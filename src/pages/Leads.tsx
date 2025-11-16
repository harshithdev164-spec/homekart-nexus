import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Phone, Mail, MapPin, Calendar, Filter, Users, Upload, Database, CalendarDays, Clock, AlertCircle, PhoneCall } from 'lucide-react';
import { CallButton } from '@/components/calls/CallButton';
import { CallLogs } from '@/components/calls/CallLogs';
import { RealtimeIndicator } from '@/components/collaboration/RealtimeIndicator';
import { LeadTransfer } from '@/components/leads/LeadTransfer';
import { MessageTemplates } from '@/components/templates/MessageTemplates';
import { LeadMessaging } from '@/components/communications/LeadMessaging';
import { LeadIntegrations } from '@/components/leads/LeadIntegrations';
import { LeadImport } from '@/components/leads/LeadImport';
import { DynamicTableImport } from '@/components/leads/DynamicTableImport';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { LeadsListModal } from '@/components/leads/LeadsListModal';
import { LeadCard } from '@/components/leads/LeadCard';
import { useToast } from '@/hooks/use-toast';
import { ListSkeleton } from '@/components/ui/loading-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
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

// Import portal logos
import metaLogo from '@/assets/meta-logo.png';
import googleLogo from '@/assets/google-logo.png';
import magicbricksLogo from '@/assets/magicbricks-logo.png';
import acresLogo from '@/assets/99acres-logo.png';
import housingLogo from '@/assets/housing-logo.png';

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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showCallLogs, setShowCallLogs] = useState(false);
  const [callLogsLeadId, setCallLogsLeadId] = useState<string | null>(null);
  const [showLeadsListModal, setShowLeadsListModal] = useState(false);
  const [newLeadId, setNewLeadId] = useState<string | null>(null);
  const [attendedLeads, setAttendedLeads] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    project_name: '',
    budget_min: '',
    budget_max: '',
    preferred_location: '',
    property_type: '',
    notes: '',
    next_followup: '',
  });

  // Optimized fetch function with pagination
  const fetchLeads = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      const from = (pageNum - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          phone,
          source,
          status,
          budget_min,
          budget_max,
          preferred_location,
          property_type,
          notes,
          created_at,
          updated_at,
          next_followup,
          last_contacted,
          assigned_to,
          created_by,
          project_name,
          profiles!leads_assigned_to_fkey(full_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching leads:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch leads',
          variant: 'destructive',
        });
        return;
      }

      if (append) {
        setLeads(prev => [...prev, ...(data || [])]);
      } else {
        setLeads(data || []);
      }
      
      setHasMore((count || 0) > to + 1);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  }, [toast, pageSize]);

  useEffect(() => {
    fetchLeads(1, false);
    setPage(1);
  }, [fetchLeads]);

  // Check for leadId in URL query params and open that lead
  useEffect(() => {
    const leadIdFromUrl = searchParams.get('leadId');
    if (leadIdFromUrl && leads.length > 0) {
      const lead = leads.find(l => l.id === leadIdFromUrl);
      if (lead) {
        setSelectedLead(lead);
        setShowLeadDetail(true);
        // Remove query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, leads, setSearchParams]);

  const loadMoreLeads = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeads(nextPage, true);
  }, [page, hasMore, loading, fetchLeads]);

  // Mark lead as attended when LeadDetailModal opens
  useEffect(() => {
    if (showLeadDetail && selectedLead && selectedLead.id === newLeadId && !attendedLeads.has(selectedLead.id)) {
      setAttendedLeads(prev => new Set([...prev, selectedLead.id]));
      setNewLeadId(null);
    }
  }, [showLeadDetail, selectedLead, newLeadId, attendedLeads]);

  // Load attended leads from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('attendedLeads');
    if (stored) {
      try {
        setAttendedLeads(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Error loading attended leads:', e);
      }
    }
  }, []);

  // Save attended leads to localStorage whenever it changes
  useEffect(() => {
    if (attendedLeads.size > 0) {
      localStorage.setItem('attendedLeads', JSON.stringify(Array.from(attendedLeads)));
    }
  }, [attendedLeads]);

  // Optimized real-time subscription with selective updates and debouncing
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    let updateCount = 0;
    const MAX_UPDATES_BEFORE_FULL_FETCH = 10;
    let pendingUpdates: any[] = [];
    
    const channel = supabase
      .channel(`leads_changes_${Date.now()}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leads' },
        async (payload) => {
          // Debounce INSERT events to batch multiple rapid inserts
          pendingUpdates.push(payload);
          
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            // Process all pending inserts
            const updatesToProcess = [...pendingUpdates];
            pendingUpdates = [];
            
            // Fetch only essential fields for new leads
            const ids = updatesToProcess.map(p => p.new.id);
            const { data } = await supabase
              .from('leads')
              .select(`
                id,
                name,
                email,
                phone,
                source,
                status,
                budget_min,
                budget_max,
                preferred_location,
                property_type,
                notes,
                created_at,
                updated_at,
                next_followup,
                last_contacted,
                assigned_to,
                created_by,
                project_name,
                profiles!leads_assigned_to_fkey(full_name)
              `)
              .in('id', ids);
            
            if (data && data.length > 0) {
              setLeads(prev => {
                // Merge new leads, avoiding duplicates
                const existingIds = new Set(prev.map(l => l.id));
                const newLeads = data.filter(l => !existingIds.has(l.id));
                return [...newLeads, ...prev];
              });
            }
          }, 500); // 500ms debounce for INSERT events
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          // Debounce UPDATE events
          clearTimeout(debounceTimer);
          
          // Update only the specific lead immediately for responsiveness
          setLeads(prev => prev.map(lead => 
            lead.id === payload.new.id 
              ? { ...lead, ...payload.new }
              : lead
          ));
          
          // If status changed from 'new' to something else, mark as attended
          if (payload.old.status === 'new' && payload.new.status !== 'new') {
            setAttendedLeads(prev => new Set([...prev, payload.new.id]));
          }
          
          updateCount++;
          // After multiple updates, do a full refresh to ensure consistency
          if (updateCount >= MAX_UPDATES_BEFORE_FULL_FETCH) {
            debounceTimer = setTimeout(() => {
              fetchLeads();
              updateCount = 0;
            }, 1000);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'leads' },
        (payload) => {
          // Remove the deleted lead
          setLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchLeads, profile?.id]);

  // Remove duplicate fetchLeads function

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create leads',
        variant: 'destructive',
      });
      return;
    }

    try {
      const leadData = {
        ...formData,
        project_name: formData.project_name || null,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        property_type: formData.property_type as 'apartment' | 'villa' | 'plot' | 'commercial' | 'office' | 'warehouse' | undefined,
        next_followup: formData.next_followup ? new Date(formData.next_followup).toISOString() : null,
        created_by: profile.id,
      };

      const { data: newLead, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();

      if (error) {
        console.error('Error creating lead:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to create lead',
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
        project_name: '',
        budget_min: '',
        budget_max: '',
        preferred_location: '',
        property_type: '',
        notes: '',
        next_followup: '',
      });

      // Set new lead ID and open leads list modal
      if (newLead) {
        setNewLeadId(newLead.id);
        setShowLeadsListModal(true);
      }
      // Don't call fetchLeads() - realtime subscription will handle it
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-primary/10 text-primary';
      case 'contacted': return 'bg-warning/10 text-warning';
      case 'qualified': return 'bg-success/10 text-success';
      case 'proposal': return 'bg-accent/20 text-accent-foreground';
      case 'negotiation': return 'bg-warning/10 text-warning';
      case 'closed_won': return 'bg-success/10 text-success';
      case 'closed_lost': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
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
    
    // Count leads by source (case-insensitive matching)
    const getSourceCount = (sourceName: string) => 
      leads.filter(lead => 
        lead.source?.toLowerCase().includes(sourceName.toLowerCase())
      ).length;
    
    return {
      total: leads.length,
      new: leads.filter(lead => lead.status === 'new').length,
      active: leads.filter(lead => ['qualified', 'proposal', 'negotiation'].includes(lead.status)).length,
      closed_won: leads.filter(lead => lead.status === 'closed_won').length,
      todayFollowUps: todayFollowUps.length,
      overdueFollowUps: overdueFollowUps.length,
      // Lead sources
      magicbricks: getSourceCount('magicbricks'),
      housing: getSourceCount('housing'),
      acres99: getSourceCount('99acres'),
      meta: getSourceCount('meta') + getSourceCount('facebook'),
      google: getSourceCount('google'),
    };
  }, [leads]);

  if (loading && leads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        <ListSkeleton count={8} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Lead Management</h1>
            <RealtimeIndicator channel="leads" />
          </div>
          <p className="text-sm text-muted-foreground">Track and manage your leads through the sales pipeline</p>
        </div>
        <div className="flex flex-wrap gap-2">
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

              <div className="space-y-2">
                <Label htmlFor="project_name">Project Name</Label>
                <Input
                  id="project_name"
                  placeholder="e.g., Sunrise Apartments, Downtown Complex"
                  value={formData.project_name}
                  onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                />
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
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning flex items-center gap-2">
              {stats.todayFollowUps}
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-xs text-warning">Today's Follow-ups</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive flex items-center gap-2">
              {stats.overdueFollowUps}
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-xs text-destructive">Overdue Follow-ups</p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Source Portal Stats */}
      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Lead Sources by Portal
          </CardTitle>
          <CardDescription>Total leads received from each platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {/* Magicbricks */}
            <Card className="bg-card/50 backdrop-blur border-2 hover:border-primary/50 transition-all hover:shadow-lg hover:scale-105">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <img src={magicbricksLogo} alt="Magicbricks" className="h-12 w-auto object-contain" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{stats.magicbricks}</div>
                  <div className="text-xs text-muted-foreground mt-1">Magicbricks</div>
                </div>
              </CardContent>
            </Card>

            {/* Housing.com */}
            <Card className="bg-card/50 backdrop-blur border-2 hover:border-orange-500/50 transition-all hover:shadow-lg hover:scale-105">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <img src={housingLogo} alt="Housing.com" className="h-12 w-auto object-contain" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">{stats.housing}</div>
                  <div className="text-xs text-muted-foreground mt-1">Housing.com</div>
                </div>
              </CardContent>
            </Card>

            {/* 99acres */}
            <Card className="bg-card/50 backdrop-blur border-2 hover:border-blue-500/50 transition-all hover:shadow-lg hover:scale-105">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <img src={acresLogo} alt="99acres" className="h-12 w-auto object-contain" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500">{stats.acres99}</div>
                  <div className="text-xs text-muted-foreground mt-1">99acres</div>
                </div>
              </CardContent>
            </Card>

            {/* Meta / Facebook */}
            <Card className="bg-card/50 backdrop-blur border-2 hover:border-blue-600/50 transition-all hover:shadow-lg hover:scale-105">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <img src={metaLogo} alt="Meta" className="h-12 w-auto object-contain" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.meta}</div>
                  <div className="text-xs text-muted-foreground mt-1">Meta / Facebook</div>
                </div>
              </CardContent>
            </Card>

            {/* Google */}
            <Card className="bg-card/50 backdrop-blur border-2 hover:border-green-600/50 transition-all hover:shadow-lg hover:scale-105">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <img src={googleLogo} alt="Google" className="h-10 w-auto object-contain" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.google}</div>
                  <div className="text-xs text-muted-foreground mt-1">Google Ads</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredLeads.map((lead) => {
          const isNewUnattended = lead.status === 'new' && lead.id === newLeadId && !attendedLeads.has(lead.id);
          return (
            <LeadCard
              key={lead.id}
              lead={lead}
              onLeadClick={(lead) => {
                setSelectedLead(lead);
                setShowLeadDetail(true);
                // Mark as attended when clicked
                if (isNewUnattended) {
                  setAttendedLeads(prev => new Set([...prev, lead.id]));
                  if (lead.id === newLeadId) {
                    setNewLeadId(null);
                  }
                }
              }}
              onMessageClick={(lead) => {
                setSelectedLead(lead);
                setIsMessagingDialogOpen(true);
              }}
              onCallLogsClick={(leadId) => {
                setCallLogsLeadId(leadId);
                setShowCallLogs(true);
              }}
              onTransferSuccess={() => fetchLeads(1, false)}
              isNewUnattended={isNewUnattended}
            />
          );
        })}
      </div>

      {filteredLeads.length === 0 && !loading && (
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

      {/* Load More Button */}
      {hasMore && !searchTerm && filteredLeads.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button 
            variant="outline" 
            onClick={loadMoreLeads}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More Leads'}
          </Button>
        </div>
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
          // Mark lead as attended when modal is opened (not just when closed)
          if (selectedLead && selectedLead.id === newLeadId && !attendedLeads.has(selectedLead.id)) {
            setAttendedLeads(prev => new Set([...prev, selectedLead.id]));
            setNewLeadId(null);
          }
          setShowLeadDetail(false);
          setSelectedLead(null);
        }}
      />

      <LeadsListModal
        isOpen={showLeadsListModal}
        onClose={() => {
          setShowLeadsListModal(false);
          setNewLeadId(null);
        }}
        leads={leads}
        newLeadId={newLeadId}
        onLeadAttended={(leadId) => {
          setAttendedLeads(prev => new Set([...prev, leadId]));
          if (leadId === newLeadId) {
            setNewLeadId(null);
          }
        }}
      />

      {/* Call Logs Dialog */}
      <Dialog open={showCallLogs} onOpenChange={setShowCallLogs}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Call History</DialogTitle>
            <DialogDescription>
              View all call logs for this lead
            </DialogDescription>
          </DialogHeader>
          <CallLogs leadId={callLogsLeadId || undefined} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;