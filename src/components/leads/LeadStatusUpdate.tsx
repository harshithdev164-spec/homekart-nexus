import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Clock, XCircle, Edit3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LeadStatusUpdateProps {
  lead: {
    id: string;
    name: string;
    status: string;
    notes?: string;
  };
  onStatusUpdate?: () => void;
}

const statusOptions = [
  { value: 'new', label: 'New', icon: AlertCircle, color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', icon: Clock, color: 'bg-yellow-500' },
  { value: 'qualified', label: 'Qualified', icon: CheckCircle, color: 'bg-green-500' },
  { value: 'proposal', label: 'Proposal', icon: Edit3, color: 'bg-purple-500' },
  { value: 'negotiation', label: 'Negotiation', icon: Clock, color: 'bg-orange-500' },
  { value: 'closed_won', label: 'Closed Won', icon: CheckCircle, color: 'bg-emerald-500' },
  { value: 'closed_lost', label: 'Closed Lost', icon: XCircle, color: 'bg-red-500' },
];

export const LeadStatusUpdate: React.FC<LeadStatusUpdateProps> = ({ lead, onStatusUpdate }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(lead.status);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatus = statusOptions.find(s => s.value === lead.status);
  const selectedStatusOption = statusOptions.find(s => s.value === selectedStatus);

  const handleStatusUpdate = async () => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to update lead status",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Create status update note
      const statusNote = `Status changed from "${currentStatus?.label || lead.status}" to "${selectedStatusOption?.label || selectedStatus}"`;
      const combinedNotes = notes.trim() 
        ? `${statusNote}\n\nNotes: ${notes.trim()}\n\n---\n${lead.notes || ''}`
        : `${statusNote}\n\n---\n${lead.notes || ''}`;

      const { error } = await supabase
        .from('leads')
        .update({
          status: selectedStatus as any,
          notes: combinedNotes.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Lead status updated to ${selectedStatusOption?.label}`,
      });

      setIsOpen(false);
      setNotes('');
      onStatusUpdate?.();
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentStatusIcon = () => {
    if (!currentStatus) return AlertCircle;
    return currentStatus.icon;
  };

  const CurrentIcon = getCurrentStatusIcon();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Lead Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{lead.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                <Badge variant="secondary" className="gap-1">
                  <CurrentIcon className="h-3 w-3" />
                  {currentStatus?.label || lead.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => {
                  const Icon = status.icon;
                  return (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {status.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder="Add notes about this status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleStatusUpdate}
              disabled={isUpdating || selectedStatus === lead.status}
              className="flex-1"
            >
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};