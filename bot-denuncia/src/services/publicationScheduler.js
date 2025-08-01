/**
 * Publication Scheduler - Sistema de Agendamento de Publicações
 * Gerencia horários otimizados para publicação no Instagram
 * @author Sistema Bot Denúncia - Engenharia de Dados
 */

const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');

class PublicationScheduler {
  constructor() {
    this.prisma = new PrismaClient();
    
    // Horários de maior engajamento baseados em dados do Instagram
    this.optimalHours = {
      weekdays: [9, 11, 14, 16, 19, 21], // Segunda a Sexta
      weekends: [10, 12, 15, 18, 20]     // Sábado e Domingo
    };
    
    // Intervalo mínimo entre posts (em minutos)
    this.minInterval = 30;
    
    // Máximo de posts por dia
    this.maxPostsPerDay = 8;
    
    logger.info('📅 [SCHEDULER] Publication Scheduler inicializado');
  }

  /**
   * Calcular próximo horário de publicação otimizado
   */
  async calculateNextPublicationTime(priority = 1) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Buscar posts já agendados para hoje
      const postsToday = await this.getScheduledPostsForDate(today);
      
      // Verificar se ainda podemos postar hoje
      if (postsToday.length >= this.maxPostsPerDay) {
        return this.calculateNextPublicationTime(priority, new Date(today.getTime() + 24 * 60 * 60 * 1000));
      }
      
      // Obter horários disponíveis
      const availableSlots = this.getAvailableTimeSlots(now, postsToday);
      
      // Selecionar melhor horário baseado na prioridade
      const nextSlot = this.selectOptimalSlot(availableSlots, priority);
      
      if (nextSlot) {
        return nextSlot;
      }
      
