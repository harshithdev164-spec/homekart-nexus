import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ComposedChart
} from 'recharts';
import { Phone, MessageSquare, Home, TrendingUp, Users, Calendar, Target, Award, Clock, Activity } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, subDays } from 'date-fns';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { RevenueSnapshotWidget } from '@/components/dashboard/widgets/RevenueSnapshotWidget';
import { PipelineHealthWidget } from '@/components/dashboard/widgets/PipelineHealthWidget';
import { QuickStatsWidget } from '@/components/dashboard/widgets/QuickStatsWidget';
import { GoalProgressWidget } from '@/components/dashboard/widgets/GoalProgressWidget';
import { HotLeadsWidget } from '@/components/dashboard/widgets/HotLeadsWidget';
import { ActivityFeedWidget } from '@/components/dashboard/widgets/ActivityFeedWidget';
import { TasksWidget } from '@/components/dashboard/widgets/TasksWidget';
import { MeetingsWidget } from '@/components/dashboard/widgets/MeetingsWidget';
import { FollowUpRemindersWidget } from '@/components/dashboard/widgets/FollowUpRemindersWidget';
import { OverdueItemsWidget } from '@/components/dashboard/widgets/OverdueItemsWidget';
import { LeadPipelineKanban } from '@/components/dashboard/widgets/LeadPipelineKanban';
import { PipelineFunnelWidget } from '@/components/dashboard/widgets/PipelineFunnelWidget';
import { LeadSourceWidget } from '@/components/dashboard/widgets/LeadSourceWidget';
import { CommissionTrackerWidget } from '@/components/dashboard/widgets/CommissionTrackerWidget';
import { PeriodComparisonWidget } from '@/components/dashboard/widgets/PeriodComparisonWidget';
import { WidgetConfig } from '@/types/dashboard';

type TimeRange = 'today' | 'week' | 'month';

interface MetricCard {
  title: string;
  value: number;
  change: string;
  icon: React.ElementType;
  color: string;
  trend: 'up' | 'down' | 'neutral';
}

