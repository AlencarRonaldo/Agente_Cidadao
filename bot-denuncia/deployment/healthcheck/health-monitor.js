#!/usr/bin/env node

const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const config = {
    blueUrl: process.env.BLUE_URL || 'http://app-blue:3001/health',
    greenUrl: process.env.GREEN_URL || 'http://app-green:3001/health',
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30,
    timeout: 10000,
    retries: 3
};

// Health status tracking
let healthStatus = {
    blue: { status: 'unknown', lastCheck: null, consecutiveFailures: 0 },
    green: { status: 'unknown', lastCheck: null, consecutiveFailures: 0 },
    activeEnvironment: 'blue', // Current active environment
    lastSwitch: null
};

// Logging utility
const log = (level, message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({
        timestamp,
        level,
        message,
        data,
        service: 'health-monitor'
    }));
};

// Health check function
async function checkHealth(url, environment) {
    let attempts = 0;
    
    while (attempts < config.retries) {
        try {
            const response = await axios.get(url, {
                timeout: config.timeout,
                validateStatus: (status) => status === 200
            });
            
            const healthData = response.data;
            
            // Validate health response structure
            if (healthData.status === 'healthy' && 
                healthData.timestamp && 
                healthData.services) {
                
                healthStatus[environment] = {
                    status: 'healthy',
                    lastCheck: new Date(),
                    consecutiveFailures: 0,
                    data: healthData
                };
                
                log('info', `Health check passed for ${environment}`, {
                    environment,
                    response: healthData
                });
                
                return true;
            }
            
        } catch (error) {
            attempts++;
            log('warn', `Health check attempt ${attempts} failed for ${environment}`, {
                environment,
                error: error.message,
                url
            });
            
            if (attempts < config.retries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    // All attempts failed
    healthStatus[environment].status = 'unhealthy';
    healthStatus[environment].lastCheck = new Date();
    healthStatus[environment].consecutiveFailures++;
    
    log('error', `Health check failed for ${environment} after ${config.retries} attempts`, {
        environment,
        consecutiveFailures: healthStatus[environment].consecutiveFailures
    });
    
    return false;
}

// Environment switching logic
async function evaluateEnvironmentSwitch() {
    const blue = healthStatus.blue;
    const green = healthStatus.green;
    const current = healthStatus.activeEnvironment;
    
    // Switch conditions
    const shouldSwitch = (
        // Current environment is unhealthy and standby is healthy
        (blue.status === 'unhealthy' && green.status === 'healthy' && current === 'blue') ||
        (green.status === 'unhealthy' && blue.status === 'healthy' && current === 'green') ||
        
        // Current environment has multiple consecutive failures
        (blue.consecutiveFailures >= 3 && green.status === 'healthy' && current === 'blue') ||
        (green.consecutiveFailures >= 3 && blue.status === 'healthy' && current === 'green')
    );
    
    if (shouldSwitch) {
        const newEnvironment = current === 'blue' ? 'green' : 'blue';
        
        log('warn', 'Initiating environment switch', {
            from: current,
            to: newEnvironment,
            reason: 'Health check failure',
            blueStatus: blue.status,
            greenStatus: green.status
        });
        
        // Trigger environment switch (would integrate with load balancer)
        await triggerEnvironmentSwitch(newEnvironment);
    }
}

// Environment switch trigger (placeholder for load balancer integration)
async function triggerEnvironmentSwitch(newEnvironment) {
    try {
        // This would typically update nginx configuration or load balancer
        log('info', 'Environment switch completed', {
            newActiveEnvironment: newEnvironment,
            previousEnvironment: healthStatus.activeEnvironment
        });
        
        healthStatus.activeEnvironment = newEnvironment;
        healthStatus.lastSwitch = new Date();
        
        // Here you would implement:
        // 1. Update nginx upstream configuration
        // 2. Reload nginx configuration
        // 3. Notify monitoring systems
        // 4. Update service discovery
        
    } catch (error) {
        log('error', 'Environment switch failed', {
            targetEnvironment: newEnvironment,
            error: error.message
        });
    }
}

// Periodic health monitoring
async function runHealthChecks() {
    log('info', 'Starting health check cycle');
    
    // Check both environments
    await Promise.all([
        checkHealth(config.blueUrl, 'blue'),
        checkHealth(config.greenUrl, 'green')
    ]);
    
    // Evaluate if environment switch is needed
    await evaluateEnvironmentSwitch();
    
    log('info', 'Health check cycle completed', {
        blueStatus: healthStatus.blue.status,
        greenStatus: healthStatus.green.status,
        activeEnvironment: healthStatus.activeEnvironment
    });
}

// API endpoints
app.use(express.json());

// Get current health status
app.get('/status', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environments: healthStatus,
        configuration: config
    });
});

// Get detailed health information
app.get('/health/detailed', (req, res) => {
    res.json({
        monitor: {
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        },
        environments: healthStatus,
        metrics: {
            totalChecks: 0, // Would track this
            successRate: 0, // Would calculate this
            lastSwitch: healthStatus.lastSwitch
        }
    });
});

// Manual environment switch (for testing/maintenance)
app.post('/switch/:environment', async (req, res) => {
    const targetEnvironment = req.params.environment;
    
    if (targetEnvironment !== 'blue' && targetEnvironment !== 'green') {
        return res.status(400).json({
            error: 'Invalid environment. Must be "blue" or "green"'
        });
    }
    
    if (healthStatus[targetEnvironment].status !== 'healthy') {
        return res.status(400).json({
            error: `Target environment ${targetEnvironment} is not healthy`
        });
    }
    
    try {
        await triggerEnvironmentSwitch(targetEnvironment);
        
        res.json({
            message: `Environment switched to ${targetEnvironment}`,
            previousEnvironment: healthStatus.activeEnvironment,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Environment switch failed',
            details: error.message
        });
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    log('info', 'Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    log('info', 'Received SIGINT, shutting down gracefully');
    process.exit(0);
});

// Start the server
app.listen(PORT, () => {
    log('info', 'Health monitor started', {
        port: PORT,
        config
    });
    
    // Start health monitoring
    runHealthChecks();
    setInterval(runHealthChecks, config.checkInterval * 1000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log('error', 'Unhandled rejection', { reason, promise });
    process.exit(1);
});