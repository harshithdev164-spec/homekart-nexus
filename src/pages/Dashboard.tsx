import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
    fetchDashboardData();
    fetchLeads();

    // Realtime subscription: refresh dashboard on changes to reports table
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports', filter: `report_type=eq.team_performance` }, () => fetchDashboardData())
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch (e) { /* ignore */ }
    };
  }, [timeRange, selectedEmployee, profile]);

  // Fetch leads for the selected employee/admin
  const fetchLeads = async () => {
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
  };

  // Helper to coerce values to numbers safely
  const toNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    
    if (data) setEmployees(data);
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: now };
      case 'month':
        return { start: startOfMonth(now), end: now };
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-primary"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
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
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
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
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
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

      {/* Tabs for Analytics and Leads */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics">
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
          {/* ...existing code for analytics charts, summary, etc... */}
          {/* ...existing code... */}
        </TabsContent>
        <TabsContent value="leads">
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
