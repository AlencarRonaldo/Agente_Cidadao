import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

/**
 * Reusable loading state component with different variants
 */
const LoadingState = memo(({ 
  variant = 'spinner', 
  size = 'medium', 
  message = 'Carregando...', 
  fullHeight = false,
  rows = 3 
}) => {
  const getSize = () => {
    switch (size) {
      case 'small': return 24;
      case 'large': return 64;
      default: return 40;
    }
  };

  const containerProps = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(fullHeight && { minHeight: '400px' }),
    p: 2
  };

  if (variant === 'skeleton') {
    return (
      <Box sx={{ p: 2 }}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton 
            key={index}
            variant="rectangular" 
            height={60} 
            sx={{ mb: 1, borderRadius: 1 }}
            animation="wave"
          />
        ))}
      </Box>
    );
  }

  if (variant === 'table') {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
        {Array.from({ length: rows }).map((_, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Skeleton variant="rectangular" width={60} height={40} />
            <Skeleton variant="rectangular" width="100%" height={40} />
            <Skeleton variant="rectangular" width={100} height={40} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={containerProps}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress 
          size={getSize()} 
          sx={{ mb: message ? 2 : 0 }}
          aria-label="Carregando"
        />
        {message && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Box>
  );
});

LoadingState.propTypes = {
  variant: PropTypes.oneOf(['spinner', 'skeleton', 'table']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  message: PropTypes.string,
  fullHeight: PropTypes.bool,
  rows: PropTypes.number
};

LoadingState.displayName = 'LoadingState';

export default LoadingState;