      // Se não há slots hoje, agendar para amanhã
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      return this.calculateNextPublicationTime(priority, tomorrow);
      
    } catch (error) {
      logger.error('❌ [SCHEDULER] Erro ao calcular próximo horário:', error.message);
      
      // Fallback: próxima hora cheia
      const fallback = new Date();
      fallback.setHours(fallback.getHours() + 1, 0, 0, 0);
      return fallback;
    }
  }

  /**
   * Obter posts agendados para uma data específica
   */
  async getScheduledPostsForDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    try {
      const posts = await this.prisma.denuncia.findMany({
        where: {
          scheduledPublishAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            in: ['APROVADA_ADMIN', 'AGENDADA', 'PROCESSANDO']
          }
        },
        select: {
          id: true,
          scheduledPublishAt: true,
          priority: true
        },
        orderBy: {
          scheduledPublishAt: 'asc'
        }
      });
      
      return posts;
    } catch (error) {
      logger.warn('⚠️ [SCHEDULER] Erro ao buscar posts agendados:', error.message);
      return [];
    }
  }

  /**
   * Obter slots de tempo disponíveis
   */
  getAvailableTimeSlots(baseDate, existingPosts) {
    const isWeekend = baseDate.getDay() === 0 || baseDate.getDay() === 6;
    const optimalHours = isWeekend ? this.optimalHours.weekends : this.optimalHours.weekdays;
    
    const slots = [];
    const now = new Date();
    
    for (const hour of optimalHours) {
      // Slots de 30 em 30 minutos
      for (const minute of [0, 30]) {
        const slotTime = new Date(baseDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // Só agendar para o futuro
        if (slotTime <= now) continue;
        
        // Verificar se o slot está disponível
        const isAvailable = !existingPosts.some(post => {
          const postTime = new Date(post.scheduledPublishAt);
          const timeDiff = Math.abs(slotTime.getTime() - postTime.getTime());
          return timeDiff < (this.minInterval * 60 * 1000);
        });
        
        if (isAvailable) {
          slots.push({
            time: slotTime,
            optimal: true,
            score: this.calculateSlotScore(slotTime)
          });
        }
      }
    }
    
    // Se não há slots ótimos, adicionar slots alternativos
    if (slots.length === 0) {
      return this.generateAlternativeSlots(baseDate, existingPosts);
    }
    
    return slots.sort((a, b) => b.score - a.score);
  }

  /**
   * Gerar slots alternativos quando horários ótimos não estão disponíveis
   */
  generateAlternativeSlots(baseDate, existingPosts) {
    const slots = [];
    const now = new Date();
    
    // Horários alternativos (8h às 22h, de hora em hora)
    for (let hour = 8; hour <= 22; hour++) {
      const slotTime = new Date(baseDate);
      slotTime.setHours(hour, 0, 0, 0);
      
      if (slotTime <= now) continue;
      
      const isAvailable = !existingPosts.some(post => {
        const postTime = new Date(post.scheduledPublishAt);
        const timeDiff = Math.abs(slotTime.getTime() - postTime.getTime());
        return timeDiff < (this.minInterval * 60 * 1000);
      });
      
      if (isAvailable) {
        slots.push({
          time: slotTime,
          optimal: false,
          score: this.calculateSlotScore(slotTime) * 0.7 // Penalidade por não ser ótimo
        });
      }
    }
    
    return slots.sort((a, b) => b.score - a.score);
  }

  /**
   * Calcular score de um slot baseado em engenharia de dados
   */
  calculateSlotScore(time) {
    const hour = time.getHours();
    const dayOfWeek = time.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let score = 50; // Score base
    
    // Bonificação por horário
    if (!isWeekend) {
      // Horários de pico durante a semana
      if (hour >= 9 && hour <= 11) score += 30; // Manhã
      if (hour >= 14 && hour <= 16) score += 25; // Tarde
      if (hour >= 19 && hour <= 21) score += 35; // Noite
    } else {
      // Horários de pico no fim de semana
      if (hour >= 10 && hour <= 12) score += 25;
      if (hour >= 15 && hour <= 18) score += 30;
      if (hour >= 20 && hour <= 21) score += 20;
    }
    
    // Penalidade por horários ruins
    if (hour < 8 || hour > 22) score -= 40;
    if (hour >= 0 && hour <= 6) score -= 60;
    
    // Bonificação para quinta e sexta
    if (dayOfWeek === 4 || dayOfWeek === 5) score += 10;
    
    // Penalização para segunda de manhã
    if (dayOfWeek === 1 && hour < 10) score -= 15;
    
    return Math.max(score, 0);
  }

  /**
   * Selecionar slot ótimo baseado na prioridade
   */
  selectOptimalSlot(slots, priority) {
    if (slots.length === 0) return null;
    
    // Prioridade alta pega o melhor slot disponível
    if (priority >= 2) {
      return slots[0].time;
    }
    
    // Prioridade normal pega um dos 3 melhores slots
    const topSlots = slots.slice(0, Math.min(3, slots.length));
    const selectedSlot = topSlots[Math.floor(Math.random() * topSlots.length)];
    
    return selectedSlot.time;
  }

  /**
   * Agendar publicação para uma denúncia
   */
  async schedulePublication(denunciaId, priority = 1, requestedTime = null) {
    try {
      let scheduledTime;
      
      if (requestedTime && requestedTime > new Date()) {
        // Usar horário solicitado se for válido
        scheduledTime = new Date(requestedTime);
      } else {
        // Calcular melhor horário automaticamente
        scheduledTime = await this.calculateNextPublicationTime(priority);
      }
      
      // Atualizar denúncia no banco de dados
      const updatedDenuncia = await this.prisma.denuncia.update({
        where: { id: denunciaId },
        data: {
          scheduledPublishAt: scheduledTime,
          status: 'AGENDADA',
          priority: priority
        }
      });
      
      logger.info(`📅 [SCHEDULER] Publicação agendada: Denúncia ${denunciaId} para ${scheduledTime.toLocaleString('pt-BR')}`);
      
      return {
        success: true,
        scheduledTime,
        denunciaId,
        isOptimalTime: await this.isOptimalTime(scheduledTime)
      };
      
    } catch (error) {
      logger.error(`❌ [SCHEDULER] Erro ao agendar publicação para denúncia ${denunciaId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        denunciaId
      };
    }
  }

  /**
   * Verificar se um horário é considerado ótimo
   */
  async isOptimalTime(time) {
    const hour = time.getHours();
    const isWeekend = time.getDay() === 0 || time.getDay() === 6;
    const optimalHours = isWeekend ? this.optimalHours.weekends : this.optimalHours.weekdays;
    
    return optimalHours.includes(hour);
  }

  /**
   * Obter estatísticas do agendamento
   */
  async getSchedulingStats() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const [
        totalScheduled,
        scheduledToday,
        scheduledTomorrow,
        overdue
      ] = await Promise.all([
        this.prisma.denuncia.count({
          where: {
            status: 'AGENDADA',
            scheduledPublishAt: { not: null }
          }
        }),
        this.prisma.denuncia.count({
          where: {
            status: 'AGENDADA',
            scheduledPublishAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              lt: tomorrow
            }
          }
        }),
        this.prisma.denuncia.count({
          where: {
            status: 'AGENDADA',
            scheduledPublishAt: {
              gte: tomorrow,
              lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        }),
        this.prisma.denuncia.count({
          where: {
            status: 'AGENDADA',
            scheduledPublishAt: { lt: now }
          }
        })
      ]);
      
      return {
        totalScheduled,
        scheduledToday,
        scheduledTomorrow,
        overdue,
        maxPostsPerDay: this.maxPostsPerDay,
        remainingToday: Math.max(0, this.maxPostsPerDay - scheduledToday)
      };
      
    } catch (error) {
      logger.error('❌ [SCHEDULER] Erro ao obter estatísticas:', error.message);
      return {
        totalScheduled: 0,
        scheduledToday: 0,
        scheduledTomorrow: 0,
        overdue: 0,
        maxPostsPerDay: this.maxPostsPerDay,
        remainingToday: this.maxPostsPerDay
      };
    }
  }

  /**
   * Reagendar posts atrasados
   */
  async rescheduleOverduePosts() {
    try {
      const now = new Date();
      
      const overduePosts = await this.prisma.denuncia.findMany({
        where: {
          status: 'AGENDADA',
          scheduledPublishAt: { lt: now }
        },
        select: { id: true, priority: true }
      });
      
      const results = [];
      
      for (const post of overduePosts) {
        const result = await this.schedulePublication(post.id, post.priority || 1);
        results.push(result);
      }
      
      logger.info(`📅 [SCHEDULER] Reagendados ${results.length} posts atrasados`);
      
      return results;
      
    } catch (error) {
      logger.error('❌ [SCHEDULER] Erro ao reagendar posts atrasados:', error.message);
      return [];
    }
  }

  /**
   * Limpar recursos
   */
  async cleanup() {
    try {
      await this.prisma.$disconnect();
      logger.info('🧹 [SCHEDULER] Recursos limpos com sucesso');
    } catch (error) {
      logger.error('❌ [SCHEDULER] Erro na limpeza de recursos:', error.message);
    }
  }
}

module.exports = PublicationScheduler;