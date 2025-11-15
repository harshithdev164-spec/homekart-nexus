import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { Target, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface GoalProgressWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
}

export const GoalProgressWidget: React.FC<GoalProgressWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
}) => {
  const { data: goals, isLoading, error, refetch } = useQuery({
    queryKey: ['goal-progress', employeeId],
    queryFn: async () => {
      // For now, calculate goals from current performance
      // In the future, this would come from a goals table
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Get current month performance
      let query = supabase
        .from('reports')
        .select('data, generated_at')
        .eq('report_type', 'team_performance')
        .gte('generated_at', startOfMonth.toISOString());

      if (employeeId) {
        query = query.eq('generated_by', employeeId);
      }

      const { data: reports } = await query;
      
      // Calculate totals
      const totalLeads = reports?.reduce((sum, r: any) => sum + (Number(r.data?.leads_registered) || 0), 0) || 0;
      const totalCalls = reports?.reduce((sum, r: any) => sum + (Number(r.data?.calls_to_agents) || 0), 0) || 0;
      const totalVisits = reports?.reduce((sum, r: any) => sum + (Number(r.data?.primary_sites_visited) || 0) + (Number(r.data?.client_visit) || 0), 0) || 0;

      // Set targets (example: 20% above average)
      return [
        {
          goalId: 'leads',
          title: 'Monthly Leads Target',
          target: 100,
          current: totalLeads,
          progress: totalLeads / 100 * 100,
          deadline: format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd'),
          status: totalLeads >= 100 ? 'on_track' : totalLeads >= 80 ? 'at_risk' : 'behind',
        },
        {
          goalId: 'calls',
          title: 'Monthly Calls Target',
          target: 500,
          current: totalCalls,
          progress: totalCalls / 500 * 100,
          deadline: format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd'),
          status: totalCalls >= 500 ? 'on_track' : totalCalls >= 400 ? 'at_risk' : 'behind',
        },
        {
          goalId: 'visits',
          title: 'Monthly Visits Target',
          target: 50,
          current: totalVisits,
          progress: totalVisits / 50 * 100,
          deadline: format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd'),
          status: totalVisits >= 50 ? 'on_track' : totalVisits >= 40 ? 'at_risk' : 'behind',
        },
      ];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'at_risk':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'behind':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return <Badge className="bg-success">On Track</Badge>;
      case 'at_risk':
        return <Badge className="bg-warning">At Risk</Badge>;
      case 'behind':
        return <Badge variant="destructive">Behind</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <WidgetContainer
      config={config}
      loading={isLoading}
      error={error}
      onRefresh={handleRefresh}
    >
      {goals && goals.length > 0 && (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.goalId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(goal.status)}
                  <span className="text-sm font-medium">{goal.title}</span>
                </div>
                {getStatusBadge(goal.status)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {goal.current} / {goal.target}
                  </span>
                  <span className="font-medium">{goal.progress.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(100, goal.progress)} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetContainer>
  );
};

