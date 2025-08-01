const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const whatsappService = require('../services/whatsappService');
const HealthCheckSystem = require('../services/healthCheckSystem');

const prisma = new PrismaClient();
const healthChecker = new HealthCheckSystem();

// Import monitoring system
let masterMonitoringOrchestrator;
try {
  masterMonitoringOrchestrator = require('../services/masterMonitoringOrchestrator').default;
} catch (error) {
  console.warn('Monitoring system not available:', error.message);
}

/**
 * Comprehensive Health Check Endpoint
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    const includeNonCritical = req.query.detailed === 'true';
    const healthResult = await healthChecker.performHealthCheck(includeNonCritical);
    
    // Set appropriate HTTP status code based on health status
    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(healthResult);
    
  } catch (error) {
    res.status(503).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      message: `Health check failed: ${error.message}`,
      error: error.name,
      environment: process.env.ENVIRONMENT_SLOT || 'unknown'
    });
  }
});

/**
 * Simple Health Check for Load Balancer
 * GET /health/simple
 */
router.get('/simple', async (req, res) => {
  try {
    // Quick check of critical services only
    const result = await healthChecker.performHealthCheck(false);
    
    if (result.status === 'healthy') {
      res.status(200).json({ status: 'ok', timestamp: result.timestamp });
    } else {
      res.status(503).json({ status: 'error', timestamp: result.timestamp });
    }
    
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString() 
    });
  }
});

/**
 * Readiness Check (Kubernetes/Docker)
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check only critical services for readiness
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Liveness Check (Kubernetes/Docker)
 * GET /health/live
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Enhanced Monitoring System Health Check
 * GET /health/monitoring
 */
router.get('/monitoring', async (req, res) => {
  try {
    if (!masterMonitoringOrchestrator) {
      return res.status(503).json({
        status: 'unavailable',
        message: 'Monitoring system not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const systemStatus = masterMonitoringOrchestrator.getSystemStatus();
    const systemMetrics = await masterMonitoringOrchestrator.getSystemMetrics();

    res.json({
      status: systemStatus.health,
      timestamp: new Date().toISOString(),
      system: systemStatus,
      metrics: systemMetrics
    });

  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: `Monitoring health check failed: ${error.message}`,
      timestamp: new Date().toISOString(),
      error: error.stack
    });
  }
});

/**
 * System Metrics Endpoint
 * GET /health/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    if (!masterMonitoringOrchestrator) {
      return res.status(503).json({
        error: 'Monitoring system not initialized'
      });
    }

    const metrics = await masterMonitoringOrchestrator.getSystemMetrics();
    res.json(metrics);

  } catch (error) {
    res.status(500).json({
      error: `Failed to get metrics: ${error.message}`
    });
  }
});

/**
 * Configuration Endpoint
 * GET /health/config
 */
router.get('/config', (req, res) => {
  try {
    if (!masterMonitoringOrchestrator) {
      return res.status(503).json({
        error: 'Monitoring system not initialized'
      });
    }

    const config = masterMonitoringOrchestrator.getConfiguration();
    res.json(config);

  } catch (error) {
    res.status(500).json({
      error: `Failed to get configuration: ${error.message}`
    });
  }
});

/**
 * Update Configuration Endpoint
 * POST /health/config
 */
router.post('/config', (req, res) => {
  try {
    if (!masterMonitoringOrchestrator) {
      return res.status(503).json({
        error: 'Monitoring system not initialized'
      });
    }

    const { path, value } = req.body;
    
    if (!path || value === undefined) {
      return res.status(400).json({
        error: 'Path and value are required'
      });
    }

    masterMonitoringOrchestrator.updateConfiguration(path, value);
    
    res.json({
      success: true,
      message: `Configuration updated: ${path} = ${value}`
    });

  } catch (error) {
    res.status(500).json({
      error: `Failed to update configuration: ${error.message}`
    });
  }
});

/**
 * Health History Endpoint
 * GET /health/history
 */
router.get('/history', (req, res) => {
  try {
    const history = healthChecker.getHistory();
    const trend = healthChecker.getHealthTrend();
    
    res.json({
      history,
      trend,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: `Failed to get health history: ${error.message}`
    });
  }
});

/**
 * Health Trend Analysis
 * GET /health/trend
 */
router.get('/trend', (req, res) => {
  try {
    const trend = healthChecker.getHealthTrend();
    
    if (!trend) {
      return res.status(404).json({
        message: 'No health data available for trend analysis'
      });
    }
    
    res.json({
      trend,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: `Failed to get health trend: ${error.message}`
    });
  }
});

/**
 * Deployment Validation Endpoint
 * GET /health/deployment
 */
router.get('/deployment', async (req, res) => {
  try {
    const deploymentHealth = await healthChecker.performHealthCheck(true);
    const environment = process.env.ENVIRONMENT_SLOT || 'unknown';
    
    // Enhanced deployment validation
    const validationResults = {
      environment,
      deploymentId: process.env.DEPLOYMENT_ID || 'unknown',
      deploymentTime: process.env.DEPLOYMENT_TIME || new Date().toISOString(),
      health: deploymentHealth,
      readyForProduction: deploymentHealth.status === 'healthy',
      timestamp: new Date().toISOString()
    };
    
    const statusCode = validationResults.readyForProduction ? 200 : 503;
    res.status(statusCode).json(validationResults);
    
  } catch (error) {
    res.status(503).json({
      environment: process.env.ENVIRONMENT_SLOT || 'unknown',
      readyForProduction: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, cleaning up health checker...');
  await healthChecker.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, cleaning up health checker...');
  await healthChecker.cleanup();
  process.exit(0);
});

module.exports = router;