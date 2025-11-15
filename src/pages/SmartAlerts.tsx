import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertCircle, Bell, CheckCircle2, Clock, Trash2, Settings,
  TrendingDown, Calendar, Zap, Users
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Alert {
  id: string;
  type: 'overdue_followup' | 'lead_update' | 'low_activity' | 'milestone' | 'inactive_user';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  metadata?: any;
}

const SmartAlerts: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    generateAlerts();
    setupRealtimeAlerts();
  }, [profile?.id]);

  const setupRealtimeAlerts = () => {
    const channel = supabase
      .channel('alerts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        generateAlerts();
      })
      .subscribe();

    return () => channel.unsubscribe();
  };

  const generateAlerts = async () => {
    setLoading(true);
    const newAlerts: Alert[] = [];

    try {
      // 1. Overdue follow-ups check
      const { data: reports } = await supabase
        .from('reports')
        .select('*, profiles!reports_generated_by_fkey(full_name)')
        .eq('report_type', 'team_performance')
        .order('generated_at', { ascending: false })
        .limit(100);

      const today = new Date();
      const reportsByUser = new Map<string, any[]>();

      reports?.forEach((report: any) => {
        const user = report.profiles?.full_name || 'Unknown';
        if (!reportsByUser.has(user)) {
          reportsByUser.set(user, []);
        }
        reportsByUser.get(user)!.push(report);
      });

      // Check for no report today
      reportsByUser.forEach((userReports, userName) => {
        if (userReports.length > 0) {
          const lastReport = new Date(userReports[0].generated_at);
          const daysSinceReport = differenceInDays(today, lastReport);

          if (daysSinceReport >= 2) {
            newAlerts.push({
              id: `overdue-${userName}`,
              type: 'overdue_followup',
              severity: daysSinceReport >= 3 ? 'critical' : 'warning',
              title: `${userName} - No Report Submitted`,
              description: `${userName} hasn't submitted a report in ${daysSinceReport} days. Last report: ${format(lastReport, 'MMM dd, HH:mm')}`,
              timestamp: new Date().toISOString(),
              read: false,
              metadata: { user: userName, days: daysSinceReport },
            });
          }
        }
      });

      // 2. Low activity check (less than 5 calls per day average)
      reports?.forEach((report: any) => {
        const data = report.data || {};
        const calls = Number(data.calls_to_agents) || 0;
        const leads = Number(data.leads_registered) || 0;

        if (calls < 3 && leads === 0) {
          newAlerts.push({
            id: `low-activity-${report.id}`,
            type: 'low_activity',
            severity: 'info',
            title: `Low Activity Alert - ${report.profiles?.full_name || 'Unknown'}`,
            description: `${report.profiles?.full_name || 'Unknown'} made only ${calls} calls and 0 leads on ${format(new Date(report.generated_at), 'MMM dd')}`,
            timestamp: report.generated_at,
            read: false,
            metadata: { user: report.profiles?.full_name, calls, leads },
          });
        }
      });

      // 3. Milestone alerts (high performers)
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name').eq('is_active', true);

      profilesData?.forEach((emp: any) => {
        const userReports = reportsByUser.get(emp.full_name) || [];
        if (userReports.length > 0) {
          const totalCalls = userReports.reduce((sum, r) => sum + (Number(r.data?.calls_to_agents) || 0), 0);
          const totalLeads = userReports.reduce((sum, r) => sum + (Number(r.data?.leads_registered) || 0), 0);

          if (totalCalls > 50 && totalLeads > 15) {
            newAlerts.push({
              id: `milestone-${emp.id}`,
              type: 'milestone',
              severity: 'info',
              title: `🎉 ${emp.full_name} - Milestone Achievement!`,
              description: `${emp.full_name} has reached ${totalLeads} leads and ${totalCalls} calls this month!`,
              timestamp: new Date().toISOString(),
              read: false,
              metadata: { user: emp.full_name, calls: totalCalls, leads: totalLeads },
            });
          }
        }
      });

      // Remove duplicate milestone alerts
      const uniqueAlerts = Array.from(new Map(newAlerts.map((a) => [a.id, a])).values());
      setAlerts(uniqueAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      console.error('Error generating alerts:', error);
      toast({ title: 'Error', description: 'Failed to generate alerts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
    toast({ title: 'Alert dismissed' });
  };

  const handleMarkRead = (id: string) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, read: !a.read } : a)));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overdue_followup':
        return <AlertCircle className="h-4 w-4" />;
      case 'low_activity':
        return <TrendingDown className="h-4 w-4" />;
      case 'milestone':
        return <Zap className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const unreadCount = alerts.filter((a) => !a.read).length;
  const severities = ['critical', 'warning', 'info'];

  const filtered =
    activeFilter === 'all'
      ? alerts
      : activeFilter === 'unread'
      ? alerts.filter((a) => !a.read)
      : alerts.filter((a) => a.severity === activeFilter);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Smart Alerts
          </h1>
          <p className="text-muted-foreground mt-1">Important notifications and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-primary/20 text-primary">
            {unreadCount} New
          </Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'unread', 'critical', 'warning', 'info'].map((f) => (
          <Badge
            key={f}
            variant={activeFilter === f ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'unread' ? `Unread (${unreadCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </Badge>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length > 0 ? (
            filtered.map((alert) => (
              <Card
                key={alert.id}
                className={`border-l-4 ${
                  alert.severity === 'critical'
                    ? 'border-l-red-500'
                    : alert.severity === 'warning'
                    ? 'border-l-yellow-500'
                    : 'border-l-blue-500'
                } ${alert.read ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4 items-start">
                    {getSeverityIcon(alert.severity)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{alert.title}</p>
                        <Badge className={getSeverityColor(alert.severity)} variant="secondary">
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">{format(new Date(alert.timestamp), 'MMM dd, HH:mm')}</p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkRead(alert.id)}
                        title={alert.read ? 'Mark as unread' : 'Mark as read'}
                      >
                        <CheckCircle2 className={`h-4 w-4 ${alert.read ? 'fill-current' : ''}`} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDismiss(alert.id)} title="Dismiss">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">All caught up! No alerts at this time.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartAlerts;
