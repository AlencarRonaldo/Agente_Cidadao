/**
 * Utilitários para tratamento de erros no frontend
 */

/**
 * Extrai uma mensagem legível de qualquer tipo de erro
 */
export const getErrorMessage = (error) => {
  if (!error) return 'Erro desconhecido';
  
  // Se for uma string, retorna diretamente
  if (typeof error === 'string') return error;
  
  // Se for um objeto Error padrão
  if (error instanceof Error) return error.message;
  
  // Se for um objeto com message
  if (error.message) return error.message;
  
  // Se for um objeto com error
  if (error.error) return error.error;
  
  // Se for uma resposta de API com data
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  
  // Fallback para JSON stringify
  try {
    return JSON.stringify(error);
  } catch {
    return 'Erro desconhecido';
  }
};

/**
 * Trata erros específicos de API HTTP
 */
export const getApiErrorMessage = (error) => {
  // Verificar se é um erro de rede
  if (!error.response) {
    return 'Erro de conexão - Verifique sua internet ou se o servidor está ativo';
  }
  
  const status = error.response?.status;
  const data = error.response?.data;
  
  // Mensagem específica da resposta
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  
  // Mensagens baseadas no status HTTP
  switch (status) {
    case 400:
      return 'Dados inválidos - Verifique os campos preenchidos';
    case 401:
      return 'Não autorizado - Faça login novamente';
    case 403:
      return 'Acesso negado - Você não tem permissão';
    case 404:
      return 'Recurso não encontrado';
    case 409:
      return 'Conflito - Dados já existem';
    case 422:
      return 'Dados inválidos - Verifique os campos';
    case 429:
      return 'Muitas tentativas - Aguarde um momento';
    case 500:
      return 'Erro interno do servidor - Tente novamente';
    case 502:
      return 'Servidor indisponível - Tente novamente';
    case 503:
      return 'Serviço temporariamente indisponível';
    default:
      return `Erro HTTP ${status} - ${getErrorMessage(error)}`;
  }
};

/**
 * Trata erros de rede/conexão
 */
export const getNetworkErrorMessage = (error) => {
  if (error.name === 'NetworkError' || error.message?.includes('NetworkError')) {
    return 'Erro de rede - Verifique sua conexão com a internet';
  }
  
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return 'Timeout - A requisição demorou muito para responder';
  }
  
  if (error.message?.includes('fetch')) {
    return 'Erro de comunicação com o servidor';
  }
  
  return getErrorMessage(error);
};

/**
 * Função principal para processar qualquer tipo de erro
 */
export const processError = (error) => {
  console.error('Erro capturado:', error);
  
  // Tenta diferentes estratégias de extração de mensagem
  if (error.response) {
    return getApiErrorMessage(error);
  }
  
  if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
    return getNetworkErrorMessage(error);
  }
  
  return getErrorMessage(error);
};

/**
 * Hook React para tratamento consistente de erros
 */
export const useErrorHandler = () => {
  const handleError = (error, fallbackMessage = null) => {
    const message = processError(error);
    
    // Log estruturado para debug
    console.group('🚨 Error Handler');
    console.error('Original Error:', error);
    console.log('Processed Message:', message);
    console.log('Fallback Message:', fallbackMessage);
    console.groupEnd();
    
    return fallbackMessage || message;
  };
  
  return { handleError };
};

/**
 * Processa resposta de API de forma segura
 */
export const processApiResponse = async (response) => {
  try {
    const data = await response.json();
    
    if (!response.ok) {
      throw {
        response: {
          status: response.status,
          data: data
        }
      };
    }
    
    return data;
  } catch (error) {
    if (error.response) {
      throw error; // Re-throw API errors
    }
    
    // JSON parsing error
    throw new Error('Resposta inválida do servidor');
  }
};

/**
 * Função utilitária para chamadas de API simplificadas
 */
export const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    return await processApiResponse(response);
  } catch (error) {
    throw processError(error);
  }
};

export default {
  getErrorMessage,
  getApiErrorMessage,
  getNetworkErrorMessage,
  processError,
  useErrorHandler,
  processApiResponse,
  apiRequest
};