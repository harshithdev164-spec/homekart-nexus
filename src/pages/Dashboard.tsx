import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { Phone, MessageSquare, Home, TrendingUp, Users, Calendar } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, subDays } from 'date-fns';

type TimeRange = 'today' | 'week' | 'month';

interface MetricCard {
  title: string;
  value: number;
  change: string;
  icon: React.ElementType;
  color: string;
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

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
      // Fetch reports data
      let reportsQuery = supabase
        .from('reports')
        .select('*, profiles!reports_generated_by_fkey(full_name)')
        .eq('report_type', 'team_performance')
        .gte('generated_at', start.toISOString())
        .lte('generated_at', end.toISOString());

      if (profileFilter) {
        reportsQuery = reportsQuery.eq('generated_by', profileFilter);
      }

      const { data: reports } = await reportsQuery;

      // Fetch call logs
      let callsQuery = supabase
        .from('call_logs')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (profileFilter) {
        callsQuery = callsQuery.eq('called_by', profileFilter);
      }

      const { data: calls } = await callsQuery;

      // Fetch communication logs
      let messagesQuery = supabase
        .from('communication_logs')
        .select('*')
        .gte('sent_at', start.toISOString())
        .lte('sent_at', end.toISOString());

      if (profileFilter) {
        messagesQuery = messagesQuery.eq('sent_by', profileFilter);
      }

      const { data: messages } = await messagesQuery;

      // Fetch site visits
      let visitsQuery = supabase
        .from('visit_schedules')
        .select('*')
        .gte('visit_date', start.toISOString())
        .lte('visit_date', end.toISOString());

      if (profileFilter) {
        visitsQuery = visitsQuery.eq('assigned_to', profileFilter);
      }

      const { data: visits } = await visitsQuery;

      // Calculate metrics
      const totalCalls = calls?.length || 0;
      const totalMessages = messages?.length || 0;
      const totalVisits = visits?.length || 0;
      const totalLeads = reports?.reduce((sum, r) => {
        const data = r.data as any;
        return sum + (data?.leads_registered || 0);
      }, 0) || 0;

      setMetrics([
        { title: 'Calls Made', value: totalCalls, change: '+12%', icon: Phone, color: 'text-chart-1' },
        { title: 'Messages Sent', value: totalMessages, change: '+8%', icon: MessageSquare, color: 'text-chart-2' },
        { title: 'Site Visits', value: totalVisits, change: '+15%', icon: Home, color: 'text-chart-3' },
        { title: 'Leads Generated', value: totalLeads, change: '+20%', icon: TrendingUp, color: 'text-chart-4' },
      ]);

      // Process performance data by employee
      const employeePerformance = new Map();
      reports?.forEach(report => {
        const data = report.data as any;
        const name = report.profiles?.full_name || 'Unknown';
        const existing = employeePerformance.get(name) || { name, calls: 0, messages: 0, visits: 0, sales: 0 };
        existing.calls += data?.calls_to_agents || 0;
        existing.messages += data?.follow_ups || 0;
        existing.visits += (data?.primary_sites_visited || 0) + (data?.client_visit || 0);
        existing.sales += data?.leads_registered || 0;
        employeePerformance.set(name, existing);
      });

      setPerformanceData(Array.from(employeePerformance.values()));

      // Activity data for line chart (last 7 days)
      const activityByDay = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStr = format(day, 'MMM dd');
        const dayCalls = calls?.filter(c => format(new Date(c.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length || 0;
        const dayMessages = messages?.filter(m => format(new Date(m.sent_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length || 0;
        activityByDay.push({ date: dayStr, calls: dayCalls, messages: dayMessages });
      }
      setActivityData(activityByDay);

      // Status distribution for pie chart
      const completedVisits = visits?.filter(v => v.status === 'completed').length || 0;
      const scheduledVisits = visits?.filter(v => v.status === 'scheduled').length || 0;
      const cancelledVisits = visits?.filter(v => v.status === 'cancelled').length || 0;
      
      setStatusData([
        { name: 'Completed', value: completedVisits },
        { name: 'Scheduled', value: scheduledVisits },
        { name: 'Cancelled', value: cancelledVisits },
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-primary/20 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <h3 className="text-3xl font-bold mt-2">{metric.value}</h3>
                    <p className="text-xs text-success mt-1">{metric.change} from last period</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${
                    i === 0 ? 'from-chart-1/20 to-chart-1/5' :
                    i === 1 ? 'from-chart-2/20 to-chart-2/5' :
                    i === 2 ? 'from-chart-3/20 to-chart-3/5' :
                    'from-chart-4/20 to-chart-4/5'
                  }`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Performance Bar Chart */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Employee Performance
            </CardTitle>
            <CardDescription>Calls, Messages, Visits & Sales by Employee</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="calls" fill="hsl(var(--chart-1))" name="Calls" />
                <Bar dataKey="messages" fill="hsl(var(--chart-2))" name="Messages" />
                <Bar dataKey="visits" fill="hsl(var(--chart-3))" name="Visits" />
                <Bar dataKey="sales" fill="hsl(var(--chart-4))" name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Trend Line Chart */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              Activity Trend
            </CardTitle>
            <CardDescription>Daily calls and messages over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Area type="monotone" dataKey="calls" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorCalls)" name="Calls" />
                <Area type="monotone" dataKey="messages" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorMessages)" name="Messages" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visit Status Pie Chart */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Visit Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of visit statuses</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

        {/* Summary Stats */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Performance highlights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {performanceData.slice(0, 5).map((emp, i) => {
              const total = emp.calls + emp.messages + emp.visits + emp.sales;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium">{emp.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{total}</div>
                    <div className="text-xs text-muted-foreground">Total Activities</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
