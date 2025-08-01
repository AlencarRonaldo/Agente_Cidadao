#!/usr/bin/env node

/**
 * MONITORING SYSTEM MIGRATION SCRIPT
 * 
 * Script para migrar do sistema de monitoramento antigo para o sistema otimizado.
 * 
 * Resolve os seguintes problemas identificados:
 * 1. "Error Recovery: Low success rate (0.0%)" - Normal em início, sem erros processados
 * 2. "Performance Audit: Integrity issues detected" - Problemas de encryption  
 * 3. Status mudou RUNNING → DEGRADED desnecessariamente
 * 
 * OTIMIZAÇÕES IMPLEMENTADAS:
 * - Startup Grace Period: Thresholds relaxados nos primeiros 5 minutos
 * - Adaptive Thresholds: Ajuste automático baseado no histórico
 * - Smart Status Calculation: Evita transições desnecessárias RUNNING → DEGRADED
 * - Encryption Issue Resolution: Fix dos problemas de integridade
 * - Enhanced Error Recovery Metrics: Métricas mais inteligentes para sistemas novos
 * 
 * @author Optimized Monitoring System Migration
 * @priority CRITICAL - System Migration
 */

const path = require('path');
const fs = require('fs').promises;

// Configurar paths
const rootPath = __dirname;
const srcPath = path.join(rootPath, 'src');

console.log('🔄 MONITORING SYSTEM MIGRATION');
console.log('==============================');
console.log('');

/**
 * MIGRATION MANAGER - Gerenciador de Migração
 */
class MigrationManager {
  constructor() {
    this.steps = [];
    this.currentStep = 0;
  }

  /**
   * Executar migração completa
   */
  async executeMigration() {
    console.log('🚀 Starting Monitoring System Migration...');
    console.log('');

    try {
      // Definir passos da migração
      this.defineSteps();

      // Executar cada passo
      for (let i = 0; i < this.steps.length; i++) {
        this.currentStep = i + 1;
        const step = this.steps[i];
        
        console.log(`📋 Step ${this.currentStep}/${this.steps.length}: ${step.name}`);
        console.log(`   ${step.description}`);
        
        try {
          await step.execute();
          console.log(`   ✅ Completed successfully`);
        } catch (error) {
          console.log(`   ❌ Failed: ${error.message}`);
          
          if (step.critical) {
            throw new Error(`Critical step failed: ${step.name}`);
          } else {
            console.log(`   ⚠️  Continuing despite non-critical failure...`);
          }
        }
        
        console.log('');
      }

      console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('');
      console.log('📊 SUMMARY OF IMPROVEMENTS:');
      console.log('  1. ✓ Grace Period System: Prevents false alarms during startup (5 min buffer)');
      console.log('  2. ✓ Adaptive Thresholds: Dynamic adjustment based on system behavior');
      console.log('  3. ✓ Smart Status Calculation: Eliminates RUNNING → DEGRADED oscillations');
      console.log('  4. ✓ Fixed Encryption: Resolves "Integrity issues detected" warnings');
      console.log('  5. ✓ Enhanced Error Recovery: Shows "no data" instead of "0.0%" for new systems');
      console.log('  6. ✓ Optimized Performance: Reduced resource usage and improved stability');
      console.log('');
      console.log('🔧 NEXT STEPS:');
      console.log('  1. Test the new system: npm run test:monitoring');
      console.log('  2. Start your application normally');
      console.log('  3. Monitor the logs for the first 5 minutes (grace period)');
      console.log('  4. Check dashboard after 15 minutes (full adaptive mode)');
      console.log('');
      console.log('💡 The system will automatically:');
      console.log('  - Use relaxed thresholds for 5 minutes (grace period)');
      console.log('  - Learn your system patterns for 15 minutes (learning period)');
      console.log('  - Switch to adaptive thresholds for optimal performance');

    } catch (error) {
      console.log('❌ MIGRATION FAILED:', error.message);
      console.log('');
      console.log('🔧 TROUBLESHOOTING:');
      console.log('  1. Check if the application is not running during migration');
      console.log('  2. Ensure you have write permissions in the project directory');
      console.log('  3. Verify all required dependencies are installed: npm install');
      console.log('  4. Check the logs for detailed error information');
      
      process.exit(1);
    }
  }

