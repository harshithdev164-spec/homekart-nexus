import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';
import { getUpcomingMeetings } from '@/services/dashboardService';
import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MeetingsWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
  onMeetingClick?: (meetingId: string) => void;
}

export const MeetingsWidget: React.FC<MeetingsWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
  onMeetingClick,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['upcoming-meetings', employeeId],
    queryFn: () => getUpcomingMeetings(7, employeeId),
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
      {data && data.length > 0 ? (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {data.map((meeting) => (
            <div
              key={meeting.id}
              className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onMeetingClick?.(meeting.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">{meeting.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(meeting.scheduledAt), 'PPpp')}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {meeting.type === 'site_visit' ? 'Site Visit' : 'Meeting'}
                </Badge>
              </div>
              {meeting.location && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <MapPin className="h-3 w-3" />
                  <span>{meeting.location}</span>
                </div>
              )}
              {meeting.participants.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Users className="h-3 w-3" />
                  <span>{meeting.participants.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No upcoming meetings
        </div>
      )}
    </WidgetContainer>
  );
};

