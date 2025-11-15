import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface LeadSourceWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
}

export const LeadSourceWidget: React.FC<LeadSourceWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
}) => {
  const { profile } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['lead-source-performance', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('source, status')
        .limit(500);

      if (employeeId) {
        query = query.eq('assigned_to', employeeId);
      } else if (profile?.role !== 'admin' && profile?.role !== 'manager') {
        query = query.eq('assigned_to', profile?.id);
      }

      const { data: leads } = await query;

      const sourceMap = new Map<string, { total: number; converted: number }>();

      leads?.forEach((lead) => {
        const source = lead.source || 'Unknown';
        const existing = sourceMap.get(source) || { total: 0, converted: 0 };
        existing.total += 1;
        if (lead.status === 'closed_won') {
          existing.converted += 1;
        }
        sourceMap.set(source, existing);
      });

      return Array.from(sourceMap.entries())
        .map(([source, data]) => ({
          source,
          total: data.total,
          converted: data.converted,
          conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  return (
    <WidgetContainer
      config={config}
      loading={isLoading}
      error={error}
      onRefresh={handleRefresh}
    >
      {data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="source" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="total" fill="hsl(var(--chart-1))" name="Total Leads" />
            <Bar dataKey="converted" fill="hsl(var(--chart-2))" name="Converted" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetContainer>
  );
};

