const prisma = require('../config/database');
const logger = require('../utils/logger');
const { addPublishJob } = require('../workers/publishWorker');
const instagramService = require('../services/instagramService');

class AdminController {
  // Dashboard: Estatísticas gerais
  async getDashboard(req, res) {
    try {
      logger.info('Iniciando busca do dashboard');
      
      // Buscar dados reais do banco
      const [
        totalDenuncias,
        denunciasPendentes,
        denunciasPublicadas,
        denunciasAgendadas,
        topBairros,
        statusDistribuicao,
        agendaPostagens
      ] = await Promise.all([
        // Total de denúncias
        prisma.denuncia.count(),
        
        // Denúncias pendentes
        prisma.denuncia.count({ 
          where: { status: 'PENDENTE_MODERACAO' } 
        }),
        
        // Denúncias publicadas
        prisma.denuncia.count({ 
          where: { status: 'PUBLICADA' } 
        }),
        
        // Denúncias agendadas
        prisma.denuncia.count({ 
          where: { status: 'AGENDADA' } 
        }),
        
        // Top bairros
        prisma.denuncia.groupBy({
          by: ['bairro'],
          _count: { bairro: true },
          orderBy: { _count: { bairro: 'desc' } },
          take: 5
        }),
        
        // Distribuição por status
        prisma.denuncia.groupBy({
          by: ['status'],
          _count: { status: true },
          orderBy: { _count: { status: 'desc' } }
        }),
        
        // Agenda de postagens (próximas 10)
        prisma.denuncia.findMany({
          where: {
            status: 'AGENDADA',
            scheduledPublishAt: {
              gte: new Date()
            }
          },
          select: {
            id: true,
            protocolo: true,
            texto: true,
            bairro: true,
            scheduledPublishAt: true,
            priority: true,
            createdAt: true
          },
          orderBy: {
            scheduledPublishAt: 'asc'
          },
          take: 10
        })
      ]);

      // Calcular taxa de aprovação automática
      const aprovacaoAutomatica = totalDenuncias > 0 
        ? Math.round((denunciasPublicadas / totalDenuncias) * 100) 
        : 0;

      // Formatar top bairros
      const topBairrosFormatted = topBairros.map(item => ({
        bairro: item.bairro,
        count: item._count.bairro
      }));

      // Formatar distribuição de status
      const statusDistribuicaoFormatted = statusDistribuicao.map(item => ({
        status: item.status,
        count: item._count.status
      }));

      logger.info(`Dashboard carregado: ${totalDenuncias} denúncias total`);

      res.json({
        success: true,
        message: 'Dashboard carregado com sucesso',
        data: {
          resumo: {
            totalDenuncias,
            denunciasPendentes,
            denunciasPublicadas,
            denunciasAgendadas,
            aprovacaoAutomatica: `${aprovacaoAutomatica}%`
          },
          topBairros: topBairrosFormatted,
          statusDistribuicao: statusDistribuicaoFormatted,
          agendaPostagens: agendaPostagens.map(post => ({
            id: post.id,
            protocolo: post.protocolo,
            texto: post.texto.substring(0, 100) + (post.texto.length > 100 ? '...' : ''),
            bairro: post.bairro,
            scheduledPublishAt: post.scheduledPublishAt,
            priority: post.priority,
            createdAt: post.createdAt
          })),
          filaPublicacao: { 
            waiting: denunciasAgendadas, 
            active: 0, 
            completed: denunciasPublicadas, 
            failed: 0 
          }
        }
      });

    } catch (error) {
      logger.error('Erro ao buscar dashboard:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'DASHBOARD_ERROR',
        details: error.message
      });
    }
  }

  // Listar denúncias com filtros e paginação
  async listarDenuncias(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        bairro,
        dataInicio,
        dataFim,
        search,
        orderBy = 'createdAt',
        order = 'desc'
      } = req.query;

      // Construir filtros
      const where = {};

      if (status) where.status = status;
      if (bairro) where.bairro = { contains: bairro, mode: 'insensitive' };
      
      if (dataInicio || dataFim) {
        where.createdAt = {};
        if (dataInicio) where.createdAt.gte = new Date(dataInicio);
        if (dataFim) where.createdAt.lte = new Date(dataFim);
      }

      if (search) {
        where.OR = [
          { texto: { contains: search, mode: 'insensitive' } },
          { protocolo: { contains: search, mode: 'insensitive' } },
          { bairro: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Validar ordenação
      const validOrderBy = ['createdAt', 'status', 'bairro', 'scoreBot', 'protocolo'];
      const validOrder = ['asc', 'desc'];
      
      const finalOrderBy = validOrderBy.includes(orderBy) ? orderBy : 'createdAt';
      const finalOrder = validOrder.includes(order) ? order : 'desc';

      // Paginação
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Buscar denúncias
      const [denuncias, total] = await Promise.all([
        prisma.denuncia.findMany({
          where,
          orderBy: { [finalOrderBy]: finalOrder },
          skip,
          take,
          select: {
            id: true,
            protocolo: true,
            texto: true,
            textoFiltrado: true,
            endereco: true,
            bairro: true,
            imagemUrl: true,
            status: true,
            vereadores: true,
            scoreBot: true,
            aprovadaBot: true,
            aprovadaAdmin: true,
            motivoRejeicaoBot: true,
            motivoRejeicaoAdmin: true,
            editadaPorAdmin: true,
            observacoesAdmin: true,
            createdAt: true,
            processedAt: true,
            reviewedAt: true,
            publishedAt: true,
            phoneNumber: true,
            adminUserId: true,
            // Novos campos de publicação
            scheduledPublishAt: true,
            priority: true,
            instagramPostId: true,
            publishAttempts: true
          }
        }),
        prisma.denuncia.count({ where })
      ]);

      // Calcular metadata de paginação
      const totalPages = Math.ceil(total / take);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      res.json({
        success: true,
        data: denuncias,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages,
          hasNext,
          hasPrev
        },
        filters: {
          status,
          bairro,
          dataInicio,
          dataFim,
          search,
          orderBy: finalOrderBy,
          order: finalOrder
        }
      });

    } catch (error) {
      logger.error('Erro ao listar denúncias:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'LIST_ERROR'
      });
    }
  }

  // Buscar denúncia específica
  async obterDenuncia(req, res) {
    try {
      const { id } = req.params;

      const denuncia = await prisma.denuncia.findUnique({
        where: { id },
        include: {
          adminUser: {
            select: {
              id: true,
              nome: true,
              email: true
            }
          }
        }
      });

      if (!denuncia) {
        return res.status(404).json({
          error: 'Denúncia não encontrada',
          code: 'DENUNCIA_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: denuncia
      });

    } catch (error) {
      logger.error('Erro ao buscar denúncia:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'FETCH_ERROR'
      });
    }
  }

  // Aprovar denúncia
  async aprovarDenuncia(req, res) {
    try {
      const { id } = req.params;
      const { observacoes } = req.body;
      const adminUserId = req.user.id;

      // Verificar se denúncia existe e pode ser aprovada
      const denuncia = await prisma.denuncia.findUnique({
        where: { id }
      });

      if (!denuncia) {
        return res.status(404).json({
          error: 'Denúncia não encontrada',
          code: 'DENUNCIA_NOT_FOUND'
        });
      }

      if (!['PENDENTE_MODERACAO', 'RECEBIDA', 'PROCESSANDO'].includes(denuncia.status)) {
        return res.status(400).json({
          error: 'Denúncia não pode ser aprovada neste status',
          code: 'INVALID_STATUS_FOR_APPROVAL'
        });
      }

      // Atualizar denúncia
      const denunciaAtualizada = await prisma.denuncia.update({
        where: { id },
        data: {
          status: 'APROVADA_ADMIN',
          aprovadaAdmin: true,
          observacoesAdmin: observacoes,
          reviewedAt: new Date(),
          adminUserId
        }
      });

      // Agendar publicação usando sistema inteligente
      const PublicationScheduler = require('../services/publicationScheduler');
      const scheduler = new PublicationScheduler();
      
      const schedulingResult = await scheduler.schedulePublication(id, 1); // Prioridade alta
      
      if (schedulingResult.success) {
        logger.info(`📅 Publicação agendada para ${schedulingResult.scheduledTime.toLocaleString('pt-BR')}`);
      } else {
        logger.warn(`⚠️ Falha no agendamento, usando fila tradicional`);
        // Fallback para sistema anterior
        await addPublishJob(id, {
          source: 'admin_approval',
          priority: 1,
          delay: 0,
          attempts: 3
        });
      }

      logger.info(`Denúncia ${denuncia.protocolo} aprovada pelo admin ${req.user.email}`);

      res.json({
        success: true,
        message: 'Denúncia aprovada com sucesso',
        data: denunciaAtualizada
      });

    } catch (error) {
      logger.error('Erro ao aprovar denúncia:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'APPROVAL_ERROR'
      });
    }
  }

  // NOVO: Aprovar e Postar Imediatamente - Bypass da Fila de Agendamentos
  async aprovarEPostarImediatamente(req, res) {
    try {
      const { id } = req.params;
      const { observacoes, usuario_id } = req.body;
      const adminUserId = req.user.id;

      // Verificar se denúncia existe e pode ser aprovada
      const denuncia = await prisma.denuncia.findUnique({
        where: { id }
      });

      if (!denuncia) {
        return res.status(404).json({
          error: 'Denúncia não encontrada',
          code: 'DENUNCIA_NOT_FOUND'
        });
      }

      if (!['PENDENTE_MODERACAO', 'RECEBIDA', 'PROCESSANDO'].includes(denuncia.status)) {
        return res.status(400).json({
          error: 'Denúncia não pode ser aprovada neste status',
          code: 'INVALID_STATUS_FOR_APPROVAL'
        });
      }

      // ⚡ BYPASS COMPLETO DA FILA - PUBLICAÇÃO IMEDIATA
      const now = new Date();
      
      const transaction = await prisma.$transaction(async (tx) => {
        // 1. Atualizar denúncia com status de publicação imediata
        const denunciaAtualizada = await tx.denuncia.update({
          where: { id },
          data: {
            status: 'PUBLICADA', // Direto para PUBLICADA (pula AGENDADA)
            aprovadaAdmin: true,
            observacoesAdmin: observacoes ? `${observacoes}\n\n🚀 BYPASS FILA: Publicação imediata executada` : '🚀 BYPASS FILA: Publicação imediata executada',
            reviewedAt: now,
            publishedAt: now, // ⚡ PUBLICADO AGORA MESMO
            scheduledPublishAt: now, // Data de agendamento = agora (marca bypass)
            adminUserId,
            publishAttempts: 1, // Marca que tentativa foi feita
            lastAttemptAt: now
          }
        });

        // 2. Log especial para bypass da fila (console log)
        logger.info('🚀 BYPASS FILA - PUBLICAÇÃO IMEDIATA:', {
          adminUserId,
          acao: 'BYPASS_FILA_PUBLICACAO_IMEDIATA',
          denunciaId: id,
          protocolo: denuncia.protocolo,
          statusAnterior: denuncia.status,
          dataPublicacao: now,
          observacoes: observacoes || null,
          ip: req.ip,
          userAgent: req.get('User-Agent') || 'unknown'
        });

        return denunciaAtualizada;
      });

      // 3. ⚡ EXECUTAR PUBLICAÇÃO IMEDIATA - TODAS AS AÇÕES QUE A FILA FARIA
      try {
        // Publicar no Instagram imediatamente
        const instagramService = require('../services/instagramService');
        
        // Gerar caption inteligente
        const smartAnalysisService = require('../services/smartAnalysisService');
        const analise = await smartAnalysisService.analisarDenuncia(
          denuncia.textoFiltrado || denuncia.texto, 
          denuncia.endereco
        );
        const caption = smartAnalysisService.gerarCaption(analise, denuncia.textoFiltrado || denuncia.texto);
        
        // Publicar imediatamente
        const publicacaoResult = await instagramService.publicar({
          denunciaId: id,
          texto: caption,
          imagem: denuncia.imagemUrl,
          bairro: denuncia.bairro,
          vereadores: denuncia.vereadores || []
        });

        if (publicacaoResult.success) {
          // Atualizar com dados da publicação
          await prisma.denuncia.update({
            where: { id },
            data: {
              instagramPostId: publicacaoResult.postId,
              publishError: null // Limpar erro anterior se houver
            }
          });

          logger.info(`⚡ BYPASS FILA: Denúncia ${denuncia.protocolo} publicada IMEDIATAMENTE no Instagram`);
        } else {
          logger.warn(`⚠️ BYPASS FILA: Publicação falhou para ${denuncia.protocolo}: ${publicacaoResult.message}`);
          
          // Mesmo se a publicação falhar, a denúncia continua aprovada
          await prisma.denuncia.update({
            where: { id },
            data: {
              publishError: publicacaoResult.message
            }
          });
        }

      } catch (publicacaoError) {
        logger.error(`❌ ERRO na publicação imediata para ${denuncia.protocolo}:`, publicacaoError);
        
        await prisma.denuncia.update({
          where: { id },
          data: {
            publishError: publicacaoError.message
          }
        });
      }

      // 4. Resposta de sucesso
      res.json({
        success: true,
        message: 'Denúncia aprovada e publicada IMEDIATAMENTE (fila ignorada)!',
        data: {
          denuncia_id: transaction.id,
          protocolo: denuncia.protocolo,
          status: transaction.status,
          data_publicacao: transaction.publishedAt,
          bypass_fila: true,
          publicacao_imediata: true,
          instagram_post_id: transaction.instagramPostId || null
        }
      });

      logger.info(`🚀 BYPASS COMPLETO: ${denuncia.protocolo} aprovado e publicado imediatamente pelo admin ${req.user.email}`);

    } catch (error) {
      logger.error('❌ Erro ao fazer bypass da fila e publicar denúncia:', error);
      res.status(500).json({
        error: 'Erro ao processar publicação imediata',
        code: 'BYPASS_PUBLICATION_ERROR',
        details: error.message
      });
    }
  }

  // Rejeitar denúncia
  async rejeitarDenuncia(req, res) {
    try {
      const { id } = req.params;
      const { motivo, observacoes } = req.body;
      const adminUserId = req.user.id;

      if (!motivo) {
        return res.status(400).json({
          error: 'Motivo da rejeição é obrigatório',
          code: 'MISSING_REJECTION_REASON'
        });
      }

      // Verificar se denúncia existe
      const denuncia = await prisma.denuncia.findUnique({
        where: { id }
      });

      if (!denuncia) {
        return res.status(404).json({
          error: 'Denúncia não encontrada',
          code: 'DENUNCIA_NOT_FOUND'
        });
      }

      // Atualizar denúncia
      const denunciaAtualizada = await prisma.denuncia.update({
        where: { id },
        data: {
          status: 'REJEITADA_ADMIN',
          aprovadaAdmin: false,
          motivoRejeicaoAdmin: motivo,
          observacoesAdmin: observacoes,
          reviewedAt: new Date(),
          adminUserId
        }
      });

      logger.info(`Denúncia ${denuncia.protocolo} rejeitada pelo admin ${req.user.email}. Motivo: ${motivo}`);

      res.json({
        success: true,
        message: 'Denúncia rejeitada com sucesso',
        data: denunciaAtualizada
      });

    } catch (error) {
      logger.error('Erro ao rejeitar denúncia:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'REJECTION_ERROR'
      });
    }
  }

  // Editar denúncia
  async editarDenuncia(req, res) {
    try {
      const { id } = req.params;
      const { textoFiltrado, observacoes } = req.body;
      const adminUserId = req.user.id;

      if (!textoFiltrado) {
        return res.status(400).json({
          error: 'Texto filtrado é obrigatório',
          code: 'MISSING_FILTERED_TEXT'
        });
      }

      // Verificar se denúncia existe
      const denuncia = await prisma.denuncia.findUnique({
        where: { id }
      });

      if (!denuncia) {
        return res.status(404).json({
          error: 'Denúncia não encontrada',
          code: 'DENUNCIA_NOT_FOUND'
        });
      }

      // Atualizar denúncia
      const denunciaAtualizada = await prisma.denuncia.update({
        where: { id },
        data: {
          textoFiltrado,
          editadaPorAdmin: true,
          observacoesAdmin: observacoes,
          reviewedAt: new Date(),
          adminUserId
        }
      });

      logger.info(`Denúncia ${denuncia.protocolo} editada pelo admin ${req.user.email}`);

      res.json({
        success: true,
        message: 'Denúncia editada com sucesso',
        data: denunciaAtualizada
      });

    } catch (error) {
      logger.error('Erro ao editar denúncia:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'EDIT_ERROR'
      });
    }
  }

  // Ações em lote
  async acaoLote(req, res) {
    try {
      const { ids, acao, motivo, observacoes } = req.body;
      const adminUserId = req.user.id;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          error: 'Lista de IDs é obrigatória',
          code: 'MISSING_IDS'
        });
      }

      if (!['aprovar', 'rejeitar'].includes(acao)) {
        return res.status(400).json({
          error: 'Ação deve ser: aprovar ou rejeitar',
          code: 'INVALID_ACTION'
        });
      }

      if (acao === 'rejeitar' && !motivo) {
        return res.status(400).json({
          error: 'Motivo é obrigatório para rejeição',
          code: 'MISSING_REJECTION_REASON'
        });
      }

      const updateData = {
        reviewedAt: new Date(),
        adminUserId,
        observacoesAdmin: observacoes
      };

      if (acao === 'aprovar') {
        updateData.status = 'APROVADA_ADMIN';
        updateData.aprovadaAdmin = true;
      } else {
        updateData.status = 'REJEITADA_ADMIN';
        updateData.aprovadaAdmin = false;
        updateData.motivoRejeicaoAdmin = motivo;
      }

      // Atualizar em lote
      const resultado = await prisma.denuncia.updateMany({
        where: {
          id: { in: ids },
          status: { in: ['PENDENTE_MODERACAO', 'RECEBIDA', 'PROCESSANDO'] }
        },
        data: updateData
      });

      // Se aprovando, agendar publicações
      if (acao === 'aprovar') {
        const PublicationScheduler = require('../services/publicationScheduler');
        const scheduler = new PublicationScheduler();
        
        for (const id of ids) {
          try {
            const schedulingResult = await scheduler.schedulePublication(id, 1); // Prioridade alta
            
            if (schedulingResult.success) {
              logger.info(`📅 Lote - Publicação agendada para ${schedulingResult.scheduledTime.toLocaleString('pt-BR')}: ${id}`);
            } else {
              logger.warn(`⚠️ Falha no agendamento para ${id}, usando fila tradicional`);
              // Fallback
              await addPublishJob(id, {
                source: 'admin_batch_approval',
                priority: 1,
                delay: 0,
                attempts: 3
              });
            }
          } catch (error) {
            logger.error(`❌ Erro ao agendar ${id}:`, error.message);
            // Fallback em caso de erro
            await addPublishJob(id, {
              source: 'admin_batch_approval',
              priority: 1,
              delay: 0,
              attempts: 3
            });
          }
        }
      }

      logger.info(`Ação em lote: ${acao} aplicada a ${resultado.count} denúncias pelo admin ${req.user.email}`);

      res.json({
        success: true,
        message: `${acao === 'aprovar' ? 'Aprovação' : 'Rejeição'} em lote realizada com sucesso`,
        processadas: resultado.count
      });

    } catch (error) {
      logger.error('Erro na ação em lote:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'BATCH_ACTION_ERROR'
      });
    }
  }

  // Relatórios e estatísticas
  async gerarRelatorio(req, res) {
    try {
      const { tipo = 'geral', dataInicio, dataFim, formato = 'json' } = req.query;

      const where = {};
      if (dataInicio || dataFim) {
        where.createdAt = {};
        if (dataInicio) where.createdAt.gte = new Date(dataInicio);
        if (dataFim) where.createdAt.lte = new Date(dataFim);
      }

      let dados = {};

      switch (tipo) {
        case 'geral':
          dados = await this._relatorioGeral(where);
          break;
        case 'bairros':
          dados = await this._relatorioBairros(where);
          break;
        case 'vereadores':
          dados = await this._relatorioVereadores(where);
          break;
        case 'moderacao':
          dados = await this._relatorioModeracao(where);
          break;
        default:
          return res.status(400).json({
            error: 'Tipo de relatório inválido',
            code: 'INVALID_REPORT_TYPE'
          });
      }

      if (formato === 'csv') {
        // TODO: Implementar exportação CSV
        return res.status(501).json({
          error: 'Exportação CSV ainda não implementada',
          code: 'CSV_NOT_IMPLEMENTED'
        });
      }

      res.json({
        success: true,
        tipo,
        periodo: { dataInicio, dataFim },
        geradoEm: new Date(),
        dados
      });

    } catch (error) {
      logger.error('Erro ao gerar relatório:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'REPORT_ERROR'
      });
    }
  }

  // Métodos auxiliares para relatórios
  async _relatorioGeral(where) {
    const [
      totalDenuncias,
      porStatus,
      mediaDiaria,
      tempoMedioProcessamento
    ] = await Promise.all([
      prisma.denuncia.count({ where }),
      prisma.denuncia.groupBy({
        by: ['status'],
        where,
        _count: { id: true }
      }),
      prisma.denuncia.count({ where: { ...where, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }) / 7,
      prisma.denuncia.aggregate({
        where: { ...where, processedAt: { not: null } },
        _avg: {
          tempoConversa: true
        }
      })
    ]);

    return {
      totalDenuncias,
      distribuicaoStatus: porStatus,
      mediaDenunciasDiarias: Math.round(mediaDiaria),
      tempoMedioProcessamento: tempoMedioProcessamento._avg.tempoConversa
    };
  }

  async _relatorioBairros(where) {
    return await prisma.denuncia.groupBy({
      by: ['bairro'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
  }

  async _relatorioVereadores(where) {
    // TODO: Implementar análise de menções de vereadores
    return { message: 'Relatório de vereadores em desenvolvimento' };
  }

  async _relatorioModeracao(where) {
    const [
      totalRevisadas,
      porAdmin,
      taxaAprovacao
    ] = await Promise.all([
      prisma.denuncia.count({ where: { ...where, reviewedAt: { not: null } } }),
      prisma.denuncia.groupBy({
        by: ['adminUserId'],
        where: { ...where, adminUserId: { not: null } },
        _count: { id: true }
      }),
      prisma.denuncia.aggregate({
        where: { ...where, reviewedAt: { not: null } },
        _count: {
          aprovadaAdmin: true
        }
      })
    ]);

    return {
      totalRevisadas,
      revisoesPorAdmin: porAdmin,
      taxaAprovacao: totalRevisadas > 0 ? Math.round((taxaAprovacao._count.aprovadaAdmin / totalRevisadas) * 100) : 0
    };
  }

  // Estatísticas de agendamento
  async getSchedulingStats(req, res) {
    try {
      const PublicationScheduler = require('../services/publicationScheduler');
      const scheduler = new PublicationScheduler();
      
      logger.info('[ADMIN] Buscando estatísticas de agendamento...');
      
      const stats = await scheduler.getSchedulingStats();
      
      // Estatísticas adicionais do banco
      const additionalStats = await Promise.all([
        // Posts por status
        prisma.denuncia.groupBy({
          by: ['status'],
          _count: { id: true },
          where: {
            status: {
              in: ['AGENDADA', 'PUBLICANDO', 'PUBLICADA', 'ERRO_PUBLICACAO']
            }
          }
        }),
        
        // Posts por prioridade
        prisma.denuncia.groupBy({
          by: ['priority'],
          _count: { id: true },
          where: {
            priority: { not: null },
            status: { not: 'REJEITADA_ADMIN' }
          }
        }),
        
        // Próximas publicações (próximas 24h)
        prisma.denuncia.findMany({
          where: {
            scheduledPublishAt: {
              gte: new Date(),
              lte: new Date(Date.now() + 24 * 60 * 60 * 1000)
            },
            status: 'AGENDADA'
          },
          select: {
            id: true,
            protocolo: true,
            scheduledPublishAt: true,
            priority: true
          },
          orderBy: {
            scheduledPublishAt: 'asc'
          },
          take: 10
        }),
        
        // Posts com erro
        prisma.denuncia.findMany({
          where: {
            status: 'ERRO_PUBLICACAO',
            lastAttemptAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 dias
            }
          },
          select: {
            id: true,
            protocolo: true,
            publishAttempts: true,
            publishError: true,
            lastAttemptAt: true
          },
          orderBy: {
            lastAttemptAt: 'desc'
          },
          take: 10
        })
      ]);
      
      const [statusStats, priorityStats, upcomingPosts, errorPosts] = additionalStats;
      
      // Calcular métricas avançadas
      const now = new Date();
      const totalPosts = await prisma.denuncia.count({
        where: {
          status: { not: 'REJEITADA_ADMIN' }
        }
      });
      
      const publishedPosts = await prisma.denuncia.count({
        where: { status: 'PUBLICADA' }
      });
      
      const successRate = totalPosts > 0 ? ((publishedPosts / totalPosts) * 100).toFixed(1) : 0;
      
      res.json({
        success: true,
        message: 'Estatísticas de agendamento obtidas com sucesso',
        data: {
          // Estatísticas básicas do scheduler
          scheduling: stats,
          
          // Distribuição por status
          statusDistribution: statusStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {}),
          
          // Distribuição por prioridade
          priorityDistribution: priorityStats.reduce((acc, stat) => {
            acc[`priority_${stat.priority}`] = stat._count.id;
            return acc;
          }, {}),
          
          // Próximas publicações
          upcomingPosts: upcomingPosts.map(post => ({
            ...post,
            scheduledPublishAt: post.scheduledPublishAt.toISOString(),
            timeToPublish: Math.ceil((post.scheduledPublishAt.getTime() - now.getTime()) / (1000 * 60)) // minutos
          })),
          
          // Posts com erro
          errorPosts: errorPosts.map(post => ({
            ...post,
            lastAttemptAt: post.lastAttemptAt?.toISOString(),
            hoursSinceError: post.lastAttemptAt ? 
              Math.ceil((now.getTime() - post.lastAttemptAt.getTime()) / (1000 * 60 * 60)) : null
          })),
          
          // Métricas gerais
          metrics: {
            totalPosts,
            publishedPosts,
            successRate: `${successRate}%`,
            avgAttemptsPerPost: errorPosts.length > 0 ? 
              (errorPosts.reduce((sum, post) => sum + post.publishAttempts, 0) / errorPosts.length).toFixed(1) : 0,
            postsInQueue: stats.totalScheduled,
            systemHealth: successRate > 90 ? 'excellent' : successRate > 75 ? 'good' : 'needs_attention'
          },
          
          // Timestamp
          generatedAt: now.toISOString()
        }
      });
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao buscar estatísticas de agendamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message,
        code: 'SCHEDULING_STATS_ERROR'
      });
    }
  }

  // Testar conexão Instagram
  async testarInstagram(req, res) {
    try {
      logger.info('[ADMIN] Iniciando teste de conexão Instagram...');
      
      const resultado = await instagramService.testConnection();
      
      if (resultado.success) {
        logger.info('[ADMIN] ✅ Teste Instagram bem-sucedido');
        res.json({
          success: true,
          message: 'Conexão Instagram validada com sucesso',
          data: {
            connected: true,
            accountInfo: resultado.accountInfo,
            attempt: resultado.attempt,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        logger.error('[ADMIN] ❌ Teste Instagram falhou:', resultado.message);
        res.status(400).json({
          success: false,
          message: 'Falha na conexão Instagram',
          error: resultado.message,
          data: {
            connected: false,
            details: resultado.details || null,
            attempts: resultado.attempts || 1,
            finalError: resultado.finalError || false,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('[ADMIN] Erro crítico no teste Instagram:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor durante teste Instagram',
        error: error.message,
        data: {
          connected: false,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Forçar publicação imediata (para debug)
  async forcarPublicacao(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`[ADMIN] Forçando publicação imediata da denúncia ${id}`);
      
      // Verificar se denúncia existe
      const denuncia = await prisma.denuncia.findUnique({
        where: { id }
      });

      if (!denuncia) {
        return res.status(404).json({
          error: 'Denúncia não encontrada',
          code: 'DENUNCIA_NOT_FOUND'
        });
      }

      // Adicionar à fila com alta prioridade e sem delay
      const job = await addPublishJob(id, {
        source: 'admin_force',
        priority: 2, // Prioridade máxima
        delay: 0,
        attempts: 5 // Mais tentativas para debug
      });

      logger.info(`[ADMIN] Job de publicação forçada criado: ${job.id}`);

      res.json({
        success: true,
        message: 'Publicação forçada iniciada',
        data: {
          denunciaId: id,
          jobId: job.id,
          protocol: denuncia.protocolo,
          status: denuncia.status,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('[ADMIN] Erro ao forçar publicação:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'FORCE_PUBLISH_ERROR'
      });
    }
  }
}

module.exports = new AdminController();