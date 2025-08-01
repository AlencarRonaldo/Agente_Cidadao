/**
 * SCROLL PERFORMANCE OPTIMIZER
 * 
 * Utility para otimizar efeitos scroll-linked e melhorar performance
 */

// Throttle function para eventos de scroll
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// Debounce function para eventos de scroll
export const debounce = (func, delay) => {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

// Otimização de scroll com RequestAnimationFrame
export const optimizedScrollHandler = (callback) => {
  let ticking = false;
  
  return function (event) {
    if (!ticking) {
      requestAnimationFrame(() => {
        callback(event);
        ticking = false;
      });
      ticking = true;
    }
  };
};

// Lazy scroll observer para elementos
export const createScrollObserver = (elements, callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target, entry);
      }
    });
  }, defaultOptions);
  
  elements.forEach(element => {
    if (element) observer.observe(element);
  });
  
  return observer;
};

// Smooth scroll otimizado
export const smoothScrollTo = (element, options = {}) => {
  const {
    top = 0,
    left = 0,
    behavior = 'smooth',
    block = 'start',
    inline = 'nearest'
  } = options;
  
  if (element.scrollIntoView) {
    element.scrollIntoView({
      behavior,
      block,
      inline
    });
  } else {
    // Fallback para browsers antigos
    element.scrollTop = top;
    element.scrollLeft = left;
  }
};

// Performance monitor para scroll
export const scrollPerformanceMonitor = () => {
  let scrollCount = 0;
  let lastScrollTime = Date.now();
  
  const monitor = throttle(() => {
    scrollCount++;
    const currentTime = Date.now();
    const timeDiff = currentTime - lastScrollTime;
    
    if (timeDiff > 100) { // Se muito lento
      console.warn('🐌 Scroll performance degraded:', {
        scrollCount,
        timeDiff: `${timeDiff}ms`,
        suggestion: 'Consider optimizing scroll-linked effects'
      });
    }
    
    lastScrollTime = currentTime;
  }, 100);
  
  return monitor;
};

// CSS-based scroll optimization hints
export const applyScrollOptimizations = (element) => {
  if (!element) return;
  
  // Aplicar otimizações CSS
  element.style.willChange = 'scroll-position';
  element.style.transform = 'translateZ(0)'; // Force hardware acceleration
  element.style.overflowAnchor = 'none'; // Disable scroll anchoring
  
  // Remove otimizações após uso
  const cleanup = () => {
    element.style.willChange = 'auto';
    element.style.transform = '';
  };
  
  return cleanup;
};

export default {
  throttle,
  debounce,
  optimizedScrollHandler,
  createScrollObserver,
  smoothScrollTo,
  scrollPerformanceMonitor,
  applyScrollOptimizations
};