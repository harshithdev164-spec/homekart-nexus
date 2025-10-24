import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  DollarSign, 
  Home,
  Clock,
  FileText,
  Users,
  Activity,
  Sparkles,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { AILeadInsights } from '@/components/ai/AILeadInsights';
import { AIPropertyMatcher } from '@/components/ai/AIPropertyMatcher';
import { LeadStatusUpdate } from '@/components/leads/LeadStatusUpdate';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  source?: string;
  budget_min?: number;
  budget_max?: number;
  property_type?: string;
  preferred_location?: string;
  last_contacted?: string;
  next_followup?: string;
  project_name?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
}

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  isOpen,
  onClose
}) => {
  const [assignedProfile, setAssignedProfile] = useState<Profile | null>(null);
  const [createdByProfile, setCreatedByProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [relatedProperties, setRelatedProperties] = useState<any[]>([]);

  useEffect(() => {
    if (lead && isOpen) {
      fetchProfiles();
      fetchActivities();
      fetchCommunications();
      fetchTransfers();
      fetchRelatedProperties();
    }
  }, [lead, isOpen]);

  const fetchProfiles = async () => {
    if (!lead) return;

    const profileIds = [lead.assigned_to, lead.created_by].filter(Boolean);
    if (profileIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', profileIds);

    if (data) {
      setAssignedProfile(data.find(p => p.id === lead.assigned_to) || null);
      setCreatedByProfile(data.find(p => p.id === lead.created_by) || null);
    }
  };

  const fetchActivities = async () => {
    if (!lead) return;

    const { data } = await supabase
      .from('activities')
      .select(`
        *,
        profiles!activities_created_by_fkey(full_name)
      `)
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setActivities(data);
    }
  };

  const fetchCommunications = async () => {
    if (!lead) return;

    const { data } = await supabase
      .from('communication_logs')
      .select(`
        *,
        profiles!communication_logs_sent_by_fkey(full_name)
      `)
      .eq('lead_id', lead.id)
      .order('sent_at', { ascending: false })
      .limit(5);

    if (data) {
      setCommunications(data);
    }
  };

  const fetchTransfers = async () => {
    if (!lead) return;

    const { data } = await supabase
      .from('lead_transfers')
      .select(`
        *,
        from_profile:profiles!lead_transfers_from_user_id_fkey(full_name),
        to_profile:profiles!lead_transfers_to_user_id_fkey(full_name),
        transferred_by_profile:profiles!lead_transfers_transferred_by_fkey(full_name)
      `)
      .eq('lead_id', lead.id)
      .order('transferred_at', { ascending: false });

    if (data) {
      setTransfers(data);
    }
  };

  const fetchRelatedProperties = async () => {
    if (!lead) return;

    const { data } = await supabase
      .from('lead_property_interests')
      .select(`
        *,
        properties(id, title, price, location, city, status, property_type)
      `)
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    if (data) {
      setRelatedProperties(data);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      qualified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xl font-bold">{lead.name}</span>
              {lead.project_name && (
                <span className="text-lg font-normal text-muted-foreground ml-2">
                  - {lead.project_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(lead.status)}>
                {lead.status.replace('_', ' ')}
              </Badge>
              <LeadStatusUpdate 
                lead={lead} 
                onStatusUpdate={() => {
                  // Trigger a refresh by closing and reopening
                  onClose();
                }} 
              />
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="ai-insights" className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Properties
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.phone}</span>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.email}</span>
                      </div>
                    )}
                    {lead.preferred_location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.preferred_location}</span>
                      </div>
                    )}
                    {lead.source && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>Source: {lead.source}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lead.property_type && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Property Type</span>
                        <p className="capitalize">{lead.property_type.replace('_', ' ')}</p>
                      </div>
                    )}
                    {(lead.budget_min || lead.budget_max) && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Budget Range</span>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {lead.budget_min ? formatCurrency(lead.budget_min) : '₹0'} - {' '}
                            {lead.budget_max ? formatCurrency(lead.budget_max) : 'No limit'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {lead.notes && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Notes</span>
                      <p className="mt-1 text-sm bg-muted p-3 rounded-md">{lead.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assignment & Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assignedProfile ? (
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(assignedProfile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{assignedProfile.full_name}</p>
                          <p className="text-sm text-muted-foreground">{assignedProfile.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Unassigned</Badge>
                      </div>
                    )}
                    
                    {createdByProfile && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Created by</span>
                        <p className="text-sm">{createdByProfile.full_name}</p>
                      </div>
                    )}
                    
                    {transfers.length > 0 && (
                      <div className="pt-2 border-t">
                        <span className="text-sm font-medium text-muted-foreground">Transfer History</span>
                        <div className="space-y-2 mt-2">
                          {transfers.map((transfer: any) => (
                            <div key={transfer.id} className="text-xs bg-muted p-2 rounded">
                              <p>
                                <strong>{transfer.from_profile?.full_name}</strong> → <strong>{transfer.to_profile?.full_name}</strong>
                              </p>
                              <p className="text-muted-foreground">
                                {format(new Date(transfer.transferred_at), 'MMM dd, yyyy')}
                                {transfer.reason && ` - ${transfer.reason}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Created</span>
                      <p className="text-sm">{format(new Date(lead.created_at), 'PPp')}</p>
                    </div>
                    {lead.last_contacted && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Last Contacted</span>
                        <p className="text-sm">{format(new Date(lead.last_contacted), 'PPp')}</p>
                      </div>
                    )}
                    {lead.next_followup && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Next Follow-up</span>
                        <p className="text-sm">{format(new Date(lead.next_followup), 'PPp')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activities.length > 0 ? (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div key={activity.id} className="border-l-2 border-primary pl-3">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'MMM dd, yyyy')} • {activity.profiles?.full_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No activities yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Recent Communications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {communications.length > 0 ? (
                      <div className="space-y-3">
                        {communications.map((comm) => (
                          <div key={comm.id} className="border-l-2 border-secondary pl-3">
                            <p className="text-sm font-medium capitalize">{comm.communication_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(comm.sent_at), 'MMM dd, yyyy')} • {comm.profiles?.full_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No communications yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Related Properties */}
              {relatedProperties.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Related Properties
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {relatedProperties.map((interest: any) => (
                        <div key={interest.id} className="border p-3 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{interest.properties?.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {interest.properties?.location}, {interest.properties?.city}
                              </p>
                              <p className="text-sm font-medium">₹{interest.properties?.price?.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{interest.properties?.status}</Badge>
                              {interest.interest_level && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Interest: {interest.interest_level}/10
                                </p>
                              )}
                            </div>
                          </div>
                          {interest.notes && (
                            <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                              {interest.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="ai-insights" className="space-y-6">
              <AILeadInsights 
                leadId={lead.id} 
                leadData={lead}
                onInsightsGenerated={(insights) => {
                  console.log('AI insights generated:', insights);
                }}
              />
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties" className="space-y-6">
              <AIPropertyMatcher
                leadId={lead.id}
                leadData={lead}
                onPropertySelected={(propertyId) => {
                  console.log('Property selected:', propertyId);
                  // You can add navigation to property details here
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};