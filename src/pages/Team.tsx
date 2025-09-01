import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Mail, Phone, UserCheck, Building2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  avatar_url?: string;
}

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  admins: number;
  managers: number;
  employees: number;
  leadsCount: { [key: string]: number };
  propertiesCount: { [key: string]: number };
}

const Team: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats>({
    totalMembers: 0,
    activeMembers: 0,
    admins: 0,
    managers: 0,
    employees: 0,
    leadsCount: {},
    propertiesCount: {},
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTeamMembers();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchTeamMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team members:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch team members',
          variant: 'destructive',
        });
        return;
      }

      const members = data || [];
      setTeamMembers(members);

      // Fetch lead and property counts for each member
      const leadsCount: { [key: string]: number } = {};
      const propertiesCount: { [key: string]: number } = {};

      for (const member of members) {
        // Count leads assigned to this member
        const { count: assignedLeads } = await supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .eq('assigned_to', member.id);

        // Count leads created by this member
        const { count: createdLeads } = await supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .eq('created_by', member.id);

        // Count properties created by this member
        const { count: createdProperties } = await supabase
          .from('properties')
          .select('id', { count: 'exact' })
          .eq('created_by', member.id);

        leadsCount[member.id] = (assignedLeads || 0) + (createdLeads || 0);
        propertiesCount[member.id] = createdProperties || 0;
      }

      // Calculate stats
      const totalMembers = members.length;
      const activeMembers = members.filter(m => m.is_active).length;
      const admins = members.filter(m => m.role === 'admin').length;
      const managers = members.filter(m => m.role === 'manager').length;
      const employees = members.filter(m => m.role === 'employee').length;

      setStats({
        totalMembers,
        activeMembers,
        admins,
        managers,
        employees,
        leadsCount,
        propertiesCount,
      });
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'manager': return 'secondary';
      case 'employee': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredMembers = teamMembers.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">Manage your team and track performance</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.managers}</div>
            <p className="text-xs text-muted-foreground">Managers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.employees}</div>
            <p className="text-xs text-muted-foreground">Employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-all">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{member.full_name}</CardTitle>
                      <CardDescription className="text-sm">{member.department || 'No Department'}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge className={getRoleColor(member.role)}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                      {!member.is_active && (
                        <Badge variant="destructive" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <UserCheck className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Leads</span>
                    </div>
                    <div className="text-lg font-bold">{stats.leadsCount[member.id] || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Properties</span>
                    </div>
                    <div className="text-lg font-bold">{stats.propertiesCount[member.id] || 0}</div>
                  </div>
                </div>

                {/* Member Since */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                  <Calendar className="h-3 w-3" />
                  <span>Member since {new Date(member.created_at).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                {profile?.role === 'admin' && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit
                    </Button>
                    <Button 
                      variant={member.is_active ? "destructive" : "default"} 
                      size="sm" 
                      className="flex-1"
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team members found</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Team;