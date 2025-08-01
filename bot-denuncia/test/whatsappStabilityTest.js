/**
 * WHATSAPP STABILITY TESTS
 * 
 * Testes de estabilidade e stress para o WhatsApp Stability Engine
 * - Teste de reconexão automática
 * - Teste de resistência a falhas
 * - Teste de queue de mensagens
 * - Teste de circuit breaker
 * - Teste de health monitoring
 * 
 * @author Backend Reliability Engineer
 * @priority CRITICAL - Validation Tests
 */

const { expect } = require('chai');
const sinon = require('sinon');
const logger = require('../src/utils/logger');

// Import components to test
const { 
    WhatsAppStabilityEngine,
    RobustReconnectionManager,
    WhatsAppHealthMonitor,
    SmartRateLimiter,
    ResilientMessageQueue,
    RELIABILITY_CONSTANTS
} = require('../src/services/whatsappStabilityEngine');

describe('WhatsApp Stability Engine Tests', function() {
    this.timeout(30000); // 30 segundos timeout para testes de estabilidade
    
    describe('SmartRateLimiter', function() {
        let rateLimiter;
        
        beforeEach(function() {
            rateLimiter = new SmartRateLimiter();
        });
        
        afterEach(function() {
            rateLimiter.stopTimers();
        });
        
        it('should allow actions within rate limits', function() {
            // Test QR requests
            for (let i = 0; i < RELIABILITY_CONSTANTS.QR_REQUESTS_PER_MINUTE; i++) {
                expect(rateLimiter.isAllowed('qrRequests')).to.be.true;
                rateLimiter.recordAction('qrRequests');
            }
        });
        
        it('should block actions exceeding rate limits', function() {
            // Exceed QR request limit
            for (let i = 0; i < RELIABILITY_CONSTANTS.QR_REQUESTS_PER_MINUTE + 1; i++) {
                rateLimiter.recordAction('qrRequests');
            }
            
            expect(rateLimiter.isAllowed('qrRequests')).to.be.false;
        });
        
        it('should provide accurate time until reset', function() {
            rateLimiter.recordAction('qrRequests');
            const timeUntilReset = rateLimiter.getTimeUntilReset('qrRequests');
            
            expect(timeUntilReset).to.be.a('number');
            expect(timeUntilReset).to.be.greaterThan(0);
        });
    });
    
    describe('RobustReconnectionManager', function() {
        let reconnectionManager;
        
        beforeEach(function() {
            reconnectionManager = new RobustReconnectionManager();
        });
        
        it('should calculate progressive delays', function() {
            const delays = [];
            
            for (let attempt = 1; attempt <= 5; attempt++) {
                const delay = reconnectionManager.calculateDelay(attempt, 'TIMEOUT');
                delays.push(delay);
                expect(delay).to.be.a('number');
                expect(delay).to.be.greaterThan(0);
            }
            
            // Verificar que delays aumentam (com jitter considerado)
            expect(delays[4]).to.be.greaterThan(delays[0]);
        });
        
        it('should respect maximum delay limit', function() {
            const delay = reconnectionManager.calculateDelay(20, 'TIMEOUT');
            expect(delay).to.be.at.most(RELIABILITY_CONSTANTS.MAX_RECONNECT_DELAY);
        });
        
        it('should adjust delays based on reason', function() {
            const authDelay = reconnectionManager.calculateDelay(3, 'AUTH_FAILURE');
            const timeoutDelay = reconnectionManager.calculateDelay(3, 'TIMEOUT');
            
            expect(authDelay).to.be.greaterThan(timeoutDelay);
        });
        
        it('should provide correct reconnection strategies', function() {
            expect(reconnectionManager.getReconnectionStrategy(1)).to.equal('FAST_RETRY');
            expect(reconnectionManager.getReconnectionStrategy(5)).to.equal('EXPONENTIAL_BACKOFF');
            expect(reconnectionManager.getReconnectionStrategy(9)).to.equal('LAST_RESORT');
        });
        
        it('should update circuit breaker correctly', function() {
            // Test circuit breaker opens after failures
            for (let i = 0; i < RELIABILITY_CONSTANTS.CIRCUIT_FAILURE_THRESHOLD; i++) {
                reconnectionManager.updateCircuitBreaker(false);
            }
            
            expect(reconnectionManager.isCircuitOpen).to.be.true;
            expect(reconnectionManager.isOperationAllowed()).to.be.false;
            
            // Test circuit breaker closes on success
            reconnectionManager.updateCircuitBreaker(true);
            expect(reconnectionManager.isCircuitOpen).to.be.false;
        });
    });
    
    describe('ResilientMessageQueue', function() {
        let messageQueue;
        
        beforeEach(function() {
            messageQueue = new ResilientMessageQueue();
        });
        
        afterEach(function() {
            messageQueue.stopProcessing();
            messageQueue.clearQueue();
        });
        
        it('should enqueue messages with correct priority', function() {
            const normalId = messageQueue.enqueue({ content: 'normal' }, 'normal');
            const highId = messageQueue.enqueue({ content: 'high' }, 'high');
            
            expect(normalId).to.be.a('string');
            expect(highId).to.be.a('string');
            expect(messageQueue.getStats().queueLength).to.equal(2);
            
            // High priority should be first
            expect(messageQueue.queue[0].priority).to.equal('high');
        });
        
        it('should process messages and handle retries', function(done) {
            // Mock processMessage to fail once then succeed
            let attemptCount = 0;
            messageQueue.processMessage = async function(item) {
                attemptCount++;
                if (attemptCount === 1) {
                    throw new Error('Simulated failure');
                }
                return true;
            };
            
            messageQueue.on('message_processed', (item) => {
                expect(item.attempts).to.equal(2);
                done();
            });
            
            messageQueue.enqueue({ content: 'retry test' }, 'normal');
        });
        
        it('should handle permanent failures', function(done) {
            // Mock processMessage to always fail
            messageQueue.processMessage = async function(item) {
                throw new Error('Permanent failure');
            };
            
            messageQueue.on('message_failed', (item) => {
                expect(item.attempts).to.equal(messageQueue.maxRetries);
                expect(item.status).to.equal('failed');
                done();
            });
            
            messageQueue.enqueue({ content: 'failure test' }, 'normal');
        });
        
        it('should provide accurate statistics', function() {
            messageQueue.enqueue({ content: 'test1' }, 'normal');
            messageQueue.enqueue({ content: 'test2' }, 'high');
            
            const stats = messageQueue.getStats();
            expect(stats.queueLength).to.equal(2);
            expect(stats.retryQueueLength).to.equal(0);
            expect(stats.processing).to.be.a('boolean');
        });
    });
    
    describe('WhatsAppHealthMonitor', function() {
        let healthMonitor;
        let mockClient;
        
        beforeEach(function() {
            mockClient = {
                getState: sinon.stub(),
                info: { wid: { user: 'test' }, platform: 'web' }
            };
            
            healthMonitor = new WhatsAppHealthMonitor(mockClient);
        });
        
        afterEach(function() {
            healthMonitor.stopMonitoring();
        });
        
        it('should start and stop monitoring', async function() {
            expect(healthMonitor.isMonitoring).to.be.false;
            
            await healthMonitor.startMonitoring();
            expect(healthMonitor.isMonitoring).to.be.true;
            
            healthMonitor.stopMonitoring();
            expect(healthMonitor.isMonitoring).to.be.false;
        });
        
        it('should perform health checks', async function() {
            mockClient.getState.resolves('CONNECTED');
            
            const result = await healthMonitor.performHealthCheck();
            
            expect(result).to.have.property('healthy', true);
            expect(result).to.have.property('state', 'CONNECTED');
            expect(result).to.have.property('responseTime');
            expect(result.responseTime).to.be.a('number');
        });
        
        it('should detect unhealthy states', async function() {
            mockClient.getState.resolves('DISCONNECTED');
            
            const result = await healthMonitor.performHealthCheck();
            
            expect(result).to.have.property('healthy', false);
            expect(result).to.have.property('error');
        });
        
        it('should handle health check timeouts', async function() {
            mockClient.getState.returns(new Promise(() => {})); // Never resolves
            
            const result = await healthMonitor.performHealthCheck();
            
            expect(result).to.have.property('healthy', false);
            expect(result.error).to.include('timeout');
        });
        
        it('should track message flow health', function() {
            const oldTime = Date.now() - (15 * 60 * 1000); // 15 minutes ago
            healthMonitor.lastSuccessfulMessage = oldTime;
            
            healthMonitor.on('message_flow_warning', (data) => {
                expect(data.timeSinceLastMessage).to.be.greaterThan(10);
            });
            
            // Trigger health check que deve emitir warning
            healthMonitor.performHealthCheck();
        });
    });
    
    describe('WhatsAppStabilityEngine', function() {
        let stabilityEngine;
        let mockWhatsAppService;
        
        beforeEach(function() {
            mockWhatsAppService = {
                client: null,
                isConnected: false,
                isConnecting: false,
                initialize: sinon.stub(),
                disconnect: sinon.stub(),
                handleMessage: sinon.stub(),
                quickHealthCheck: sinon.stub(),
                attemptReconnect: sinon.stub()
            };
            
            stabilityEngine = new WhatsAppStabilityEngine(mockWhatsAppService);
        });
        
        afterEach(async function() {
            if (stabilityEngine.isEngineActive) {
                await stabilityEngine.shutdown();
            }
        });
        
        it('should initialize successfully', async function() {
            await stabilityEngine.initialize();
            
            expect(stabilityEngine.isEngineActive).to.be.true;
            expect(stabilityEngine.engineStats.startTime).to.be.a('number');
        });
        
        it('should integrate with WhatsApp service methods', async function() {
            await stabilityEngine.initialize();
            
            // Verificar se métodos foram substituídos
            expect(mockWhatsAppService.initialize).to.not.equal(stabilityEngine.whatsappService.initialize);
            expect(mockWhatsAppService.handleMessage).to.not.equal(stabilityEngine.whatsappService.handleMessage);
        });
        
        it('should provide comprehensive statistics', async function() {
            await stabilityEngine.initialize();
            
            const stats = stabilityEngine.getEngineStats();
            
            expect(stats).to.have.property('engine');
            expect(stats).to.have.property('rateLimiter');
            expect(stats).to.have.property('circuitBreaker');
            expect(stats).to.have.property('messageQueue');
            expect(stats).to.have.property('reconnectionManager');
            
            expect(stats.engine.active).to.be.true;
            expect(stats.engine.uptime).to.be.a('number');
        });
        
        it('should handle forced reconnections', async function() {
            await stabilityEngine.initialize();
            
            const result = await stabilityEngine.forceReconnectWithStability('TEST');
            
            expect(result).to.have.property('success', true);
            expect(result.message).to.include('Stability reconnection initiated');
        });
        
        it('should shutdown gracefully', async function() {
            await stabilityEngine.initialize();
            expect(stabilityEngine.isEngineActive).to.be.true;
            
            await stabilityEngine.shutdown();
            expect(stabilityEngine.isEngineActive).to.be.false;
        });
    });
    
    describe('Integration Tests', function() {
        it('should handle complete failure and recovery scenario', function(done) {
            this.timeout(10000);
            
            const reconnectionManager = new RobustReconnectionManager();
            let failureCount = 0;
            
            // Simular falhas consecutivas seguidas de sucesso
            reconnectionManager.on('circuit_opened', () => {
                expect(reconnectionManager.isCircuitOpen).to.be.true;
                
                // Simular recuperação após circuito aberto
                setTimeout(() => {
                    reconnectionManager.updateCircuitBreaker(true);
                    expect(reconnectionManager.isCircuitOpen).to.be.false;
                    done();
                }, 1000);
            });
            
            // Trigger failures to open circuit
            for (let i = 0; i < RELIABILITY_CONSTANTS.CIRCUIT_FAILURE_THRESHOLD; i++) {
                reconnectionManager.updateCircuitBreaker(false);
            }
        });
        
        it('should coordinate all components properly', async function() {
            const rateLimiter = new SmartRateLimiter();
            const messageQueue = new ResilientMessageQueue();
            const reconnectionManager = new RobustReconnectionManager();
            
            // Verificar coordenação entre componentes
            expect(rateLimiter.isAllowed('messages')).to.be.true;
            expect(messageQueue.getStats().queueLength).to.equal(0);
            expect(reconnectionManager.isOperationAllowed()).to.be.true;
            
            // Simular carga de trabalho
            messageQueue.enqueue({ content: 'test' }, 'high');
            rateLimiter.recordAction('messages');
            
            expect(messageQueue.getStats().queueLength).to.equal(1);
            
            // Cleanup
            messageQueue.stopProcessing();
            rateLimiter.stopTimers();
        });
    });
    
    describe('Performance Tests', function() {
        it('should handle high message throughput', function(done) {
            this.timeout(5000);
            
            const messageQueue = new ResilientMessageQueue();
            const messageCount = 100;
            let processedCount = 0;
            
            messageQueue.processMessage = async function(item) {
                return new Promise(resolve => {
                    setTimeout(() => {
                        processedCount++;
                        if (processedCount === messageCount) {
                            expect(processedCount).to.equal(messageCount);
                            messageQueue.stopProcessing();
                            done();
                        }
                        resolve(true);
                    }, 10);
                });
            };
            
            // Enqueue many messages
            for (let i = 0; i < messageCount; i++) {
                messageQueue.enqueue({ content: `message-${i}` }, 'normal');
            }
        });
        
        it('should maintain performance under circuit breaker stress', function() {
            const reconnectionManager = new RobustReconnectionManager();
            const startTime = Date.now();
            
            // Simular muitas operações de circuit breaker
            for (let i = 0; i < 1000; i++) {
                reconnectionManager.updateCircuitBreaker(i % 10 !== 0); // 10% failure rate
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete in reasonable time (< 100ms)
            expect(duration).to.be.lessThan(100);
        });
    });
});

/**
 * STRESS TESTS - Execute separately for load testing
 */
describe('WhatsApp Stress Tests', function() {
    this.timeout(60000); // 1 minute for stress tests
    
    // Apenas rodar stress tests se variável de ambiente estiver definida
    const runStressTests = process.env.RUN_STRESS_TESTS === 'true';
    
    (runStressTests ? it : it.skip)('should handle sustained reconnection attempts', function(done) {
        const reconnectionManager = new RobustReconnectionManager();
        let reconnectCount = 0;
        const maxReconnects = 50;
        
        const attemptReconnection = () => {
            if (reconnectCount >= maxReconnects) {
                expect(reconnectCount).to.equal(maxReconnects);
                done();
                return;
            }
            
            reconnectCount++;
            const delay = reconnectionManager.calculateDelay(reconnectCount, 'STRESS_TEST');
            
            setTimeout(() => {
                attemptReconnection();
            }, Math.min(delay, 100)); // Cap delay for stress test
        };
        
        attemptReconnection();
    });
    
    (runStressTests ? it : it.skip)('should handle message queue under extreme load', function(done) {
        const messageQueue = new ResilientMessageQueue();
        const messageCount = 1000;
        let processedCount = 0;
        
        messageQueue.processMessage = async function(item) {
            processedCount++;
            if (processedCount === messageCount) {
                expect(processedCount).to.equal(messageCount);
                messageQueue.stopProcessing();
                done();
            }
            return true;
        };
        
        // Flood with messages
        for (let i = 0; i < messageCount; i++) {
            messageQueue.enqueue({ content: `stress-${i}` }, i % 5 === 0 ? 'high' : 'normal');
        }
    });
});

module.exports = {
    // Export test utilities if needed
};