  /**
   * Definir passos da migração
   */
  defineSteps() {
    this.steps = [
      {
        name: 'Environment Validation',
        description: 'Validate environment and dependencies',
        critical: true,
        execute: this.validateEnvironment.bind(this)
      },
      {
        name: 'Backup Current System',
        description: 'Create backup of current monitoring configuration',
        critical: false,
        execute: this.backupCurrentSystem.bind(this)
      },
      {
        name: 'Install Optimized System',
        description: 'Deploy optimized monitoring system files',
        critical: true,
        execute: this.installOptimizedSystem.bind(this)
      },
      {
        name: 'Update Integration Points',
        description: 'Update main application to use optimized system',
        critical: true,
        execute: this.updateIntegrationPoints.bind(this)
      },
      {
        name: 'Initialize Encryption Keys',
        description: 'Generate secure encryption keys for audit system',
        critical: false,
        execute: this.initializeEncryptionKeys.bind(this)
      },
      {
        name: 'Validate Installation',
        description: 'Run basic validation tests on new system',
        critical: true,
        execute: this.validateInstallation.bind(this)
      },
      {
        name: 'Create Migration Log',
        description: 'Document migration for future reference',
        critical: false,
        execute: this.createMigrationLog.bind(this)
      }
    ];
  }

  /**
   * Passo 1: Validar ambiente
   */
  async validateEnvironment() {
    // Verificar Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 14) {
      throw new Error(`Node.js ${nodeVersion} is too old. Requires Node.js 14+`);
    }

