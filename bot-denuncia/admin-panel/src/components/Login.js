import React, { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Login as LoginIcon,
  Visibility,
  VisibilityOff,
  Security,
  AdminPanelSettings,
  Email,
  Lock,
  Shield,
  Fingerprint
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { apiCall, processApiResponse } from '../config/api';
import { useErrorHandler } from '../utils/errorUtils';
import {
  BackgroundContainer,
  FloatingParticle,
  CyberpunkTextField,
  NeonButton,
  containerVariants,
  headerVariants,
  formVariants,
  glassContainerStyles
} from './LoginStyles';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: 'admin@admin.com',
    senha: 'admin123'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [particles, setParticles] = useState([]);
  
  const { handleError } = useErrorHandler('Login');

  // Generate floating particles
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = [];
      for (let i = 0; i < 15; i++) {
        newParticles.push({
          id: i,
          delay: Math.random() * 5,
          size: `${2 + Math.random() * 4}px`
        });
      }
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiCall('/admin/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      const data = await processApiResponse(response);

      // Save token in localStorage
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      
      // Notify parent component
      onLogin(data.token, data.user);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundContainer>
      {/* Floating Particles */}
      {particles.map((particle) => (
        <FloatingParticle 
          key={particle.id}
          delay={particle.delay}
          size={particle.size}
        />
      ))}

      <Container component="main" maxWidth="sm" sx={{ px: 2 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={glassContainerStyles}
        >
          {/* Holographic Header */}
          <motion.div variants={headerVariants}>
            <Box sx={{ textAlign: 'center', mb: 4, position: 'relative' }}>
              <motion.div
                initial={{ rotateY: 0 }}
                animate={{ rotateY: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ display: 'inline-block', marginBottom: '16px' }}
              >
                <Shield 
                  sx={{ 
                    fontSize: 64, 
                    color: '#00ffff',
                    filter: 'drop-shadow(0 0 10px #00ffff)'
                  }} 
                />
              </motion.div>
              
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 1,
                  background: 'linear-gradient(135deg, #00ffff 0%, #8a2be2 50%, #00bfff 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
                }}
              >
                SISTEMA CYBERSEC
              </Typography>
              
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: 'rgba(0, 255, 255, 0.8)',
                  fontWeight: 400,
                  letterSpacing: '0.1em'
                }}
              >
                Bot de Denúncias Cidadãs • SBC
              </Typography>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Fingerprint sx={{ color: '#00ffff', fontSize: 20 }} />
                <AdminPanelSettings sx={{ color: '#8a2be2', fontSize: 20 }} />
                <Security sx={{ color: '#00bfff', fontSize: 20 }} />
              </Box>
            </Box>
          </motion.div>

          {/* Form Section */}
          <motion.div variants={formVariants}>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      borderRadius: '12px',
                      background: 'rgba(255, 7, 58, 0.1)',
                      border: '1px solid rgba(255, 7, 58, 0.3)',
                      color: '#ff073a',
                      backdropFilter: 'blur(10px)',
                      '& .MuiAlert-icon': {
                        color: '#ff073a'
                      }
                    }}
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Box component="form" onSubmit={handleSubmit}>
              <CyberpunkTextField
                required
                fullWidth
                id="email"
                label="Neural Access ID"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#00ffff' }} />
                    </InputAdornment>
                  )
                }}
                inputProps={{
                  'aria-label': 'Email de acesso',
                }}
              />
              
              <CyberpunkTextField
                required
                fullWidth
                name="senha"
                label="Security Key"
                type={showPassword ? 'text' : 'password'}
                id="senha"
                autoComplete="current-password"
                value={formData.senha}
                onChange={handleChange}
                disabled={loading}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#00ffff' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                        sx={{ 
                          color: '#00ffff',
                          '&:hover': {
                            color: '#ffffff',
                            background: 'rgba(0, 255, 255, 0.1)'
                          }
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                inputProps={{
                  'aria-label': 'Senha de acesso',
                }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                      color: 'rgba(0, 255, 255, 0.5)',
                      '&.Mui-checked': {
                        color: '#00ffff'
                      }
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: 'rgba(0, 255, 255, 0.8)', fontSize: '14px' }}>
                    Manter sessão ativa
                  </Typography>
                }
                sx={{ mb: 3, alignSelf: 'flex-start' }}
              />
              
              <NeonButton
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                aria-label="Fazer login no sistema"
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <CircularProgress size={20} sx={{ color: '#ffffff' }} />
                    </motion.div>
                    Iniciando Conexão Neural...
                  </Box>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                  >
                    <LoginIcon />
                    ACESSAR SISTEMA
                  </motion.div>
                )}
              </NeonButton>
            </Box>
            
            {/* Debug Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <Box 
                sx={{ 
                  mt: 4, 
                  p: 3, 
                  background: 'rgba(0, 20, 40, 0.3)',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    mb: 2,
                    color: 'rgba(0, 255, 255, 0.8)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.05em'
                  }}
                >
                  🔐 CREDENCIAIS DE ACESSO DEBUG
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                  >
                    <span style={{ color: '#00ffff' }}>EMAIL:</span> admin@teste.com
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                  >
                    <span style={{ color: '#00ffff' }}>PASS:</span> Admin123!
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          </motion.div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Typography 
            variant="body2" 
            align="center" 
            sx={{ 
              mt: 3, 
              color: 'rgba(0, 255, 255, 0.6)',
              fontWeight: 400,
              fontSize: '12px',
              letterSpacing: '0.1em',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
            }}
          >
            SECURED BY CYBERSEC • v2.0.25 • NEURAL NETWORK ACTIVE
          </Typography>
        </motion.div>
      </Container>
    </BackgroundContainer>
  );
};

export default Login;