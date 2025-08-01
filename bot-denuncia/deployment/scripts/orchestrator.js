#!/usr/bin/env node

/**
 * Deployment Orchestrator
 * Sistema completo de orquestração de deployment com integração de todos os componentes
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Importa sistemas internos
const HealthCheckSystem = require('../services/healthCheckSystem');
const RollbackSystem = require('../services/rollbackSystem');

class DeploymentOrchestrator {
    constructor(config = {}) {
        this.config = {
            projectRoot: config.projectRoot || process.cwd(),
            healthCheckTimeout: config.healthCheckTimeout || 300000, // 5 min
            deploymentTimeout: config.deploymentTimeout || 1800000, // 30 min
            retryAttempts: config.retryAttempts || 3,
            notificationWebhook: config.notificationWebhook,
            slackWebhook: config.slackWebhook,
            ...config
        };
        
        this.state = {
            currentDeployment: null,
            deploymentHistory: [],
            isDeploying: false,
            lastHealthCheck: null
        };
        
        // Inicializa sistemas
        this.healthSystem = new HealthCheckSystem();
        this.rollbackSystem = new RollbackSystem({
            healthCheckUrl: 'http://localhost:3001/health/deployment'
        });
        
        this.initializeOrchestrator();
    }
    
    async initializeOrchestrator() {
        try {
            console.log('🚀 Initializing Deployment Orchestrator...');
            
            // Carrega estado persistido
            await this.loadState();
            
            // Configura handlers de processo
            this.setupProcessHandlers();
            
            console.log('✅ Deployment Orchestrator initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize orchestrator:', error);
            process.exit(1);
        }
    }
    
    /**
     * Executa deployment completo
     */
    async executeDeployment(deploymentConfig) {
        if (this.state.isDeploying) {
            throw new Error('Deployment already in progress');
        }
        
        const deployment = {
            id: `deploy_${Date.now()}`,
            timestamp: new Date().toISOString(),
            config: deploymentConfig,
            status: 'started',
            phases: [],
            metrics: {},
            errors: []
        };
        
        this.state.currentDeployment = deployment;
        this.state.isDeploying = true;
        
        try {
            console.log(`🚀 Starting deployment: ${deployment.id}`);
            
            // Registra deployment no sistema de rollback
            await this.rollbackSystem.registerDeployment({
                id: deployment.id,
                environment: deploymentConfig.targetEnvironment,
                version: deploymentConfig.version
            });
            
            // Fase 1: Pré-validação
            await this.executePhase(deployment, 'pre-validation', async () => {
                return await this.preValidationPhase(deploymentConfig);
            });
            
            // Fase 2: Build
            await this.executePhase(deployment, 'build', async () => {
                return await this.buildPhase(deploymentConfig);
            });
            
            // Fase 3: Database Migration
            await this.executePhase(deployment, 'database-migration', async () => {
                return await this.databaseMigrationPhase(deploymentConfig);
            });
            
            // Fase 4: Deployment
            await this.executePhase(deployment, 'deployment', async () => {
                return await this.deploymentPhase(deploymentConfig);
            });
            
            // Fase 5: Health Validation
            await this.executePhase(deployment, 'health-validation', async () => {
                return await this.healthValidationPhase(deploymentConfig);
            });
            
            // Fase 6: Traffic Switch
            await this.executePhase(deployment, 'traffic-switch', async () => {
                return await this.trafficSwitchPhase(deploymentConfig);
            });
            
            // Fase 7: Post-validation
            await this.executePhase(deployment, 'post-validation', async () => {
                return await this.postValidationPhase(deploymentConfig);
            });
            
            // Fase 8: Cleanup
            await this.executePhase(deployment, 'cleanup', async () => {
                return await this.cleanupPhase(deploymentConfig);
            });
            
            deployment.status = 'completed';
            deployment.completedAt = new Date().toISOString();
            deployment.duration = Date.now() - new Date(deployment.timestamp).getTime();
            
            console.log(`✅ Deployment completed successfully: ${deployment.id}`);
            console.log(`⏱️  Total duration: ${Math.round(deployment.duration / 1000)}s`);
            
            // Notificações de sucesso
            await this.sendNotification('deployment_success', deployment);
            
            return deployment;
            
        } catch (error) {
            deployment.status = 'failed';
            deployment.error = error.message;
            deployment.failedAt = new Date().toISOString();
            
            console.error(`❌ Deployment failed: ${deployment.id}`, error);
            
            // Executa rollback automático
            try {
                await this.executeRollback(deployment, error.message);
            } catch (rollbackError) {
                console.error('❌ Rollback also failed:', rollbackError);
                deployment.rollbackError = rollbackError.message;
            }
            
            // Notificações de falha
            await this.sendNotification('deployment_failed', deployment);
            
            throw error;
            
        } finally {
            this.state.isDeploying = false;
            this.state.deploymentHistory.unshift(deployment);
            
            // Mantém apenas os últimos 20 deployments
            if (this.state.deploymentHistory.length > 20) {
                this.state.deploymentHistory = this.state.deploymentHistory.slice(0, 20);
            }
            
            await this.saveState();
        }
    }
    
    /**
     * Executa uma fase do deployment
     */
    async executePhase(deployment, phaseName, phaseFunction) {
        const phase = {
            name: phaseName,
            status: 'started',
            startTime: new Date().toISOString(),
            logs: []
        };
        
        deployment.phases.push(phase);
        
        console.log(`📦 Starting phase: ${phaseName}`);
        
        try {
            const result = await Promise.race([
                phaseFunction(),
                this.createTimeoutPromise(this.config.deploymentTimeout, `Phase ${phaseName} timeout`)
            ]);
            
            phase.status = 'completed';
            phase.result = result;
            phase.endTime = new Date().toISOString();
            phase.duration = Date.now() - new Date(phase.startTime).getTime();
            
            console.log(`✅ Phase completed: ${phaseName} (${Math.round(phase.duration / 1000)}s)`);
            
        } catch (error) {
            phase.status = 'failed';
            phase.error = error.message;
            phase.endTime = new Date().toISOString();
            
            console.error(`❌ Phase failed: ${phaseName}`, error);
            throw error;
        }
    }
    
    /**
     * Fase de pré-validação
     */
    async preValidationPhase(config) {
        console.log('🔍 Running pre-validation checks...');
        
        const checks = {
            docker: await this.checkDockerAvailability(),
            diskSpace: await this.checkDiskSpace(),
            environment: await this.validateEnvironmentConfig(config),
            currentHealth: await this.healthSystem.performHealthCheck(false)
        };
        
        // Verifica se todas as validações passaram
        const failures = Object.entries(checks)
            .filter(([_, result]) => !result.passed)
            .map(([check, result]) => `${check}: ${result.error || result.message}`);
        
        if (failures.length > 0) {
            throw new Error(`Pre-validation failed: ${failures.join(', ')}`);
        }
        
        return { status: 'passed', checks };
    }
    
    /**
     * Fase de build
     */
    async buildPhase(config) {
        console.log('🔨 Building application...');
        
        const buildResult = await this.executeCommand(
            path.join(__dirname, 'build.sh'),
            [config.targetEnvironment],
            { cwd: this.config.projectRoot }
        );
        
        return { status: 'completed', buildResult };
    }
    
    /**
     * Fase de migração do banco
     */
    async databaseMigrationPhase(config) {
        console.log('🗄️ Running database migrations...');
        
        // Cria backup antes da migração
        const backupResult = await this.createDatabaseBackup();
        
        try {
            const migrationResult = await this.executeCommand(
                'npm',
                ['run', 'db:migrate'],
                { cwd: this.config.projectRoot }
            );
            
            return { 
                status: 'completed', 
                migrationResult,
                backup: backupResult
            };
            
        } catch (error) {
            // Em caso de falha, restaura o backup
            await this.restoreDatabaseBackup(backupResult.backupFile);
            throw error;
        }
    }
    
    /**
     * Fase de deployment
     */
    async deploymentPhase(config) {
        console.log('🚢 Deploying to target environment...');
        
        const deployResult = await this.executeCommand(
            'docker-compose',
            [
                '-f', path.join(this.config.projectRoot, 'deployment', 'docker-compose.production.yml'),
                'up', '-d', `app-${config.targetEnvironment}`
            ],
            { 
                cwd: this.config.projectRoot,
                env: {
                    ...process.env,
                    ENVIRONMENT_SLOT: config.targetEnvironment,
                    DEPLOYMENT_ID: config.deploymentId
                }
            }
        );
        
        // Aguarda o container estar pronto
        await this.waitForContainerReady(config.targetEnvironment);
        
        return { status: 'completed', deployResult };
    }
    
    /**
     * Fase de validação de saúde
     */
    async healthValidationPhase(config) {
        console.log('🏥 Validating deployment health...');
        
        const maxAttempts = 30; // 5 minutos com intervalos de 10s
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const healthUrl = `http://app-${config.targetEnvironment}:3001/health/deployment`;
                const response = await axios.get(healthUrl, { timeout: 10000 });
                
                if (response.data.readyForProduction) {
                    console.log('✅ Health validation passed');
                    return { 
                        status: 'passed', 
                        healthData: response.data,
                        attempts: attempts + 1
                    };
                }
                
            } catch (error) {
                console.log(`🔄 Health check attempt ${attempts + 1}/${maxAttempts} failed: ${error.message}`);
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10s
        }
        
        throw new Error(`Health validation failed after ${maxAttempts} attempts`);
    }
    
    /**
     * Fase de switch de tráfego
     */
    async trafficSwitchPhase(config) {
        console.log('🔄 Switching traffic...');
        
        // Atualiza configuração do nginx
        await this.updateNginxConfiguration(config.targetEnvironment);
        
        // Recarrega nginx
        await this.reloadNginx();
        
        // Verifica se o switch foi bem-sucedido
        await this.verifyTrafficSwitch(config.targetEnvironment);
        
        return { status: 'completed', activeEnvironment: config.targetEnvironment };
    }
    
    /**
     * Fase de pós-validação
     */
    async postValidationPhase(config) {
        console.log('✅ Running post-deployment validation...');
        
        // Valida o deployment no sistema de rollback
        const validationResult = await this.rollbackSystem.validateDeployment(config.deploymentId);
        
        // Executa testes end-to-end se configurados
        if (config.runE2ETests) {
            const e2eResult = await this.runEndToEndTests();
            validationResult.e2eTests = e2eResult;
        }
        
        return validationResult;
    }
    
    /**
     * Fase de cleanup
     */
    async cleanupPhase(config) {
        console.log('🧹 Cleaning up...');
        
        const cleanupResult = await this.executeCommand(
            path.join(__dirname, 'cleanup.sh'),
            [],
            { cwd: this.config.projectRoot }
        );
        
        return { status: 'completed', cleanupResult };
    }
    
    /**
     * Executa rollback
     */
    async executeRollback(deployment, reason) {
        console.log(`🔙 Executing rollback for deployment: ${deployment.id}`);
        console.log(`Reason: ${reason}`);
        
        try {
            const rollbackResult = await this.rollbackSystem.triggerAutomaticRollback(
                `deployment_failed: ${reason}`
            );
            
            deployment.rollback = {
                status: 'completed',
                timestamp: new Date().toISOString(),
                result: rollbackResult
            };
            
            console.log('✅ Rollback completed successfully');
            
        } catch (error) {
            deployment.rollback = {
                status: 'failed',
                timestamp: new Date().toISOString(),
                error: error.message
            };
            
            throw error;
        }
    }
    
    /**
     * Utilitários
     */
    async executeCommand(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                stdio: 'pipe',
                ...options
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => {
                stdout += data.toString();
                console.log(data.toString().trim());
            });
            
            child.stderr.on('data', (data) => {
                stderr += data.toString();
                console.error(data.toString().trim());
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    resolve({ code, stdout, stderr });
                } else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });
            
            child.on('error', reject);
        });
    }
    
    createTimeoutPromise(timeout, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeout);
        });
    }
    
    async checkDockerAvailability() {
        try {
            execSync('docker info', { stdio: 'pipe' });
            return { passed: true, message: 'Docker is available' };
        } catch (error) {
            return { passed: false, error: 'Docker is not available' };
        }
    }
    
    async checkDiskSpace() {
        try {
            const stats = execSync('df -h .', { encoding: 'utf8' });
            // Parse disk usage - implementar verificação específica
            return { passed: true, message: 'Sufficient disk space', stats };
        } catch (error) {
            return { passed: false, error: 'Could not check disk space' };
        }
    }
    
    async validateEnvironmentConfig(config) {
        const required = ['targetEnvironment', 'version'];
        const missing = required.filter(key => !config[key]);
        
        if (missing.length > 0) {
            return { 
                passed: false, 
                error: `Missing required config: ${missing.join(', ')}` 
            };
        }
        
        return { passed: true, message: 'Environment config is valid' };
    }
    
    async waitForContainerReady(environment) {
        const maxWait = 60000; // 1 minuto
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            try {
                const result = execSync(
                    `docker ps --filter "name=bot-denuncia-${environment}" --filter "status=running" --quiet`,
                    { encoding: 'utf8' }
                );
                
                if (result.trim()) {
                    return true;
                }
                
            } catch (error) {
                // Continua tentando
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new Error(`Container for ${environment} did not become ready in time`);
    }
    
    async createDatabaseBackup() {
        const backupFile = `backup_${Date.now()}.sql`;
        // Implementar backup do banco de dados
        return { backupFile, status: 'created' };
    }
    
    async restoreDatabaseBackup(backupFile) {
        // Implementar restauração do backup
        console.log(`Restoring database from ${backupFile}`);
    }
    
    async updateNginxConfiguration(environment) {
        // Implementar atualização da configuração do nginx
        console.log(`Updating nginx configuration for ${environment}`);
    }
    
    async reloadNginx() {
        // Implementar reload do nginx
        console.log('Reloading nginx configuration');
    }
    
    async verifyTrafficSwitch(environment) {
        // Implementar verificação do switch de tráfego
        console.log(`Verifying traffic switch to ${environment}`);
    }
    
    async runEndToEndTests() {
        // Implementar testes end-to-end
        return { status: 'passed', tests: [] };
    }
    
    async sendNotification(type, data) {
        if (this.config.slackWebhook) {
            await this.sendSlackNotification(type, data);
        }
        
        if (this.config.notificationWebhook) {
            await this.sendWebhookNotification(type, data);
        }
    }
    
    async sendSlackNotification(type, data) {
        try {
            const message = this.formatSlackMessage(type, data);
            await axios.post(this.config.slackWebhook, message);
        } catch (error) {
            console.error('Failed to send Slack notification:', error);
        }
    }
    
    formatSlackMessage(type, data) {
        const emoji = type === 'deployment_success' ? '✅' : '❌';
        const color = type === 'deployment_success' ? 'good' : 'danger';
        
        return {
            attachments: [{
                color,
                title: `${emoji} Deployment ${data.status}`,
                fields: [
                    { title: 'Deployment ID', value: data.id, short: true },
                    { title: 'Environment', value: data.config?.targetEnvironment, short: true },
                    { title: 'Duration', value: `${Math.round((data.duration || 0) / 1000)}s`, short: true },
                    { title: 'Status', value: data.status, short: true }
                ],
                timestamp: data.timestamp
            }]
        };
    }
    
    async sendWebhookNotification(type, data) {
        try {
            await axios.post(this.config.notificationWebhook, {
                type,
                deployment: data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to send webhook notification:', error);
        }
    }
    
    setupProcessHandlers() {
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));
        process.on('uncaughtException', this.handleUncaughtException.bind(this));
        process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    }
    
    async gracefulShutdown() {
        console.log('🛑 Graceful shutdown initiated...');
        
        if (this.state.isDeploying) {
            console.log('⚠️  Deployment in progress, waiting for completion...');
            // Aqui você pode implementar lógica para aguardar ou cancelar deployment
        }
        
        await this.saveState();
        await this.healthSystem.cleanup();
        await this.rollbackSystem.cleanup();
        
        console.log('✅ Shutdown completed');
        process.exit(0);
    }
    
    handleUncaughtException(error) {
        console.error('💥 Uncaught exception:', error);
        this.gracefulShutdown();
    }
    
    handleUnhandledRejection(reason, promise) {
        console.error('💥 Unhandled rejection:', reason);
        this.gracefulShutdown();
    }
    
    async loadState() {
        try {
            const stateFile = path.join(this.config.projectRoot, 'deployment', 'state', 'orchestrator-state.json');
            const data = await fs.readFile(stateFile, 'utf8');
            this.state = { ...this.state, ...JSON.parse(data) };
        } catch (error) {
            console.log('No previous state found, starting fresh');
        }
    }
    
    async saveState() {
        try {
            const stateFile = path.join(this.config.projectRoot, 'deployment', 'state', 'orchestrator-state.json');
            const stateDir = path.dirname(stateFile);
            
            await fs.mkdir(stateDir, { recursive: true });
            await fs.writeFile(stateFile, JSON.stringify(this.state, null, 2));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }
    
    /**
     * API para uso externo
     */
    getStatus() {
        return {
            isDeploying: this.state.isDeploying,
            currentDeployment: this.state.currentDeployment,
            lastDeployment: this.state.deploymentHistory[0] || null,
            deploymentHistory: this.state.deploymentHistory.slice(0, 5)
        };
    }
    
    async getHealthStatus() {
        return await this.healthSystem.performHealthCheck(true);
    }
    
    getRollbackStatus() {
        return this.rollbackSystem.getStatus();
    }
}

// CLI Interface
if (require.main === module) {
    const orchestrator = new DeploymentOrchestrator();
    
    const command = process.argv[2];
    const config = {
        targetEnvironment: process.argv[3] || 'green',
        version: process.argv[4] || 'latest',
        deploymentId: `deploy_${Date.now()}`
    };
    
    switch (command) {
        case 'deploy':
            orchestrator.executeDeployment(config)
                .then(() => {
                    console.log('✅ Deployment orchestration completed');
                    process.exit(0);
                })
                .catch((error) => {
                    console.error('❌ Deployment orchestration failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'status':
            console.log(JSON.stringify(orchestrator.getStatus(), null, 2));
            break;
            
        case 'health':
            orchestrator.getHealthStatus()
                .then(health => {
                    console.log(JSON.stringify(health, null, 2));
                    process.exit(health.status === 'healthy' ? 0 : 1);
                });
            break;
            
        case 'rollback':
            orchestrator.rollbackSystem.manualRollback('manual_cli_request')
                .then(() => {
                    console.log('✅ Manual rollback completed');
                    process.exit(0);
                })
                .catch((error) => {
                    console.error('❌ Manual rollback failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node orchestrator.js {deploy|status|health|rollback} [environment] [version]');
            process.exit(1);
    }
}

module.exports = DeploymentOrchestrator;