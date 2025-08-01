import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, Alert, AlertTitle, Stack } from '@mui/material';
import { Refresh, Warning } from '@mui/icons-material';

/**
 * Specialized Error Boundary for API-related components
 * Provides context-aware error messages and recovery options
 */
class ApiErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log for monitoring
    console.group('🚨 API Error Boundary');
    console.error('Component:', this.props.componentName);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();

    // Send to monitoring service if available
    if (window.errorLogger) {
      window.errorLogger.logError(error, {
        ...errorInfo,
        component: this.props.componentName,
        retryCount: this.state.retryCount
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  getErrorType = () => {
    const error = this.state.error;
    
    if (error?.name === 'ChunkLoadError') {
      return 'chunk';
    }
    
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return 'network';
    }
    
    if (error?.status >= 400 && error?.status < 500) {
      return 'client';
    }
    
    if (error?.status >= 500) {
      return 'server';
    }
    
    return 'unknown';
  };

  getErrorMessage = () => {
    const errorType = this.getErrorType();
    const componentName = this.props.componentName || 'componente';
    
    switch (errorType) {
      case 'chunk':
        return {
          title: 'Erro de Carregamento',
          message: 'Uma nova versão da aplicação está disponível. Recarregue a página para continuar.',
          severity: 'warning',
          showRefresh: true,
          showRetry: false
        };
      
      case 'network':
        return {
          title: 'Erro de Conexão',
          message: `Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.`,
          severity: 'error',
          showRefresh: false,
          showRetry: true
        };
      
      case 'client':
        return {
          title: 'Erro de Solicitação',
          message: `Ocorreu um erro ao processar sua solicitação no ${componentName}. Tente novamente.`,
          severity: 'warning',
          showRefresh: false,
          showRetry: true
        };
      
      case 'server':
        return {
          title: 'Erro do Servidor',
          message: `O servidor está temporariamente indisponível. Nossa equipe foi notificada.`,
          severity: 'error',
          showRefresh: false,
          showRetry: true
        };
      
      default:
        return {
          title: 'Erro Inesperado',
          message: `Ocorreu um erro inesperado no ${componentName}. Nossa equipe foi notificada.`,
          severity: 'error',
          showRefresh: true,
          showRetry: true
        };
    }
  };

  render() {
    if (this.state.hasError) {
      const errorInfo = this.getErrorMessage();
      const isDevelopment = process.env.NODE_ENV === 'development';
      const maxRetries = 3;
      const canRetry = this.state.retryCount < maxRetries && errorInfo.showRetry;
      
      return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Alert 
            severity={errorInfo.severity} 
            sx={{ mb: 3 }}
            icon={<Warning />}
          >
            <AlertTitle>{errorInfo.title}</AlertTitle>
            {errorInfo.message}
            
            {this.state.retryCount > 0 && (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Tentativas: {this.state.retryCount}/{maxRetries}
              </Typography>
            )}
          </Alert>

          <Stack direction="row" spacing={2} justifyContent="center">
            {canRetry && (
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRetry}
                color="primary"
              >
                Tentar Novamente
              </Button>
            )}
            
            {errorInfo.showRefresh && (
              <Button
                variant={canRetry ? "outlined" : "contained"}
                startIcon={<Refresh />}
                onClick={this.handleRefresh}
                color="primary"
              >
                Recarregar Página
              </Button>
            )}
          </Stack>

          {isDevelopment && this.state.error && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <AlertTitle>Debug Info (Development)</AlertTitle>
              <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem', mb: 1 }}>
                {this.state.error.toString()}
              </Typography>
              {this.state.errorInfo?.componentStack && (
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.7rem' }}>
                  {this.state.errorInfo.componentStack.substring(0, 500)}...
                </Typography>
              )}
            </Alert>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

ApiErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  componentName: PropTypes.string,
  onRetry: PropTypes.func
};

ApiErrorBoundary.defaultProps = {
  componentName: 'Componente'
};

// HOC for easy wrapping
export const withApiErrorBoundary = (Component, componentName, onRetry = null) => {
  const WrappedComponent = (props) => (
    <ApiErrorBoundary 
      componentName={componentName}
      onRetry={onRetry}
    >
      <Component {...props} />
    </ApiErrorBoundary>
  );
  
  WrappedComponent.displayName = `withApiErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ApiErrorBoundary;