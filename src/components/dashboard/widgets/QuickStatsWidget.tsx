import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { Activity, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { getQuickStats } from '@/services/dashboardService';

interface QuickStatsWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
}

export const QuickStatsWidget: React.FC<QuickStatsWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['quick-stats', employeeId],
    queryFn: () => getQuickStats(employeeId),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 60000,
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const stats = [
    {
      label: "Today's Activities",
      value: data?.todayActivities || 0,
      icon: Activity,
      color: 'text-primary',
    },
    {
      label: 'Pending Follow-ups',
      value: data?.pendingFollowUps || 0,
      icon: Clock,
      color: 'text-warning',
    },
    {
      label: 'Overdue Tasks',
      value: data?.overdueTasks || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
    },
    {
      label: 'Upcoming Meetings',
      value: data?.upcomingMeetings || 0,
      icon: Calendar,
      color: 'text-success',
    },
  ];

  return (
    <WidgetContainer
      config={config}
      loading={isLoading}
      error={error}
      onRefresh={handleRefresh}
    >
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50">
              <Icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground text-center mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </WidgetContainer>
  );
};

