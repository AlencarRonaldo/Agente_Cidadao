/**
 * Test file for eventUtils.js
 * Demonstrates the solution for "event.stopImmediatePropagation is not a function" error
 */

import { 
  safeStopPropagation, 
  createSafeEventHandler, 
  hasEventMethod, 
  getEventType 
} from './eventUtils';

// Mock console methods for testing
const originalConsole = { ...console };
beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('eventUtils - React Event Handling Fix', () => {
  describe('safeStopPropagation', () => {
    it('should handle null/undefined events gracefully', () => {
      expect(() => {
        safeStopPropagation(null);
        safeStopPropagation(undefined);
      }).not.toThrow();
      
      expect(console.warn).toHaveBeenCalledWith('safeStopPropagation: No event object provided');
    });

    it('should call preventDefault when available', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      safeStopPropagation(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle missing stopImmediatePropagation gracefully', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
        // stopImmediatePropagation is missing - this was causing the original error
      };

      expect(() => {
        safeStopPropagation(mockEvent);
      }).not.toThrow();

      expect(console.debug).toHaveBeenCalledWith(
        'safeStopPropagation: stopImmediatePropagation not available on this event'
      );
    });

    it('should use nativeEvent.stopImmediatePropagation when available', () => {
      const mockNativeEvent = {
        stopImmediatePropagation: jest.fn()
      };

      const mockSyntheticEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        nativeEvent: mockNativeEvent
      };

      safeStopPropagation(mockSyntheticEvent);

      expect(mockSyntheticEvent.preventDefault).toHaveBeenCalled();
      expect(mockSyntheticEvent.stopPropagation).toHaveBeenCalled();
      expect(mockNativeEvent.stopImmediatePropagation).toHaveBeenCalled();
    });

    it('should respect options parameter', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        stopImmediatePropagation: jest.fn()
      };

      safeStopPropagation(mockEvent, {
        preventDefault: false,
        stopPropagation: false,
        stopImmediatePropagation: true
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
      expect(mockEvent.stopImmediatePropagation).toHaveBeenCalled();
    });
  });

  describe('createSafeEventHandler', () => {
    it('should create a wrapped handler that stops propagation', () => {
      const mockHandler = jest.fn();
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      const wrappedHandler = createSafeEventHandler(mockHandler);
      wrappedHandler(mockEvent, 'test', 'args');

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(mockEvent, 'test', 'args');
    });

    it('should handle non-function handlers gracefully', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      const wrappedHandler = createSafeEventHandler(null);

      expect(() => {
        wrappedHandler(mockEvent);
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'createSafeEventHandler: Provided handler is not a function'
      );
    });
  });

  describe('hasEventMethod', () => {
    it('should correctly identify available methods', () => {
      const eventWithMethod = {
        preventDefault: () => {},
        stopPropagation: () => {}
      };

      const eventWithNativeMethod = {
        nativeEvent: {
          stopImmediatePropagation: () => {}
        }
      };

      expect(hasEventMethod(eventWithMethod, 'preventDefault')).toBe(true);
      expect(hasEventMethod(eventWithMethod, 'stopImmediatePropagation')).toBe(false);
      expect(hasEventMethod(eventWithNativeMethod, 'stopImmediatePropagation')).toBe(true);
    });

    it('should handle invalid inputs', () => {
      expect(hasEventMethod(null, 'preventDefault')).toBe(false);
      expect(hasEventMethod({}, null)).toBe(false);
      expect(hasEventMethod({}, 123)).toBe(false);
    });
  });

  describe('getEventType', () => {
    it('should identify synthetic events', () => {
      const syntheticEvent = {
        nativeEvent: {},
        currentTarget: {}
      };

      const result = getEventType(syntheticEvent);

      expect(result.type).toBe('synthetic');
      expect(result.isSynthetic).toBe(true);
      expect(result.isNative).toBe(false);
    });

    it('should identify native events', () => {
      const nativeEvent = {
        type: 'click',
        target: {}
      };

      const result = getEventType(nativeEvent);

      expect(result.type).toBe('native');
      expect(result.isSynthetic).toBe(false);
      expect(result.isNative).toBe(true);
    });

    it('should handle null events', () => {
      const result = getEventType(null);

      expect(result.type).toBe('null');
      expect(result.isSynthetic).toBe(false);
      expect(result.isNative).toBe(false);
    });
  });
});

describe('Real-world usage examples', () => {
  it('should handle the original error scenario', () => {
    // Simulate the original problematic event object
    const problematicEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
      // stopImmediatePropagation is missing - this caused the original error
    };

    // The old code would have failed here:
    // problematicEvent.stopImmediatePropagation(); // TypeError: stopImmediatePropagation is not a function

    // The new code handles it safely:
    expect(() => {
      safeStopPropagation(problematicEvent);
    }).not.toThrow();

    expect(problematicEvent.preventDefault).toHaveBeenCalled();
    expect(problematicEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should work with Material-UI IconButton events', () => {
    // Simulate a Material-UI IconButton click event
    const muiEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: {},
      nativeEvent: {
        stopImmediatePropagation: jest.fn()
      }
    };

    const buttonClickHandler = createSafeEventHandler((event, action) => {
      // This is what the ActionButtons component does
      console.log('Button clicked with action:', action);
    });

    expect(() => {
      buttonClickHandler(muiEvent, 'approve');
    }).not.toThrow();

    expect(muiEvent.preventDefault).toHaveBeenCalled();
    expect(muiEvent.stopPropagation).toHaveBeenCalled();
    expect(muiEvent.nativeEvent.stopImmediatePropagation).toHaveBeenCalled();
  });
});