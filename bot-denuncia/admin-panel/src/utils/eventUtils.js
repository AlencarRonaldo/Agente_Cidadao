/**
 * Event Utilities for React Applications
 * 
 * Provides safe event handling utilities that work with both React SyntheticEvents
 * and native DOM events, preventing errors when methods are not available.
 */

/**
 * Safely stops event propagation using all available methods
 * Handles both React SyntheticEvent and native Event objects
 * 
 * @param {Event|SyntheticEvent} event - The event object to stop propagation for
 * @param {Object} options - Configuration options
 * @param {boolean} options.preventDefault - Whether to prevent default behavior (default: true)
 * @param {boolean} options.stopPropagation - Whether to stop regular propagation (default: true)
 * @param {boolean} options.stopImmediatePropagation - Whether to stop immediate propagation (default: true)
 * @param {boolean} options.silent - Whether to suppress warnings (default: false)
 */
export const safeStopPropagation = (event, options = {}) => {
  const {
    preventDefault = true,
    stopPropagation = true,
    stopImmediatePropagation = true,
    silent = false
  } = options;

  try {
    if (!event) {
      if (!silent) {
        console.warn('safeStopPropagation: No event object provided');
      }
      return;
    }

    // Prevent default behavior (available on both SyntheticEvent and native Event)
    if (preventDefault && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    // Stop regular propagation (available on both SyntheticEvent and native Event)
    if (stopPropagation && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }

    // Stop immediate propagation - check if method exists
    if (stopImmediatePropagation) {
      // Try on the event object itself first
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      // Fall back to native event if available (React SyntheticEvent)
      else if (event.nativeEvent && typeof event.nativeEvent.stopImmediatePropagation === 'function') {
        event.nativeEvent.stopImmediatePropagation();
      }
      else if (!silent) {
        console.debug('safeStopPropagation: stopImmediatePropagation not available on this event');
      }
    }

  } catch (error) {
    if (!silent) {
      console.error('Error in safeStopPropagation:', error);
    }
  }
};

/**
 * Creates a safe event handler that automatically stops propagation
 * and then calls the provided handler function
 * 
 * @param {Function} handler - The handler function to call
 * @param {Object} propagationOptions - Options passed to safeStopPropagation
 * @returns {Function} A wrapped event handler
 */
export const createSafeEventHandler = (handler, propagationOptions = {}) => {
  return (event, ...args) => {
    safeStopPropagation(event, propagationOptions);
    
    if (typeof handler === 'function') {
      return handler(event, ...args);
    } else {
      console.warn('createSafeEventHandler: Provided handler is not a function');
    }
  };
};

/**
 * Utility to check if an event has a specific method
 * Useful for conditional event handling
 * 
 * @param {Event|SyntheticEvent} event - The event object to check
 * @param {string} methodName - The method name to check for
 * @returns {boolean} Whether the method exists and is callable
 */
export const hasEventMethod = (event, methodName) => {
  if (!event || typeof methodName !== 'string') {
    return false;
  }
  
  // Check on event object itself
  if (typeof event[methodName] === 'function') {
    return true;
  }
  
  // Check on nativeEvent if available (React SyntheticEvent)
  if (event.nativeEvent && typeof event.nativeEvent[methodName] === 'function') {
    return true;
  }
  
  return false;
};

/**
 * Detects the type of event object
 * Useful for debugging and conditional handling
 * 
 * @param {Event|SyntheticEvent} event - The event object to analyze
 * @returns {Object} Information about the event type
 */
export const getEventType = (event) => {
  if (!event) {
    return { type: 'null', isSynthetic: false, isNative: false };
  }

  const isSynthetic = !!(event.nativeEvent && event.currentTarget);
  const isNative = !isSynthetic && !!(event.type && event.target);
  
  return {
    type: isSynthetic ? 'synthetic' : isNative ? 'native' : 'unknown',
    isSynthetic,
    isNative,
    constructor: event.constructor?.name || 'unknown',
    availableMethods: {
      preventDefault: typeof event.preventDefault === 'function',
      stopPropagation: typeof event.stopPropagation === 'function',
      stopImmediatePropagation: typeof event.stopImmediatePropagation === 'function',
      nativeStopImmediatePropagation: !!(event.nativeEvent && typeof event.nativeEvent.stopImmediatePropagation === 'function')
    }
  };
};

/**
 * React hook for creating memoized safe event handlers
 * Combines useCallback with safe event handling
 * 
 * Note: Import useCallback from React in your component to use this function
 * 
 * @param {Function} handler - The handler function
 * @param {Array} dependencies - Dependencies array for useCallback
 * @param {Object} propagationOptions - Options for event propagation
 * @param {Function} useCallback - useCallback hook from React
 * @returns {Function} Memoized safe event handler
 */
export const createUseSafeEventHandler = (useCallback) => (handler, dependencies = [], propagationOptions = {}) => {
  return useCallback(
    createSafeEventHandler(handler, propagationOptions),
    dependencies
  );
};

// Export default for convenience
export default {
  safeStopPropagation,
  createSafeEventHandler,
  hasEventMethod,
  getEventType,
  createUseSafeEventHandler
};