interface EmployeePerformance {
  name: string;
  calls: number;
  messages: number;
  visits: number;
  leads: number;
  conversionRate: number;
  avgResponseTime: number;
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [performanceData, setPerformanceData] = useState<EmployeePerformance[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [conversionData, setConversionData] = useState<any[]>([]);
  const [hourlyActivityData, setHourlyActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const employeesCacheRef = useRef<any[]>([]);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  const COLORS = {
    chart1: 'hsl(var(--chart-1))',
    chart2: 'hsl(var(--chart-2))',
    chart3: 'hsl(var(--chart-3))',
    chart4: 'hsl(var(--chart-4))',
    chart5: 'hsl(var(--chart-5))',
    primary: 'hsl(var(--primary))',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    danger: 'hsl(0, 84%, 60%)',
  };

  // Memoize date range calculation
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: now };
      case 'month':
        return { start: startOfMonth(now), end: now };
    }
  }, [timeRange]);

  // Fetch leads for the selected employee/admin
  const fetchLeads = useCallback(async () => {
    let query = supabase
      .from('leads')
      .select(`id, name, project_name, budget_min, budget_max, status, assigned_to, created_at, profiles!leads_assigned_to_fkey(full_name)`)
      .order('created_at', { ascending: false });
    if (selectedEmployee !== 'all') {
      query = query.eq('assigned_to', selectedEmployee);
    } else if (!isAdmin) {
      query = query.eq('assigned_to', profile?.id);
    }
    const { data, error } = await query;
    if (!error) setLeads(data || []);
  }, [selectedEmployee, isAdmin, profile?.id]);

  // Helper to coerce values to numbers safely
  const toNumber = useCallback((v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const fetchEmployees = useCallback(async () => {
    // Use cache if available
    if (employeesCacheRef.current.length > 0) {
      setEmployees(employeesCacheRef.current);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    
    if (data) {
      setEmployees(data);
      employeesCacheRef.current = data;
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const { start, end } = dateRange;
    const profileFilter = selectedEmployee === 'all' ? (isAdmin ? null : profile?.id) : selectedEmployee;

    try {
      // Fetch reports data (employee daily submissions)
      let reportsQuery = supabase
        .from('reports')
        .select('*, profiles!reports_generated_by_fkey(id, full_name)')
        .gte('generated_at', start.toISOString())
        .lte('generated_at', end.toISOString())
        .eq('report_type', 'team_performance');

      if (profileFilter) {
        reportsQuery = reportsQuery.eq('generated_by', profileFilter);
      }

      const reportsRes = await reportsQuery;
      if ((reportsRes as any).error) {
        console.error('reports query error', (reportsRes as any).error);
        toast({ title: 'Error', description: 'Failed to fetch reports', variant: 'destructive' });
      }

      const reports = (reportsRes as any).data || [];
      console.debug('fetchDashboardData reports', { profileFilter, totalReports: reports.length, reports });

      // Aggregate metrics from reports
      let totalCalls = 0;
      let totalVisits = 0;
      let totalLeads = 0;
      const employeeMap = new Map<string, EmployeePerformance>();

      reports.forEach((report: any) => {
        const data = report.data || {};
        const name = report.profiles?.full_name || 'Unknown';

        // Coerce numeric fields
        const calls = toNumber(data.calls_to_agents);
        const visits = toNumber(data.primary_sites_visited) + toNumber(data.client_visit);
        const leads = toNumber(data.leads_registered);

        totalCalls += calls;
        totalVisits += visits;
        totalLeads += leads;

        // Track per-employee performance
        if (!employeeMap.has(name)) {
          employeeMap.set(name, {
            name,
            calls: 0,
            messages: 0,
            visits: 0,
            leads: 0,
            conversionRate: 0,
            avgResponseTime: 0,
          });
        }
        const emp = employeeMap.get(name)!;
        emp.calls += calls;
        emp.visits += visits;
        emp.leads += leads;
      });

      const conversionRate = totalLeads > 0 ? ((totalLeads / Math.max(totalLeads, 1)) * 100).toFixed(1) : 0;

      setMetrics([
        { 
          title: 'Total Calls', 
          value: totalCalls, 
          change: '+12%', 
          icon: Phone, 
          color: 'text-chart-1',
          trend: 'up'
        },
        { 
          title: 'Site Visits', 
          value: totalVisits, 
          change: '+15%', 
          icon: Home, 
          color: 'text-chart-3',
          trend: 'up'
        },
        { 
          title: 'Leads Generated', 
          value: totalLeads, 
          change: '+20%', 
          icon: TrendingUp, 
          color: 'text-chart-4',
          trend: 'up'
        },
        { 
          title: 'Total Reports', 
          value: reports.length, 
          change: '+5%', 
          icon: Target, 
          color: 'text-success',
          trend: 'up'
        },
        { 
          title: 'Inventories', 
          value: reports.reduce((sum, r) => sum + toNumber(r.data?.inventories_found), 0), 
          change: '+18%', 
          icon: Award, 
          color: 'text-primary',
          trend: 'up'
        },
      ]);

      setPerformanceData(Array.from(employeeMap.values()).slice(0, 10));

      // Activity data for area chart (last 7 days)
      const activityByDay = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStr = format(day, 'MMM dd');
        const dayKey = day.toISOString().slice(0, 10);

        const dayReports = reports.filter(
          (r: any) => new Date(r.generated_at).toISOString().slice(0, 10) === dayKey
        );

        const dayCalls = dayReports.reduce((sum, r: any) => sum + toNumber(r.data?.calls_to_agents), 0);
        const dayVisits = dayReports.reduce((sum, r: any) => 
          sum + toNumber(r.data?.primary_sites_visited) + toNumber(r.data?.client_visit), 0);

        activityByDay.push({ 
          date: dayStr, 
          calls: dayCalls, 
          visits: dayVisits,
          total: dayCalls + dayVisits
        });
      }
      setActivityData(activityByDay);

      // Status data from inventory counts
      const lowInventory = reports.filter((r: any) => toNumber(r.data?.inventories_found) < 5).length;
      const mediumInventory = reports.filter((r: any) => {
        const inv = toNumber(r.data?.inventories_found);
        return inv >= 5 && inv < 15;
      }).length;
      const highInventory = reports.filter((r: any) => toNumber(r.data?.inventories_found) >= 15).length;

      setStatusData([
        { name: 'High Activity', value: highInventory, color: COLORS.success },
        { name: 'Medium Activity', value: mediumInventory, color: COLORS.chart2 },
        { name: 'Low Activity', value: lowInventory, color: COLORS.danger },
      ]);

      // Conversion funnel based on lead stages (using report counts as proxy)
      const reportCount = reports.length;
      setConversionData([
        { stage: 'Reports', count: reportCount },
        { stage: 'Leads Gen', count: totalLeads },
        { stage: 'Visits', count: totalVisits },
        { stage: 'Inventories', count: reports.reduce((sum, r: any) => sum + toNumber(r.data?.inventories_found), 0) },
      ]);

      // Hourly breakdown (for today)
      if (timeRange === 'today') {
        const todayReports = reports.filter(
          (r: any) => format(new Date(r.generated_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
        );
        
        const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour}:00`,
          calls: 0,
          visits: 0,
        }));

        todayReports.forEach((report: any) => {
          const hour = new Date(report.generated_at).getHours();
          hourlyBreakdown[hour].calls += toNumber(report.data?.calls_to_agents);
          hourlyBreakdown[hour].visits += toNumber(report.data?.primary_sites_visited) + toNumber(report.data?.client_visit);
        });

        setHourlyActivityData(hourlyBreakdown.filter(h => h.calls > 0 || h.visits > 0));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({ title: 'Error', description: 'Failed to load dashboard', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedEmployee, isAdmin, profile?.id, toNumber, toast]);

  // Debounced version for filter changes
  const debouncedFetchDashboardData = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchDashboardData();
    }, 300);
  }, [fetchDashboardData]);

  // Memoize chart data calculations
  const memoizedMetrics = useMemo(() => metrics, [metrics]);
  const memoizedPerformanceData = useMemo(() => performanceData, [performanceData]);
  const memoizedActivityData = useMemo(() => activityData, [activityData]);
  const memoizedStatusData = useMemo(() => statusData, [statusData]);
  const memoizedConversionData = useMemo(() => conversionData, [conversionData]);
  const memoizedHourlyActivityData = useMemo(() => hourlyActivityData, [hourlyActivityData]);

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
    fetchDashboardData();
    fetchLeads();

    // Realtime subscription: refresh dashboard on changes to reports table with debouncing
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`dashboard_realtime_${Date.now()}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reports', filter: `report_type=eq.team_performance` }, 
        () => {
          debouncedFetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [timeRange, selectedEmployee, isAdmin, fetchEmployees, fetchDashboardData, fetchLeads, debouncedFetchDashboardData]);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            <div className="h-10 w-40 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-8 w-16 bg-muted rounded mb-2 animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Performance Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Real-time analytics and insights</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={(v) => {
            setTimeRange(v as TimeRange);
            debouncedFetchDashboardData();
          }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={selectedEmployee} onValueChange={(v) => {
              setSelectedEmployee(v);
              debouncedFetchDashboardData();
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Quick Actions Panel */}
      <QuickActionsPanel />

      {/* Tabs for Analytics, Widgets, and Leads */}
      <Tabs defaultValue="widgets" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="widgets">Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>
        
        {/* New Widgets Dashboard Tab */}
        <TabsContent value="widgets" className="transition-opacity duration-200 space-y-6">
          {/* Executive Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <RevenueSnapshotWidget
              config={{
                id: 'revenue-snapshot',
                type: 'revenue_snapshot',
                title: 'Revenue Snapshot',
                size: 'small',
                visible: true,
              }}
              timeRange={timeRange}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
            <PipelineHealthWidget
              config={{
                id: 'pipeline-health',
                type: 'pipeline_health',
                title: 'Pipeline Health',
                size: 'small',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
            <QuickStatsWidget
              config={{
                id: 'quick-stats',
                type: 'quick_stats',
                title: 'Quick Stats',
                size: 'small',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
            <GoalProgressWidget
              config={{
                id: 'goal-progress',
                type: 'goal_progress',
                title: 'Goal Progress',
                size: 'small',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
          </div>

          {/* Lead Management Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HotLeadsWidget
              config={{
                id: 'hot-leads',
                type: 'hot_leads',
                title: 'Hot Leads',
                size: 'medium',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
              onLeadClick={(leadId) => {
                const lead = leads.find((l) => l.id === leadId);
                if (lead) {
                  setSelectedLead(lead);
                  setShowLeadModal(true);
                }
              }}
            />
            <ActivityFeedWidget
              config={{
                id: 'activity-feed',
                type: 'activity_feed',
                title: 'Activity Feed',
                size: 'medium',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
          </div>

          {/* Pipeline Visualization */}
          <LeadPipelineKanban
            config={{
              id: 'lead-pipeline-kanban',
              type: 'lead_pipeline_kanban',
              title: 'Lead Pipeline',
              size: 'large',
              visible: true,
            }}
            employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            onLeadClick={(leadId) => {
              const lead = leads.find((l) => l.id === leadId);
              if (lead) {
                setSelectedLead(lead);
                setShowLeadModal(true);
              }
            }}
          />

          {/* Tasks and Meetings Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TasksWidget
              config={{
                id: 'tasks',
                type: 'tasks',
                title: "Today's Tasks",
                size: 'small',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
            <MeetingsWidget
              config={{
                id: 'meetings',
                type: 'meetings',
                title: 'Upcoming Meetings',
                size: 'small',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
            <FollowUpRemindersWidget
              config={{
                id: 'followup-reminders',
                type: 'followup_reminders',
                title: 'Follow-up Reminders',
                size: 'small',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
              onLeadClick={(leadId) => {
                const lead = leads.find((l) => l.id === leadId);
                if (lead) {
                  setSelectedLead(lead);
                  setShowLeadModal(true);
                }
              }}
            />
          </div>

          {/* Overdue Items and Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <OverdueItemsWidget
              config={{
                id: 'overdue-items',
                type: 'overdue_items',
                title: 'Overdue Items',
                size: 'small',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
            <PipelineFunnelWidget
              config={{
                id: 'pipeline-funnel',
                type: 'pipeline_funnel',
                title: 'Pipeline Funnel',
                size: 'small',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
            <LeadSourceWidget
              config={{
                id: 'lead-source',
                type: 'lead_source',
                title: 'Lead Source Performance',
                size: 'small',
                visible: true,
              }}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
          </div>

          {/* Commission Tracker and Additional Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {isAdmin && (
              <CommissionTrackerWidget
                config={{
                  id: 'commission-tracker',
                  type: 'commission_tracker',
                  title: 'Commission Tracker',
                  size: 'medium',
                  visible: true,
                }}
                timeRange={timeRange}
                employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
              />
            )}
            <PeriodComparisonWidget
              config={{
                id: 'period-comparison',
                type: 'period_comparison',
                title: 'Period Comparison',
                size: 'medium',
                visible: true,
              }}
              timeRange={timeRange}
              employeeId={selectedEmployee !== 'all' ? selectedEmployee : undefined}
            />
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="transition-opacity duration-200">
          {/* ...existing code for analytics dashboard... */}
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {metrics.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <Card key={i} className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{metric.title}</p>
                        <h3 className="text-3xl font-bold mt-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                          {metric.title.includes('Rate') ? `${metric.value}%` : metric.value}
                        </h3>
                        <p className={`text-xs mt-1 flex items-center gap-1 ${
                          metric.trend === 'up' ? 'text-success' : metric.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'} {metric.change}
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${
                        i === 0 ? 'from-chart-1/30 to-chart-1/10' :
                        i === 1 ? 'from-chart-2/30 to-chart-2/10' :
                        i === 2 ? 'from-chart-3/30 to-chart-3/10' :
                        i === 3 ? 'from-chart-4/30 to-chart-4/10' :
                        i === 4 ? 'from-success/30 to-success/10' :
                        'from-primary/30 to-primary/10'
                      }`}>
                        <Icon className={`h-6 w-6 ${metric.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Activity Over Time - Area Chart */}
            {activityData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Activity Over Time</CardTitle>
                  <CardDescription>Daily calls and visits for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="calls" stackId="1" stroke={COLORS.chart1} fill={COLORS.chart1} fillOpacity={0.6} />
                      <Area type="monotone" dataKey="visits" stackId="1" stroke={COLORS.chart3} fill={COLORS.chart3} fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Activity Status - Pie Chart */}
            {statusData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Activity Status Distribution</CardTitle>
                  <CardDescription>Distribution of activity levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Conversion Funnel - Bar Chart */}
            {conversionData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                  <CardDescription>Pipeline from reports to inventories</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={conversionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Employee Performance - Radar Chart */}
            {performanceData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>Employee performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={performanceData.slice(0, 5)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis />
                      <Radar name="Calls" dataKey="calls" stroke={COLORS.chart1} fill={COLORS.chart1} fillOpacity={0.6} />
                      <Radar name="Visits" dataKey="visits" stroke={COLORS.chart3} fill={COLORS.chart3} fillOpacity={0.6} />
                      <Radar name="Leads" dataKey="leads" stroke={COLORS.chart4} fill={COLORS.chart4} fillOpacity={0.6} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Hourly Activity - Line Chart (only for today) */}
            {timeRange === 'today' && hourlyActivityData.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Hourly Activity Breakdown</CardTitle>
                  <CardDescription>Activity distribution throughout the day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={hourlyActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="calls" stroke={COLORS.chart1} strokeWidth={2} />
                      <Line type="monotone" dataKey="visits" stroke={COLORS.chart3} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Employee Performance Table */}
            {performanceData.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Employee Performance</CardTitle>
                  <CardDescription>Detailed performance metrics by employee</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Calls</TableHead>
                          <TableHead>Visits</TableHead>
                          <TableHead>Leads</TableHead>
                          <TableHead>Conversion Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performanceData.map((emp, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell>{emp.calls}</TableCell>
                            <TableCell>{emp.visits}</TableCell>
                            <TableCell>{emp.leads}</TableCell>
                            <TableCell>
                              {emp.leads > 0 ? `${((emp.leads / (emp.calls || 1)) * 100).toFixed(1)}%` : '0%'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="leads" className="transition-opacity duration-200">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Assigned Leads</CardTitle>
              <CardDescription>All leads assigned to the selected employee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Assigned Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-muted" onClick={() => { setSelectedLead(lead); setShowLeadModal(true); }}>
                        <TableCell>{lead.name}</TableCell>
                        <TableCell>{lead.project_name || '-'}</TableCell>
                        <TableCell>{lead.budget_min ? `₹${lead.budget_min.toLocaleString()}` : ''}{lead.budget_max ? ` - ₹${lead.budget_max.toLocaleString()}` : ''}</TableCell>
                        <TableCell>{lead.status}</TableCell>
                        <TableCell>{lead.profiles?.full_name || '-'}</TableCell>
                        <TableCell>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {leads.length === 0 && <div className="text-center py-8 text-muted-foreground">No leads found.</div>}
              </div>
            </CardContent>
          </Card>
          <LeadDetailModal lead={selectedLead} isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
