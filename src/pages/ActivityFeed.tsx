import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, Phone, Users, FileText, MessageSquare, Home, 
  Target, Clock, CheckCircle, AlertCircle, Plus
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface ActivityEvent {
  id: string;
  type: 'report_submitted' | 'lead_created' | 'call_logged' | 'visit_scheduled' | 'inventory_found' | 'message_sent';
  description: string;
  user: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
  metadata?: any;
}

const ActivityFeed: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchActivities();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('activity_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        addActivity({
          type: 'report_submitted',
          description: 'Daily report submitted',
          user: payload.new.generated_by,
          timestamp: payload.new.generated_at,
        });
      })
      .subscribe();

    return () => channel.unsubscribe();
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data: reports } = await supabase
        .from('reports')
        .select('*, profiles!reports_generated_by_fkey(full_name)')
        .eq('report_type', 'team_performance')
        .order('generated_at', { ascending: false })
        .limit(50);

      const events: ActivityEvent[] = [];

      reports?.forEach((report: any) => {
        const data = report.data || {};
        const timestamp = report.generated_at;
        const user = report.profiles?.full_name || 'Unknown';

        // Report submitted
        events.push({
          id: `report-${report.id}`,
          type: 'report_submitted',
          description: 'Daily performance report submitted',
          user,
          timestamp,
          icon: <FileText className="h-4 w-4" />,
          color: 'text-blue-500',
          metadata: { leads: data.leads_registered, calls: data.calls_to_agents },
        });

        // Leads generated
        if (data.leads_registered > 0) {
          events.push({
            id: `leads-${report.id}`,
            type: 'lead_created',
            description: `Generated ${data.leads_registered} leads`,
            user,
            timestamp,
            icon: <Target className="h-4 w-4" />,
            color: 'text-green-500',
            metadata: { count: data.leads_registered },
          });
        }

        // Calls logged
        if (data.calls_to_agents > 0) {
          events.push({
            id: `calls-${report.id}`,
            type: 'call_logged',
            description: `Made ${data.calls_to_agents} agent calls`,
            user,
            timestamp,
            icon: <Phone className="h-4 w-4" />,
            color: 'text-purple-500',
            metadata: { count: data.calls_to_agents },
          });
        }

        // Visits scheduled
        const visits = (data.primary_sites_visited || 0) + (data.client_visit || 0);
        if (visits > 0) {
          events.push({
            id: `visits-${report.id}`,
            type: 'visit_scheduled',
            description: `Completed ${visits} site visits`,
            user,
            timestamp,
            icon: <Home className="h-4 w-4" />,
            color: 'text-orange-500',
            metadata: { count: visits },
          });
        }

        // Inventories found
        if (data.inventories_found > 0) {
          events.push({
            id: `inventory-${report.id}`,
            type: 'inventory_found',
            description: `Found ${data.inventories_found} properties`,
            user,
            timestamp,
            icon: <Plus className="h-4 w-4" />,
            color: 'text-pink-500',
            metadata: { count: data.inventories_found },
          });
        }
      });

      setActivities(events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({ title: 'Error', description: 'Failed to load activity feed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getTimeLabel = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd');
  };

  const getActivityFilters = () => {
    return ['all', 'report_submitted', 'lead_created', 'call_logged', 'visit_scheduled', 'inventory_found'];
  };

  const filtered = filter === 'all' ? activities : activities.filter((a) => a.type === filter);

  const activityTypeColors = {
    report_submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    lead_created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    call_logged: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    visit_scheduled: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    inventory_found: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    message_sent: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  };

  const activityTypeLabels = {
    report_submitted: 'Report',
    lead_created: 'Lead',
    call_logged: 'Call',
    visit_scheduled: 'Visit',
    inventory_found: 'Inventory',
    message_sent: 'Message',
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Activity Feed
        </h1>
        <p className="text-muted-foreground mt-1">Real-time team activity and updates</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {getActivityFilters().map((f) => (
          <Badge
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Activity' : activityTypeLabels[f as keyof typeof activityTypeLabels]}
          </Badge>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Team activities from the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filtered.length > 0 ? (
                filtered.map((activity) => (
                  <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center ${activity.color}`}>
                      {activity.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{activity.user}</p>
                        <Badge className={activityTypeColors[activity.type]} variant="secondary">
                          {activityTypeLabels[activity.type]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(activity.timestamp), 'HH:mm a')} · {getTimeLabel(activity.timestamp)}
                      </p>
                    </div>

                    {/* Metadata */}
                    {activity.metadata?.count && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{activity.metadata.count}</p>
                        <p className="text-xs text-muted-foreground">items</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No activities found for the selected filter.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ActivityFeed;
