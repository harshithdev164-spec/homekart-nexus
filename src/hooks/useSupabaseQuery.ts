import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

interface UseSupabaseQueryOptions<T> {
  queryKey: string[];
  table: string;
  select?: string;
  filters?: (query: any) => any;
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  };
}

/**
 * Optimized hook for Supabase queries with built-in caching and error handling
 */
export function useSupabaseQuery<T = any>({
  queryKey,
  table,
  select = '*',
  filters,
  options = {},
}: UseSupabaseQueryOptions<T>) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from(table).select(select);
      
      if (filters) {
        query = filters(query);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as T[];
    },
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

/**
 * Optimized mutation hook with automatic cache invalidation
 */
export function useSupabaseMutation<T = any>(
  table: string,
  invalidateKeys: string[][] = []
) {
  const queryClient = useQueryClient();

  const insert = useMutation({
    mutationFn: async (data: Partial<T>) => {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });

  return { insert, update, remove };
}

/**
 * Prefetch data for better UX
 */
export function usePrefetchQuery(queryClient: any) {
  return {
    prefetch: async <T = any>(
      queryKey: string[],
      table: string,
      select = '*',
      filters?: (query: any) => any
    ) => {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          let query = supabase.from(table).select(select);
          
          if (filters) {
            query = filters(query);
          }
          
          const { data, error } = await query;
          if (error) throw error;
          return data as T[];
        },
      });
    },
  };
}
