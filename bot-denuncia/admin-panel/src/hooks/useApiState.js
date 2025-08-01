import { useState, useCallback } from 'react';
import { useErrorHandler } from '../utils/errorUtils';

/**
 * Custom hook for managing API call states
 * Provides loading, error, and success states with consistent error handling
 */
export const useApiState = (componentName = 'Component') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { handleError } = useErrorHandler(componentName);

  const executeAsync = useCallback(async (asyncFn, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      showLoading = true, 
      resetError = true 
    } = options;

    try {
      if (showLoading) setLoading(true);
      if (resetError) setError(null);

      const result = await asyncFn();
      
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
      
      if (onError) onError(err, errorMessage);
      throw err;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [handleError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setLoadingState = useCallback((isLoading) => {
    setLoading(isLoading);
  }, []);

  return {
    loading,
    error,
    executeAsync,
    clearError,
    setLoadingState
  };
};

export default useApiState;