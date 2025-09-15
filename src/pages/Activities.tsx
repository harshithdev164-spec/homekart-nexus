import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Clock, CheckCircle, Users, Building2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { RealtimeIndicator } from '@/components/collaboration/RealtimeIndicator';

interface Activity {
  id: string;
  title: string;
  description?: string;
  type: string;
  scheduled_at?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  lead_id?: string;
  property_id?: string;
  leads?: { name: string };
  properties?: { title: string };
}

interface Lead {
  id: string;
  name: string;
}

interface Property {
  id: string;
  title: string;
}

const Activities: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'call' as 'call' | 'email' | 'meeting' | 'note' | 'task' | 'property_visit',
    scheduled_at: '',
    lead_id: '',
    property_id: '',
  });

  useEffect(() => {
    fetchActivities();
    fetchLeads();
    fetchProperties();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('activities_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'activities' },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          leads(name),
          properties(title)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching activities:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch activities',
          variant: 'destructive',
        });
        return;
      }

      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name')
      .order('name');
    if (data) setLeads(data);
  };

  const fetchProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, title')
      .order('title');
    if (data) setProperties(data);
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;

    try {
      const activityData = {
        ...formData,
        created_by: profile.id,
        scheduled_at: formData.scheduled_at || null,
        lead_id: formData.lead_id || null,
        property_id: formData.property_id || null,
      };

      const { error } = await supabase
        .from('activities')
        .insert(activityData);

      if (error) {
        console.error('Error creating activity:', error);
        toast({
          title: 'Error',
          description: 'Failed to create activity',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Activity created successfully',
      });

      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        type: 'call' as 'call' | 'email' | 'meeting' | 'note' | 'task' | 'property_visit',
        scheduled_at: '',
        lead_id: '',
        property_id: '',
      });
      fetchActivities();
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  };

  const toggleActivityCompletion = async (activityId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ 
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        })
        .eq('id', activityId);

      if (error) {
        console.error('Error updating activity:', error);
        return;
      }

      fetchActivities();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞';
      case 'email': return '📧';
      case 'meeting': return '🤝';
      case 'note': return '📝';
      case 'task': return '✅';
      case 'property_visit': return '🏠';
      default: return '📝';
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      case 'note': return 'bg-gray-100 text-gray-800';
      case 'task': return 'bg-yellow-100 text-yellow-800';
      case 'property_visit': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'completed') return matchesSearch && activity.is_completed;
    if (filterStatus === 'pending') return matchesSearch && !activity.is_completed;
    return matchesSearch;
  });

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
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Activities</h1>
            <RealtimeIndicator channel="activities" />
          </div>
          <p className="text-muted-foreground">Manage your tasks and scheduled activities</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Activity</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateActivity} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Activity title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'property_visit') => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="property_visit">Property Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Scheduled Date & Time</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead_id">Related Lead (Optional)</Label>
                <Select value={formData.lead_id} onValueChange={(value) => setFormData({...formData, lead_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(lead => (
                      <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_id">Related Property (Optional)</Label>
                <Select value={formData.property_id} onValueChange={(value) => setFormData({...formData, property_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.id} value={property.id}>{property.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Activity description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <Button type="submit" className="w-full">Create Activity</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted-foreground">Total Activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activities.filter(a => !a.is_completed).length}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activities.filter(a => a.is_completed).length}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Activities List */}
      <div className="space-y-4">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActivityCompletion(activity.id, activity.is_completed)}
                    className="mt-1"
                  >
                    <CheckCircle className={`h-5 w-5 ${activity.is_completed ? 'text-green-500' : 'text-gray-300'}`} />
                  </Button>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className={`font-semibold ${activity.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {getActivityTypeIcon(activity.type)} {activity.title}
                        </h3>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        )}
                      </div>
                      <Badge className={getActivityTypeColor(activity.type)}>
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {activity.scheduled_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(activity.scheduled_at), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                      {activity.leads && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {activity.leads.name}
                        </div>
                      )}
                      {activity.properties && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {activity.properties.title}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No activities found</p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-2"
                >
                  Create your first activity
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Activities;