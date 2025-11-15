import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  renderCount: number;
}

/**
 * Hook to measure component render performance
 */
export function usePerformanceMonitor(componentName: string, enabled: boolean = process.env.NODE_ENV === 'development') {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > 16) { // Warn if render takes more than 16ms (60fps threshold)
      console.warn(`⚠️ Slow render detected in ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        renderCount: renderCount.current,
      });
    }

    startTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
  };
}

/**
 * Measure and log function execution time
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  label?: string
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    const fnName = label || fn.name || 'Anonymous function';
    console.log(`⏱️ ${fnName} took ${(end - start).toFixed(2)}ms`);
    
    return result;
  }) as T;
}

/**
 * Detect performance bottlenecks
 */
export class PerformanceTracker {
  private static metrics: Map<string, PerformanceMetrics[]> = new Map();

  static track(componentName: string, renderTime: number) {
    const existing = this.metrics.get(componentName) || [];
    existing.push({
      componentName,
      renderTime,
      renderCount: existing.length + 1,
    });
    this.metrics.set(componentName, existing);
  }

  static getReport() {
    const report: Record<string, {
      avgRenderTime: number;
      totalRenders: number;
      slowestRender: number;
    }> = {};

    this.metrics.forEach((metrics, componentName) => {
      const renderTimes = metrics.map(m => m.renderTime);
      report[componentName] = {
        avgRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
        totalRenders: metrics.length,
        slowestRender: Math.max(...renderTimes),
      };
    });

    return report;
  }

  static clear() {
    this.metrics.clear();
  }
}

/**
 * Monitor Web Vitals
 */
export function useWebVitals() {
  useEffect(() => {
    if ('web-vital' in performance) {
      // Monitor Largest Contentful Paint (LCP)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          console.log('LCP:', entry);
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // Monitor First Input Delay (FID)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          console.log('FID:', fid);
        });
      }).observe({ type: 'first-input', buffered: true });

      // Monitor Cumulative Layout Shift (CLS)
      let clsScore = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any) {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
            console.log('CLS:', clsScore);
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }
  }, []);
}

/**
 * Log bundle size information
 */
export function logBundleInfo() {
  if (process.env.NODE_ENV === 'development') {
    console.group('📦 Bundle Information');
    console.log('React version:', React.version);
    console.log('Environment:', process.env.NODE_ENV);
    console.groupEnd();
  }
}

import React from 'react';
