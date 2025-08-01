import React, { useEffect } from 'react';

const WalletProtection = ({ children }) => {
  useEffect(() => {
    // Proteção contra redefinição da propriedade ethereum
    const protectEthereum = () => {
      try {
        const originalEthereum = window.ethereum;
        
        // Redefine a propriedade como não configurável para prevenir redefinições
        Object.defineProperty(window, 'ethereum', {
          get: () => originalEthereum,
          set: (newValue) => {
            console.warn('🛡️ Tentativa de redefinição do window.ethereum bloqueada');
            // Retorna o valor original sem permitir modificação
            return originalEthereum;
          },
          configurable: false
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🛡️ Proteção de carteira ativada');
        }
      } catch (error) {
        console.warn('⚠️ Ethereum já protegido ou não disponível:', error.message);
      }
    };

    // Captura erros globais relacionados a carteiras
    const handleError = (event) => {
      if (event.error?.message?.includes('ethereum') || 
          event.error?.message?.includes('defineProperty') ||
          event.error?.message?.includes('redefine property')) {
        console.warn('🛡️ Erro de carteira capturado e suprimido:', event.error.message);
        event.preventDefault(); // Previne que o erro apareça no console
        return false;
      }
    };

    // Captura erros de promise rejeitada
    const handleUnhandledRejection = (event) => {
      if (event.reason?.message?.includes('ethereum') ||
          event.reason?.message?.includes('defineProperty')) {
        console.warn('🛡️ Promise de carteira rejeitada e tratada:', event.reason.message);
        event.preventDefault();
      }
    };

    // Executa proteção imediatamente
    protectEthereum();
    
    // Executa novamente após DOM carregar completamente
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', protectEthereum);
    }

    // Adiciona listeners para capturar erros
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('DOMContentLoaded', protectEthereum);
    };
  }, []);

  return <>{children}</>;
};

export default WalletProtection;