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