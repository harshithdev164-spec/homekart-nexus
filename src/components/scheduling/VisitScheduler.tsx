import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Visit {
  id: string;
  lead_id: string;
  property_id: string;
  scheduled_by: string;
  assigned_to: string;
  visit_date: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_email?: string;
  lead?: { name: string; phone: string };
  property?: { title: string; location: string };
  assigned_user?: { full_name: string };
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Property {
  id: string;
  title: string;
  location: string;
}

interface TeamMember {
  id: string;
  full_name: string;
}

export const VisitScheduler: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    lead_id: '',
    property_id: '',
    assigned_to: '',
    visit_date: '',
    visitor_name: '',
    visitor_phone: '',
    visitor_email: '',
    notes: ''
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchVisits();
    fetchLeads();
    fetchProperties();
    fetchTeamMembers();
    subscribeToVisits();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchVisits = async () => {
    const { data, error } = await supabase
      .from('visit_schedules')
      .select('*')
      .order('visit_date', { ascending: true });

    if (data) {
      // Fetch related data separately to avoid join issues
      const enrichedVisits = await Promise.all(
        data.map(async (visit) => {
          const { data: lead } = await supabase
            .from('leads')
            .select('name, phone')
            .eq('id', visit.lead_id)
            .single();

          const { data: property } = await supabase
            .from('properties')
            .select('title, location')
            .eq('id', visit.property_id)
            .single();

          const { data: assignedUser } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', visit.assigned_to)
            .single();

          return {
            ...visit,
            status: visit.status as 'scheduled' | 'completed' | 'cancelled' | 'rescheduled',
            lead,
            property,
            assigned_user: assignedUser
          };
        })
      );
      setVisits(enrichedVisits);
    }
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, email')
      .order('name');
    if (data) setLeads(data);
  };

  const fetchProperties = async () => {
    const { data } = await supabase
      .from('properties')
      .select('id, title, location')
      .order('title');
    if (data) setProperties(data);
  };

  const fetchTeamMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    if (data) setTeamMembers(data);
  };

  const subscribeToVisits = () => {
    const channel = supabase
      .channel('visit-schedules')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'visit_schedules'
      }, () => {
        fetchVisits();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('visit_schedules')
      .insert({
        ...formData,
        scheduled_by: currentUser.id,
        visit_date: new Date(formData.visit_date).toISOString()
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to schedule visit',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Visit scheduled successfully'
      });
      setShowForm(false);
      resetForm();
    }
    setIsLoading(false);
  };

  const updateVisitStatus = async (visitId: string, status: string) => {
    const { error } = await supabase
      .from('visit_schedules')
      .update({ status })
      .eq('id', visitId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update visit status',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Visit status updated'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      lead_id: '',
      property_id: '',
      assigned_to: '',
      visit_date: '',
      visitor_name: '',
      visitor_phone: '',
      visitor_email: '',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      scheduled: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
      rescheduled: 'outline'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Visit Scheduler</h2>
          <p className="text-muted-foreground">Manage property visit appointments</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Visit
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule New Visit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lead</label>
                <Select value={formData.lead_id} onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, lead_id: value }));
                  const selectedLead = leads.find(l => l.id === value);
                  if (selectedLead) {
                    setFormData(prev => ({
                      ...prev,
                      visitor_name: selectedLead.name,
                      visitor_phone: selectedLead.phone,
                      visitor_email: selectedLead.email || ''
                    }));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(lead => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name} - {lead.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Property</label>
                <Select value={formData.property_id} onValueChange={(value) => setFormData(prev => ({ ...prev, property_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title} - {property.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned To</label>
                <Select value={formData.assigned_to} onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Visit Date & Time</label>
                <Input
                  type="datetime-local"
                  value={formData.visit_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, visit_date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Visitor Name</label>
                <Input
                  value={formData.visitor_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, visitor_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Visitor Phone</label>
                <Input
                  value={formData.visitor_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, visitor_phone: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Visitor Email (Optional)</label>
                <Input
                  type="email"
                  value={formData.visitor_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, visitor_email: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about the visit..."
                />
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Scheduling...' : 'Schedule Visit'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Visitor</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {new Date(visit.visit_date).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(visit.visit_date).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{visit.visitor_name}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {visit.visitor_phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{visit.property?.title}</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {visit.property?.location}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{visit.assigned_user?.full_name}</TableCell>
                  <TableCell>{getStatusBadge(visit.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {visit.status === 'scheduled' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateVisitStatus(visit.id, 'completed')}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateVisitStatus(visit.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};