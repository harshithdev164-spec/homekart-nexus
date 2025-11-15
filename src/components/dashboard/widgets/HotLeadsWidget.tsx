import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { getHotLeads } from '@/services/dashboardService';
import { format } from 'date-fns';
import { Flame, User } from 'lucide-react';

interface HotLeadsWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
  onLeadClick?: (leadId: string) => void;
}

export const HotLeadsWidget: React.FC<HotLeadsWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
  onLeadClick,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hot-leads', employeeId],
    queryFn: () => getHotLeads(5, employeeId),
    staleTime: 2 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
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
        <div className="space-y-3">
          {data.map((lead) => (
            <div
              key={lead.id}
              className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onLeadClick?.(lead.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="h-4 w-4 text-destructive" />
                    <span className="font-medium">{lead.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{lead.assignedTo}</span>
                  </div>
                </div>
                <Badge className={getPriorityColor(lead.priority)}>
                  {lead.priority}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Score: {lead.score}</span>
                  <Badge variant="outline" className="text-xs">
                    {lead.status}
                  </Badge>
                </div>
                {lead.nextFollowUp !== 'Not scheduled' && (
                  <span className="text-muted-foreground">
                    {format(new Date(lead.nextFollowUp), 'MMM dd')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No hot leads at the moment
        </div>
      )}
    </WidgetContainer>
  );
};

