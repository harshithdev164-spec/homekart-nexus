import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Calendar, Clock, Users, PhoneCall, CalendarClock } from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { CallButton } from '@/components/calls/CallButton';
import { LeadTransfer } from '@/components/leads/LeadTransfer';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface LeadCardProps {
  lead: Lead;
  onLeadClick: (lead: Lead) => void;
  onMessageClick: (lead: Lead) => void;
  onCallLogsClick: (leadId: string) => void;
  onTransferSuccess: () => void;
  isNewUnattended?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'new': return 'bg-primary/10 text-primary';
    case 'contacted': return 'bg-warning/10 text-warning';
    case 'qualified': return 'bg-success/10 text-success';
    case 'meeting_scheduled': return 'bg-indigo-500/10 text-indigo-500';
    case 'site_visit_scheduled': return 'bg-cyan-500/10 text-cyan-500';
    case 'site_visit_done': return 'bg-teal-500/10 text-teal-500';
    case 'proposal': return 'bg-accent/20 text-accent-foreground';
    case 'negotiation': return 'bg-warning/10 text-warning';
    case 'closed_won': return 'bg-success/10 text-success';
    case 'closed_lost': return 'bg-destructive/10 text-destructive';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const LeadCard = React.memo<LeadCardProps>(({
  lead,
  onLeadClick,
  onMessageClick,
  onCallLogsClick,
  onTransferSuccess,
  isNewUnattended = false
}) => {
  const { toast } = useToast();
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScheduleFollowUp = async () => {
    if (!followUpDate) {
      toast({
        title: 'Error',
        description: 'Please select a follow-up date',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          next_followup: new Date(followUpDate).toISOString(),
          notes: followUpNotes ? `${lead.notes || ''}\n\nFollow-up scheduled: ${followUpNotes}` : lead.notes,
        })
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Follow-up scheduled successfully',
      });
      setShowFollowUpDialog(false);
      setFollowUpDate('');
      setFollowUpNotes('');
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule follow-up',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card
        className={cn(
          "hover:shadow-lg transition-all duration-300",
          lead.status === 'new' && !isNewUnattended ? 'border-2 border-success' : '',
          isNewUnattended ? 'new-lead-blink border-2' : ''
        )}
      >
        <CardHeader
          className="cursor-pointer"
          onClick={() => onLeadClick(lead)}
        >
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">
              <span className="font-bold">{lead.name}</span>
              {lead.project_name && (
                <span className="font-normal text-muted-foreground text-sm ml-2">
                  - {lead.project_name}
                </span>
              )}
            </CardTitle>
            <Badge className={cn('capitalize', getStatusColor(lead.status))}>
              {lead.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent
          className="cursor-pointer"
          onClick={() => onLeadClick(lead)}
        >
          <div className="space-y-2.5">
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
              <div className={cn(
                "flex items-center gap-2 text-xs",
                isToday(parseISO(lead.next_followup))
                  ? 'text-warning font-medium'
                  : isPast(parseISO(lead.next_followup)) && !isToday(parseISO(lead.next_followup))
                    ? 'text-destructive font-medium'
                    : 'text-muted-foreground'
              )}>
                <Clock className="h-3 w-3" />
                Follow-up: {new Date(lead.next_followup).toLocaleDateString()}
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

          {/* Action Buttons */}
          <div className="space-y-2 mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2">
              <CallButton
                phoneNumber={lead.phone}
                leadId={lead.id}
                name={lead.name}
                variant="default"
                size="sm"
                className="w-full"
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onMessageClick(lead);
                }}
              >
                <Mail className="h-4 w-4 mr-1" />
                Message
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onCallLogsClick(lead.id);
                }}
                className="w-full"
              >
                <PhoneCall className="h-4 w-4 mr-1" />
                Logs
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFollowUpDialog(true);
                }}
                className="w-full"
              >
                <CalendarClock className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Follow-up</span>
                <span className="sm:hidden">Follow</span>
              </Button>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <LeadTransfer
                leadId={lead.id}
                leadName={lead.name}
                currentOwner={lead.profiles?.full_name}
                onTransferSuccess={onTransferSuccess}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>
              Set a follow-up reminder for {lead.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="followup-date">Follow-up Date & Time</Label>
              <Input
                id="followup-date"
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followup-notes">Notes (Optional)</Label>
              <Textarea
                id="followup-notes"
                placeholder="Add notes about this follow-up..."
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFollowUpDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleFollowUp}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.lead.status === nextProps.lead.status &&
    prevProps.lead.updated_at === nextProps.lead.updated_at &&
    prevProps.isNewUnattended === nextProps.isNewUnattended
  );
});

LeadCard.displayName = 'LeadCard';
