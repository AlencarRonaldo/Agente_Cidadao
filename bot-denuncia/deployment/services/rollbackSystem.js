/**
 * Sistema de Rollback Automático
 * Implementa rollback inteligente com validação de saúde
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class RollbackSystem {
    constructor(config = {}) {
        this.config = {
            healthCheckUrl: config.healthCheckUrl || 'http://localhost:3001/health/deployment',
            healthCheckInterval: config.healthCheckInterval || 30000, // 30s
            rollbackThreshold: config.rollbackThreshold || 3, // falhas consecutivas
            rollbackCooldown: config.rollbackCooldown || 300000, // 5 min
            maxRollbackAttempts: config.maxRollbackAttempts || 3,
            ...config
        };
        
        this.state = {
            currentEnvironment: 'blue',
            lastDeployment: null,
            rollbackHistory: [],
            healthFailures: 0,
            lastHealthCheck: null,
            rollbackInProgress: false,
            lastRollbackTime: null
        };
        
        this.deploymentHistory = [];
        this.healthCheckTimer = null;
        
        this.initializeState();
    }
    
    /**
     * Inicializa o estado do sistema
     */
    async initializeState() {
        try {
            // Carrega estado persistido
            await this.loadState();
            
            // Detecta ambiente ativo atual
            await this.detectActiveEnvironment();
            
            // Inicia monitoramento contínuo
            this.startHealthMonitoring();
            
            console.log('Rollback system initialized', {
                currentEnvironment: this.state.currentEnvironment,
                config: this.config
            });
            
        } catch (error) {
            console.error('Failed to initialize rollback system:', error);
        }
    }
    
    /**
     * Detecta qual ambiente está ativo
     */
    async detectActiveEnvironment() {
        try {
            // Verifica nginx upstream configuration
            const nginxConfig = await this.getNginxUpstreamConfig();
            this.state.currentEnvironment = nginxConfig.activeEnvironment;
            
        } catch (error) {
            console.warn('Could not detect active environment, defaulting to blue');
            this.state.currentEnvironment = 'blue';
        }
    }
    
    /**
     * Registra um novo deployment
     */
    async registerDeployment(deploymentInfo) {
        const deployment = {
            id: deploymentInfo.id || `deploy_${Date.now()}`,
            environment: deploymentInfo.environment,
            version: deploymentInfo.version,
            timestamp: new Date().toISOString(),
            previousEnvironment: this.state.currentEnvironment,
            rollbackData: deploymentInfo.rollbackData || {},
            healthValidation: {
                required: true,
                passed: false,
                attempts: 0
            }
        };
        
        this.deploymentHistory.unshift(deployment);
        this.state.lastDeployment = deployment;
        
        // Mantém apenas os últimos 10 deployments
        if (this.deploymentHistory.length > 10) {
            this.deploymentHistory = this.deploymentHistory.slice(0, 10);
        }
        
        await this.saveState();
        
        console.log('Deployment registered:', {
            id: deployment.id,
            environment: deployment.environment,
            version: deployment.version
        });
        
        return deployment;
    }
    
    /**
     * Valida o deployment atual
     */
    async validateDeployment(deploymentId) {
        const deployment = this.deploymentHistory.find(d => d.id === deploymentId);
        
        if (!deployment) {
            throw new Error(`Deployment ${deploymentId} not found`);
        }
        
        const validationResult = {
            deploymentId,
            timestamp: new Date().toISOString(),
            checks: {},
            passed: false,
            details: {}
        };
        
        try {
            // Executa verificações de saúde
            const healthCheck = await this.performHealthCheck();
            validationResult.checks.health = healthCheck;
            
            // Verifica métricas de performance
            const performanceCheck = await this.performPerformanceCheck();
            validationResult.checks.performance = performanceCheck;
            
            // Verifica conectividade dos serviços
            const servicesCheck = await this.performServicesCheck();
            validationResult.checks.services = servicesCheck;
            
            // Determina se a validação passou
            validationResult.passed = (
                healthCheck.status === 'healthy' &&
                performanceCheck.passed &&
                servicesCheck.passed
            );
            
            // Atualiza deployment
            deployment.healthValidation.passed = validationResult.passed;
            deployment.healthValidation.attempts++;
            deployment.healthValidation.lastCheck = validationResult.timestamp;
            
            if (validationResult.passed) {
                this.state.healthFailures = 0;
                console.log('Deployment validation passed:', deploymentId);
            } else {
                this.state.healthFailures++;
                console.warn('Deployment validation failed:', {
                    deploymentId,
                    failures: this.state.healthFailures,
                    threshold: this.config.rollbackThreshold
                });
                
                // Verifica se deve executar rollback automático
                if (this.state.healthFailures >= this.config.rollbackThreshold) {
                    await this.triggerAutomaticRollback('health_validation_failed');
                }
            }
            
            await this.saveState();
            return validationResult;
            
        } catch (error) {
            validationResult.error = error.message;
            console.error('Deployment validation error:', error);
            
            this.state.healthFailures++;
            await this.saveState();
            
            throw error;
        }
    }
    
    /**
     * Executa rollback automático
     */
    async triggerAutomaticRollback(reason) {
        if (this.state.rollbackInProgress) {
            console.warn('Rollback already in progress, skipping');
            return false;
        }
        
        // Verifica cooldown
        const now = Date.now();
        if (this.state.lastRollbackTime && 
            (now - this.state.lastRollbackTime) < this.config.rollbackCooldown) {
            console.warn('Rollback cooldown active, skipping automatic rollback');
            return false;
        }
        
        // Verifica limite de tentativas
        const recentRollbacks = this.state.rollbackHistory.filter(
            r => (now - new Date(r.timestamp).getTime()) < 3600000 // 1 hora
        );
        
        if (recentRollbacks.length >= this.config.maxRollbackAttempts) {
            console.error('Max rollback attempts reached, manual intervention required');
            await this.sendAlert('max_rollback_attempts_reached', {
                reason,
                recentRollbacks: recentRollbacks.length
            });
            return false;
        }
        
        this.state.rollbackInProgress = true;
        
        try {
            console.log('Triggering automatic rollback:', reason);
            
            const rollbackResult = await this.executeRollback({
                reason,
                automatic: true,
                timestamp: new Date().toISOString()
            });
            
            this.state.rollbackHistory.unshift(rollbackResult);
            this.state.lastRollbackTime = now;
            this.state.healthFailures = 0;
            
            await this.saveState();
            
            console.log('Automatic rollback completed:', rollbackResult.id);
            
            await this.sendAlert('rollback_completed', rollbackResult);
            
            return true;
            
        } catch (error) {
            console.error('Automatic rollback failed:', error);
            
            await this.sendAlert('rollback_failed', {
                reason,
                error: error.message
            });
            
            throw error;
            
        } finally {
            this.state.rollbackInProgress = false;
        }
    }
    
    /**
     * Executa o rollback propriamente dito
     */
    async executeRollback(rollbackInfo) {
        const rollback = {
            id: `rollback_${Date.now()}`,
            timestamp: rollbackInfo.timestamp,
            reason: rollbackInfo.reason,
            automatic: rollbackInfo.automatic || false,
            fromEnvironment: this.state.currentEnvironment,
            toEnvironment: this.state.currentEnvironment === 'blue' ? 'green' : 'blue',
            steps: [],
            status: 'in_progress'
        };
        
        try {
            // Passo 1: Validar ambiente de destino
            rollback.steps.push(await this.validateTargetEnvironment(rollback.toEnvironment));
            
            // Passo 2: Preparar ambiente de destino
            rollback.steps.push(await this.prepareTargetEnvironment(rollback.toEnvironment));
            
            // Passo 3: Executar switch de ambiente
            rollback.steps.push(await this.switchEnvironment(rollback.toEnvironment));
            
            // Passo 4: Validar switch
            rollback.steps.push(await this.validateEnvironmentSwitch(rollback.toEnvironment));
            
            // Passo 5: Cleanup
            rollback.steps.push(await this.cleanupAfterRollback(rollback.fromEnvironment));
            
            rollback.status = 'completed';
            this.state.currentEnvironment = rollback.toEnvironment;
            
            return rollback;
            
        } catch (error) {
            rollback.status = 'failed';
            rollback.error = error.message;
            rollback.steps.push({
                name: 'rollback_failed',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }
    
    /**
     * Valida se o ambiente de destino está saudável
     */
    async validateTargetEnvironment(environment) {
        const step = {
            name: 'validate_target_environment',
            environment,
            status: 'in_progress',
            timestamp: new Date().toISOString()
        };
        
        try {
            const healthUrl = `http://app-${environment}:3001/health/deployment`;
            const response = await axios.get(healthUrl, { timeout: 10000 });
            
            if (response.data.readyForProduction) {
                step.status = 'completed';
                step.message = 'Target environment is healthy';
            } else {
                throw new Error('Target environment is not ready for production');
            }
            
        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw error;
        }
        
        return step;
    }
    
    /**
     * Prepara o ambiente de destino
     */
    async prepareTargetEnvironment(environment) {
        const step = {
            name: 'prepare_target_environment',
            environment,
            status: 'in_progress',
            timestamp: new Date().toISOString()
        };
        
        try {
            // Aqui você adicionaria preparação específica se necessária
            // Por exemplo: limpar caches, resetar conexões, etc.
            
            step.status = 'completed';
            step.message = 'Target environment prepared';
            
        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw error;
        }
        
        return step;
    }
    
    /**
     * Executa o switch de ambiente
     */
    async switchEnvironment(targetEnvironment) {
        const step = {
            name: 'switch_environment',
            targetEnvironment,
            status: 'in_progress',
            timestamp: new Date().toISOString()
        };
        
        try {
            // Atualiza configuração do nginx
            await this.updateNginxUpstream(targetEnvironment);
            
            // Recarrega nginx
            await this.reloadNginx();
            
            step.status = 'completed';
            step.message = `Environment switched to ${targetEnvironment}`;
            
        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw error;
        }
        
        return step;
    }
    
    /**
     * Valida se o switch foi bem-sucedido
     */
    async validateEnvironmentSwitch(targetEnvironment) {
        const step = {
            name: 'validate_environment_switch',
            targetEnvironment,
            status: 'in_progress',
            timestamp: new Date().toISOString()
        };
        
        try {
            // Espera um pouco para o switch tomar efeito
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Verifica se o ambiente está respondendo
            const healthCheck = await this.performHealthCheck();
            
            if (healthCheck.status === 'healthy') {
                step.status = 'completed';
                step.message = 'Environment switch validated successfully';
            } else {
                throw new Error('Environment switch validation failed');
            }
            
        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            throw error;
        }
        
        return step;
    }
    
    /**
     * Cleanup após rollback
     */
    async cleanupAfterRollback(previousEnvironment) {
        const step = {
            name: 'cleanup_after_rollback',
            previousEnvironment,
            status: 'in_progress',
            timestamp: new Date().toISOString()
        };
        
        try {
            // Cleanup específico pode ser adicionado aqui
            // Por exemplo: limpar logs, resetar métricas, etc.
            
            step.status = 'completed';
            step.message = 'Cleanup completed';
            
        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            // Não falha o rollback por causa do cleanup
        }
        
        return step;
    }
    
    /**
     * Monitoramento contínuo de saúde
     */
    startHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        
        this.healthCheckTimer = setInterval(async () => {
            try {
                if (this.state.rollbackInProgress) {
                    return; // Pula verificação durante rollback
                }
                
                const healthResult = await this.performHealthCheck();
                this.state.lastHealthCheck = {
                    timestamp: new Date().toISOString(),
                    status: healthResult.status
                };
                
                if (healthResult.status !== 'healthy') {
                    this.state.healthFailures++;
                    
                    if (this.state.healthFailures >= this.config.rollbackThreshold) {
                        await this.triggerAutomaticRollback('continuous_health_monitoring');
                    }
                } else {
                    this.state.healthFailures = 0;
                }
                
            } catch (error) {
                console.error('Health monitoring error:', error);
                this.state.healthFailures++;
            }
        }, this.config.healthCheckInterval);
    }
    
    /**
     * Para o monitoramento de saúde
     */
    stopHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
    
    /**
     * Utilitários
     */
    async performHealthCheck() {
        const response = await axios.get(this.config.healthCheckUrl, {
            timeout: 10000,
            validateStatus: () => true
        });
        
        return response.data;
    }
    
    async performPerformanceCheck() {
        // Implementar verificações de performance
        return { passed: true, metrics: {} };
    }
    
    async performServicesCheck() {
        // Implementar verificações de serviços
        return { passed: true, services: {} };
    }
    
    async getNginxUpstreamConfig() {
        // Implementar leitura da configuração do nginx
        return { activeEnvironment: 'blue' };
    }
    
    async updateNginxUpstream(environment) {
        // Implementar atualização da configuração do nginx
        console.log(`Updating nginx upstream to ${environment}`);
    }
    
    async reloadNginx() {
        // Implementar reload do nginx
        console.log('Reloading nginx configuration');
    }
    
    async sendAlert(type, data) {
        // Implementar sistema de alertas
        console.log(`ALERT [${type}]:`, data);
    }
    
    async loadState() {
        try {
            const statePath = path.join(process.cwd(), 'deployment', 'state', 'rollback-state.json');
            const stateData = await fs.readFile(statePath, 'utf8');
            const savedState = JSON.parse(stateData);
            
            this.state = { ...this.state, ...savedState };
            this.deploymentHistory = savedState.deploymentHistory || [];
            
        } catch (error) {
            console.warn('Could not load rollback state, using defaults');
        }
    }
    
    async saveState() {
        try {
            const statePath = path.join(process.cwd(), 'deployment', 'state', 'rollback-state.json');
            const stateDir = path.dirname(statePath);
            
            await fs.mkdir(stateDir, { recursive: true });
            
            const stateData = {
                ...this.state,
                deploymentHistory: this.deploymentHistory
            };
            
            await fs.writeFile(statePath, JSON.stringify(stateData, null, 2));
            
        } catch (error) {
            console.error('Could not save rollback state:', error);
        }
    }
    
    /**
     * API para integração externa
     */
    getStatus() {
        return {
            currentEnvironment: this.state.currentEnvironment,
            rollbackInProgress: this.state.rollbackInProgress,
            healthFailures: this.state.healthFailures,
            lastHealthCheck: this.state.lastHealthCheck,
            lastRollbackTime: this.state.lastRollbackTime,
            deploymentHistory: this.deploymentHistory.slice(0, 5),
            rollbackHistory: this.state.rollbackHistory.slice(0, 5)
        };
    }
    
    async manualRollback(reason) {
        return await this.triggerAutomaticRollback(`manual: ${reason}`);
    }
    
    async cleanup() {
        this.stopHealthMonitoring();
        await this.saveState();
    }
}

module.exports = RollbackSystem;