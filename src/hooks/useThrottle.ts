import { useEffect, useRef, useCallback } from 'react';

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Throttle hook to limit function execution rate
 * Useful for scroll events, resize events, etc.
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: ThrottleOptions = { leading: true, trailing: true }
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledFunction = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      const execute = () => {
        lastCallRef.current = now;
        callbackRef.current(...args);
      };

      if (timeSinceLastCall >= delay) {
        if (options.leading) {
          execute();
        }
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        if (options.trailing) {
          timeoutRef.current = setTimeout(() => {
            execute();
          }, delay - timeSinceLastCall);
        }
      }
    },
    [delay, options.leading, options.trailing]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledFunction;
}
