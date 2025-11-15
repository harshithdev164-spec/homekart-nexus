import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Calendar, Clock, Users, Search } from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { LeadDetailModal } from './LeadDetailModal';
import { cn } from '@/lib/utils';

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

interface LeadsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  newLeadId?: string | null;
  onLeadAttended?: (leadId: string) => void;
}

export const LeadsListModal: React.FC<LeadsListModalProps> = ({
  isOpen,
  onClose,
  leads,
  newLeadId,
  onLeadAttended
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [attendedLeads, setAttendedLeads] = useState<Set<string>>(new Set());

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

  // Mark new lead as unattended when modal opens
  useEffect(() => {
    if (isOpen && newLeadId && !attendedLeads.has(newLeadId)) {
      // Don't mark it as attended yet, let it blink
    }
  }, [isOpen, newLeadId, attendedLeads]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const searchLower = searchTerm.toLowerCase();
    return leads.filter(lead =>
      lead.name.toLowerCase().includes(searchLower) ||
      lead.phone.includes(searchTerm) ||
      (lead.email && lead.email.toLowerCase().includes(searchLower))
    );
  }, [leads, searchTerm]);

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

  const isNewUnattendedLead = (lead: Lead) => {
    return lead.status === 'new' && 
           lead.id === newLeadId && 
           !attendedLeads.has(lead.id);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetail(true);
    
    // Mark as attended when clicked
    if (isNewUnattendedLead(lead)) {
      setAttendedLeads(prev => new Set([...prev, lead.id]));
      onLeadAttended?.(lead.id);
    }
  };

  const handleLeadDetailClose = () => {
    setShowLeadDetail(false);
    setSelectedLead(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>All Leads</DialogTitle>
            <DialogDescription>
              View and manage all your leads. New leads are highlighted with a green blinking border.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Leads List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchTerm ? 'No leads found matching your search.' : 'No leads available.'}
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const isBlinking = isNewUnattendedLead(lead);
                  return (
                    <Card
                      key={lead.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-all duration-200",
                        isBlinking && "new-lead-blink border-2"
                      )}
                      onClick={() => handleLeadClick(lead)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{lead.name}</h3>
                              <Badge className={getStatusColor(lead.status)}>
                                {lead.status.replace('_', ' ')}
                              </Badge>
                              {isBlinking && (
                                <Badge variant="outline" className="border-success text-success">
                                  New
                                </Badge>
                              )}
                            </div>
                            
                            {lead.profiles && (
                              <div className="flex items-center gap-2 text-sm text-primary">
                                <Users className="h-3 w-3" />
                                Assigned to: {lead.profiles.full_name}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {lead.phone}
                              </div>
                              {lead.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  {lead.email}
                                </div>
                              )}
                              {lead.preferred_location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {lead.preferred_location}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Created: {format(new Date(lead.created_at), 'MMM dd, yyyy')}
                              </div>
                            </div>

                            {(lead.budget_min || lead.budget_max) && (
                              <div className="text-sm font-medium">
                                Budget: ₹{lead.budget_min?.toLocaleString('en-IN')} - ₹{lead.budget_max?.toLocaleString('en-IN')}
                              </div>
                            )}

                            {lead.next_followup && (
                              <div className={cn(
                                "flex items-center gap-2 text-xs",
                                isToday(parseISO(lead.next_followup))
                                  ? 'text-warning font-medium'
                                  : isPast(parseISO(lead.next_followup)) && !isToday(parseISO(lead.next_followup))
                                  ? 'text-destructive font-medium'
                                  : 'text-muted-foreground'
                              )}>
                                <Clock className="h-3 w-3" />
                                Follow-up: {format(new Date(lead.next_followup), 'MMM dd, yyyy')}
                                {isToday(parseISO(lead.next_followup)) && <span className="text-warning">(Today)</span>}
                                {isPast(parseISO(lead.next_followup)) && !isToday(parseISO(lead.next_followup)) && <span className="text-destructive">(Overdue)</span>}
                              </div>
                            )}

                            {lead.notes && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {lead.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LeadDetailModal
        lead={selectedLead}
        isOpen={showLeadDetail}
        onClose={handleLeadDetailClose}
      />
    </>
  );
};

