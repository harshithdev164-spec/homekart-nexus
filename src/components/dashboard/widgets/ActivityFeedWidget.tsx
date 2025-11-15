import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';
import { getActivityFeed } from '@/services/dashboardService';
import { format, formatDistanceToNow } from 'date-fns';
import { Phone, Mail, Calendar, CheckCircle, User, Home, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActivityFeedWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
}

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activity-feed', employeeId],
    queryFn: () => getActivityFeed(10, employeeId),
    staleTime: 30 * 1000,
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4 text-primary" />;
      case 'email':
        return <Mail className="h-4 w-4 text-secondary" />;
      case 'meeting':
        return <Calendar className="h-4 w-4 text-success" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-warning" />;
      case 'lead_update':
        return <User className="h-4 w-4 text-primary" />;
      case 'property_update':
        return <Home className="h-4 w-4 text-accent" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <WidgetContainer
      config={config}
      loading={isLoading}
      error={error}
      onRefresh={handleRefresh}
    >
      {data && data.length > 0 ? (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {data.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="mt-0.5">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                {activity.description && (
                  <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{activity.user}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No recent activities
        </div>
      )}
    </WidgetContainer>
  );
};

