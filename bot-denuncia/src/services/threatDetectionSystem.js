/**
 * ThreatDetectionSystem - Real-time Security Threat Detection and Response
 * Implements advanced threat detection, anomaly detection, and automated response
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const prisma = require('../config/database');

class ThreatDetectionSystem extends EventEmitter {
  constructor() {
    super();
    
    // Threat detection configuration
    this.config = {
      // Rate limiting thresholds
      maxRequestsPerMinute: 60,
      maxFailedLoginsPerHour: 5,
      maxFileUploadsPerHour: 10,
      
      // Anomaly detection thresholds
      suspiciousActivityThreshold: 0.7,
      highRiskThreshold: 0.9,
      criticalThreatThreshold: 0.95,
      
      // Response automation settings
      autoBlockEnabled: true,
      autoAlertEnabled: true,
      quarantineEnabled: true,
      
      // Monitoring intervals
      realTimeMonitoringInterval: 30000, // 30 seconds
      threatAnalysisInterval: 300000,    // 5 minutes
      reportingInterval: 3600000         // 1 hour
    };
    
    // Threat intelligence database
    this.threatDatabase = {
      knownMalwareHashes: new Set(),
      suspiciousIPs: new Set(),
      blockedUserAgents: new Set(),
      maliciousPatterns: new Map(),
      vulnerabilityScanners: new Set()
    };
    
    // Real-time monitoring data
    this.activityMetrics = new Map();
    this.threatEvents = [];
    this.activeThreats = new Map();
    this.blockedEntities = new Set();
    
    // Anomaly detection models
    this.behaviorBaselines = new Map();
    this.anomalyDetectors = new Map();
    
    // Security incident tracking
    this.securityIncidents = [];
    this.incidentCounter = 0;
    
    // Initialize threat intelligence
    this.initializeThreatIntelligence();
    
    // Start real-time monitoring
    this.startRealTimeMonitoring();
    
    logger.info('🛡️ ThreatDetectionSystem initialized with real-time monitoring');
  }

  /**
   * REAL-TIME THREAT MONITORING
   */
  startRealTimeMonitoring() {
    // Real-time activity monitoring
    this.realTimeMonitor = setInterval(() => {
      this.performRealTimeAnalysis();
    }, this.config.realTimeMonitoringInterval);
    
    // Periodic threat analysis
    this.threatAnalyzer = setInterval(() => {
      this.performThreatAnalysis();
    }, this.config.threatAnalysisInterval);
    
    // Hourly reporting
    this.reportingTimer = setInterval(() => {
      this.generateThreatReport();
    }, this.config.reportingInterval);
    
    logger.info('🔍 Real-time threat monitoring started');
  }

  /**
   * THREAT DETECTION METHODS
   */

  // Analyze incoming request for threats
  async analyzeRequest(req, res, next) {
    try {
      const requestData = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'Unknown',
        method: req.method,
        url: req.url,
        timestamp: Date.now(),
        headers: req.headers,
        body: req.body
      };
      
      // Multi-layer threat analysis
      const threatAnalysis = {
        ipReputation: await this.analyzeIPReputation(requestData.ip),
        userAgentAnalysis: await this.analyzeUserAgent(requestData.userAgent),
        rateLimitAnalysis: await this.analyzeRateLimit(requestData.ip),
        payloadAnalysis: await this.analyzePayload(requestData),
        behaviorAnalysis: await this.analyzeBehavior(requestData),
        vulnerabilityScan: await this.detectVulnerabilityScanning(requestData)
      };
      
      // Calculate composite threat score
      const threatScore = this.calculateThreatScore(threatAnalysis);
      
      // Log the analysis
      this.logThreatAnalysis(requestData, threatAnalysis, threatScore);
      
      // Take action based on threat level
      const action = await this.determineResponseAction(threatScore, requestData);
      
      if (action.block) {
        return this.blockRequest(req, res, action);
      }
      
      if (action.alert) {
        this.triggerSecurityAlert(requestData, threatAnalysis, threatScore);
      }
      
      if (action.monitor) {
        this.addToWatchlist(requestData.ip, threatScore);
      }
      
      // Continue to next middleware if not blocked
      next();
      
    } catch (error) {
      logger.error('❌ Threat analysis failed:', error);
      next(); // Continue on error to avoid breaking the application
    }
  }

  // Analyze IP reputation
  async analyzeIPReputation(ip) {
    try {
      const analysis = {
        isKnownThreat: this.threatDatabase.suspiciousIPs.has(ip),
        isBlocked: this.blockedEntities.has(`ip:${ip}`),
        recentActivity: this.getRecentActivityForIP(ip),
        geolocation: await this.getIPGeolocation(ip),
        riskScore: 0
      };
      
      // Calculate risk score based on various factors
      if (analysis.isKnownThreat) analysis.riskScore += 0.8;
      if (analysis.isBlocked) analysis.riskScore = 1.0;
      if (analysis.recentActivity.suspiciousRequests > 10) analysis.riskScore += 0.3;
      if (analysis.geolocation && analysis.geolocation.isHighRiskCountry) analysis.riskScore += 0.2;
      
      return analysis;
      
    } catch (error) {
      logger.error(`❌ IP reputation analysis failed for ${ip}:`, error);
      return { riskScore: 0 };
    }
  }

  // Analyze User-Agent for suspicious patterns
  async analyzeUserAgent(userAgent) {
    try {
      const analysis = {
        isBot: this.detectBot(userAgent),
        isKnownMalicious: this.threatDatabase.blockedUserAgents.has(userAgent),
        isSuspicious: this.detectSuspiciousUserAgent(userAgent),
        riskScore: 0
      };
      
      if (analysis.isKnownMalicious) analysis.riskScore = 1.0;
      if (analysis.isSuspicious) analysis.riskScore += 0.6;
      if (analysis.isBot && !this.isLegitimateBot(userAgent)) analysis.riskScore += 0.4;
      
      return analysis;
      
    } catch (error) {
      logger.error('❌ User-Agent analysis failed:', error);
      return { riskScore: 0 };
    }
  }

  // Analyze rate limiting violations
  async analyzeRateLimit(ip) {
    try {
      const now = Date.now();
      const windowStart = now - (60 * 1000); // 1 minute window
      
      const recentRequests = this.getRequestsInWindow(ip, windowStart, now);
      const analysis = {
        requestCount: recentRequests.length,
        isExceeded: recentRequests.length > this.config.maxRequestsPerMinute,
        riskScore: 0
      };
      
      if (analysis.isExceeded) {
        analysis.riskScore = Math.min(1.0, recentRequests.length / this.config.maxRequestsPerMinute);
      }
      
      return analysis;
      
    } catch (error) {
      logger.error(`❌ Rate limit analysis failed for ${ip}:`, error);
      return { riskScore: 0 };
    }
  }

  // Analyze request payload for malicious content
  async analyzePayload(requestData) {
    try {
      const analysis = {
        hasSQLInjection: false,
        hasXSS: false,
        hasPathTraversal: false,
        hasCommandInjection: false,
        suspiciousPatterns: [],
        riskScore: 0
      };
      
      const payload = JSON.stringify(requestData.body || {}) + requestData.url;
      
      // SQL Injection detection
      const sqlPatterns = [
        /(\bor\b|\band\b).*?=.*?('|"|`)/i,
        /union.*select/i,
        /drop.*table/i,
        /insert.*into/i,
        /update.*set/i,
        /delete.*from/i
      ];
      
      for (const pattern of sqlPatterns) {
        if (pattern.test(payload)) {
          analysis.hasSQLInjection = true;
          analysis.suspiciousPatterns.push('SQL_INJECTION');
          analysis.riskScore += 0.8;
          break;
        }
      }
      
      // XSS detection
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /document\.cookie/i
      ];
      
      for (const pattern of xssPatterns) {
        if (pattern.test(payload)) {
          analysis.hasXSS = true;
          analysis.suspiciousPatterns.push('XSS');
          analysis.riskScore += 0.7;
          break;
        }
      }
      
      // Path traversal detection
      const pathTraversalPatterns = [
        /\.\.\//g,
        /\.\.\\\\]/g,
        /%2e%2e%2f/i,
        /%2e%2e%5c/i
      ];
      
      for (const pattern of pathTraversalPatterns) {
        if (pattern.test(payload)) {
          analysis.hasPathTraversal = true;
          analysis.suspiciousPatterns.push('PATH_TRAVERSAL');
          analysis.riskScore += 0.6;
          break;
        }
      }
      
      // Command injection detection
      const commandPatterns = [
        /[;&|`$()]/,
        /\b(rm|wget|curl|nc|telnet|ssh)\b/i,
        /\b(exec|eval|system|shell_exec)\b/i
      ];
      
      for (const pattern of commandPatterns) {
        if (pattern.test(payload)) {
          analysis.hasCommandInjection = true;
          analysis.suspiciousPatterns.push('COMMAND_INJECTION');
          analysis.riskScore += 0.9;
          break;
        }
      }
      
      return analysis;
      
    } catch (error) {
      logger.error('❌ Payload analysis failed:', error);
      return { riskScore: 0 };
    }
  }

  // Analyze behavioral patterns
  async analyzeBehavior(requestData) {
    try {
      const ip = requestData.ip;
      const baseline = this.behaviorBaselines.get(ip);
      
      if (!baseline) {
        // Create new baseline for this IP
        this.createBehaviorBaseline(ip, requestData);
        return { riskScore: 0, isFirstVisit: true };
      }
      
      const analysis = {
        deviationScore: this.calculateBehaviorDeviation(requestData, baseline),
        isAnomalous: false,
        anomalies: [],
        riskScore: 0
      };
      
      // Check for behavioral anomalies
      if (analysis.deviationScore > this.config.suspiciousActivityThreshold) {
        analysis.isAnomalous = true;
        analysis.riskScore = analysis.deviationScore;
        
        // Identify specific anomalies
        analysis.anomalies = this.identifyBehaviorAnomalies(requestData, baseline);
      }
      
      // Update baseline with new data
      this.updateBehaviorBaseline(ip, requestData);
      
      return analysis;
      
    } catch (error) {
      logger.error('❌ Behavior analysis failed:', error);
      return { riskScore: 0 };
    }
  }

  // Detect vulnerability scanning attempts
  async detectVulnerabilityScanning(requestData) {
    try {
      const analysis = {
        isVulnerabilityScanner: false,
        scannerType: null,
        suspiciousUrls: [],
        riskScore: 0
      };
      
      // Check for known vulnerability scanner user agents
      const scannerPatterns = [
        /nikto/i,
        /nessus/i,
        /openvas/i,
        /nmap/i,
        /sqlmap/i,
        /burpsuite/i,
        /acunetix/i,
        /wpscan/i
      ];
      
      for (const pattern of scannerPatterns) {
        if (pattern.test(requestData.userAgent)) {
          analysis.isVulnerabilityScanner = true;
          analysis.scannerType = pattern.source;
          analysis.riskScore = 0.95;
          break;
        }
      }
      
      // Check for suspicious URL patterns indicating scanning
      const scanningUrls = [
        /\/admin/i,
        /\/config/i,
        /\/backup/i,
        /\.env/i,
        /\/wp-admin/i,
        /\/phpmyadmin/i,
        /\/cgi-bin/i,
        /\/etc\/passwd/i
      ];
      
      for (const pattern of scanningUrls) {
        if (pattern.test(requestData.url)) {
          analysis.suspiciousUrls.push(requestData.url);
          analysis.riskScore += 0.3;
        }
      }
      
      // Check for directory traversal or file enumeration
      if (requestData.url.includes('..') || requestData.url.includes('%2e%2e')) {
        analysis.suspiciousUrls.push(requestData.url);
        analysis.riskScore += 0.4;
      }
      
      return analysis;
      
    } catch (error) {
      logger.error('❌ Vulnerability scanning detection failed:', error);
      return { riskScore: 0 };
    }
  }

  /**
   * THREAT RESPONSE ACTIONS
   */

  // Calculate composite threat score
  calculateThreatScore(analysis) {
    const weights = {
      ipReputation: 0.25,
      userAgentAnalysis: 0.15,
      rateLimitAnalysis: 0.20,
      payloadAnalysis: 0.25,
      behaviorAnalysis: 0.10,
      vulnerabilityScan: 0.05
    };
    
    let compositeScore = 0;
    for (const [category, weight] of Object.entries(weights)) {
      if (analysis[category] && analysis[category].riskScore !== undefined) {
        compositeScore += analysis[category].riskScore * weight;
      }
    }
    
    return Math.min(1.0, compositeScore);
  }

  // Determine response action based on threat score
  async determineResponseAction(threatScore, requestData) {
    const action = {
      block: false,
      alert: false,
      monitor: false,
      quarantine: false,
      reason: []
    };
    
    if (threatScore >= this.config.criticalThreatThreshold) {
      action.block = true;
      action.alert = true;
      action.quarantine = true;
      action.reason.push('CRITICAL_THREAT_DETECTED');
      
      // Add to blocked entities
      this.blockedEntities.add(`ip:${requestData.ip}`);
      
      // Create security incident
      await this.createSecurityIncident('CRITICAL', 'Critical threat detected and blocked', {
        ip: requestData.ip,
        threatScore,
        url: requestData.url,
        userAgent: requestData.userAgent
      });
      
    } else if (threatScore >= this.config.highRiskThreshold) {
      action.alert = true;
      action.monitor = true;
      action.quarantine = true;
      action.reason.push('HIGH_RISK_ACTIVITY');
      
      // Create security incident
      await this.createSecurityIncident('HIGH', 'High-risk activity detected', {
        ip: requestData.ip,
        threatScore,
        url: requestData.url
      });
      
    } else if (threatScore >= this.config.suspiciousActivityThreshold) {
      action.monitor = true;
      action.reason.push('SUSPICIOUS_ACTIVITY');
      
      // Add to watchlist
      this.addToWatchlist(requestData.ip, threatScore);
    }
    
    return action;
  }

  // Block malicious request
  blockRequest(req, res, action) {
    const blockInfo = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      reason: action.reason.join(', '),
      url: req.url,
      userAgent: req.get('User-Agent')
    };
    
    logger.warn('🚫 Request blocked:', blockInfo);
    
    // Emit threat event
    this.emit('threatBlocked', blockInfo);
    
    return res.status(403).json({
      error: 'Access denied',
      code: 'SECURITY_THREAT_DETECTED',
      timestamp: blockInfo.timestamp,
      requestId: crypto.randomUUID()
    });
  }

  // Trigger security alert
  triggerSecurityAlert(requestData, analysis, threatScore) {
    const alert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      severity: threatScore >= 0.9 ? 'CRITICAL' : 'HIGH',
      type: 'SECURITY_THREAT',
      source: requestData.ip,
      threatScore,
      analysis,
      requestData: {
        url: requestData.url,
        userAgent: requestData.userAgent,
        method: requestData.method
      }
    };
    
    logger.warn('🚨 Security alert triggered:', alert);
    
    // Emit alert event
    this.emit('securityAlert', alert);
    
    // Store alert for reporting
    this.threatEvents.push(alert);
  }

  // Add IP to watchlist
  addToWatchlist(ip, threatScore) {
    const watchlistEntry = {
      ip,
      threatScore,
      timestamp: Date.now(),
      events: []
    };
    
    this.activeThreats.set(ip, watchlistEntry);
    
    logger.info(`👁️ IP added to watchlist: ${ip} (score: ${threatScore.toFixed(3)})`);
  }

  /**
   * REAL-TIME ANALYSIS METHODS
   */

  // Perform real-time threat analysis
  async performRealTimeAnalysis() {
    try {
      // Analyze current threat landscape
      const analysis = {
        timestamp: new Date().toISOString(),
        activeThreats: this.activeThreats.size,
        blockedEntities: this.blockedEntities.size,
        recentAlerts: this.threatEvents.filter(e => 
          Date.now() - new Date(e.timestamp).getTime() < 300000 // 5 minutes
        ).length,
        systemHealth: this.calculateSystemHealth()
      };
      
      // Check for threat escalation
      await this.checkThreatEscalation();
      
      // Clean up expired entries
      this.cleanupExpiredThreats();
      
      // Log analysis results
      if (analysis.recentAlerts > 0 || analysis.activeThreats > 10) {
        logger.info('🔍 Real-time threat analysis:', analysis);
      }
      
    } catch (error) {
      logger.error('❌ Real-time analysis failed:', error);
    }
  }

  // Perform periodic threat analysis
  async performThreatAnalysis() {
    try {
      logger.info('🕵️ Performing comprehensive threat analysis...');
      
      // Analyze threat patterns
      const patterns = this.analyzeThreatPatterns();
      
      // Update threat intelligence
      await this.updateThreatIntelligence();
      
      // Generate threat metrics
      const metrics = this.generateThreatMetrics();
      
      // Adjust detection sensitivity based on current threat level
      this.adjustDetectionSensitivity(metrics.overallThreatLevel);
      
      logger.info('✅ Threat analysis completed:', {
        threatPatterns: patterns.length,
        overallThreatLevel: metrics.overallThreatLevel
      });
      
    } catch (error) {
      logger.error('❌ Periodic threat analysis failed:', error);
    }
  }

  /**
   * SECURITY INCIDENT MANAGEMENT
   */

  // Create security incident
  async createSecurityIncident(severity, description, details = {}) {
    try {
      const incident = {
        id: crypto.randomUUID(),
        incidentNumber: `SEC-${Date.now()}-${++this.incidentCounter}`,
        timestamp: new Date().toISOString(),
        severity,
        status: 'OPEN',
        description,
        details,
        actions: [],
        resolution: null,
        resolvedAt: null
      };
      
      this.securityIncidents.push(incident);
      
      logger.warn(`🚨 Security incident created: ${incident.incidentNumber} - ${severity} - ${description}`);
      
      // Emit incident event
      this.emit('securityIncident', incident);
      
      // Auto-respond based on severity
      if (severity === 'CRITICAL') {
        await this.executeIncidentResponse(incident);
      }
      
      return incident;
      
    } catch (error) {
      logger.error('❌ Failed to create security incident:', error);
    }
  }

  // Execute incident response procedures
  async executeIncidentResponse(incident) {
    try {
      logger.warn(`🚑 Executing incident response for ${incident.incidentNumber}`);
      
      const responseActions = [];
      
      // Block the threat source immediately
      if (incident.details.ip) {
        this.blockedEntities.add(`ip:${incident.details.ip}`);
        responseActions.push(`Blocked IP: ${incident.details.ip}`);
      }
      
      // Quarantine suspicious uploads if any
      if (incident.details.uploads) {
        await this.quarantineUploads(incident.details.uploads);
        responseActions.push('Quarantined suspicious uploads');
      }
      
      // Notify administrators
      await this.notifyAdministrators(incident);
      responseActions.push('Administrators notified');
      
      // Update incident with response actions
      incident.actions = responseActions;
      incident.status = 'RESPONDING';
      
      logger.info(`✅ Incident response executed for ${incident.incidentNumber}:`, responseActions);
      
    } catch (error) {
      logger.error(`❌ Incident response failed for ${incident.incidentNumber}:`, error);
    }
  }

  /**
   * ANOMALY DETECTION METHODS
   */

  // Create behavior baseline for new IP
  createBehaviorBaseline(ip, requestData) {
    const baseline = {
      ip,
      firstSeen: Date.now(),
      requestPattern: {
        avgRequestsPerMinute: 1,
        commonUrls: [requestData.url],
        commonUserAgents: [requestData.userAgent],
        requestMethods: [requestData.method],
        avgPayloadSize: JSON.stringify(requestData.body || {}).length
      },
      timestamps: [Date.now()],
      sampleSize: 1
    };
    
    this.behaviorBaselines.set(ip, baseline);
  }

  // Calculate behavior deviation from baseline
  calculateBehaviorDeviation(requestData, baseline) {
    let deviation = 0;
    
    // Check URL deviation
    if (!baseline.requestPattern.commonUrls.includes(requestData.url)) {
      deviation += 0.2;
    }
    
    // Check User-Agent deviation
    if (!baseline.requestPattern.commonUserAgents.includes(requestData.userAgent)) {
      deviation += 0.3;
    }
    
    // Check method deviation
    if (!baseline.requestPattern.requestMethods.includes(requestData.method)) {
      deviation += 0.1;
    }
    
    // Check payload size deviation
    const payloadSize = JSON.stringify(requestData.body || {}).length;
    const sizeDeviation = Math.abs(payloadSize - baseline.requestPattern.avgPayloadSize) / 
                         Math.max(baseline.requestPattern.avgPayloadSize, 1);
    if (sizeDeviation > 2.0) {
      deviation += 0.2;
    }
    
    // Check request frequency deviation
    const now = Date.now();
    const recentRequests = baseline.timestamps.filter(t => now - t < 60000).length;
    if (recentRequests > baseline.requestPattern.avgRequestsPerMinute * 3) {
      deviation += 0.2;
    }
    
    return Math.min(1.0, deviation);
  }

  // Update behavior baseline with new data
  updateBehaviorBaseline(ip, requestData) {
    const baseline = this.behaviorBaselines.get(ip);
    if (!baseline) return;
    
    // Add new timestamp
    baseline.timestamps.push(Date.now());
    
    // Keep only recent timestamps (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    baseline.timestamps = baseline.timestamps.filter(t => t > oneHourAgo);
    
    // Update patterns
    if (!baseline.requestPattern.commonUrls.includes(requestData.url)) {
      baseline.requestPattern.commonUrls.push(requestData.url);
      if (baseline.requestPattern.commonUrls.length > 10) {
        baseline.requestPattern.commonUrls.shift(); // Keep only 10 most recent
      }
    }
    
    if (!baseline.requestPattern.commonUserAgents.includes(requestData.userAgent)) {
      baseline.requestPattern.commonUserAgents.push(requestData.userAgent);
      if (baseline.requestPattern.commonUserAgents.length > 5) {
        baseline.requestPattern.commonUserAgents.shift();
      }
    }
    
    // Update sample size
    baseline.sampleSize++;
    
    // Recalculate average requests per minute
    baseline.requestPattern.avgRequestsPerMinute = 
      baseline.timestamps.length / Math.max(1, (Date.now() - baseline.firstSeen) / 60000);
  }

  /**
   * UTILITY METHODS
   */

  // Initialize threat intelligence database
  initializeThreatIntelligence() {
    // Known malicious IP addresses (example - in production, use threat feed)
    const maliciousIPs = [
      '192.168.1.100',  // Example malicious IP
      '10.0.0.50'       // Example malicious IP
    ];
    
    maliciousIPs.forEach(ip => this.threatDatabase.suspiciousIPs.add(ip));
    
    // Known malicious user agents
    const maliciousUserAgents = [
      'sqlmap',
      'nikto',
      'python-requests',
      'curl/7.0'
    ];
    
    maliciousUserAgents.forEach(ua => this.threatDatabase.blockedUserAgents.add(ua));
    
    // Vulnerability scanner patterns
    const scannerAgents = [
      'Acunetix',
      'w3af',
      'Nessus',
      'OpenVAS'
    ];
    
    scannerAgents.forEach(scanner => this.threatDatabase.vulnerabilityScanners.add(scanner));
    
    logger.info('🧠 Threat intelligence database initialized');
  }

  // Get recent activity for IP
  getRecentActivityForIP(ip) {
    const activity = this.activityMetrics.get(ip) || {
      requests: 0,
      suspiciousRequests: 0,
      failedLogins: 0,
      lastSeen: null
    };
    
    return activity;
  }

  // Get IP geolocation (mock implementation)
  async getIPGeolocation(ip) {
    // In production, integrate with a geolocation service
    return {
      country: 'Unknown',
      isHighRiskCountry: false,
      isTorNode: false,
      isProxy: false
    };
  }

  // Detect if user agent is a bot
  detectBot(userAgent) {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i
    ];
    
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  // Check if bot is legitimate
  isLegitimateBot(userAgent) {
    const legitimateBots = [
      /googlebot/i,
      /bingbot/i,
      /facebookexternalhit/i,
      /twitterbot/i,
      /linkedinbot/i
    ];
    
    return legitimateBots.some(pattern => pattern.test(userAgent));
  }

  // Detect suspicious user agent patterns
  detectSuspiciousUserAgent(userAgent) {
    const suspiciousPatterns = [
      /^$/,  // Empty user agent
      /test/i,
      /scanner/i,
      /hack/i,
      /exploit/i,
      /payload/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  // Get requests in time window
  getRequestsInWindow(ip, startTime, endTime) {
    const activity = this.activityMetrics.get(ip);
    if (!activity || !activity.requestTimes) return [];
    
    return activity.requestTimes.filter(time => time >= startTime && time <= endTime);
  }

  // Log threat analysis
  logThreatAnalysis(requestData, analysis, threatScore) {
    if (threatScore > 0.3) { // Only log significant threats
      const logEntry = {
        timestamp: new Date().toISOString(),
        ip: requestData.ip,
        url: requestData.url,
        userAgent: requestData.userAgent,
        threatScore: threatScore.toFixed(3),
        analysis: this.summarizeAnalysis(analysis)
      };
      
      logger.info('🔍 Threat Analysis:', logEntry);
    }
    
    // Update activity metrics
    this.updateActivityMetrics(requestData.ip, threatScore);
  }

  // Summarize analysis for logging
  summarizeAnalysis(analysis) {
    const summary = {};
    
    Object.keys(analysis).forEach(key => {
      if (analysis[key] && analysis[key].riskScore > 0) {
        summary[key] = analysis[key].riskScore.toFixed(3);
      }
    });
    
    return summary;
  }

  // Update activity metrics
  updateActivityMetrics(ip, threatScore) {
    const activity = this.activityMetrics.get(ip) || {
      requests: 0,
      suspiciousRequests: 0,
      maxThreatScore: 0,
      firstSeen: Date.now(),
      lastSeen: null,
      requestTimes: []
    };
    
    activity.requests++;
    activity.lastSeen = Date.now();
    activity.requestTimes.push(Date.now());
    
    if (threatScore > 0.3) {
      activity.suspiciousRequests++;
    }
    
    if (threatScore > activity.maxThreatScore) {
      activity.maxThreatScore = threatScore;
    }
    
    // Keep only recent request times (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    activity.requestTimes = activity.requestTimes.filter(time => time > oneHourAgo);
    
    this.activityMetrics.set(ip, activity);
  }

  // Calculate system health
  calculateSystemHealth() {
    const activeThreats = this.activeThreats.size;
    const recentIncidents = this.securityIncidents.filter(i => 
      Date.now() - new Date(i.timestamp).getTime() < 3600000 // 1 hour
    ).length;
    
    let healthScore = 100;
    
    if (activeThreats > 50) healthScore -= 30;
    else if (activeThreats > 20) healthScore -= 15;
    else if (activeThreats > 10) healthScore -= 5;
    
    if (recentIncidents > 10) healthScore -= 40;
    else if (recentIncidents > 5) healthScore -= 20;
    else if (recentIncidents > 1) healthScore -= 10;
    
    return Math.max(0, healthScore);
  }

  // Check for threat escalation
  async checkThreatEscalation() {
    const now = Date.now();
    const escalationWindow = 300000; // 5 minutes
    
    for (const [ip, threat] of this.activeThreats.entries()) {
      const timeSinceDetection = now - threat.timestamp;
      
      if (timeSinceDetection > escalationWindow && threat.threatScore > 0.8) {
        // Escalate threat
        await this.createSecurityIncident(
          'HIGH',
          `Persistent high-risk activity from ${ip}`,
          { ip, threatScore: threat.threatScore, duration: timeSinceDetection }
        );
        
        // Remove from active threats to avoid duplicate incidents
        this.activeThreats.delete(ip);
      }
    }
  }

  // Clean up expired threats
  cleanupExpiredThreats() {
    const now = Date.now();
    const expirationTime = 3600000; // 1 hour
    
    for (const [ip, threat] of this.activeThreats.entries()) {
      if (now - threat.timestamp > expirationTime) {
        this.activeThreats.delete(ip);
      }
    }
    
    // Clean up old activity metrics
    for (const [ip, activity] of this.activityMetrics.entries()) {
      if (now - activity.lastSeen > expirationTime * 24) { // 24 hours
        this.activityMetrics.delete(ip);
      }
    }
  }

  // Analyze threat patterns
  analyzeThreatPatterns() {
    const patterns = [];
    
    // Analyze common attack patterns from recent events
    const recentEvents = this.threatEvents.filter(e => 
      Date.now() - new Date(e.timestamp).getTime() < 3600000 // 1 hour
    );
    
    const ipFrequency = new Map();
    const urlFrequency = new Map();
    const userAgentFrequency = new Map();
    
    recentEvents.forEach(event => {
      const ip = event.source;
      const url = event.requestData?.url;
      const userAgent = event.requestData?.userAgent;
      
      ipFrequency.set(ip, (ipFrequency.get(ip) || 0) + 1);
      if (url) urlFrequency.set(url, (urlFrequency.get(url) || 0) + 1);
      if (userAgent) userAgentFrequency.set(userAgent, (userAgentFrequency.get(userAgent) || 0) + 1);
    });
    
    // Identify patterns
    for (const [ip, count] of ipFrequency.entries()) {
      if (count > 5) {
        patterns.push({
          type: 'REPEATED_IP_ATTACKS',
          value: ip,
          frequency: count,
          severity: count > 10 ? 'HIGH' : 'MEDIUM'
        });
      }
    }
    
    return patterns;
  }

  // Update threat intelligence
  async updateThreatIntelligence() {
    // In production, this would fetch from external threat feeds
    logger.debug('🧠 Threat intelligence updated');
  }

  // Generate threat metrics
  generateThreatMetrics() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const recentThreats = this.threatEvents.filter(e => 
      now - new Date(e.timestamp).getTime() < oneHour
    );
    
    const criticalThreats = recentThreats.filter(e => e.severity === 'CRITICAL').length;
    const highThreats = recentThreats.filter(e => e.severity === 'HIGH').length;
    
    let overallThreatLevel = 'LOW';
    if (criticalThreats > 5 || highThreats > 20) {
      overallThreatLevel = 'CRITICAL';
    } else if (criticalThreats > 2 || highThreats > 10) {
      overallThreatLevel = 'HIGH';
    } else if (criticalThreats > 0 || highThreats > 5) {
      overallThreatLevel = 'MEDIUM';
    }
    
    return {
      overallThreatLevel,
      recentThreats: recentThreats.length,
      criticalThreats,
      highThreats,
      activeThreats: this.activeThreats.size,
      blockedEntities: this.blockedEntities.size
    };
  }

  // Adjust detection sensitivity
  adjustDetectionSensitivity(threatLevel) {
    switch (threatLevel) {
      case 'CRITICAL':
        this.config.suspiciousActivityThreshold = 0.5;
        this.config.highRiskThreshold = 0.7;
        this.config.maxRequestsPerMinute = 30;
        break;
      case 'HIGH':
        this.config.suspiciousActivityThreshold = 0.6;
        this.config.highRiskThreshold = 0.8;
        this.config.maxRequestsPerMinute = 45;
        break;
      case 'MEDIUM':
        this.config.suspiciousActivityThreshold = 0.7;
        this.config.highRiskThreshold = 0.9;
        this.config.maxRequestsPerMinute = 60;
        break;
      default:
        // Keep default values
        break;
    }
    
    logger.info(`🎚️ Detection sensitivity adjusted for ${threatLevel} threat level`);
  }

  // Generate threat report
  async generateThreatReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        period: 'LAST_HOUR',
        metrics: this.generateThreatMetrics(),
        topThreats: this.getTopThreats(),
        securityIncidents: this.getRecentIncidents(),
        systemHealth: this.calculateSystemHealth(),
        recommendations: this.generateSecurityRecommendations()
      };
      
      logger.info('📊 Threat Report Generated:', {
        threats: report.metrics.recentThreats,
        incidents: report.securityIncidents.length,
        systemHealth: report.systemHealth
      });
      
      // Emit report event
      this.emit('threatReport', report);
      
      return report;
      
    } catch (error) {
      logger.error('❌ Failed to generate threat report:', error);
    }
  }

  // Get top threats
  getTopThreats() {
    return Array.from(this.activeThreats.entries())
      .sort(([,a], [,b]) => b.threatScore - a.threatScore)
      .slice(0, 10)
      .map(([ip, threat]) => ({
        ip,
        threatScore: threat.threatScore,
        timestamp: threat.timestamp,
        duration: Date.now() - threat.timestamp
      }));
  }

  // Get recent incidents
  getRecentIncidents() {
    const oneHour = 60 * 60 * 1000;
    return this.securityIncidents.filter(i => 
      Date.now() - new Date(i.timestamp).getTime() < oneHour
    );
  }

  // Generate security recommendations
  generateSecurityRecommendations() {
    const recommendations = [];
    const metrics = this.generateThreatMetrics();
    
    if (metrics.criticalThreats > 0) {
      recommendations.push('Review and strengthen critical security controls immediately');
    }
    
    if (metrics.activeThreats > 50) {
      recommendations.push('Consider implementing additional rate limiting measures');
    }
    
    if (this.blockedEntities.size > 100) {
      recommendations.push('Review blocked entities list and consider permanent bans');
    }
    
    return recommendations;
  }

  // Quarantine uploads (placeholder)
  async quarantineUploads(uploads) {
    logger.info('🔒 Quarantining suspicious uploads:', uploads);
    // Implementation would move files to quarantine directory
  }

  // Notify administrators (placeholder)
  async notifyAdministrators(incident) {
    logger.warn('📧 Notifying administrators of security incident:', incident.incidentNumber);
    // Implementation would send notifications via email, SMS, etc.
  }

  // Shutdown threat detection system
  shutdown() {
    if (this.realTimeMonitor) clearInterval(this.realTimeMonitor);
    if (this.threatAnalyzer) clearInterval(this.threatAnalyzer);
    if (this.reportingTimer) clearInterval(this.reportingTimer);
    
    logger.info('🛡️ ThreatDetectionSystem shutdown completed');
  }

  // Get system status
  getSystemStatus() {
    return {
      isActive: !!this.realTimeMonitor,
      activeThreats: this.activeThreats.size,
      blockedEntities: this.blockedEntities.size,
      recentIncidents: this.getRecentIncidents().length,
      systemHealth: this.calculateSystemHealth(),
      config: this.config
    };
  }
}

module.exports = ThreatDetectionSystem;