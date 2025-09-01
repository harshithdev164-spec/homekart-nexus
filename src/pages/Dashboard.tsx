import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, TrendingUp, Calendar, Phone, Mail, MapPin, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalLeads: number;
  totalProperties: number;
  activeLeads: number;
  recentActivities: any[];
  recentLeads: any[];
  recentProperties: any[];
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    totalProperties: 0,
    activeLeads: 0,
    recentActivities: [],
    recentLeads: [],
    recentProperties: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    try {
      const [leadsResult, propertiesResult, activitiesResult] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('properties').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('activities').select('*, leads(*), properties(*)').order('created_at', { ascending: false }).limit(5),
      ]);

      const totalLeadsCount = await supabase.from('leads').select('id', { count: 'exact' });
      const totalPropertiesCount = await supabase.from('properties').select('id', { count: 'exact' });
      const activeLeadsCount = await supabase.from('leads').select('id', { count: 'exact' }).neq('status', 'closed_won').neq('status', 'closed_lost');

      setStats({
        totalLeads: totalLeadsCount.count || 0,
        totalProperties: totalPropertiesCount.count || 0,
        activeLeads: activeLeadsCount.count || 0,
        recentActivities: activitiesResult.data || [],
        recentLeads: leadsResult.data || [],
        recentProperties: propertiesResult.data || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'proposal': return 'bg-purple-100 text-purple-800';
      case 'negotiation': return 'bg-orange-100 text-orange-800';
      case 'closed_won': return 'bg-emerald-100 text-emerald-800';
      case 'closed_lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-hero rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {profile?.full_name}!
        </h1>
        <p className="text-lg opacity-90">
          {profile?.role === 'admin' ? 'Manage your team and oversee all operations' : 'Track your leads and close more deals'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeLeads} active leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              Available inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalLeads > 0 ? Math.round((stats.totalLeads - stats.activeLeads) / stats.totalLeads * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Leads
            </CardTitle>
            <CardDescription>
              Latest leads that need your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentLeads.length > 0 ? (
                stats.recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                        {lead.email && (
                          <>
                            <Mail className="h-3 w-3 ml-2" />
                            {lead.email}
                          </>
                        )}
                      </div>
                      {lead.preferred_location && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {lead.preferred_location}
                        </div>
                      )}
                    </div>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No leads yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recent Properties
            </CardTitle>
            <CardDescription>
              Latest property listings in your inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentProperties.length > 0 ? (
                stats.recentProperties.map((property) => (
                  <div key={property.id} className="p-3 border border-border rounded-lg">
                    <div className="font-medium">{property.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <MapPin className="h-3 w-3" />
                      {property.location}, {property.city}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <IndianRupee className="h-3 w-3" />
                        {Number(property.price).toLocaleString('en-IN')}
                      </div>
                      <Badge variant="outline">
                        {property.property_type}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No properties yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activities
          </CardTitle>
          <CardDescription>
            Latest team activities and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="font-medium">{activity.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.created_at).toLocaleDateString()} at {new Date(activity.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent activities</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;