/**
 * Instagram Humanization Engine Configuration
 * Centralized configuration for all anti-detection and human behavior simulation
 */

const humanizationConfig = {
    // Risk Management Settings
    risk: {
        threshold: 0.7,          // Emergency mode trigger (0.0-1.0)
        criticalThreshold: 0.8,  // Critical risk level
        monitoringInterval: 300000, // 5 minutes
        
        // Risk factor weights
        weights: {
            postFrequency: 0.25,
            timingPattern: 0.20,
            contentSimilarity: 0.20,
            hashtagRepetition: 0.20,
            sessionBehavior: 0.15
        },
        
        // Post frequency limits (per hour)
        maxPostsPerHour: {
            normal: 3,
            emergency: 1,
            critical: 0
        }
    },
    
    // Timing Configuration
    timing: {
        // Base delays in minutes
        baseDelay: {
            normal: 15,      // 15 minutes base
            emergency: 30,   // 30 minutes in emergency
            critical: 60     // 1 hour in critical mode
        },
        
        // Variance as percentage of base delay
        variance: 0.5,       // ±50% variance
        
        // Absolute limits in minutes
        minDelay: 5,         // Minimum 5 minutes
        maxDelay: 60,        // Maximum 60 minutes
        
        // Activity hours (24h format)
        activeHours: {
            start: 7,        // 7 AM
            end: 22,         // 10 PM
            peakStart: 8,    // 8 AM
            peakEnd: 12,     // 12 PM
            eveningStart: 18, // 6 PM
            eveningEnd: 22   // 10 PM
        },
        
        // Day preferences (0=Sunday, 6=Saturday)
        dayWeights: {
            0: 0.12, // Sunday
            1: 0.14, // Monday
            2: 0.15, // Tuesday
            3: 0.16, // Wednesday
            4: 0.15, // Thursday
            5: 0.14, // Friday
            6: 0.14  // Saturday
        },
        
        // Hour preferences (0-23)
        hourWeights: {
            0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
            6: 0.05, 7: 0.08, 8: 0.12, 9: 0.10, 10: 0.09, 11: 0.08,
            12: 0.09, 13: 0.07, 14: 0.06, 15: 0.05, 16: 0.06, 17: 0.08,
            18: 0.10, 19: 0.12, 20: 0.15, 21: 0.13, 22: 0.08, 23: 0.04
        }
    },
    
    // Content Variation Settings
    content: {
        // Template rotation history size
        templateHistorySize: 50,
        
        // Minimum time between using same template (minutes)
        templateCooldown: 60,
        
        // Content similarity threshold (0-1)
        similarityThreshold: 0.7,
        
        // Emoji usage probability
        emojiProbability: 0.1,
        
        // Available emojis for variation
        emojis: ['⚠️', '📢', '🚨', '📍', '⭐', '🔔', '💬', '📝'],
        
        // Template pools
        templates: {
            prefixes: [
                "Denúncia cidadã:",
                "Problema identificado:",
                "Situação preocupante:",
                "Necessário atenção:",
                "Questão urgente:",
                "Comunidade relata:",
                "Moradores sinalizam:",
                "Fiscalização necessária:",
                "Questão importante:",
                "Demanda da comunidade:"
            ],
            
            connectors: [
                "foi identificado na região",
                "necessita atenção urgente",
                "requer intervenção imediata",
                "demanda ação dos responsáveis",
                "precisa ser resolvido",
                "está afetando a comunidade",
                "impacta os moradores",
                "gera preocupação local",
                "merece atenção especial",
                "solicita providências"
            ],
            
            callToActions: [
                "Contamos com a atuação dos vereadores para resolver esta questão.",
                "Esperamos providências urgentes dos representantes locais.",
                "A comunidade aguarda ação dos vereadores responsáveis.",
                "É necessária a intervenção dos representantes eleitos.",
                "Solicitamos atenção dos vereadores para esta demanda.",
                "Confiamos na atuação dos nossos representantes.",
                "A população espera medidas efetivas dos vereadores.",
                "Pedimos apoio dos vereadores nesta questão importante.",
                "Esperamos que os representantes tomem conhecimento.",
                "Contamos com o comprometimento dos vereadores eleitos."
            ]
        }
    },
    
    // Hashtag Configuration
    hashtags: {
        // Maximum hashtags per post
        maxHashtags: 15,
        
        // Hashtag rotation history size  
        rotationHistorySize: 200,
        
        // Minimum time between using same hashtag (minutes)
        hashtagCooldown: 30,
        
        // Hashtag pools by category
        pools: {
            base: [
                'DenunciaCidada', 'SaoBernardodoCampo', 'FiscalizacaoCidada',
                'TransparenciaPublica', 'ProblemasUrbanos', 'CidadaniaAtiva',
                'ParticipacaoSocial', 'VozCidada', 'MudancaPositiva',
                'ResponsabilidadeCivica', 'EngajamentoCidadao'
            ],
            
            municipal: [
                'PrefeituraSBC', 'CamaraSBC', 'SaoBernardo', 'ABCSBC',
                'RegionalABC', 'CidadeSBC', 'MunicipioSBC', 'GestaoMunicipal',
                'AdministracaoPublica', 'ServicoPublico'
            ],
            
            problems: [
                'ProblemasUrbanos', 'InfraestruturaSBC', 'ServicosPublicos',
                'ManutencaoUrbana', 'QualidadeVida', 'BemEstarSocial',
                'DesenvolvimentoUrbano', 'GestaoPublica', 'PoliticasPublicas',
                'MelhoriasContinuas'
            ],
            
            community: [
                'ComunidadeSBC', 'MoradoresSBC', 'BairroSeguro',
                'VizinhancaUnida', 'ColetividadeSBC', 'IntegracaoSocial',
                'UniaoCidada', 'ForcaComunitaria', 'SolidariedadeLocal'
            ],
            
            categories: {
                'infraestrutura': ['Infraestrutura', 'ObrasPúblicas', 'ManutençãoUrbana', 'ReformasUrbanas'],
                'segurança': ['SegurançaPública', 'Policiamento', 'SegurançaComunitária', 'Prevenção'],
                'saúde': ['SaúdePública', 'PostoSaúde', 'AtendimentoMédico', 'BemEstar'],
                'educação': ['EducaçãoPública', 'Escola', 'EnsinoQualidade', 'EducaçãoCidadã'],
                'transporte': ['TransportePúblico', 'Mobilidade', 'TrânsitoSBC', 'AcessibilidadeUrbana'],
                'meio-ambiente': ['MeioAmbiente', 'Sustentabilidade', 'LimpezaUrbana', 'PreservaçãoAmbiental']
            }
        },
        
        // Hashtag selection probabilities
        selectionProbabilities: {
            base: { min: 2, max: 3, probability: 1.0 },
            municipal: { min: 1, max: 2, probability: 0.8 },
            problems: { min: 1, max: 2, probability: 0.7 },
            community: { min: 0, max: 1, probability: 0.3 },
            category: { min: 1, max: 2, probability: 0.9 }
        }
    },
    
    // User Agent and Headers
    headers: {
        // User agent pool for rotation
        userAgents: [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36'
        ],
        
        // DNT (Do Not Track) probability
        dntProbability: 0.3,
        
        // Default headers template
        defaults: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
    },
    
    // Engagement Simulation
    engagement: {
        // Probability of simulating engagement
        simulationProbability: 0.2,
        
        // Delay range for engagement (seconds)
        delayRange: {
            min: 10,
            max: 40
        },
        
        // Types of engagement to simulate
        types: ['view', 'like'],
        
        // Skip engagement in emergency mode
        skipInEmergency: true
    },
    
    // Behavior Tracking
    tracking: {
        // Maximum behavior history entries
        maxHistorySize: 1000,
        
        // Data retention period (days)
        retentionDays: 7,
        
        // Cleanup interval (hours)
        cleanupInterval: 24,
        
        // Track these behavior types
        trackTypes: [
            'post', 'post_failed', 'engagement', 
            'login', 'session_start', 'risk_check'
        ]
    },
    
    // Monitoring and Alerting
    monitoring: {
        // Log levels for different risk scores
        logLevels: {
            low: 'info',        // 0.0 - 0.3
            medium: 'warn',     // 0.3 - 0.6
            high: 'error',      // 0.6 - 0.8
            critical: 'error'   // 0.8 - 1.0
        },
        
        // Alert thresholds
        alerts: {
            riskThreshold: 0.6,
            frequencyThreshold: 5,  // posts per hour
            failureThreshold: 3     // consecutive failures
        }
    },
    
    // Development and Testing
    development: {
        // Enable debug logging
        debugMode: process.env.NODE_ENV === 'development',
        
        // Test mode settings
        testMode: process.env.HUMANIZATION_TEST_MODE === 'true',
        
        // Accelerated timing for testing
        acceleratedTiming: false,
        
        // Mock engagement for testing
        mockEngagement: process.env.NODE_ENV === 'test'
    }
};

module.exports = humanizationConfig;