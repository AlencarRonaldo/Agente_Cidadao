const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

// Mock data por enquanto - pode ser substituído por dados reais do sistema
const getSystemMetrics = () => {
  return {
    instagram: {
      connected: true,
      posts_today: 4,
      limit: 4,
      account: 'vozdopovobot'
    },
    queue: {
      waiting: 2,
      processing: 0,
      completed: 15,
      failed: 0
    },
    system: {
      uptime: process.uptime(),
      memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      cpu: `${Math.round(Math.random() * 20 + 10)}%` // Mock CPU usage
    },
    publications: {
      success_rate: 0.95,
      avg_time: 12.5,
      total_today: 4,
      total_week: 28
    },
    errors: {
      total: 3,
      instagram: 1,
      network: 2,
      auth: 0
    }
  };
};

// GET /api/monitoring/status - Status geral do sistema
router.get('/status', requireAuth, async (req, res) => {
  try {
    logger.info('[MONITORING] Status request from user:', req.user.id);
    
    const metrics = getSystemMetrics();
    
    res.json(metrics);
  } catch (error) {
    logger.error('[MONITORING] Error getting status:', error);
    res.status(500).json({ 
      error: 'Erro ao obter status do sistema',
      details: error.message 
    });
  }
});

// GET /api/monitoring/metrics - Métricas detalhadas
router.get('/metrics', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    // Mock de métricas detalhadas
    const detailedMetrics = {
      period,
      publications: {
        success_rate: 0.95,
        avg_time: 12.5,
        by_hour: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: Math.floor(Math.random() * 5)
        }))
      },
      errors: {
        total: 15,
        by_type: {
          instagram_api: 5,
          network_timeout: 3,
          image_processing: 2,
          rate_limit: 5
        }
      },
      performance: {
        response_time: 245,
        throughput: 8.2,
        queue_depth: 2
      }
    };
    
    res.json(detailedMetrics);
  } catch (error) {
    logger.error('[MONITORING] Error getting metrics:', error);
    res.status(500).json({ 
      error: 'Erro ao obter métricas',
      details: error.message 
    });
  }
});

// GET /api/monitoring/queue - Status da fila de publicação
router.get('/queue', requireAuth, async (req, res) => {
  try {
    // Mock de fila de publicação
    const queueStatus = {
      scheduled: [
        {
          id: 'den-123',
          protocol: 'DEN-TEST-123',
          scheduled_for: new Date(Date.now() + 3600000).toISOString(), // 1 hora
          position: 1,
          priority: 'high'
        },
        {
          id: 'den-124',
          protocol: 'DEN-TEST-124',
          scheduled_for: new Date(Date.now() + 7200000).toISOString(), // 2 horas
          position: 2,
          priority: 'normal'
        }
      ],
      processing: [],
      completed_today: 15,
      failed_today: 1
    };
    
    res.json(queueStatus);
  } catch (error) {
    logger.error('[MONITORING] Error getting queue status:', error);
    res.status(500).json({ 
      error: 'Erro ao obter status da fila',
      details: error.message 
    });
  }
});

// GET /api/monitoring/alerts - Alertas ativos
router.get('/alerts', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    // Mock de alertas
    const alerts = [
      {
        id: 'alert-1',
        type: 'warning',
        title: 'Limite diário próximo',
        message: 'Apenas 1 publicação restante para hoje',
        timestamp: new Date().toISOString(),
        acknowledged: false
      }
    ];
    
    res.json({ alerts });
  } catch (error) {
    logger.error('[MONITORING] Error getting alerts:', error);
    res.status(500).json({ 
      error: 'Erro ao obter alertas',
      details: error.message 
    });
  }
});

// POST /api/monitoring/alerts/:id/acknowledge - Reconhecer alerta
router.post('/alerts/:id/acknowledge', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`[MONITORING] Alert ${id} acknowledged by user:`, req.user.id);
    
    res.json({ 
      success: true, 
      message: 'Alerta reconhecido com sucesso' 
    });
  } catch (error) {
    logger.error('[MONITORING] Error acknowledging alert:', error);
    res.status(500).json({ 
      error: 'Erro ao reconhecer alerta',
      details: error.message 
    });
  }
});

module.exports = router;