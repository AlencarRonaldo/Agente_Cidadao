
// Configuração otimizada para Windows + Puppeteer - Browser Launch Fix
const path = require('path');
const os = require('os');

const puppeteerConfig = {
    headless: true,
    
    // CORREÇÃO CRÍTICA: Especificar executável do Chrome
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 
                   process.env.CHROME_PATH || 
                   (os.platform() === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined),
    
    args: [
        // CRITICAL FIX: Remove --no-sandbox for Windows stability
        // '--no-sandbox', // REMOVED - causes Windows instability and hanging
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        
        // Performance e estabilidade - OTIMIZADO para Windows
        '--disable-gpu',
        '--disable-software-rasterizer', 
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-sync',
        
        // Recursos desnecessários
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-translate',
        '--disable-logging',
        '--disable-breakpad',
        
        // Windows específico - PRODUCTION READY
        '--disable-features=VizDisplayCompositor,AudioServiceOutOfProcess,Translate,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-blink-features=AutomationControlled',
        '--disable-component-extensions-with-background-pages',
        '--disable-domain-reliability',
        '--disable-client-side-phishing-detection',
        
        // Memory e recursos - WINDOWS OPTIMIZED
        '--memory-pressure-off',
        '--no-zygote',
        '--no-first-run',
        '--no-default-browser-check',
        '--no-pings',
        '--no-crash-upload',
        '--max_old_space_size=4096',
        
        // Windows launch stability fixes
        '--disable-crash-reporter',
        '--disable-in-process-stack-traces',
        '--disable-dev-tools',
        '--disable-javascript-harmony-shipping',
        '--disable-shared-workers',
        '--disable-speech-api',
        '--disable-background-networking',
        '--disable-component-update',
        
        // Window management for Windows
        '--window-size=1366,768',
        '--start-maximized',
        
        // User agent for WhatsApp Web compatibility
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
    
    // Timeouts aumentados - CRÍTICO para Windows
    timeout: 180000, // 3 minutos para inicialização (aumentado)
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
    
    // NOVOS: Configurações de estabilidade
    protocolTimeout: 180000,
    slowMo: 0,
    devtools: false,
    pipe: false, // Usar WebSocket ao invés de pipe no Windows
    
    // Configurações de página
    defaultViewport: {
        width: 1366,
        height: 768,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: true
    },
    
    // NOVOS: Configurações de ambiente
    env: {
        ...process.env,
        DISPLAY: process.env.DISPLAY || ':99'
    }
};

// Função para detectar Chrome no Windows
function findChromeExecutable() {
    const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    
    const fs = require('fs');
    for (const chromePath of possiblePaths) {
        try {
            if (fs.existsSync(chromePath)) {
                console.log(`🔍 Chrome encontrado: ${chromePath}`);
                return chromePath;
            }
        } catch (e) {}
    }
    
    console.warn('⚠️ Chrome não encontrado nos caminhos padrão');
    return null;
}

// Auto-detectar Chrome se não especificado
if (os.platform() === 'win32' && !puppeteerConfig.executablePath) {
    const foundChrome = findChromeExecutable();
    if (foundChrome) {
        puppeteerConfig.executablePath = foundChrome;
    }
}

// Configuração de debug
if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Puppeteer Config:', {
        executablePath: puppeteerConfig.executablePath,
        platform: os.platform(),
        timeout: puppeteerConfig.timeout,
        argsCount: puppeteerConfig.args.length
    });
}

module.exports = puppeteerConfig;
