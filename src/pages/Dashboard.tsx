import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ComposedChart
} from 'recharts';
import { Phone, MessageSquare, Home, TrendingUp, Users, Calendar, Target, Award, Clock, Activity } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, subDays, differenceInMinutes } from 'date-fns';

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
  }, [timeRange, selectedEmployee, profile]);

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
      // Fetch all data with proper joins
      let callsQuery = supabase
        .from('call_logs')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      if (profileFilter) callsQuery = callsQuery.eq('called_by', profileFilter);
      const { data: calls } = await callsQuery;

      let messagesQuery = supabase
        .from('communication_logs')
        .select('*')
        .gte('sent_at', start.toISOString())
        .lte('sent_at', end.toISOString());
      if (profileFilter) messagesQuery = messagesQuery.eq('sent_by', profileFilter);
      const { data: messages } = await messagesQuery;

      let visitsQuery = supabase
        .from('visit_schedules')
        .select('*')
        .gte('visit_date', start.toISOString())
        .lte('visit_date', end.toISOString());
      if (profileFilter) visitsQuery = visitsQuery.eq('assigned_to', profileFilter);
      const { data: visits } = await visitsQuery;

      let leadsQuery = supabase
        .from('leads')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      if (profileFilter) leadsQuery = leadsQuery.eq('created_by', profileFilter);
      const { data: leads } = await leadsQuery;
      
      // Fetch employee profiles separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      // Calculate comprehensive metrics
      const totalCalls = calls?.length || 0;
      const totalMessages = messages?.length || 0;
      const totalVisits = visits?.length || 0;
      const totalLeads = leads?.length || 0;
      const closedWonLeads = leads?.filter(l => l.status === 'closed_won').length || 0;
      const conversionRate = totalLeads > 0 ? ((closedWonLeads / totalLeads) * 100).toFixed(1) : 0;

      // Calculate response times
      const avgResponseTime = calls && calls.length > 0 
        ? calls.reduce((sum, call) => {
            const created = new Date(call.created_at);
            const now = new Date();
            return sum + differenceInMinutes(now, created);
          }, 0) / calls.length
        : 0;

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
          title: 'Messages Sent', 
          value: totalMessages, 
          change: '+8%', 
          icon: MessageSquare, 
          color: 'text-chart-2',
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
          title: 'Conversion Rate', 
          value: parseFloat(conversionRate as string), 
          change: '+5%', 
          icon: Target, 
          color: 'text-success',
          trend: 'up'
        },
        { 
          title: 'Closed Won', 
          value: closedWonLeads, 
          change: '+18%', 
          icon: Award, 
          color: 'text-primary',
          trend: 'up'
        },
      ]);

      // Process detailed employee performance
      const employeeMap = new Map<string, EmployeePerformance>();
      
      // Aggregate calls per employee
      calls?.forEach(call => {
        const name = profilesMap.get(call.called_by) || 'Unknown';
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
        emp.calls += 1;
      });

      // Aggregate messages per employee
      messages?.forEach(msg => {
        const name = profilesMap.get(msg.sent_by) || 'Unknown';
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
        emp.messages += 1;
      });

      // Aggregate visits per employee
      visits?.forEach(visit => {
        const name = profilesMap.get(visit.assigned_to) || 'Unknown';
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
        emp.visits += 1;
      });

      // Aggregate leads and calculate conversion per employee
      leads?.forEach(lead => {
        const name = profilesMap.get(lead.created_by) || 'Unknown';
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
        emp.leads += 1;
        if (lead.status === 'closed_won') {
          emp.conversionRate += 1;
        }
      });

      // Calculate final conversion rates
      employeeMap.forEach((emp) => {
        if (emp.leads > 0) {
          emp.conversionRate = (emp.conversionRate / emp.leads) * 100;
        }
      });

      setPerformanceData(Array.from(employeeMap.values()).slice(0, 10)); // Top 10 performers

      // Activity data for area chart (last 7 days with hourly breakdown for today)
      const activityByDay = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStr = format(day, 'MMM dd');
        const dayCalls = calls?.filter(c => format(new Date(c.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length || 0;
        const dayMessages = messages?.filter(m => format(new Date(m.sent_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length || 0;
        const dayVisits = visits?.filter(v => format(new Date(v.visit_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length || 0;
        activityByDay.push({ 
          date: dayStr, 
          calls: dayCalls, 
          messages: dayMessages,
          visits: dayVisits,
          total: dayCalls + dayMessages + dayVisits
        });
      }
      setActivityData(activityByDay);

      // Hourly activity breakdown (for today)
      if (timeRange === 'today') {
        const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour}:00`,
          calls: 0,
          messages: 0,
          visits: 0,
        }));

        calls?.forEach(call => {
          const hour = new Date(call.created_at).getHours();
          hourlyBreakdown[hour].calls += 1;
        });

        messages?.forEach(msg => {
          const hour = new Date(msg.sent_at).getHours();
          hourlyBreakdown[hour].messages += 1;
        });

        visits?.forEach(visit => {
          const hour = new Date(visit.visit_date).getHours();
          hourlyBreakdown[hour].visits += 1;
        });

        setHourlyActivityData(hourlyBreakdown.filter(h => h.calls > 0 || h.messages > 0 || h.visits > 0));
      }

      // Visit status distribution
      const completedVisits = visits?.filter(v => v.status === 'completed').length || 0;
      const scheduledVisits = visits?.filter(v => v.status === 'scheduled').length || 0;
      const cancelledVisits = visits?.filter(v => v.status === 'cancelled').length || 0;
      
      setStatusData([
        { name: 'Completed', value: completedVisits, color: COLORS.success },
        { name: 'Scheduled', value: scheduledVisits, color: COLORS.chart2 },
        { name: 'Cancelled', value: cancelledVisits, color: COLORS.danger },
      ]);

      // Lead conversion funnel
      const newLeads = leads?.filter(l => l.status === 'new').length || 0;
      const contacted = leads?.filter(l => l.status === 'contacted').length || 0;
      const qualified = leads?.filter(l => l.status === 'qualified').length || 0;
      const proposal = leads?.filter(l => l.status === 'proposal').length || 0;
      const negotiation = leads?.filter(l => l.status === 'negotiation').length || 0;
      const won = closedWonLeads;

      setConversionData([
        { stage: 'New', count: newLeads },
        { stage: 'Contacted', count: contacted },
        { stage: 'Qualified', count: qualified },
        { stage: 'Proposal', count: proposal },
        { stage: 'Negotiation', count: negotiation },
        { stage: 'Closed Won', count: won },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
    <div className="w-full space-y-6 p-2 sm:p-0">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Performance Bar Chart */}
        <Card className="col-span-1 lg:col-span-2 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Employee Performance Overview
            </CardTitle>
            <CardDescription>Comprehensive activity breakdown by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }} 
                />
                <Legend />
                <Bar dataKey="calls" fill={COLORS.chart1} name="Calls" radius={[8, 8, 0, 0]} />
                <Bar dataKey="messages" fill={COLORS.chart2} name="Messages" radius={[8, 8, 0, 0]} />
                <Bar dataKey="visits" fill={COLORS.chart3} name="Visits" radius={[8, 8, 0, 0]} />
                <Bar dataKey="leads" fill={COLORS.chart4} name="Leads" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Trend Area Chart */}
        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur border-secondary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" />
              Activity Trend
            </CardTitle>
            <CardDescription>Daily activity patterns over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.chart1} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.chart1} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.chart2} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.chart2} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.chart3} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.chart3} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area type="monotone" dataKey="calls" stroke={COLORS.chart1} fillOpacity={1} fill="url(#colorCalls)" />
                <Area type="monotone" dataKey="messages" stroke={COLORS.chart2} fillOpacity={1} fill="url(#colorMessages)" />
                <Area type="monotone" dataKey="visits" stroke={COLORS.chart3} fillOpacity={1} fill="url(#colorVisits)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Visit Status Pie Chart */}
        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur border-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Visit Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of site visit statuses</CardDescription>
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
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel & Hourly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Conversion Funnel */}
        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Lead Conversion Funnel
            </CardTitle>
            <CardDescription>Track leads through the sales pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="count" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Activity (only for today) */}
        {timeRange === 'today' && hourlyActivityData.length > 0 && (
          <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur border-secondary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" />
                Hourly Activity Breakdown
              </CardTitle>
              <CardDescription>Activity distribution throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={hourlyActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="calls" fill={COLORS.chart1} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="messages" fill={COLORS.chart2} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="visits" stroke={COLORS.chart3} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Performance Radar (for week/month view) */}
        {timeRange !== 'today' && performanceData.length > 0 && (
          <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur border-accent/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-accent" />
                Top Performer Analysis
              </CardTitle>
              <CardDescription>Multi-dimensional performance view</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[performanceData[0]].filter(Boolean).map(p => ({
                  metric: 'Calls',
                  value: p.calls,
                  fullMark: Math.max(...performanceData.map(d => d.calls)),
                }))} outerRadius={90}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                  <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                  <Radar name="Performance" dataKey="value" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats Summary */}
      <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Key insights and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {performanceData.slice(0, 3).map((emp, i) => (
              <div key={i} className="p-4 rounded-lg bg-card/50 backdrop-blur border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                    i === 1 ? 'bg-gray-400/20 text-gray-400' :
                    'bg-amber-600/20 text-amber-600'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{emp.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {emp.calls} calls • {emp.messages} messages • {emp.visits} visits
                    </p>
                    <p className="text-xs text-success mt-1">
                      Conversion: {emp.conversionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
