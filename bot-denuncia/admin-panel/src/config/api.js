import { getNetworkErrorMessage, getApiErrorMessage, processError } from '../utils/errorUtils';

// Configuração da API
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3355/api';

// Helper para fazer chamadas da API com tratamento de erro melhorado
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    console.log('Making API call to:', url, 'with options:', finalOptions);
    const response = await fetch(url, finalOptions);
    console.log('API response:', response.status, response.statusText);
    
    // Retorna response para permitir tratamento customizado pelos componentes
    return response;
  } catch (error) {
    // Log estruturado do erro
    console.error('API call error:', {
      error,
      url,
      options: finalOptions,
      timestamp: new Date().toISOString()
    });
    
    // Cria erro com mensagem amigável para network errors
    const friendlyMessage = getNetworkErrorMessage(error);
    const enhancedError = new Error(friendlyMessage);
    enhancedError.originalError = error;
    enhancedError.url = url;
    enhancedError.options = finalOptions;
    
    throw enhancedError;
  }
};

/**
 * Helper para processar resposta da API com tratamento de erro padronizado
 * @param {Response} response - Resposta da fetch API
 * @returns {Object} Dados parseados ou throw error com mensagem amigável
 */
export const processApiResponse = async (response) => {
  let data = null;
  
  try {
    // Tenta parsear o JSON
    const text = await response.text();
    if (text) {
      data = JSON.parse(text);
    }
  } catch (parseError) {
    console.warn('Erro ao parsear resposta JSON:', parseError);
    // Se não conseguir parsear, usa o status como fallback
  }
  
  if (!response.ok) {
    // Criar objeto de erro compatível com o getApiErrorMessage
    const errorObj = {
      response: {
        status: response.status,
        statusText: response.statusText,
        data: data
      }
    };
    
    const errorMessage = getApiErrorMessage(errorObj);
    const error = new Error(errorMessage);
    error.status = response.status;
    error.statusText = response.statusText;
    error.data = data;
    error.response = errorObj.response;
    throw error;
  }
  
  return data;
};

/**
 * Helper que combina apiCall + processApiResponse para uso simples
 * @param {string} endpoint - Endpoint da API
 * @param {Object} options - Opções da requisição
 * @returns {Object} Dados parseados da resposta
 */
export const apiRequest = async (endpoint, options = {}) => {
  const response = await apiCall(endpoint, options);
  return await processApiResponse(response);
};

const apiConfig = { API_BASE_URL, apiCall };
export default apiConfig;