const net = require('net');
const { execSync, spawn } = require('child_process');
const logger = require('./logger');

/**
 * Verifica se uma porta está disponível
 * @param {number} port - Porta a ser verificada
 * @returns {Promise<boolean>} - true se disponível, false caso contrário
 */
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Encontra a próxima porta disponível a partir de uma porta base
 * @param {number} startPort - Porta inicial para busca
 * @param {number} maxAttempts - Número máximo de tentativas (padrão: 10)
 * @returns {Promise<number>} - Próxima porta disponível
 */
async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const isAvailable = await checkPortAvailable(port);
    
    if (isAvailable) {
      return port;
    }
  }
  
  throw new Error(`Não foi possível encontrar uma porta disponível após ${maxAttempts} tentativas a partir da porta ${startPort}`);
}

/**
 * Encontra o processo que está usando uma porta específica (Windows)
 * @param {number} port - Porta a ser verificada
 * @returns {Object|null} - Informações do processo ou null se não encontrado
 */
function findProcessUsingPort(port) {
  try {
    // Usar netstat para encontrar o PID
    const netstatOutput = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    
    if (!netstatOutput.trim()) {
      return null;
    }
    
    // Extrair PID da primeira linha
    const lines = netstatOutput.trim().split('\n');
    const firstLine = lines[0].trim();
    const parts = firstLine.split(/\s+/);
    const pid = parts[parts.length - 1];
    
    if (!pid || pid === '0') {
      return null;
    }
    
    // Obter informações do processo
    try {
      const tasklistOutput = execSync(`tasklist | findstr "${pid}"`, { encoding: 'utf8' });
      
      if (tasklistOutput.trim()) {
        const processLine = tasklistOutput.trim().split('\n')[0];
        const parts = processLine.trim().split(/\s+/);
        
        return {
          pid: parseInt(pid),
          name: parts[0] || 'Unknown',
          memoryUsage: parts[4] || 'Unknown',
          fullLine: firstLine
        };
      }
    } catch (tasklistError) {
      logger.warn(`Erro ao obter detalhes do processo ${pid}:`, tasklistError.message);
    }
    
    return {
      pid: parseInt(pid),
      name: 'Unknown',
      memoryUsage: 'Unknown',
      fullLine: firstLine
    };
    
  } catch (error) {
    logger.error('Erro ao buscar processo usando porta:', error.message);
    return null;
  }
}

/**
 * Tenta finalizar um processo de forma segura
 * @param {number} pid - ID do processo
 * @param {boolean} force - Se deve forçar finalização (padrão: false)
 * @returns {Promise<boolean>} - true se finalizado com sucesso
 */
async function killProcess(pid, force = false) {
  try {
    const command = force ? `taskkill /F /PID ${pid}` : `taskkill /PID ${pid}`;
    execSync(command, { encoding: 'utf8' });
    
    // Aguardar um pouco para o processo terminar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    logger.error(`Erro ao finalizar processo ${pid}:`, error.message);
    return false;
  }
}

/**
 * Verifica se um processo é seguro para finalizar
 * @param {Object} processInfo - Informações do processo
 * @returns {boolean} - true se for seguro finalizar
 */
function isProcessSafeToKill(processInfo) {
  if (!processInfo || !processInfo.name) {
    return false;
  }
  
  const safeProceses = ['node.exe', 'nodemon.exe', 'npm.exe', 'yarn.exe'];
  const systemProcesses = ['System', 'svchost.exe', 'winlogon.exe', 'csrss.exe', 'explorer.exe'];
  
  const processName = processInfo.name.toLowerCase();
  
  // Não finalizar processos do sistema
  if (systemProcesses.some(sysProc => processName.includes(sysProc.toLowerCase()))) {
    return false;
  }
  
  // Seguro finalizar processos de desenvolvimento
  return safeProceses.some(safeProc => processName.includes(safeProc.toLowerCase()));
}

/**
 * Resolve conflito de porta automaticamente
 * @param {number} desiredPort - Porta desejada
 * @param {Object} options - Opções de resolução
 * @returns {Promise<{port: number, action: string, message: string}>}
 */
async function resolvePortConflict(desiredPort, options = {}) {
  const {
    allowKill = true,
    allowPortChange = true,
    forceKill = false,
    maxPortAttempts = 10
  } = options;
  
  logger.info(`🔍 Verificando disponibilidade da porta ${desiredPort}...`);
  
  const isAvailable = await checkPortAvailable(desiredPort);
  
  if (isAvailable) {
    return {
      port: desiredPort,
      action: 'none',
      message: `Porta ${desiredPort} está disponível`
    };
  }
  
  logger.warn(`⚠️ Porta ${desiredPort} está em uso`);
  
  // Encontrar processo usando a porta
  const processInfo = findProcessUsingPort(desiredPort);
  
  if (processInfo) {
    logger.info(`📊 Processo encontrado: ${processInfo.name} (PID: ${processInfo.pid})`);
    
    // Tentar finalizar se for seguro e permitido
    if (allowKill && isProcessSafeToKill(processInfo)) {
      logger.info(`🔄 Tentando finalizar processo ${processInfo.name} (PID: ${processInfo.pid})...`);
      
      const killed = await killProcess(processInfo.pid, forceKill);
      
      if (killed) {
        // Verificar se a porta ficou disponível
        const nowAvailable = await checkPortAvailable(desiredPort);
        
        if (nowAvailable) {
          return {
            port: desiredPort,
            action: 'killed_process',
            message: `Processo ${processInfo.name} finalizado. Porta ${desiredPort} agora está disponível`
          };
        }
      }
    }
  }
  
  // Se não conseguiu liberar a porta, tentar encontrar outra
  if (allowPortChange) {
    try {
      const newPort = await findAvailablePort(desiredPort + 1, maxPortAttempts);
      
      return {
        port: newPort,
        action: 'port_changed',
        message: `Porta ${desiredPort} indisponível. Usando porta ${newPort}`
      };
    } catch (error) {
      throw new Error(`Não foi possível resolver conflito de porta: ${error.message}`);
    }
  }
  
  throw new Error(`Porta ${desiredPort} está em uso e não foi possível resolver o conflito`);
}

/**
 * Gera relatório de uso de portas
 * @param {number[]} ports - Array de portas para verificar
 * @returns {Promise<Object>} - Relatório de uso das portas
 */
async function generatePortReport(ports) {
  const report = {
    timestamp: new Date().toISOString(),
    ports: []
  };
  
  for (const port of ports) {
    const isAvailable = await checkPortAvailable(port);
    const processInfo = isAvailable ? null : findProcessUsingPort(port);
    
    report.ports.push({
      port,
      available: isAvailable,
      process: processInfo
    });
  }
  
  return report;
}

module.exports = {
  checkPortAvailable,
  findAvailablePort,
  findProcessUsingPort,
  killProcess,
  isProcessSafeToKill,
  resolvePortConflict,
  generatePortReport
};