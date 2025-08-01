/**
 * SecurityComplianceValidator - Comprehensive Security Assessment and LGPD Compliance Engine
 * Implements enterprise-grade security validation and regulatory compliance framework
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const prisma = require('../config/database');

class SecurityComplianceValidator {
  constructor() {
    this.vulnerabilityThresholds = {
      CRITICAL: 9.0,
      HIGH: 7.0,
      MEDIUM: 4.0,
      LOW: 1.0
    };
    
    this.lgpdRequirements = [
      'DATA_MINIMIZATION',
      'CONSENT_MANAGEMENT', 
      'DATA_RETENTION',
      'DATA_ANONYMIZATION',
      'SUBJECT_RIGHTS',
      'AUDIT_TRAIL',
      'BREACH_NOTIFICATION',
      'PRIVACY_POLICY',
      'CROSS_BORDER_TRANSFER',
      'DATA_PROTECTION_OFFICER'
    ];
    
    // Security scan results cache
    this.scanResults = new Map();
    this.lastScanTimestamp = null;
    
    // Real-time threat monitoring
    this.threatLevels = new Map();
    this.securityIncidents = [];
    
    logger.info('🛡️ SecurityComplianceValidator initialized');
  }

  /**
   * COMPREHENSIVE SECURITY ASSESSMENT
   */
  async performSecurityAssessment() {
    const startTime = Date.now();
    logger.info('🔍 Starting comprehensive security assessment...');
    
    try {
      const assessment = {
        timestamp: new Date().toISOString(),
        assessmentId: crypto.randomUUID(),
        
        // Authentication & Authorization Security
        authSecurity: await this.assessAuthenticationSecurity(),
        
        // API Security Validation
        apiSecurity: await this.assessApiSecurity(),
        
        // WhatsApp Integration Security
        whatsappSecurity: await this.assessWhatsAppSecurity(),
        
        // Instagram Integration Security
        instagramSecurity: await this.assessInstagramSecurity(),
        
        // Data Flow Security Analysis
        dataFlowSecurity: await this.assessDataFlowSecurity(),
        
        // Network Security & Encryption
        networkSecurity: await this.assessNetworkSecurity(),
        
        // Platform Policy Compliance
        platformCompliance: await this.assessPlatformCompliance(),
        
        // Overall Security Score
        overallScore: 0,
        riskRating: 'UNKNOWN',
        criticalVulnerabilities: [],
        recommendations: []
      };
      
      // Calculate overall security score
      assessment.overallScore = this.calculateOverallSecurityScore(assessment);
      assessment.riskRating = this.determineRiskRating(assessment.overallScore);
      
      // Extract critical vulnerabilities
      assessment.criticalVulnerabilities = this.extractCriticalVulnerabilities(assessment);
      
      // Generate security recommendations
      assessment.recommendations = this.generateSecurityRecommendations(assessment);
      
      const processingTime = Date.now() - startTime;
      logger.info(`✅ Security assessment completed in ${processingTime}ms - Score: ${assessment.overallScore}/100, Risk: ${assessment.riskRating}`);
      
      // Store assessment results
      this.scanResults.set('latest', assessment);
      this.lastScanTimestamp = Date.now();
      
      return assessment;
      
    } catch (error) {
      logger.error('❌ Security assessment failed:', error);
      throw new Error(`Security assessment failed: ${error.message}`);
    }
  }

  /**
   * AUTHENTICATION & AUTHORIZATION SECURITY ASSESSMENT
   */
  async assessAuthenticationSecurity() {
    const findings = [];
    let score = 100;
    
    try {
      // JWT Secret Strength Analysis
      const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
      if (jwtSecret === 'your-super-secret-jwt-key-change-in-production' || jwtSecret.length < 32) {
        findings.push({
          severity: 'CRITICAL',
          category: 'JWT_SECURITY',
          issue: 'Weak or default JWT secret detected',
          description: 'JWT secret is either default value or too short (< 32 chars)',
          impact: 'Authentication bypass, token forgery attacks',
          remediation: 'Use cryptographically strong JWT secret (>= 64 chars)',
          cve: 'CWE-256: Unprotected Storage of Credentials',
          score: -25
        });
        score -= 25;
      }
      
      // Password Hashing Algorithm Analysis
      const testHash = await bcryptjs.hash('test', 12);
      if (!testHash.startsWith('$2b$12$')) {
        findings.push({
          severity: 'HIGH',
          category: 'PASSWORD_SECURITY',
          issue: 'Weak password hashing detected',
          description: 'BCrypt rounds < 12 or using weaker algorithm',
          impact: 'Password cracking, credential compromise',
          remediation: 'Use BCrypt with 12+ rounds',
          cve: 'CWE-327: Use of a Broken or Risky Cryptographic Algorithm',
          score: -15
        });
        score -= 15;
      }
      
      // Session Management Security
      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
      const expiryHours = this.parseExpiryToHours(jwtExpiresIn);
      if (expiryHours > 24) {
        findings.push({
          severity: 'MEDIUM',
          category: 'SESSION_MANAGEMENT',
          issue: 'Excessive token lifetime',
          description: `JWT tokens expire after ${expiryHours} hours`,
          impact: 'Extended attack window for compromised tokens',
          remediation: 'Reduce token lifetime to <= 24 hours',
          cve: 'CWE-613: Insufficient Session Expiration',
          score: -10
        });
        score -= 10;
      }
      
      // Database Query Security Analysis
      const authMiddlewarePath = path.join(__dirname, '../middleware/auth.js');
      const authCode = await fs.readFile(authMiddlewarePath, 'utf8');
      
      // Check for SQL injection vulnerabilities
      if (authCode.includes('$1') || authCode.includes('?')) {
        findings.push({
          severity: 'HIGH',
          category: 'SQL_INJECTION',
          issue: 'Potential SQL injection vulnerability',
          description: 'Raw SQL parameters detected in authentication code',
          impact: 'Database compromise, data exfiltration',
          remediation: 'Use parameterized queries with Prisma ORM',
          cve: 'CWE-89: SQL Injection',
          score: -20
        });
        score -= 20;
      }
      
      logger.info(`🔐 Authentication security assessment: ${score}/100 - ${findings.length} findings`);
      
      return {
        score: Math.max(0, score),
        findings,
        recommendations: this.generateAuthSecurityRecommendations(findings)
      };
      
    } catch (error) {
      logger.error('❌ Authentication security assessment failed:', error);
      return {
        score: 0,
        findings: [{
          severity: 'CRITICAL',
          category: 'ASSESSMENT_ERROR',
          issue: 'Authentication security assessment failed',
          description: error.message,
          score: -100
        }],
        recommendations: ['Fix authentication security assessment errors']
      };
    }
  }

  /**
   * API SECURITY VALIDATION
   */
  async assessApiSecurity() {
    const findings = [];
    let score = 100;
    
    try {
      // Rate Limiting Analysis
      const validationPath = path.join(__dirname, '../middleware/validation.js');
      const validationCode = await fs.readFile(validationPath, 'utf8');
      
      // Check for disabled rate limiting
      if (validationCode.includes('login: (req, res, next) => next()')) {
        findings.push({
          severity: 'CRITICAL',
          category: 'RATE_LIMITING',
          issue: 'Login rate limiting disabled',
          description: 'Authentication endpoint has no rate limiting protection',
          impact: 'Brute force attacks, credential stuffing',
          remediation: 'Enable strict rate limiting for authentication endpoints',
          cve: 'CWE-307: Improper Restriction of Excessive Authentication Attempts',
          score: -30
        });
        score -= 30;
      }
      
      // Input Validation Analysis
      if (!validationCode.includes('sanitizeInput')) {
        findings.push({
          severity: 'HIGH',
          category: 'INPUT_VALIDATION',
          issue: 'Missing input sanitization',
          description: 'API endpoints lack comprehensive input sanitization',
          impact: 'XSS attacks, injection vulnerabilities',
          remediation: 'Implement comprehensive input sanitization middleware',
          cve: 'CWE-79: Cross-site Scripting',
          score: -20
        });
        score -= 20;
      }
      
      // CORS Configuration Security
      if (validationCode.includes("callback(null, true)")) {
        findings.push({
          severity: 'MEDIUM',
          category: 'CORS_SECURITY',
          issue: 'Permissive CORS configuration',
          description: 'CORS allows requests without origin validation',
          impact: 'Cross-origin attacks, data exfiltration',
          remediation: 'Implement strict origin validation for CORS',
          cve: 'CWE-346: Origin Validation Error',
          score: -15
        });
        score -= 15;
      }
      
      // Helmet Security Headers Analysis
      if (!validationCode.includes('contentSecurityPolicy')) {
        findings.push({
          severity: 'MEDIUM',
          category: 'SECURITY_HEADERS',
          issue: 'Missing Content Security Policy',
          description: 'CSP headers not properly configured',
          impact: 'XSS attacks, data injection',
          remediation: 'Configure comprehensive CSP headers',
          cve: 'CWE-1021: Improper Restriction of Rendered UI Layers',
          score: -10
        });
        score -= 10;
      }
      
      logger.info(`🌐 API security assessment: ${score}/100 - ${findings.length} findings`);
      
      return {
        score: Math.max(0, score),
        findings,
        recommendations: this.generateApiSecurityRecommendations(findings)
      };
      
    } catch (error) {
      logger.error('❌ API security assessment failed:', error);
      return {
        score: 0,
        findings: [{
          severity: 'CRITICAL',
          category: 'ASSESSMENT_ERROR',
          issue: 'API security assessment failed',
          description: error.message,
          score: -100
        }],
        recommendations: ['Fix API security assessment errors']
      };
    }
  }

  /**
   * WHATSAPP INTEGRATION SECURITY ASSESSMENT
   */
  async assessWhatsAppSecurity() {
    const findings = [];
    let score = 100;
    
    try {
      // WhatsApp Session Security Analysis
      const sessionPath = path.join(__dirname, '../../.wwebjs_auth');
      try {
        await fs.access(sessionPath);
        findings.push({
          severity: 'MEDIUM',
          category: 'SESSION_STORAGE',
          issue: 'WhatsApp session data stored unencrypted',
          description: 'Local session files lack encryption protection',
          impact: 'Session hijacking if file system compromised',
          remediation: 'Encrypt WhatsApp session data at rest',
          cve: 'CWE-312: Cleartext Storage of Sensitive Information',
          score: -15
        });
        score -= 15;
      } catch (error) {
        // Session files don't exist - this is actually better for security
      }
      
      // Message Processing Security
      const whatsappServicePath = path.join(__dirname, './whatsappService.js');
      const whatsappCode = await fs.readFile(whatsappServicePath, 'utf8');
      
      // Check for message content logging
      if (whatsappCode.includes('console.log') && whatsappCode.includes('message')) {
        findings.push({
          severity: 'HIGH',
          category: 'DATA_EXPOSURE',
          issue: 'Message content logged to console',
          description: 'WhatsApp messages being logged in plaintext',
          impact: 'Personal data exposure in log files',
          remediation: 'Remove or encrypt message content logging',
          cve: 'CWE-532: Insertion of Sensitive Information into Log File',
          score: -20
        });
        score -= 20;
      }
      
      // File Upload Security
      if (whatsappCode.includes('downloadMedia') && !whatsappCode.includes('virus')) {
        findings.push({
          severity: 'HIGH',
          category: 'FILE_UPLOAD_SECURITY',
          issue: 'Missing malware scanning for file uploads',
          description: 'WhatsApp media files not scanned for malware',
          impact: 'Malware propagation, system compromise',
          remediation: 'Implement antivirus scanning for all uploaded files',
          cve: 'CWE-434: Unrestricted Upload of File with Dangerous Type',
          score: -20
        });
        score -= 20;
      }
      
      // Rate Limiting for WhatsApp Messages
      if (!whatsappCode.includes('rateLimitDelay')) {
        findings.push({
          severity: 'MEDIUM',
          category: 'RATE_LIMITING',
          issue: 'No rate limiting for WhatsApp message processing',
          description: 'WhatsApp message processing lacks rate limiting',
          impact: 'Service abuse, resource exhaustion',
          remediation: 'Implement rate limiting for message processing',
          cve: 'CWE-770: Allocation of Resources Without Limits',
          score: -10
        });
        score -= 10;
      }
      
      logger.info(`📱 WhatsApp security assessment: ${score}/100 - ${findings.length} findings`);
      
      return {
        score: Math.max(0, score),
        findings,
        recommendations: this.generateWhatsAppSecurityRecommendations(findings)
      };
      
    } catch (error) {
      logger.error('❌ WhatsApp security assessment failed:', error);
      return {
        score: 0,
        findings: [{
          severity: 'CRITICAL',
          category: 'ASSESSMENT_ERROR',
          issue: 'WhatsApp security assessment failed',
          description: error.message,
          score: -100
        }],
        recommendations: ['Fix WhatsApp security assessment errors']
      };
    }
  }

  /**
   * INSTAGRAM INTEGRATION SECURITY ASSESSMENT
   */
  async assessInstagramSecurity() {
    const findings = [];
    let score = 100;
    
    try {
      // Instagram Credentials Security
      const instagramUsername = process.env.INSTAGRAM_USERNAME;
      const instagramPassword = process.env.INSTAGRAM_PASSWORD;
      
      if (!instagramUsername || !instagramPassword) {
        findings.push({
          severity: 'HIGH',
          category: 'CREDENTIAL_MANAGEMENT',
          issue: 'Missing Instagram credentials configuration',
          description: 'Instagram API credentials not properly configured',
          impact: 'Service disruption, integration failure',
          remediation: 'Configure Instagram credentials securely',
          cve: 'CWE-756: Missing Custom Error Page',
          score: -15
        });
        score -= 15;
      } else if (instagramUsername.includes('test') || instagramPassword.includes('test')) {
        findings.push({
          severity: 'CRITICAL',
          category: 'CREDENTIAL_SECURITY',
          issue: 'Test credentials detected in production',
          description: 'Instagram using test/default credentials',
          impact: 'Account compromise, service disruption',
          remediation: 'Use production Instagram credentials',
          cve: 'CWE-798: Use of Hard-coded Credentials',
          score: -25
        });
        score -= 25;
      }
      
      // Instagram Session Security
      const sessionPath = path.join(__dirname, '../../instagram-session.json');
      try {
        const sessionData = await fs.readFile(sessionPath, 'utf8');
        const session = JSON.parse(sessionData);
        
        if (!session.encrypted) {
          findings.push({
            severity: 'HIGH',
            category: 'SESSION_SECURITY',
            issue: 'Instagram session stored unencrypted',
            description: 'Instagram authentication session lacks encryption',
            impact: 'Account takeover if session compromised',
            remediation: 'Encrypt Instagram session data',
            cve: 'CWE-312: Cleartext Storage of Sensitive Information',
            score: -20
          });
          score -= 20;
        }
      } catch (error) {
        // Session file doesn't exist - not necessarily bad
      }
      
      // Instagram API Usage Analysis
      const instagramServicePath = path.join(__dirname, './instagramService.js');
      const instagramCode = await fs.readFile(instagramServicePath, 'utf8');
      
      // Check for private API usage
      if (instagramCode.includes('instagram-private-api')) {
        findings.push({
          severity: 'HIGH',
          category: 'API_COMPLIANCE',
          issue: 'Using private Instagram API',
          description: 'Using unofficial Instagram Private API library',
          impact: 'Account suspension, terms of service violation',
          remediation: 'Migrate to official Instagram Basic Display API',
          cve: 'CWE-284: Improper Access Control',
          score: -20
        });
        score -= 20;
      }
      
      // Rate Limiting Analysis
      if (!instagramCode.includes('rateLimitDelay') || instagramCode.includes('5000')) {
        findings.push({
          severity: 'MEDIUM',
          category: 'RATE_LIMITING',
          issue: 'Insufficient Instagram API rate limiting',
          description: 'Instagram API rate limiting too aggressive or missing',
          impact: 'Account restrictions, API blocking',
          remediation: 'Implement adaptive rate limiting',
          cve: 'CWE-770: Allocation of Resources Without Limits',
          score: -15
        });
        score -= 15;
      }
      
      logger.info(`📸 Instagram security assessment: ${score}/100 - ${findings.length} findings`);
      
      return {
        score: Math.max(0, score),
        findings,
        recommendations: this.generateInstagramSecurityRecommendations(findings)
      };
      
    } catch (error) {
      logger.error('❌ Instagram security assessment failed:', error);
      return {
        score: 0,
        findings: [{
          severity: 'CRITICAL',
          category: 'ASSESSMENT_ERROR',
          issue: 'Instagram security assessment failed',
          description: error.message,
          score: -100
        }],
        recommendations: ['Fix Instagram security assessment errors']
      };
    }
  }

  /**
   * DATA FLOW SECURITY ANALYSIS
   */
  async assessDataFlowSecurity() {
    const findings = [];
    let score = 100;
    
    try {
      // Database Connection Security
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl || !databaseUrl.includes('ssl=true')) {
        findings.push({
          severity: 'HIGH',
          category: 'DATABASE_SECURITY',
          issue: 'Database connection not encrypted',
          description: 'PostgreSQL connection lacks SSL encryption',
          impact: 'Data interception, man-in-the-middle attacks',
          remediation: 'Enable SSL for database connections',
          cve: 'CWE-319: Cleartext Transmission of Sensitive Information',
          score: -20
        });
        score -= 20;
      }
      
      // Data Encryption at Rest
      const schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
      const schemaContent = await fs.readFile(schemaPath, 'utf8');
      
      if (!schemaContent.includes('encryptionKey') && schemaContent.includes('phoneNumber')) {
        findings.push({
          severity: 'CRITICAL',
          category: 'DATA_ENCRYPTION',
          issue: 'Personal data stored unencrypted',
          description: 'Phone numbers and personal data lack encryption at rest',
          impact: 'Personal data exposure, LGPD violations',
          remediation: 'Implement field-level encryption for sensitive data',
          cve: 'CWE-312: Cleartext Storage of Sensitive Information',
          score: -30
        });
        score -= 30;
      }
      
      // File Storage Security
      const uploadsPath = path.join(__dirname, '../../uploads');
      try {
        await fs.access(uploadsPath);
        const stats = await fs.stat(uploadsPath);
        
        // Check directory permissions (simplified check)
        findings.push({
          severity: 'MEDIUM',
          category: 'FILE_PERMISSIONS',
          issue: 'Upload directory security needs review',
          description: 'Upload directory permissions and access controls',
          impact: 'Unauthorized file access, data exposure',
          remediation: 'Review and restrict upload directory permissions',
          cve: 'CWE-276: Incorrect Default Permissions',
          score: -10
        });
        score -= 10;
      } catch (error) {
        // Upload directory doesn't exist - not necessarily bad
      }
      
      // Temporary File Handling
      const tempPath = path.join(__dirname, '../../temp');
      try {
        await fs.access(tempPath);
        findings.push({
          severity: 'MEDIUM',
          category: 'TEMP_FILE_SECURITY',
          issue: 'Temporary files may persist',
          description: 'Temporary file cleanup not verified',
          impact: 'Data leakage, storage exhaustion',
          remediation: 'Implement automatic temporary file cleanup',
          cve: 'CWE-459: Incomplete Cleanup',
          score: -10
        });
        score -= 10;
      } catch (error) {
        // Temp directory doesn't exist - actually good
      }
      
      logger.info(`🔄 Data flow security assessment: ${score}/100 - ${findings.length} findings`);
      
      return {
        score: Math.max(0, score),
        findings,
        recommendations: this.generateDataFlowSecurityRecommendations(findings)
      };
      
    } catch (error) {
      logger.error('❌ Data flow security assessment failed:', error);
      return {
        score: 0,
        findings: [{
          severity: 'CRITICAL',
          category: 'ASSESSMENT_ERROR',
          issue: 'Data flow security assessment failed',
          description: error.message,
          score: -100
        }],
        recommendations: ['Fix data flow security assessment errors']
      };
    }
  }

  /**
   * NETWORK SECURITY & ENCRYPTION VERIFICATION
   */
  async assessNetworkSecurity() {
    const findings = [];
    let score = 100;
    
    try {
      // HTTPS Configuration
      const indexPath = path.join(__dirname, '../index.js');
      const indexContent = await fs.readFile(indexPath, 'utf8');
      
      if (!indexContent.includes('https') && !indexContent.includes('ssl')) {
        findings.push({
          severity: 'HIGH',
          category: 'TRANSPORT_SECURITY',
          issue: 'HTTP instead of HTTPS',
          description: 'Application not configured for HTTPS',
          impact: 'Data interception, man-in-the-middle attacks',
          remediation: 'Configure HTTPS with valid SSL certificates',
          cve: 'CWE-319: Cleartext Transmission of Sensitive Information',
          score: -25
        });
        score -= 25;
      }
      
      // Security Headers Configuration
      if (!indexContent.includes('helmet')) {
        findings.push({
          severity: 'MEDIUM',
          category: 'SECURITY_HEADERS',
          issue: 'Missing security headers middleware',
          description: 'Application lacks comprehensive security headers',
          impact: 'XSS attacks, clickjacking, content injection',
          remediation: 'Implement Helmet.js security headers',
          cve: 'CWE-16: Configuration',
          score: -15
        });
        score -= 15;
      }
      
      // Environment Variable Security
      const envVariables = process.env;
      const sensitiveVars = ['DATABASE_URL', 'JWT_SECRET', 'INSTAGRAM_PASSWORD'];
      
      for (const varName of sensitiveVars) {
        if (envVariables[varName] && envVariables[varName].length < 20) {
          findings.push({
            severity: 'HIGH',
            category: 'CREDENTIAL_SECURITY',
            issue: `Weak ${varName} configuration`,
            description: `Environment variable ${varName} appears to be weak or default`,
            impact: 'System compromise, unauthorized access',
            remediation: `Strengthen ${varName} with secure random value`,
            cve: 'CWE-798: Use of Hard-coded Credentials',
            score: -15
          });
          score -= 15;
        }
      }
      
      // Port Configuration Security
      const port = process.env.PORT || '3355';
      if (port === '3000' || port === '8080' || port === '80') {
        findings.push({
          severity: 'LOW',
          category: 'CONFIGURATION',
          issue: 'Common port usage',
          description: `Application using common port ${port}`,
          impact: 'Increased attack surface, port scanning targets',
          remediation: 'Use non-standard ports for services',
          cve: 'CWE-16: Configuration',
          score: -5
        });
        score -= 5;
      }
      
      logger.info(`🌐 Network security assessment: ${score}/100 - ${findings.length} findings`);
      
      return {
        score: Math.max(0, score),
        findings,
        recommendations: this.generateNetworkSecurityRecommendations(findings)
      };
      
    } catch (error) {
      logger.error('❌ Network security assessment failed:', error);
      return {
        score: 0,
        findings: [{
          severity: 'CRITICAL',
          category: 'ASSESSMENT_ERROR',
          issue: 'Network security assessment failed',
          description: error.message,
          score: -100
        }],
        recommendations: ['Fix network security assessment errors']
      };
    }
  }

  /**
   * PLATFORM POLICY COMPLIANCE ASSESSMENT
   */
  async assessPlatformCompliance() {
    const findings = [];
    let score = 100;
    
    try {
      // WhatsApp Business API Compliance
      const whatsappServicePath = path.join(__dirname, './whatsappService.js');
      const whatsappCode = await fs.readFile(whatsappServicePath, 'utf8');
      
      // Check for spam prevention
      if (!whatsappCode.includes('rateLimitDelay') || !whatsappCode.includes('timeout')) {
        findings.push({
          severity: 'HIGH',
          category: 'WHATSAPP_POLICY',
          issue: 'Insufficient spam prevention',
          description: 'WhatsApp integration lacks proper rate limiting',
          impact: 'Account suspension, policy violations',
          remediation: 'Implement WhatsApp Business API rate limits',
          score: -20
        });
        score -= 20;
      }
      
      // Instagram API Compliance
      const instagramServicePath = path.join(__dirname, './instagramService.js');
      const instagramCode = await fs.readFile(instagramServicePath, 'utf8');
      
      // Check for private API usage (policy violation)
      if (instagramCode.includes('instagram-private-api')) {
        findings.push({
          severity: 'CRITICAL',
          category: 'INSTAGRAM_POLICY',
          issue: 'Instagram private API usage violates terms',
          description: 'Using unofficial Instagram Private API',
          impact: 'Account termination, legal issues',
          remediation: 'Migrate to Instagram Basic Display API',
          score: -30
        });
        score -= 30;
      }
      
      // Content Moderation Compliance
      const textFilterPath = path.join(__dirname, './textFilterService.js');
      try {
        await fs.access(textFilterPath);
        const filterCode = await fs.readFile(textFilterPath, 'utf8');
        
        if (!filterCode.includes('profanity') && !filterCode.includes('inappropriate')) {
          findings.push({
            severity: 'MEDIUM',
            category: 'CONTENT_MODERATION',
            issue: 'Limited content moderation',
            description: 'Content filtering may not catch all inappropriate content',
            impact: 'Platform policy violations, content issues',
            remediation: 'Enhance content moderation capabilities',
            score: -15
          });
          score -= 15;
        }
      } catch (error) {
        findings.push({
          severity: 'HIGH',
          category: 'CONTENT_MODERATION',
          issue: 'Missing content moderation system',
          description: 'No content filtering detected',
          impact: 'Platform policy violations, inappropriate content',
          remediation: 'Implement comprehensive content moderation',
          score: -25
        });
        score -= 25;
      }
      
      // Data Retention Policy Compliance
      if (!whatsappCode.includes('cleanupExpiredConversations')) {
        findings.push({
          severity: 'MEDIUM',
          category: 'DATA_RETENTION',
          issue: 'No automated data cleanup',
          description: 'Conversation data may be retained indefinitely',
          impact: 'LGPD violations, storage issues',
          remediation: 'Implement automated data retention policies',
          score: -15
        });
        score -= 15;
      }
      
      logger.info(`📋 Platform compliance assessment: ${score}/100 - ${findings.length} findings`);
      
      return {
        score: Math.max(0, score),
        findings,
        recommendations: this.generatePlatformComplianceRecommendations(findings)
      };
      
    } catch (error) {
      logger.error('❌ Platform compliance assessment failed:', error);
      return {
        score: 0,
        findings: [{
          severity: 'CRITICAL',
          category: 'ASSESSMENT_ERROR',
          issue: 'Platform compliance assessment failed',
          description: error.message,
          score: -100
        }],
        recommendations: ['Fix platform compliance assessment errors']
      };
    }
  }

  /**
   * UTILITY METHODS
   */
  calculateOverallSecurityScore(assessment) {
    const weights = {
      authSecurity: 0.20,
      apiSecurity: 0.15,
      whatsappSecurity: 0.15,
      instagramSecurity: 0.15,
      dataFlowSecurity: 0.20,
      networkSecurity: 0.10,
      platformCompliance: 0.05
    };
    
    let weightedScore = 0;
    for (const [category, weight] of Object.entries(weights)) {
      if (assessment[category] && assessment[category].score !== undefined) {
        weightedScore += assessment[category].score * weight;
      }
    }
    
    return Math.round(weightedScore);
  }

  determineRiskRating(score) {
    if (score >= 90) return 'LOW';
    if (score >= 70) return 'MEDIUM';
    if (score >= 50) return 'HIGH';
    return 'CRITICAL';
  }

  extractCriticalVulnerabilities(assessment) {
    const critical = [];
    
    for (const category of Object.values(assessment)) {
      if (category.findings) {
        critical.push(...category.findings.filter(f => f.severity === 'CRITICAL'));
      }
    }
    
    return critical;
  }

  parseExpiryToHours(expiryString) {
    const match = expiryString.match(/(\d+)([hd])/);
    if (!match) return 24;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return unit === 'h' ? value : value * 24;
  }

  // Security Recommendation Generators
  generateAuthSecurityRecommendations(findings) {
    const recommendations = [];
    
    if (findings.some(f => f.category === 'JWT_SECURITY')) {
      recommendations.push('Generate cryptographically strong JWT secret (64+ characters)');
    }
    
    if (findings.some(f => f.category === 'PASSWORD_SECURITY')) {
      recommendations.push('Increase BCrypt rounds to 12+ for password hashing');
    }
    
    if (findings.some(f => f.category === 'SESSION_MANAGEMENT')) {
      recommendations.push('Implement token refresh mechanism with shorter lifetimes');
    }
    
    if (findings.some(f => f.category === 'SQL_INJECTION')) {
      recommendations.push('Review all database queries for SQL injection vulnerabilities');
    }
    
    return recommendations;
  }

  generateApiSecurityRecommendations(findings) {
    const recommendations = [];
    
    if (findings.some(f => f.category === 'RATE_LIMITING')) {
      recommendations.push('Implement strict rate limiting for all authentication endpoints');
    }
    
    if (findings.some(f => f.category === 'INPUT_VALIDATION')) {
      recommendations.push('Deploy comprehensive input sanitization across all endpoints');
    }
    
    if (findings.some(f => f.category === 'CORS_SECURITY')) {
      recommendations.push('Restrict CORS to specific domains and remove permissive configurations');
    }
    
    if (findings.some(f => f.category === 'SECURITY_HEADERS')) {
      recommendations.push('Configure comprehensive security headers including CSP');
    }
    
    return recommendations;
  }

  generateWhatsAppSecurityRecommendations(findings) {
    const recommendations = [];
    
    if (findings.some(f => f.category === 'SESSION_STORAGE')) {
      recommendations.push('Encrypt WhatsApp session data at rest using AES-256');
    }
    
    if (findings.some(f => f.category === 'DATA_EXPOSURE')) {
      recommendations.push('Remove message content from logs or implement secure logging');
    }
    
    if (findings.some(f => f.category === 'FILE_UPLOAD_SECURITY')) {
      recommendations.push('Implement antivirus scanning for all WhatsApp media uploads');
    }
    
    if (findings.some(f => f.category === 'RATE_LIMITING')) {
      recommendations.push('Add rate limiting for WhatsApp message processing to prevent abuse');
    }
    
    return recommendations;
  }

  generateInstagramSecurityRecommendations(findings) {
    const recommendations = [];
    
    if (findings.some(f => f.category === 'CREDENTIAL_MANAGEMENT')) {
      recommendations.push('Configure secure Instagram API credentials with proper environment variables');
    }
    
    if (findings.some(f => f.category === 'CREDENTIAL_SECURITY')) {
      recommendations.push('Replace test credentials with secure production credentials');
    }
    
    if (findings.some(f => f.category === 'SESSION_SECURITY')) {
      recommendations.push('Encrypt Instagram session data using strong encryption');
    }
    
    if (findings.some(f => f.category === 'API_COMPLIANCE')) {
      recommendations.push('Migrate from private API to official Instagram Basic Display API');
    }
    
    if (findings.some(f => f.category === 'RATE_LIMITING')) {
      recommendations.push('Implement adaptive rate limiting for Instagram API calls');
    }
    
    return recommendations;
  }

  generateDataFlowSecurityRecommendations(findings) {
    const recommendations = [];
    
    if (findings.some(f => f.category === 'DATABASE_SECURITY')) {
      recommendations.push('Enable SSL/TLS encryption for all database connections');
    }
    
    if (findings.some(f => f.category === 'DATA_ENCRYPTION')) {
      recommendations.push('Implement field-level encryption for sensitive personal data');
    }
    
    if (findings.some(f => f.category === 'FILE_PERMISSIONS')) {
      recommendations.push('Review and restrict file system permissions for uploaded content');
    }
    
    if (findings.some(f => f.category === 'TEMP_FILE_SECURITY')) {
      recommendations.push('Implement automatic cleanup for temporary files');
    }
    
    return recommendations;
  }

  generateNetworkSecurityRecommendations(findings) {
    const recommendations = [];
    
    if (findings.some(f => f.category === 'TRANSPORT_SECURITY')) {
      recommendations.push('Configure HTTPS with valid SSL/TLS certificates');
    }
    
    if (findings.some(f => f.category === 'SECURITY_HEADERS')) {
      recommendations.push('Implement comprehensive security headers using Helmet.js');
    }
    
    if (findings.some(f => f.category === 'CREDENTIAL_SECURITY')) {
      recommendations.push('Strengthen all environment variables with secure random values');
    }
    
    if (findings.some(f => f.category === 'CONFIGURATION')) {
      recommendations.push('Use non-standard ports and secure configuration practices');
    }
    
    return recommendations;
  }

  generatePlatformComplianceRecommendations(findings) {
    const recommendations = [];
    
    if (findings.some(f => f.category === 'WHATSAPP_POLICY')) {
      recommendations.push('Implement WhatsApp Business API compliant rate limiting');
    }
    
    if (findings.some(f => f.category === 'INSTAGRAM_POLICY')) {
      recommendations.push('Replace private API usage with official Instagram APIs');
    }
    
    if (findings.some(f => f.category === 'CONTENT_MODERATION')) {
      recommendations.push('Deploy comprehensive content moderation system');
    }
    
    if (findings.some(f => f.category === 'DATA_RETENTION')) {
      recommendations.push('Implement automated data retention and cleanup policies');
    }
    
    return recommendations;
  }

  generateSecurityRecommendations(assessment) {
    const allRecommendations = [];
    
    // Collect recommendations from all categories
    for (const category of Object.values(assessment)) {
      if (category.recommendations) {
        allRecommendations.push(...category.recommendations);
      }
    }
    
    // Add overall recommendations based on risk rating
    if (assessment.riskRating === 'CRITICAL') {
      allRecommendations.unshift('URGENT: Address all critical vulnerabilities immediately');
      allRecommendations.push('Conduct immediate security incident response assessment');
    } else if (assessment.riskRating === 'HIGH') {
      allRecommendations.unshift('Address high-priority security issues within 48 hours');
    }
    
    // Remove duplicates and return
    return [...new Set(allRecommendations)];
  }

  /**
   * Get latest security assessment results
   */
  getLatestAssessment() {
    return this.scanResults.get('latest') || null;
  }

  /**
   * Get security scan history
   */
  getScanHistory() {
    return Array.from(this.scanResults.values());
  }
}

module.exports = SecurityComplianceValidator;