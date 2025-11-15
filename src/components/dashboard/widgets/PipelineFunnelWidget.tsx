import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface PipelineFunnelWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
}

export const PipelineFunnelWidget: React.FC<PipelineFunnelWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
}) => {
  const { profile } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pipeline-funnel', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('status')
        .neq('status', 'closed_won')
        .neq('status', 'closed_lost');

      if (employeeId) {
        query = query.eq('assigned_to', employeeId);
      } else if (profile?.role !== 'admin' && profile?.role !== 'manager') {
        query = query.eq('assigned_to', profile?.id);
      }

      const { data: leads } = await query;

      const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'];
      const counts = new Map<string, number>();

      stages.forEach((stage) => {
        counts.set(stage, 0);
      });

      leads?.forEach((lead) => {
        const count = counts.get(lead.status) || 0;
        counts.set(lead.status, count + 1);
      });

      return stages.map((stage) => ({
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: counts.get(stage) || 0,
      }));
    },
    staleTime: 2 * 60 * 1000,
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
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="stage" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetContainer>
  );
};

