/**
 * Instagram Flow Orchestrator
 * State machine para publicação robusta Instagram via Facebook Pages
 */

const { EventEmitter } = require('events');

class InstagramFlowOrchestrator extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.state = 'idle';
        this.context = {};
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // State machine transitions
        this.transitions = {
            'idle': ['preparing'],
            'preparing': ['publishing', 'failed'],
            'publishing': ['published', 'failed', 'retrying'],
            'published': ['syncing', 'completed'],
            'syncing': ['completed', 'sync_failed'],
            'sync_failed': ['manual_sync_required'],
            'retrying': ['publishing', 'failed'],
            'failed': ['retrying', 'manual_intervention'],
            'manual_intervention': ['preparing'],
            'completed': ['idle']
        };
    }

    async orchestratePublication(message, media = null) {
        console.log('🚀 INICIANDO ORQUESTRAÇÃO DE PUBLICAÇÃO');
        
        try {
            this.context = {
                message,
                media,
                startTime: new Date(),
                attempts: [],
                currentAttempt: 1
            };

            await this.transitionTo('preparing');
            await this.preparePublication();
            
            await this.transitionTo('publishing');
            const result = await this.publishToFacebook();
            
            await this.transitionTo('published');
            
            // Iniciar monitoramento de sincronização
            this.startSyncMonitoring(result.postId);
            
            return result;
            
        } catch (error) {
            console.error('💥 ERRO NA ORQUESTRAÇÃO:', error.message);
            await this.handleError(error);
            throw error;
        }
    }

    async transitionTo(newState) {
        const validTransitions = this.transitions[this.state] || [];
        
        if (!validTransitions.includes(newState)) {
            throw new Error(`Transição inválida: ${this.state} → ${newState}`);
        }
        
        const oldState = this.state;
        this.state = newState;
        
        console.log(`🔄 STATE TRANSITION: ${oldState} → ${newState}`);
        this.emit('stateChange', { from: oldState, to: newState, context: this.context });
        
        // Log attempt
        this.context.attempts.push({
            state: newState,
            timestamp: new Date(),
            attempt: this.context.currentAttempt
        });
    }

    async preparePublication() {
        console.log('📋 PREPARANDO PUBLICAÇÃO...');
        
        // Validar tokens
        await this.validateTokens();
        
        // Validar conteúdo
        await this.validateContent();
        
        // Preparar payload
        this.context.payload = await this.buildPayload();
        
        console.log('✅ PREPARAÇÃO COMPLETA');
    }

    async validateTokens() {
        if (!this.config.pageToken) {
            throw new Error('Page token não configurado');
        }
        
        // Testar validade do token
        try {
            const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${this.config.pageToken}`);
            if (!response.ok) {
                throw new Error('Token inválido');
            }
        } catch (error) {
            throw new Error(`Validação de token falhou: ${error.message}`);
        }
    }

    async validateContent() {
        const { message, media } = this.context;
        
        if (!message || message.trim().length === 0) {
            throw new Error('Mensagem é obrigatória');
        }
        
        if (message.length > 2200) {
            throw new Error('Mensagem muito longa (máximo 2200 caracteres)');
        }
        
        // Validar mídia se presente
        if (media) {
            await this.validateMedia(media);
        }
    }

    async validateMedia(media) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
        const maxSize = 100 * 1024 * 1024; // 100MB
        
        if (!allowedTypes.includes(media.type)) {
            throw new Error(`Tipo de mídia não suportado: ${media.type}`);
        }
        
        if (media.size > maxSize) {
            throw new Error('Mídia muito grande (máximo 100MB)');
        }
    }

    async buildPayload() {
        const { message, media } = this.context;
        
        const payload = {
            message: message,
            access_token: this.config.pageToken
        };
        
        if (media) {
            payload.source = media.buffer;
        }
        
        return payload;
    }

    async publishToFacebook() {
        console.log('📤 PUBLICANDO NO FACEBOOK...');
        
        const endpoint = this.context.media 
            ? `https://graph.facebook.com/v18.0/${this.config.pageId}/photos`
            : `https://graph.facebook.com/v18.0/${this.config.pageId}/feed`;
            
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.context.payload)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Facebook API Error: ${error.error?.message || 'Unknown error'}`);
            }
            
            const result = await response.json();
            
            console.log('✅ PUBLICADO NO FACEBOOK:', result.id);
            
            return {
                postId: result.id,
                platform: 'facebook',
                timestamp: new Date(),
                context: this.context
            };
            
        } catch (error) {
            console.error('❌ FALHA NA PUBLICAÇÃO:', error.message);
            throw error;
        }
    }

    startSyncMonitoring(postId) {
        console.log('🔍 INICIANDO MONITORAMENTO DE SINCRONIZAÇÃO...');
        
        this.transitionTo('syncing');
        
        // Monitorar por 5 minutos
        const maxMonitorTime = 5 * 60 * 1000; // 5 minutos
        const checkInterval = 30 * 1000; // 30 segundos
        
        let elapsed = 0;
        
        const monitor = setInterval(async () => {
            elapsed += checkInterval;
            
            try {
                const synced = await this.checkInstagramSync(postId);
                
                if (synced) {
                    console.log('✅ SINCRONIZAÇÃO CONFIRMADA');
                    clearInterval(monitor);
                    await this.transitionTo('completed');
                    this.emit('syncCompleted', { postId, platform: 'instagram' });
                    return;
                }
                
                if (elapsed >= maxMonitorTime) {
                    console.log('⚠️ TIMEOUT DE SINCRONIZAÇÃO');
                    clearInterval(monitor);
                    await this.transitionTo('sync_failed');
                    this.emit('syncTimeout', { postId });
                }
                
            } catch (error) {
                console.error('❌ ERRO NO MONITORAMENTO:', error.message);
                clearInterval(monitor);
                await this.transitionTo('sync_failed');
                this.emit('syncError', { postId, error: error.message });
            }
        }, checkInterval);
    }

    async checkInstagramSync(postId) {
        // Implementar verificação se o post apareceu no Instagram
        // Por enquanto, assumir que sincronizou após 2 minutos
        return new Promise(resolve => {
            setTimeout(() => resolve(true), 2 * 60 * 1000);
        });
    }

    async handleError(error) {
        console.error('🚨 TRATAMENTO DE ERRO:', error.message);
        
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.context.currentAttempt++;
            
            console.log(`🔄 TENTATIVA ${this.retryCount}/${this.maxRetries}`);
            
            await this.transitionTo('retrying');
            
            // Backoff exponencial
            const delay = Math.pow(2, this.retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
                await this.transitionTo('publishing');
                return await this.publishToFacebook();
            } catch (retryError) {
                return await this.handleError(retryError);
            }
        } else {
            console.log('❌ MÁXIMO DE TENTATIVAS EXCEDIDO');
            await this.transitionTo('failed');
            this.emit('maxRetriesExceeded', { error: error.message, context: this.context });
        }
    }

    getFlowStatus() {
        return {
            state: this.state,
            retryCount: this.retryCount,
            context: this.context,
            uptime: this.context.startTime ? Date.now() - this.context.startTime.getTime() : 0
        };
    }
}

module.exports = InstagramFlowOrchestrator;