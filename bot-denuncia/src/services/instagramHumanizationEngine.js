/**
 * Instagram Humanization Engine
 * Advanced anti-detection system that makes bot behavior indistinguishable from human patterns
 * 
 * Features:
 * - Natural timing patterns with human-like distribution curves
 * - Content variation engine with sophisticated templates
 * - Intelligent hashtag rotation system
 * - Human activity schedule simulation
 * - Real-time risk assessment monitoring
 * - Engagement simulation
 * - Header randomization and user-agent rotation
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const humanizationConfig = require('../config/humanizationConfig');

class InstagramHumanizationEngine {
    constructor() {
        // Load configuration
        this.config = humanizationConfig;
        
        // Risk management
        this.riskScore = 0.0;
        this.riskThreshold = this.config.risk.threshold;
        this.emergencyMode = false;
        this.lastPostTime = 0;
        this.dailyPostCount = 0;
        this.sessionStartTime = Date.now();
        
        // Behavior tracking
        this.behaviorHistory = [];
        this.hashtagHistory = [];
        this.contentVariationHistory = [];
        
        // Initialize from config
        this.humanPatterns = {
            timePreferences: this.config.timing.hourWeights,
            dayPreferences: this.config.timing.dayWeights,
            sessionDurations: [300000, 900000, 1800000, 3600000], // 5min, 15min, 30min, 1hr
            sessionIntervals: [3600000, 7200000, 14400000, 28800000] // 1hr, 2hr, 4hr, 8hr
        };
        
        // Content templates from config
        this.contentTemplates = {
            denunciaPrefixes: this.config.content.templates.prefixes,
            problemConnectors: this.config.content.templates.connectors,
            callToActions: this.config.content.templates.callToActions
        };
        
        // Hashtag pools from config
        this.hashtagPools = this.config.hashtags.pools;
        
        // User agents from config
        this.userAgents = this.config.headers.userAgents;
        
        // Debug logging
        if (this.config.development.debugMode) {
            logger.info('[HUMANIZATION] Debug mode enabled');
        }
        
        this.startBehaviorTracking();
    }
    
    /**
     * Calculate natural delay with human-like distribution
     * Uses Gaussian distribution with realistic variance
     */
    calculateNaturalDelay(baseDelayMinutes) {
        // Use configured base delay if not provided
        if (!baseDelayMinutes) {
            if (this.emergencyMode) {
                baseDelayMinutes = this.config.timing.baseDelay.emergency;
            } else {
                baseDelayMinutes = this.config.timing.baseDelay.normal;
            }
        }
        
        // Convert to milliseconds
        const baseDelay = baseDelayMinutes * 60 * 1000;
        
        // Generate Gaussian distribution (Box-Muller transform)
        const u1 = Math.random();
        const u2 = Math.random();
        const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        
        // Apply configured variance
        const variance = baseDelay * this.config.timing.variance;
        const delay = baseDelay + (gaussian * variance);
        
        // Use configured limits
        const minDelay = this.config.timing.minDelay * 60 * 1000;
        const maxDelay = this.config.timing.maxDelay * 60 * 1000;
        
        const naturalDelay = Math.max(minDelay, Math.min(maxDelay, delay));
        
        // Add emergency mode adjustment
        if (this.emergencyMode) {
            return naturalDelay * 2; // Double delay in emergency mode
        }
        
        return Math.round(naturalDelay);
    }
    
    /**
     * Check if current time is within human activity schedule
     */
    isWithinHumanActivitySchedule() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        // Check time preferences
        const timeProb = this.humanPatterns.timePreferences[hour] || 0.01;
        const dayProb = this.humanPatterns.dayPreferences[day] || 0.14;
        
        // Peak activity hours: 8-12, 18-22
        const isPeakHour = (hour >= 8 && hour <= 12) || (hour >= 18 && hour <= 22);
        
        // Weekend has different pattern
        const isWeekend = day === 0 || day === 6;
        
        return {
            isOptimalTime: timeProb > 0.08 && !this.emergencyMode,
            isPeakHour,
            isWeekend,
            timeProb,
            dayProb,
            shouldDelay: timeProb < 0.03 || (hour >= 23 || hour <= 6)
        };
    }
    
    /**
     * Generate content variation using templates and AI-like patterns
     */
    generateContentVariation(originalContent, metadata = {}) {
        try {
            const { vereadores = [], categoria = 'geral' } = metadata;
            
            // Extract core message
            const coreMessage = this.extractCoreMessage(originalContent);
            
            // Select templates based on history to avoid repetition
            const prefix = this.selectFromPool(this.contentTemplates.denunciaPrefixes, 'prefix');
            const connector = this.selectFromPool(this.contentTemplates.problemConnectors, 'connector');
            const callToAction = this.selectFromPool(this.contentTemplates.callToActions, 'callToAction');
            
            // Generate variations
            const variations = [
                `${prefix} ${coreMessage} ${connector}. ${callToAction}`,
                `${coreMessage} - ${callToAction}`,
                `📢 ${prefix}\n\n${coreMessage}\n\n${callToAction}`,
                `⚠️ ${coreMessage}\n\n${connector.charAt(0).toUpperCase() + connector.slice(1)}.\n\n${callToAction}`
            ];
            
            // Select variation based on history
            const selectedVariation = this.selectFromPool(variations, 'variation');
            
            // Add emotional markers occasionally (10% chance)
            if (Math.random() < 0.1) {
                const emotions = ['⚠️', '📢', '🚨', '📍', '⭐'];
                const emotion = emotions[Math.floor(Math.random() * emotions.length)];
                return `${emotion} ${selectedVariation}`;
            }
            
            return selectedVariation;
            
        } catch (error) {
            logger.error('[HUMANIZATION] Content variation failed:', error.message);
            return originalContent;
        }
    }
    
    /**
     * Generate intelligent hashtag rotation
     */
    generateHashtagRotation(vereadores = [], categoria = 'geral') {
        try {
            const hashtags = [];
            
            // Base hashtags (always include 2-3)
            const baseSelection = this.selectMultipleFromPool(this.hashtagPools.base, 2, 3, 'base');
            hashtags.push(...baseSelection);
            
            // Municipal hashtags (1-2)
            const municipalSelection = this.selectMultipleFromPool(this.hashtagPools.municipal, 1, 2, 'municipal');
            hashtags.push(...municipalSelection);
            
            // Problem-specific hashtags (1-2)
            const problemSelection = this.selectMultipleFromPool(this.hashtagPools.problems, 1, 2, 'problems');
            hashtags.push(...problemSelection);
            
            // Community hashtags (0-1, 30% chance)
            if (Math.random() < 0.3) {
                const communitySelection = this.selectMultipleFromPool(this.hashtagPools.community, 0, 1, 'community');
                hashtags.push(...communitySelection);
            }
            
            // Vereador hashtags
            if (vereadores && vereadores.length > 0) {
                vereadores.forEach(vereador => {
                    const tag = this.extractVereadorTag(vereador);
                    if (tag && !hashtags.includes(tag)) {
                        hashtags.push(tag);
                    }
                });
            }
            
            // Category-specific hashtags
            const categoryTags = this.getCategoryHashtags(categoria);
            hashtags.push(...categoryTags.filter(tag => !hashtags.includes(tag)));
            
            // Limit to 15 hashtags to avoid spam detection
            const finalHashtags = hashtags.slice(0, 15);
            
            // Track hashtag usage
            this.trackHashtagUsage(finalHashtags);
            
            return finalHashtags;
            
        } catch (error) {
            logger.error('[HUMANIZATION] Hashtag rotation failed:', error.message);
            return ['DenunciaCidada', 'SaoBernardodoCampo', 'FiscalizacaoCidada'];
        }
    }
    
    /**
     * Calculate current risk score based on multiple factors
     */
    calculateRiskScore() {
        const factors = {
            postFrequency: this.calculatePostFrequencyRisk(),
            timingPattern: this.calculateTimingPatternRisk(),
            contentSimilarity: this.calculateContentSimilarityRisk(),
            hashtagRepetition: this.calculateHashtagRepetitionRisk(),
            sessionBehavior: this.calculateSessionBehaviorRisk()
        };
        
        // Use configured weights
        const weights = this.config.risk.weights;
        
        this.riskScore = Object.keys(factors).reduce((total, factor) => {
            return total + (factors[factor] * (weights[factor] || 0));
        }, 0);
        
        // Update emergency mode based on calculated risk
        const previousEmergencyMode = this.emergencyMode;
        this.emergencyMode = this.riskScore >= this.riskThreshold;
        
        if (this.emergencyMode && !previousEmergencyMode) {
            logger.warn(`🚨 [HUMANIZATION] Emergency mode activated! Risk score: ${this.riskScore.toFixed(3)}`);
        } else if (!this.emergencyMode && previousEmergencyMode) {
            logger.info(`✅ [HUMANIZATION] Emergency mode deactivated. Risk score: ${this.riskScore.toFixed(3)}`);
        }
        
        return {
            totalRisk: this.riskScore,
            factors,
            emergencyMode: this.emergencyMode,
            recommendation: this.getRiskRecommendation()
        };
    }
    
    /**
     * Get random user agent for header rotation
     */
    getRandomUserAgent() {
        const index = Math.floor(Math.random() * this.userAgents.length);
        return this.userAgents[index];
    }
    
    /**
     * Generate realistic headers for requests
     */
    generateRealisticHeaders() {
        const userAgent = this.getRandomUserAgent();
        
        return {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': Math.random() < 0.3 ? '1' : '0',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        };
    }
    
    /**
     * Simulate human engagement patterns
     */
    async simulateEngagement(postId) {
        if (this.emergencyMode) {
            logger.info('[HUMANIZATION] Skipping engagement simulation - emergency mode');
            return false;
        }
        
        // 20% chance of engagement simulation
        if (Math.random() > 0.2) {
            return false;
        }
        
        try {
            // Simulate viewing post (random delay 1-10 seconds)
            const viewDelay = Math.random() * 9000 + 1000;
            await this.sleep(viewDelay);
            
            // 50% chance of liking own post (realistic behavior)
            if (Math.random() < 0.5) {
                logger.info(`[HUMANIZATION] Simulating post engagement for ${postId}`);
                // Note: Actual Instagram API call would go here
                // For now, just log the simulation
                return true;
            }
            
            return false;
            
        } catch (error) {
            logger.error('[HUMANIZATION] Engagement simulation failed:', error.message);
            return false;
        }
    }
    
    /**
     * Get optimal posting time within human activity schedule
     */
    getOptimalPostingTime() {
        const schedule = this.isWithinHumanActivitySchedule();
        
        if (schedule.shouldDelay) {
            // Calculate delay to next optimal window
            const now = new Date();
            const currentHour = now.getHours();
            
            // Next optimal window is 8 AM
            const nextOptimal = new Date();
            if (currentHour >= 22 || currentHour < 8) {
                nextOptimal.setDate(nextOptimal.getDate() + (currentHour >= 22 ? 1 : 0));
                nextOptimal.setHours(8, 0, 0, 0);
            } else {
                // Post within current acceptable window but with delay
                nextOptimal.setTime(now.getTime() + this.calculateNaturalDelay(5));
            }
            
            return {
                shouldWait: true,
                optimalTime: nextOptimal,
                delayMinutes: Math.round((nextOptimal.getTime() - now.getTime()) / (1000 * 60)),
                reason: schedule.shouldDelay ? 'Outside active hours' : 'Natural pacing'
            };
        }
        
        return {
            shouldWait: false,
            optimalTime: new Date(),
            delayMinutes: 0,
            reason: 'Optimal posting window'
        };
    }
    
    /**
     * Generate comprehensive behavior report
     */
    generateBehaviorReport() {
        const riskAssessment = this.calculateRiskScore();
        const schedule = this.isWithinHumanActivitySchedule();
        const postingTime = this.getOptimalPostingTime();
        
        return {
            timestamp: new Date().toISOString(),
            riskAssessment,
            schedule,
            postingTime,
            stats: {
                dailyPostCount: this.dailyPostCount,
                sessionDuration: Date.now() - this.sessionStartTime,
                behaviorHistoryLength: this.behaviorHistory.length,
                emergencyMode: this.emergencyMode
            },
            recommendations: this.getRecommendations()
        };
    }
    
    // === PRIVATE HELPER METHODS === //
    
    extractCoreMessage(content) {
        // Remove existing prefixes and suffixes
        let core = content
            .replace(/^(Denúncia cidadã:|Problema identificado:|Situação preocupante:)/i, '')
            .replace(/\n\n.*$/s, '') // Remove call to action
            .trim();
        
        return core;
    }
    
    selectFromPool(pool, category) {
        // Select item avoiding recent usage
        const recentUsage = this.contentVariationHistory
            .filter(h => h.category === category && Date.now() - h.timestamp < 3600000) // 1 hour
            .map(h => h.value);
        
        const availableItems = pool.filter(item => !recentUsage.includes(item));
        const selectedPool = availableItems.length > 0 ? availableItems : pool;
        
        const selected = selectedPool[Math.floor(Math.random() * selectedPool.length)];
        
        // Track usage
        this.contentVariationHistory.push({
            category,
            value: selected,
            timestamp: Date.now()
        });
        
        // Cleanup old history (keep last 100 entries)
        if (this.contentVariationHistory.length > 100) {
            this.contentVariationHistory = this.contentVariationHistory.slice(-100);
        }
        
        return selected;
    }
    
    selectMultipleFromPool(pool, min, max, category) {
        const count = Math.floor(Math.random() * (max - min + 1)) + min;
        const selected = [];
        
        // Filter out recently used hashtags for better rotation
        const recentUsage = this.hashtagHistory
            .filter(h => Date.now() - h.timestamp < this.config.hashtags.hashtagCooldown * 60 * 1000)
            .map(h => h.tag);
        
        const availablePool = pool.filter(tag => !recentUsage.includes(tag));
        const finalPool = availablePool.length > 0 ? availablePool : pool;
        
        const shuffled = [...finalPool].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            selected.push(shuffled[i]);
        }
        
        return selected;
    }
    
    extractVereadorTag(vereador) {
        if (typeof vereador === 'string') {
            return vereador.replace('@', '').replace(/\s+/g, '').toLowerCase();
        } else if (vereador && typeof vereador === 'object') {
            return vereador.instagram?.replace('@', '').replace(/\s+/g, '').toLowerCase() || 
                   vereador.nome?.replace(/\s+/g, '').toLowerCase();
        }
        return null;
    }
    
    getCategoryHashtags(categoria) {
        const categoryMap = this.config.hashtags.pools.categories;
        return categoryMap[categoria] || ['ServiçosPúblicos'];
    }
    
    trackHashtagUsage(hashtags) {
        const now = Date.now();
        hashtags.forEach(tag => {
            this.hashtagHistory.push({ tag, timestamp: now });
        });
        
        // Cleanup old history (keep last 500 entries)
        if (this.hashtagHistory.length > 500) {
            this.hashtagHistory = this.hashtagHistory.slice(-500);
        }
    }
    
    calculatePostFrequencyRisk() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const recentPosts = this.behaviorHistory.filter(b => 
            b.action === 'post' && (now - b.timestamp) < oneHour
        );
        
        // Risk increases exponentially with frequency
        if (recentPosts.length >= 5) return 1.0;
        if (recentPosts.length >= 3) return 0.8;
        if (recentPosts.length >= 2) return 0.5;
        if (recentPosts.length >= 1) return 0.2;
        return 0.0;
    }
    
    calculateTimingPatternRisk() {
        const recentPosts = this.behaviorHistory
            .filter(b => b.action === 'post')
            .slice(-10); // Last 10 posts
        
        if (recentPosts.length < 3) return 0.0;
        
        // Calculate timing variance
        const intervals = [];
        for (let i = 1; i < recentPosts.length; i++) {
            intervals.push(recentPosts[i].timestamp - recentPosts[i-1].timestamp);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => 
            sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        
        // Low variance indicates bot behavior
        const coefficient = Math.sqrt(variance) / avgInterval;
        return Math.max(0, 1 - coefficient * 2); // Higher risk for lower variance
    }
    
    calculateContentSimilarityRisk() {
        const recentContent = this.behaviorHistory
            .filter(b => b.action === 'post' && b.metadata?.contentHash)
            .slice(-5)
            .map(b => b.metadata.contentHash);
        
        if (recentContent.length < 2) return 0.0;
        
        // Simple similarity check (in real implementation, use more sophisticated NLP)
        const uniqueContent = [...new Set(recentContent)];
        const similarityRatio = 1 - (uniqueContent.length / recentContent.length);
        
        return similarityRatio;
    }
    
    calculateHashtagRepetitionRisk() {
        const recentHashtags = this.hashtagHistory
            .filter(h => Date.now() - h.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
            .map(h => h.tag);
        
        if (recentHashtags.length === 0) return 0.0;
        
        const uniqueHashtags = [...new Set(recentHashtags)];
        const repetitionRatio = 1 - (uniqueHashtags.length / recentHashtags.length);
        
        return Math.min(1.0, repetitionRatio * 2); // Cap at 1.0
    }
    
    calculateSessionBehaviorRisk() {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const oneHour = 60 * 60 * 1000;
        
        // Risk increases with extremely long sessions (>4 hours) or very short bursts
        if (sessionDuration > 4 * oneHour) return 0.7;
        if (sessionDuration < 5 * 60 * 1000 && this.dailyPostCount > 1) return 0.8; // <5min with multiple posts
        
        return 0.0;
    }
    
    getRiskRecommendation() {
        if (this.riskScore >= 0.8) {
            return 'CRITICAL: Stop all activity for 2-4 hours';
        } else if (this.riskScore >= 0.7) {
            return 'HIGH: Enter emergency mode, double delays';
        } else if (this.riskScore >= 0.5) {
            return 'MEDIUM: Increase delays, vary content more';
        } else if (this.riskScore >= 0.3) {
            return 'LOW: Monitor patterns, slight adjustments';
        } else {
            return 'OPTIMAL: Continue current behavior';
        }
    }
    
    getRecommendations() {
        const recommendations = [];
        
        if (this.emergencyMode) {
            recommendations.push('Emergency mode active - all delays doubled');
        }
        
        const schedule = this.isWithinHumanActivitySchedule();
        if (schedule.shouldDelay) {
            recommendations.push('Outside optimal posting hours - consider delaying');
        }
        
        if (this.dailyPostCount > 8) {
            recommendations.push('High daily post count - consider reducing frequency');
        }
        
        if (this.riskScore > 0.5) {
            recommendations.push('Elevated risk score - review recent patterns');
        }
        
        return recommendations;
    }
    
    startBehaviorTracking() {
        // Track daily post count reset
        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                this.dailyPostCount = 0;
                logger.info('[HUMANIZATION] Daily post count reset');
            }
        }, 60000); // Check every minute
        
        // Clean old behavior history
        setInterval(() => {
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const cutoff = Date.now() - oneWeek;
            this.behaviorHistory = this.behaviorHistory.filter(b => b.timestamp > cutoff);
        }, 3600000); // Clean every hour
    }
    
    trackBehavior(action, metadata = {}) {
        this.behaviorHistory.push({
            action,
            timestamp: Date.now(),
            metadata: {
                ...metadata,
                riskScore: this.riskScore,
                emergencyMode: this.emergencyMode
            }
        });
        
        if (action === 'post') {
            this.dailyPostCount++;
            this.lastPostTime = Date.now();
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = InstagramHumanizationEngine;