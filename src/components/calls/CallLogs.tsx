import React, { useEffect, useState } from 'react';
import { Phone, Clock, Calendar, User, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface CallLog {
  id: string;
  lead_id: string | null;
  agent_id: string | null;
  phone_number: string;
  call_type: string;
  call_status: string;
  duration: number | null;
  notes: string | null;
  created_at: string;
  leads?: { name: string } | null;
}

interface CallLogsProps {
  leadId?: string;
  agentId?: string;
  limit?: number;
}

export const CallLogs: React.FC<CallLogsProps> = ({ leadId, agentId, limit }) => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallLogs();
  }, [leadId, agentId]);

  const fetchCallLogs = async () => {
    try {
      let query = supabase
        .from('call_logs')
        .select(`
          *,
          leads(name)
        `)
        .order('created_at', { ascending: false});

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCallLogs(data || []);
    } catch (error) {
      console.error('Error fetching call logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-500/10 text-green-700 dark:text-green-400',
      missed: 'bg-red-500/10 text-red-700 dark:text-red-400',
      no_answer: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      busy: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      cancelled: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
    };
    return colors[status as keyof typeof colors] || colors.completed;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (callLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>No calls recorded yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call History
        </CardTitle>
        <CardDescription>Recent call activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {callLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{log.phone_number}</span>
                    {log.leads && (
                      <Badge variant="outline" className="text-xs">
                        {log.leads.name}
                      </Badge>
                    )}
                  </div>
                  <Badge className={getStatusColor(log.call_status)}>
                    {log.call_status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(log.created_at), 'MMM dd, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(log.created_at), 'hh:mm a')}
                  </div>
                  {log.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Duration: {formatDuration(log.duration)}
                    </div>
                  )}
                </div>

                {log.notes && (
                  <div className="flex gap-2 text-sm mt-2">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{log.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
