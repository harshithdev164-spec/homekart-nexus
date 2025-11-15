import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';
import { getFollowUpReminders } from '@/services/dashboardService';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FollowUpRemindersWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
  onLeadClick?: (leadId: string) => void;
}

export const FollowUpRemindersWidget: React.FC<FollowUpRemindersWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
  onLeadClick,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['followup-reminders', employeeId],
    queryFn: () => getFollowUpReminders(employeeId),
    staleTime: 1 * 60 * 1000,
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
      {data && data.length > 0 ? (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {data.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onLeadClick?.(reminder.id)}
            >
              <div className="mt-0.5">
                {reminder.isOverdue ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Clock className="h-4 w-4 text-warning" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{reminder.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {reminder.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reminder.nextFollowUp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(reminder.nextFollowUp), 'PPpp')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No follow-up reminders
        </div>
      )}
    </WidgetContainer>
  );
};

