const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso necessário',
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar se usuário ainda existe e está ativo
    const user = await prisma.adminUser.findUnique({
      where: { 
        id: decoded.userId,
        ativo: true 
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Usuário não encontrado ou inativo',
        code: 'USER_NOT_FOUND'
      });
    }

    // Adicionar informações do usuário à requisição
    req.user = user;
    
    // Atualizar último login
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    next();
  } catch (error) {
    logger.error('Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'EXPIRED_TOKEN'
      });
    }

    return res.status(500).json({ 
      error: 'Erro interno de autenticação',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware para verificar permissões por role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.warn(`Acesso negado para usuário ${req.user.email}. Role: ${userRole}, Requerido: ${allowedRoles.join(', ')}`);
      
      return res.status(403).json({ 
        error: 'Permissão insuficiente',
        code: 'INSUFFICIENT_PERMISSION',
        userRole,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// Função para fazer login
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Buscar usuário
    const user = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.ativo) {
      return res.status(401).json({ 
        error: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(senha, user.senha);
    
    if (!isValidPassword) {
      logger.warn(`Tentativa de login com senha incorreta: ${email}`);
      return res.status(401).json({ 
        error: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Atualizar último login
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    logger.info(`Login realizado com sucesso: ${email}`);

    // Retornar token e dados do usuário (sem senha)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    logger.error('Erro ao fazer login:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Função para verificar token atual
const verifyToken = async (req, res) => {
  try {
    // Se chegou até aqui, o token é válido (passou pelo middleware)
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    logger.error('Erro ao verificar token:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Função para refresh do token
const refreshToken = async (req, res) => {
  try {
    // Gerar novo token com os dados atuais do usuário
    const newToken = jwt.sign(
      { 
        userId: req.user.id, 
        email: req.user.email, 
        role: req.user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token: newToken,
      user: req.user
    });

  } catch (error) {
    logger.error('Erro ao renovar token:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Função para criar hash de senha
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Função para criar usuário admin (usar apenas em setup inicial)
const createAdminUser = async (req, res) => {
  try {
    const { nome, email, senha, role = 'ADMIN' } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ 
        error: 'Nome, email e senha são obrigatórios',
        code: 'MISSING_FIELDS'
      });
    }

    // Verificar se já existe
    const existingUser = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Usuário já existe',
        code: 'USER_EXISTS'
      });
    }

    // Criar usuário
    const hashedPassword = await hashPassword(senha);
    
    const newUser = await prisma.adminUser.create({
      data: {
        nome,
        email: email.toLowerCase(),
        senha: hashedPassword,
        role,
        ativo: true
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    logger.info(`Usuário admin criado: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: newUser
    });

  } catch (error) {
    logger.error('Erro ao criar usuário admin:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  login,
  verifyToken,
  refreshToken,
  hashPassword,
  createAdminUser,
  JWT_SECRET
};