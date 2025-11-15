import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useOrganization } from '@/components/organization/OrganizationProvider';
import { 
  BarChart3, 
  Users, 
  Building2, 
  UserCheck, 
  Activity, 
  Database,
  TrendingUp,
  Calendar,
  FileText,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  accent: 'hsl(var(--accent))',
};

export const Analytics: React.FC = () => {
  const { profile } = useAuth();
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  
  // Usage statistics
  const [stats, setStats] = useState({
    users: 0,
    leads: 0,
    properties: 0,
    activities: 0,
    storage: 0,
    apiCalls: 0,
  });

  // Trend data
  const [userTrend, setUserTrend] = useState<any[]>([]);
  const [leadTrend, setLeadTrend] = useState<any[]>([]);
  const [propertyTrend, setPropertyTrend] = useState<any[]>([]);
  const [activityTrend, setActivityTrend] = useState<any[]>([]);

  // Feature usage
  const [featureUsage, setFeatureUsage] = useState<any[]>([]);

  useEffect(() => {
    if (currentOrganization) {
      loadAnalytics();
    }
  }, [currentOrganization, timeRange]);

  const loadAnalytics = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'quarter':
          startDate = startOfMonth(subMonths(now, 3));
          break;
        case 'year':
          startDate = startOfMonth(subMonths(now, 12));
          break;
      }

      // Get current counts
      const [usersRes, leadsRes, propertiesRes, activitiesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id),
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id),
        supabase
          .from('activities')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id)
          .gte('created_at', startDate.toISOString()),
      ]);

      setStats({
        users: usersRes.count || 0,
        leads: leadsRes.count || 0,
        properties: propertiesRes.count || 0,
        activities: activitiesRes.count || 0,
        storage: 0, // TODO: Calculate from file storage
        apiCalls: 0, // TODO: Track API calls
      });

      // Get trend data (monthly for the selected range)
      const months = [];
      const current = new Date(startDate);
      while (current <= now) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }

      const trendData = await Promise.all(
        months.map(async (month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);

          const [leads, properties, activities, users] = await Promise.all([
            supabase
              .from('leads')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', currentOrganization.id)
              .gte('created_at', monthStart.toISOString())
              .lte('created_at', monthEnd.toISOString()),
            supabase
              .from('properties')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', currentOrganization.id)
              .gte('created_at', monthStart.toISOString())
              .lte('created_at', monthEnd.toISOString()),
            supabase
              .from('activities')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', currentOrganization.id)
              .gte('created_at', monthStart.toISOString())
              .lte('created_at', monthEnd.toISOString()),
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', currentOrganization.id)
              .lte('created_at', monthEnd.toISOString()),
          ]);

          return {
            month: format(month, 'MMM yyyy'),
            leads: leads.count || 0,
            properties: properties.count || 0,
            activities: activities.count || 0,
            users: users.count || 0,
          };
        })
      );

      setUserTrend(trendData.map(d => ({ name: d.month, value: d.users })));
      setLeadTrend(trendData.map(d => ({ name: d.month, value: d.leads })));
      setPropertyTrend(trendData.map(d => ({ name: d.month, value: d.properties })));
      setActivityTrend(trendData.map(d => ({ name: d.month, value: d.activities })));

      // Feature usage (simplified - count by type)
      const [reportsRes, messagesRes, calendarRes] = await Promise.all([
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('communications')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('activities')
          .select('type', { count: 'exact' })
          .eq('organization_id', currentOrganization.id)
          .gte('created_at', startDate.toISOString()),
      ]);

      setFeatureUsage([
        { name: 'Reports', value: reportsRes.count || 0, icon: FileText },
        { name: 'Messages', value: messagesRes.count || 0, icon: MessageSquare },
        { name: 'Activities', value: activitiesRes.count || 0, icon: Activity },
        { name: 'Calendar', value: 0, icon: Calendar }, // TODO: Track calendar events
      ]);

    } catch (error: any) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track your organization's usage and activity
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 rounded-md border border-input bg-background"
          >
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Current Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leads}</div>
            <p className="text-xs text-muted-foreground">All time leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.properties}</div>
            <p className="text-xs text-muted-foreground">Property listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activities}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.storage} MB</div>
            <p className="text-xs text-muted-foreground">File storage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiCalls}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Lead Growth Trend</CardTitle>
              <CardDescription>New leads created over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leadTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke={COLORS.primary} name="Leads" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Property Growth Trend</CardTitle>
              <CardDescription>New properties added over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={propertyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke={COLORS.secondary} name="Properties" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Growth Trend</CardTitle>
              <CardDescription>Total users over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke={COLORS.success} name="Users" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Activity Trend</CardTitle>
              <CardDescription>Activities performed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill={COLORS.accent} name="Activities" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Usage</CardTitle>
          <CardDescription>Most used features in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featureUsage.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-4 border rounded-lg">
                <feature.icon className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{feature.name}</p>
                  <p className="text-2xl font-bold">{feature.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;