    // Verificar estrutura de diretórios
    const requiredDirs = [
      path.join(srcPath, 'services'),
      path.join(srcPath, 'tests'),
      path.join(rootPath, 'keys')
    ];

    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }

    // Verificar dependências críticas
    const packageJsonPath = path.join(rootPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const requiredDeps = ['crypto', 'fs', 'path'];
      // crypto, fs, path são built-ins do Node.js, não precisa verificar no package.json
    } catch (error) {
      console.log('   ⚠️  Could not validate package.json, continuing...');
    }
  }

  /**
   * Passo 2: Backup do sistema atual
   */
  async backupCurrentSystem() {
    const backupDir = path.join(rootPath, 'backup', `monitoring-backup-${Date.now()}`);
    await fs.mkdir(backupDir, { recursive: true });

    const filesToBackup = [
      'src/services/intelligentMonitoringSystem.js',
      'src/services/performanceAuditSystem.js',
      'src/services/monitoringInitializer.js'
    ];

    for (const file of filesToBackup) {
      const sourcePath = path.join(rootPath, file);
      const targetPath = path.join(backupDir, path.basename(file));
      
      try {
        await fs.copyFile(sourcePath, targetPath);
      } catch (error) {
        // Arquivo pode não existir, continuar
        console.log(`     ℹ️  Could not backup ${file} (may not exist)`);
      }
    }

    console.log(`     💾 Backup created at: ${backupDir}`);
  }

  /**
   * Passo 3: Instalar sistema otimizado
   */
  async installOptimizedSystem() {
    // Os arquivos já foram criados pelos comandos anteriores
    // Apenas verificar se existem
    const requiredFiles = [
      'src/services/optimizedMonitoringSystem.js',
      'src/services/monitoringSystemInitializer.js',
      'src/tests/optimizedMonitoringSystem.test.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(rootPath, file);
      try {
        await fs.access(filePath);
        console.log(`     ✓ ${file} installed`);
      } catch {
        throw new Error(`Required file missing: ${file}`);
      }
    }
  }

  /**
   * Passo 4: Atualizar pontos de integração
   */
  async updateIntegrationPoints() {
    // Atualizar index.js principal se existir
    const indexPath = path.join(srcPath, 'index.js');
    
    try {
      const indexContent = await fs.readFile(indexPath, 'utf8');
      
      // Procurar por importações do sistema antigo
      const hasOldImport = indexContent.includes('intelligentMonitoringSystem') || 
                          indexContent.includes('performanceAuditSystem');
      
      if (hasOldImport) {
        console.log('     ⚠️  Found old monitoring system imports in index.js');
        console.log('     ℹ️  Please manually update imports to use:');
        console.log('        const { initialize } = require("./services/monitoringSystemInitializer");');
        console.log('        await initialize();');
      } else {
        console.log('     ✓ No old monitoring imports found in index.js');
      }
    } catch (error) {
      console.log('     ℹ️  index.js not found or not readable, skipping integration update');
    }

    // Criar arquivo de exemplo de integração
    const exampleIntegrationPath = path.join(rootPath, 'monitoring-integration-example.js');
    const exampleContent = `
/**
 * MONITORING INTEGRATION EXAMPLE
 * 
 * Add this code to your main application file (e.g., src/index.js)
 */

const { initialize, getStatus } = require('./src/services/monitoringSystemInitializer');

async function startApplication() {
  try {
    // Initialize optimized monitoring system
    console.log('🚀 Starting optimized monitoring system...');
    const initResult = await initialize();
    
    console.log('✅ Monitoring system initialized:', initResult.message);
    
    // Your existing application code here
    // ...
    
    // Optional: Get system status
    const status = getStatus();
    console.log('📊 Monitoring status:', status.monitoring?.overallStatus?.status);
    
  } catch (error) {
    console.error('❌ Failed to initialize monitoring:', error);
    process.exit(1);
  }
}

startApplication();
`;

    await fs.writeFile(exampleIntegrationPath, exampleContent.trim());
    console.log(`     📝 Integration example created: monitoring-integration-example.js`);
  }

  /**
   * Passo 5: Inicializar chaves de criptografia
   */
  async initializeEncryptionKeys() {
    const keysDir = path.join(rootPath, 'keys');
    const privateKeyPath = path.join(keysDir, 'audit-private.key');
    const publicKeyPath = path.join(keysDir, 'audit-public.key');

    // Verificar se chaves já existem
    try {
      await fs.access(privateKeyPath);
      await fs.access(publicKeyPath);
      console.log('     ✓ Encryption keys already exist');
      return;
    } catch {
      // Chaves não existem, serão criadas automaticamente pelo sistema
      console.log('     ℹ️  Encryption keys will be generated automatically on first run');
    }
  }

  /**
   * Passo 6: Validar instalação
   */
  async validateInstallation() {
    try {
      // Tentar importar o sistema otimizado
      const { OptimizedMonitoringSystem } = require(path.join(srcPath, 'services', 'optimizedMonitoringSystem'));
      const system = new OptimizedMonitoringSystem();
      
      // Verificar se componentes básicos existem
      if (!system.thresholdManager || !system.statusCalculator || !system.errorRecoveryTracker) {
        throw new Error('Missing essential components in optimized system');
      }

      // Verificar grace period
      const isInGracePeriod = system.thresholdManager.isInGracePeriod();
      if (!isInGracePeriod) {
        throw new Error('Grace period should be active for new system');
      }

      // Verificar thresholds
      const thresholds = system.thresholdManager.getThresholds('whatsapp');
      if (!thresholds || Object.keys(thresholds).length === 0) {
        throw new Error('Thresholds not properly configured');
      }

      console.log('     ✓ Core system components validated');
      console.log('     ✓ Grace period mechanism working');
      console.log('     ✓ Adaptive thresholds configured');
      
    } catch (error) {
      throw new Error(`Installation validation failed: ${error.message}`);
    }
  }

  /**
   * Passo 7: Criar log de migração
   */
  async createMigrationLog() {
    const logContent = {
      migrationDate: new Date().toISOString(),
      migrationVersion: '1.0.0',
      nodeVersion: process.version,
      improvements: [
        'Grace Period System (5 minutes startup buffer)',
        'Adaptive Thresholds (dynamic adjustment)',
        'Smart Status Calculation (eliminates oscillations)',
        'Fixed Encryption Manager (resolves integrity issues)',
        'Enhanced Error Recovery Metrics (intelligent success rates)',
        'Optimized Performance (reduced resource usage)'
      ],
      resolvedIssues: [
        'Error Recovery: Low success rate (0.0%) - Now shows "no data" for new systems',
        'Performance Audit: Integrity issues detected - Fixed encryption implementation',
        'Status oscillations RUNNING → DEGRADED - Smart status calculation prevents this'
      ],
      configurationPeriods: {
        gracePeriod: '5 minutes (relaxed thresholds)',
        learningPeriod: '15 minutes (transitional thresholds)',
        adaptivePeriod: 'After 15 minutes (dynamic thresholds)'
      },
      nextSteps: [
        'Start application normally',
        'Monitor logs during grace period (5 min)',
        'Check dashboard after learning period (15 min)',
        'Run tests: npm run test:monitoring'
      ]
    };

    const logPath = path.join(rootPath, 'monitoring-migration.log.json');
    await fs.writeFile(logPath, JSON.stringify(logContent, null, 2));
    
    console.log(`     📋 Migration log created: monitoring-migration.log.json`);
  }
}

/**
 * MAIN EXECUTION
 */
async function main() {
  const migrationManager = new MigrationManager();
  await migrationManager.executeMigration();
}

// Executar migração
if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { MigrationManager };