import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Phone, Mail, MapPin, Calendar, Filter, Users, Upload, Database, CalendarDays, Clock, AlertCircle } from 'lucide-react';
import { RealtimeIndicator } from '@/components/collaboration/RealtimeIndicator';
import { LeadTransfer } from '@/components/leads/LeadTransfer';
import { MessageTemplates } from '@/components/templates/MessageTemplates';
import { LeadMessaging } from '@/components/communications/LeadMessaging';
import { LeadAssignmentIndicator } from '@/components/leads/LeadAssignmentIndicator';
import { LeadIntegrations } from '@/components/leads/LeadIntegrations';
import { LeadImport } from '@/components/leads/LeadImport';
import { DynamicTableImport } from '@/components/leads/DynamicTableImport';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isToday, isPast, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  source?: string;
  status: string;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  property_type?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  next_followup?: string;
  last_contacted?: string;
  assigned_to?: string;
  created_by: string;
  project_name?: string;
  profiles?: {
    full_name: string;
  };
}

const Leads: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<{
    startDate: Date | null;
    endDate: Date | null;
    followUpFilter: 'all' | 'today' | 'overdue' | 'upcoming';
  }>({
    startDate: null,
    endDate: null,
    followUpFilter: 'all'
  });
  
  // Debounce search term to prevent excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false);
  const [isMessagingDialogOpen, setIsMessagingDialogOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDynamicImportDialogOpen, setIsDynamicImportDialogOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDynamicImport, setShowDynamicImport] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    budget_min: '',
    budget_max: '',
    preferred_location: '',
    property_type: '',
    notes: '',
    next_followup: '',
  });

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          profiles!leads_assigned_to_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch leads',
          variant: 'destructive',
        });
        return;
      }

      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Optimized real-time subscription
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const channel = supabase
      .channel(`leads_changes_${Date.now()}`) // Unique channel name
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('Lead change detected:', payload);
          
          // Debounce rapid updates to prevent excessive API calls
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchLeads();
          }, 500);
        }
      )
      .on('broadcast', 
        { event: 'status_updated' },
        (payload) => {
          console.log('Lead status updated:', payload);
          
          // Show notification to other users
          if (payload.payload?.updated_by && payload.payload?.updated_by !== profile?.full_name) {
            toast({
              title: "Lead Updated",
              description: `${payload.payload.updated_by} updated a lead status`,
            });
          }
          
          // Debounced refresh
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchLeads();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchLeads, profile?.full_name, toast]);

  // Remove duplicate fetchLeads function

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;

    try {
      const leadData = {
        ...formData,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        property_type: formData.property_type as 'apartment' | 'villa' | 'plot' | 'commercial' | 'office' | 'warehouse' | undefined,
        next_followup: formData.next_followup ? new Date(formData.next_followup).toISOString() : null,
        created_by: profile.id,
      };

      const { error } = await supabase
        .from('leads')
        .insert([leadData]);

      if (error) {
        console.error('Error creating lead:', error);
        toast({
          title: 'Error',
          description: 'Failed to create lead',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Lead created successfully',
      });

      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        source: '',
        budget_min: '',
        budget_max: '',
        preferred_location: '',
        property_type: '',
        notes: '',
        next_followup: '',
      });
        fetchLeads();
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        source: '',
        budget_min: '',
        budget_max: '',
        preferred_location: '',
        property_type: '',
        notes: '',
        next_followup: '',
      });
      // Don't call fetchLeads here as real-time will handle it
    } catch (error) {
      console.error('Error creating lead:', error);
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

  // Memoized filtered leads with debounced search and date filters
  const filteredLeads = useMemo(() => {
    let filtered = leads;
    
    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchLower) ||
        lead.phone.includes(debouncedSearchTerm) ||
        (lead.email && lead.email.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply date range filter
    if (dateFilter.startDate && dateFilter.endDate) {
      filtered = filtered.filter(lead => {
        const createdDate = parseISO(lead.created_at);
        return isWithinInterval(createdDate, {
          start: startOfDay(dateFilter.startDate!),
          end: endOfDay(dateFilter.endDate!)
        });
      });
    }
    
    // Apply follow-up filter
    if (dateFilter.followUpFilter !== 'all') {
      filtered = filtered.filter(lead => {
        if (!lead.next_followup) return dateFilter.followUpFilter === 'all';
        
        const followUpDate = parseISO(lead.next_followup);
        const today = new Date();
        
        switch (dateFilter.followUpFilter) {
          case 'today':
            return isToday(followUpDate);
          case 'overdue':
            return isPast(followUpDate) && !isToday(followUpDate);
          case 'upcoming':
            return followUpDate > today;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [leads, debouncedSearchTerm, dateFilter]);

  // Memoized stats to prevent recalculation on every render
  const stats = useMemo(() => {
    const todayFollowUps = leads.filter(lead => 
      lead.next_followup && isToday(parseISO(lead.next_followup))
    );
    const overdueFollowUps = leads.filter(lead => 
      lead.next_followup && isPast(parseISO(lead.next_followup)) && !isToday(parseISO(lead.next_followup))
    );
    
    return {
      total: leads.length,
      new: leads.filter(lead => lead.status === 'new').length,
      active: leads.filter(lead => ['qualified', 'proposal', 'negotiation'].includes(lead.status)).length,
      closed_won: leads.filter(lead => lead.status === 'closed_won').length,
      todayFollowUps: todayFollowUps.length,
      overdueFollowUps: overdueFollowUps.length,
    };
  }, [leads]);

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
            <h1 className="text-3xl font-bold">Lead Management</h1>
            <RealtimeIndicator channel="leads" />
          </div>
          <p className="text-muted-foreground">Track and manage your leads through the sales pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Import Leads
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setIsDynamicImportDialogOpen(true)}
          >
            <Database className="h-4 w-4" />
            Smart Import
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setIsIntegrationsOpen(true)}
          >
            <Database className="h-4 w-4" />
            Integrations
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setIsTemplatesDialogOpen(true)}
          >
            <Mail className="h-4 w-4" />
            Templates
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Lead
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Add a new lead to your pipeline. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Lead name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    placeholder="Lead source"
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_min">Min Budget (₹)</Label>
                  <Input
                    id="budget_min"
                    type="number"
                    placeholder="Minimum budget"
                    value={formData.budget_min}
                    onChange={(e) => setFormData({...formData, budget_min: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_max">Max Budget (₹)</Label>
                  <Input
                    id="budget_max"
                    type="number"
                    placeholder="Maximum budget"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({...formData, budget_max: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_location">Preferred Location</Label>
                  <Input
                    id="preferred_location"
                    placeholder="Preferred location"
                    value={formData.preferred_location}
                    onChange={(e) => setFormData({...formData, preferred_location: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_type">Property Type</Label>
                  <Select value={formData.property_type} onValueChange={(value) => setFormData({...formData, property_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="plot">Plot</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about the lead"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_followup">Next Follow-up Date</Label>
                  <Input
                    id="next_followup"
                    type="datetime-local"
                    value={formData.next_followup}
                    onChange={(e) => setFormData({...formData, next_followup: e.target.value})}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full">Create Lead</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                {dateFilter.startDate && dateFilter.endDate
                  ? `${format(dateFilter.startDate, 'MMM dd')} - ${format(dateFilter.endDate, 'MMM dd')}`
                  : 'Date Range'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <div>
                    <p className="text-sm font-medium mb-2">Start Date</p>
                    <CalendarComponent
                      mode="single"
                      selected={dateFilter.startDate || undefined}
                      onSelect={(date) => setDateFilter(prev => ({ ...prev, startDate: date || null }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">End Date</p>
                    <CalendarComponent
                      mode="single"
                      selected={dateFilter.endDate || undefined}
                      onSelect={(date) => setDateFilter(prev => ({ ...prev, endDate: date || null }))}
                      disabled={(date) => dateFilter.startDate ? date < dateFilter.startDate : false}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setDateFilter(prev => ({ ...prev, startDate: null, endDate: null }))}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Follow-up Filter */}
        <Select 
          value={dateFilter.followUpFilter} 
          onValueChange={(value: 'all' | 'today' | 'overdue' | 'upcoming') => 
            setDateFilter(prev => ({ ...prev, followUpFilter: value }))
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Follow-ups</SelectItem>
            <SelectItem value="today">Today's Follow-ups</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lead Assignment Indicator */}
      <LeadAssignmentIndicator 
        leads={filteredLeads} 
        onLeadUpdate={(updatedLead) => {
          setLeads(prevLeads => 
            prevLeads.map(lead => 
              lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead
            )
          );
        }}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.new}</div>
            <p className="text-xs text-muted-foreground">New Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.closed_won}</div>
            <p className="text-xs text-muted-foreground">Closed Won</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
              {stats.todayFollowUps}
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-xs text-orange-600">Today's Follow-ups</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              {stats.overdueFollowUps}
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-xs text-red-600">Overdue Follow-ups</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <Card 
            key={lead.id} 
            className="hover:shadow-medium transition-all duration-300 cursor-pointer"
            onClick={() => {
              setSelectedLead(lead);
              setShowLeadDetail(true);
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  <span className="font-bold">{lead.name}</span>
                  {(lead as any).project_name && (
                    <span className="font-normal text-muted-foreground ml-2">
                      - {(lead as any).project_name}
                    </span>
                  )}
                </CardTitle>
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lead.profiles && (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Users className="h-3 w-3" />
                    Assigned to: {lead.profiles.full_name}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {lead.phone}
                </div>
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {lead.email}
                  </div>
                )}
                {lead.preferred_location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {lead.preferred_location}
                  </div>
                )}
                {(lead.budget_min || lead.budget_max) && (
                  <div className="text-sm font-medium">
                    Budget: ₹{lead.budget_min?.toLocaleString('en-IN')} - ₹{lead.budget_max?.toLocaleString('en-IN')}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Created: {new Date(lead.created_at).toLocaleDateString()}
                </div>
                {lead.next_followup && (
                  <div className={`flex items-center gap-2 text-xs ${
                    isToday(parseISO(lead.next_followup)) 
                      ? 'text-orange-600 font-medium' 
                      : isPast(parseISO(lead.next_followup)) && !isToday(parseISO(lead.next_followup))
                      ? 'text-red-600 font-medium'
                      : 'text-muted-foreground'
                  }`}>
                    <Clock className="h-3 w-3" />
                    Follow-up: {new Date(lead.next_followup).toLocaleDateString()}
                    {isToday(parseISO(lead.next_followup)) && <span className="text-orange-600">(Today)</span>}
                    {isPast(parseISO(lead.next_followup)) && !isToday(parseISO(lead.next_followup)) && <span className="text-red-600">(Overdue)</span>}
                  </div>
                )}
                {lead.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {lead.notes}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedLead(lead);
                    setIsMessagingDialogOpen(true);
                  }}
                >
                  Message
                </Button>
                <LeadTransfer 
                  leadId={lead.id}
                  leadName={lead.name}
                  currentOwner={lead.profiles?.full_name}
                  onTransferSuccess={fetchLeads}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? 'No leads found matching your search.' : 'No leads yet. Create your first lead to get started.'}
            </p>
            {!searchTerm && (
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message Templates Dialog */}
      <Dialog open={isTemplatesDialogOpen} onOpenChange={setIsTemplatesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Message Templates</DialogTitle>
            <DialogDescription>
              Manage message templates for client communication
            </DialogDescription>
          </DialogHeader>
          <MessageTemplates />
        </DialogContent>
      </Dialog>

      {/* Lead Messaging Dialog */}
      <Dialog open={isMessagingDialogOpen} onOpenChange={setIsMessagingDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Send Message to Lead</DialogTitle>
            <DialogDescription>
              {selectedLead 
                ? `Send WhatsApp or email messages to ${selectedLead.name}`
                : 'Send messages to leads'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LeadMessaging />
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Integrations Dialog */}
      <Dialog open={isIntegrationsOpen} onOpenChange={setIsIntegrationsOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Lead Integrations</DialogTitle>
            <DialogDescription>
              Import leads from external platforms like MagicBricks, 99acres, and Zoho. Sync data and send bulk emails.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <LeadIntegrations />
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Import Leads from Excel</DialogTitle>
            <DialogDescription>
              Upload and import leads from an Excel file (.xlsx or .xls)
            </DialogDescription>
          </DialogHeader>
          <LeadImport />
        </DialogContent>
      </Dialog>

      {/* Smart Lead Import Dialog */}
      <Dialog open={isDynamicImportDialogOpen} onOpenChange={setIsDynamicImportDialogOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Smart Lead Import</DialogTitle>
            <DialogDescription>
              Upload any Excel file and automatically import it as leads with intelligent field mapping
            </DialogDescription>
          </DialogHeader>
          <DynamicTableImport />
        </DialogContent>
      </Dialog>

      <LeadDetailModal
        lead={selectedLead}
        isOpen={showLeadDetail}
        onClose={() => {
          setShowLeadDetail(false);
          setSelectedLead(null);
        }}
      />
    </div>
  );
};

export default Leads;