import { useState, useEffect, useCallback, useRef } from 'react';
import { generateReport } from '@/services/reportService';
import { ReportConfig, ReportData } from '@/types/reports';
import { useToast } from '@/hooks/use-toast';

interface UseReportDataOptions {
  autoFetch?: boolean;
  cacheTime?: number;
}

export const useReportData = (config: ReportConfig | null, options: UseReportDataOptions = {}) => {
  const { autoFetch = false, cacheTime = 5 * 60 * 1000 } = options;
  const { toast } = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, { data: ReportData; timestamp: number }>>(new Map());

  const fetchReport = useCallback(async (reportConfig: ReportConfig) => {
    // Check cache
    const cacheKey = JSON.stringify(reportConfig);
    const cached = cacheRef.current.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data);
      return cached.data;
    }

    setLoading(true);
    setError(null);

    try {
      const reportData = await generateReport(reportConfig);
      setData(reportData);
      
      // Update cache
      cacheRef.current.set(cacheKey, {
        data: reportData,
        timestamp: Date.now(),
      });

      return reportData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate report');
      setError(error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [cacheTime, toast]);

  const refresh = useCallback(() => {
    if (config) {
      // Clear cache for this config
      const cacheKey = JSON.stringify(config);
      cacheRef.current.delete(cacheKey);
      return fetchReport(config);
    }
  }, [config, fetchReport]);

  useEffect(() => {
    if (autoFetch && config) {
      fetchReport(config);
    }
  }, [autoFetch, config, fetchReport]);

  // Clear old cache entries periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      cacheRef.current.forEach((value, key) => {
        if (now - value.timestamp > cacheTime) {
          cacheRef.current.delete(key);
        }
      });
    }, cacheTime);

    return () => clearInterval(interval);
  }, [cacheTime]);

  return {
    data,
    loading,
    error,
    fetchReport,
    refresh,
  };
};

