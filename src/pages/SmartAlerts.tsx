import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertCircle, Bell, CheckCircle2, Clock, Trash2,
  TrendingDown, Zap
} from 'lucide-react';
import { format, differenceInDays, subDays } from 'date-fns';

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
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const alertsCacheRef = useRef<{ dataHash: string; alerts: Alert[] } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // Limit displayed alerts to top 50
  const MAX_DISPLAYED_ALERTS = 50;

  const generateAlerts = useCallback(async () => {
    setLoading(true);
    const newAlerts: Alert[] = [];

    try {
      // Limit query to last 30 days instead of fetching 100 reports
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      // 1. Overdue follow-ups check
      const { data: reports } = await supabase
        .from('reports')
        .select('*, profiles!reports_generated_by_fkey(full_name)')
        .eq('report_type', 'team_performance')
        .gte('generated_at', thirtyDaysAgo)
        .order('generated_at', { ascending: false });

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
      const sortedAlerts = uniqueAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Create a hash of the data to check if alerts actually changed
      const dataHash = JSON.stringify(reports?.map(r => ({ id: r.id, generated_at: r.generated_at })) || []);
      
      // Only update if data actually changed
      if (alertsCacheRef.current?.dataHash !== dataHash) {
        setAllAlerts(sortedAlerts);
        setAlerts(sortedAlerts.slice(0, MAX_DISPLAYED_ALERTS));
        alertsCacheRef.current = { dataHash, alerts: sortedAlerts };
      }
    } catch (error) {
      console.error('Error generating alerts:', error);
      toast({ title: 'Error', description: 'Failed to generate alerts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Debounced version of generateAlerts
  const debouncedGenerateAlerts = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      generateAlerts();
    }, 500);
  }, [generateAlerts]);

  useEffect(() => {
    if (profile?.id) {
      generateAlerts();
    }
  }, [profile?.id, generateAlerts]);

  const setupRealtimeAlerts = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel('alerts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        debouncedGenerateAlerts();
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [debouncedGenerateAlerts]);

  useEffect(() => {
    const cleanup = setupRealtimeAlerts();
    return cleanup;
  }, [setupRealtimeAlerts]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setAlerts(prev => prev.filter((a) => a.id !== id));
    setAllAlerts(prev => prev.filter((a) => a.id !== id));
    toast({ title: 'Alert dismissed' });
  }, [toast]);

  const handleMarkRead = useCallback((id: string) => {
    setAlerts(prev => prev.map((a) => (a.id === id ? { ...a, read: !a.read } : a)));
    setAllAlerts(prev => prev.map((a) => (a.id === id ? { ...a, read: !a.read } : a)));
  }, []);

  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  }, []);

  const getSeverityIcon = useCallback((severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  }, []);

  const getTypeIcon = useCallback((type: string) => {
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
  }, []);

  const unreadCount = useMemo(() => allAlerts.filter((a) => !a.read).length, [allAlerts]);

  const filtered = useMemo(() => {
    const source = activeFilter === 'all' ? allAlerts : activeFilter === 'unread'
      ? allAlerts.filter((a) => !a.read)
      : allAlerts.filter((a) => a.severity === activeFilter);
    
    // Limit to top 50 for display
    return source.slice(0, MAX_DISPLAYED_ALERTS);
  }, [allAlerts, activeFilter]);

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
            {f === 'all' ? `All (${allAlerts.length})` : f === 'unread' ? `Unread (${unreadCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </Badge>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex gap-4 items-start">
                  <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/4 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length > 0 ? (
            <>
              {filtered.map((alert) => (
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
              ))}
              {allAlerts.length > MAX_DISPLAYED_ALERTS && (
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Showing top {MAX_DISPLAYED_ALERTS} of {allAlerts.length} alerts
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
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
