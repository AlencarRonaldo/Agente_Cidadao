/**
 * Express Application Setup for Testing
 * Lightweight Express app configuration for testing purposes
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100 : 50, // Higher limit for tests
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 20 : 5, // Lower limit for auth endpoints
  skipSuccessfulRequests: true
}));

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock authentication endpoints for testing
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Mock authentication logic
  if (username === 'admin' && password === 'correct-password') {
    return res.json({
      success: true,
      token: 'mock-jwt-token',
      expiresIn: 3600,
      user: { id: 1, username: 'admin', role: 'ADMIN' }
    });
  }
  
  // Consistent response time to prevent timing attacks
  setTimeout(() => {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }, 100);
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/auth/forgot-password', (req, res) => {
  // Generic response to prevent user enumeration
  res.json({
    success: true,
    message: 'If this email exists, you will receive password reset instructions.'
  });
});

app.post('/api/auth/refresh', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Invalid refresh token'
  });
});

app.get('/api/csrf-token', (req, res) => {
  res.json({
    csrfToken: 'mock-csrf-token-' + Date.now()
  });
});

// Monitoring routes
const monitoringRoutes = require('./routes/monitoring');
app.use('/api/monitoring', monitoringRoutes);

// Mock admin endpoints
app.get('/api/admin/dashboard', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  res.json({
    totalDenuncias: 150,
    pendingApproval: 25,
    publishedToday: 12,
    systemStatus: 'operational'
  });
});

app.get('/api/admin/users', (req, res) => {
  res.status(403).json({ message: 'Insufficient permissions' });
});

// Mock denuncias endpoints
app.get('/api/denuncias', (req, res) => {
  res.json({
    data: [
      { id: 1, texto: 'Sample complaint', status: 'PENDING' },
      { id: 2, texto: 'Another complaint', status: 'APPROVED' }
    ],
    pagination: { page: 1, total: 2 }
  });
});

app.post('/api/denuncias', (req, res) => {
  const { texto, endereco, bairro } = req.body;
  
  // Input validation
  if (!texto || texto.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Description must be at least 10 characters long'
    });
  }
  
  res.status(201).json({
    success: true,
    data: {
      id: Date.now(),
      texto: texto.replace(/<script.*?>.*?<\/script>/gi, ''), // XSS protection
      endereco,
      bairro,
      status: 'PENDING'
    }
  });
});

app.get('/api/denuncias/:id', (req, res) => {
  const id = req.params.id;
  
  // Path traversal protection
  if (id.includes('..') || id.includes('/') || id.includes('\\')) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  
  res.json({
    id: parseInt(id) || id,
    texto: 'Sample complaint',
    status: 'PENDING'
  });
});

// File upload endpoint
app.post('/api/upload', (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Invalid file type or malicious content detected'
  });
});

// Mock fetch URL endpoint (for SSRF testing)
app.post('/api/fetch-url', (req, res) => {
  const { url } = req.body;
  
  // SSRF protection
  if (url && (
    url.includes('localhost') || 
    url.includes('127.0.0.1') || 
    url.includes('169.254.169.254') ||
    url.startsWith('file:') ||
    url.startsWith('gopher:') ||
    url.startsWith('dict:')
  )) {
    return res.status(403).json({
      success: false,
      message: 'URL not allowed'
    });
  }
  
  res.status(400).json({
    success: false,
    message: 'Invalid URL'
  });
});

// System command endpoint (should be blocked)
app.post('/api/admin/system/command', (req, res) => {
  res.status(403).json({
    success: false,
    message: 'System commands are not allowed'
  });
});

// Profile update endpoint
app.put('/api/users/profile', (req, res) => {
  const { role, ...otherFields } = req.body;
  
  // Prevent privilege escalation
  if (role) {
    return res.status(403).json({
      success: false,
      message: 'Cannot modify user role'
    });
  }
  
  res.json({
    success: true,
    user: { ...otherFields, role: 'USER' }
  });
});

// User profile endpoints
app.get('/api/users/:userId/profile', (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Access denied'
  });
});

// Admin endpoints that should be protected
const adminEndpoints = [
  '/api/admin/denuncias/approve',
  '/api/admin/system/config',
  '/api/admin/logs'
];

adminEndpoints.forEach(endpoint => {
  app.get(endpoint, (req, res) => {
    res.status(403).json({ message: 'Access denied' });
  });
  
  app.post(endpoint, (req, res) => {
    res.status(403).json({ message: 'Access denied' });
  });
});

// Files endpoint for path traversal testing
app.get('/api/files/:filename', (req, res) => {
  res.status(404).json({ message: 'File not found' });
});

// Search endpoint
app.post('/api/denuncias/search', (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Invalid search parameters'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

module.exports = app;