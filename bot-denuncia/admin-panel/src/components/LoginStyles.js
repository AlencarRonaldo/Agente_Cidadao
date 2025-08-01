// LoginStyles.js - Estilos otimizados para o componente Login
import { styled, keyframes } from '@mui/material/styles';
import { Box, TextField, Button } from '@mui/material';

// Animações
export const floatingParticles = keyframes`
  0% { 
    transform: translateY(0px) rotate(0deg); 
    opacity: 1; 
  }
  100% { 
    transform: translateY(-100vh) rotate(360deg); 
    opacity: 0; 
  }
`;

export const neonGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff;
  }
  50% { 
    box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff;
  }
`;

export const pulseGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }
  50% { 
    box-shadow: 0 0 40px rgba(0, 255, 255, 0.6);
  }
`;

// Componentes Styled
export const BackgroundContainer = styled(Box)({
  minHeight: '100vh',
  background: `
    linear-gradient(135deg, 
      #0a0a0a 0%, 
      #1a0033 25%, 
      #0d1b2a 50%, 
      #001122 75%, 
      #000000 100%
    )
  `,
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(0, 191, 255, 0.05) 0%, transparent 50%)
    `,
    animation: `${neonGlow} 4s ease-in-out infinite alternate`
  }
});

export const FloatingParticle = styled(Box)(({ delay = 0, size = '4px' }) => ({
  position: 'absolute',
  width: size,
  height: size,
  background: 'linear-gradient(45deg, #00ffff, #ff00ff)',
  borderRadius: '50%',
  animation: `${floatingParticles} ${15 + Math.random() * 10}s linear infinite`,
  animationDelay: `${delay}s`,
  left: `${Math.random() * 100}%`,
  boxShadow: '0 0 6px currentColor',
  pointerEvents: 'none'
}));

export const CyberpunkTextField = styled(TextField)({
  marginBottom: '24px',
  '& .MuiOutlinedInput-root': {
    background: 'rgba(0, 20, 40, 0.4)',
    borderRadius: '12px',
    color: '#00ffff',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    '& fieldset': {
      borderColor: 'rgba(0, 255, 255, 0.3)',
      borderWidth: '1px'
    },
    '&:hover fieldset': {
      borderColor: 'rgba(0, 255, 255, 0.6)',
      boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
    },
    '&.Mui-focused fieldset': {
      borderColor: '#00ffff',
      borderWidth: '2px',
      boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)'
    },
    '&.Mui-error fieldset': {
      borderColor: '#ff073a',
      boxShadow: '0 0 10px rgba(255, 7, 58, 0.4)'
    }
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(0, 255, 255, 0.7)',
    fontSize: '14px',
    '&.Mui-focused': {
      color: '#00ffff'
    },
    '&.Mui-error': {
      color: '#ff073a'
    }
  },
  '& .MuiOutlinedInput-input': {
    color: '#ffffff',
    '&::placeholder': {
      color: 'rgba(0, 255, 255, 0.5)'
    }
  }
});

export const NeonButton = styled(Button)({
  background: 'linear-gradient(135deg, #00ffff 0%, #8a2be2 50%, #00bfff 100%)',
  borderRadius: '12px',
  padding: '16px 24px',
  fontSize: '16px',
  fontWeight: 600,
  textTransform: 'none',
  color: '#ffffff',
  border: 'none',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 4px 15px rgba(0, 255, 255, 0.4)',
  transition: 'all 0.3s ease',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    transition: 'left 0.5s'
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(0, 255, 255, 0.6)',
    '&::before': {
      left: '100%'
    }
  },
  '&:disabled': {
    background: 'rgba(100, 100, 100, 0.3)',
    color: 'rgba(255, 255, 255, 0.5)',
    boxShadow: 'none'
  }
});

// Variantes de animação para Framer Motion
export const containerVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

export const headerVariants = {
  hidden: { y: -50, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      delay: 0.2,
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export const formVariants = {
  hidden: { y: 50, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      delay: 0.4,
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export const glassContainerStyles = {
  background: 'rgba(13, 27, 42, 0.1)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(0, 255, 255, 0.2)',
  borderRadius: '24px',
  padding: '40px',
  width: '100%',
  maxWidth: '480px',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: `
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 0 1px rgba(0, 255, 255, 0.1)
  `,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.1), transparent)',
    transition: 'left 0.5s',
  },
  '&:hover::before': {
    left: '100%'
  }
};