import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email: string;
  department?: string;
}

interface LeadTransferProps {
  leadId: string;
  leadName: string;
  currentOwner?: string;
  onTransferSuccess?: () => void;
}

export const LeadTransfer: React.FC<LeadTransferProps> = ({
  leadId,
  leadName,
  currentOwner,
  onTransferSuccess
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDialogOpen) {
      fetchTeamMembers();
    }
  }, [isDialogOpen]);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, email, department')
        .eq('is_active', true)
        .neq('id', profile?.id); // Exclude current user

      if (error) {
        console.error('Error fetching team members:', error);
        return;
      }

      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !selectedUser) return;

    setLoading(true);
    
    try {
      // Start transaction
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('assigned_to, created_by')
        .eq('id', leadId)
        .single();

      if (leadError) {
        throw leadError;
      }

      // Update lead assignment
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          assigned_to: selectedUser,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateError) {
        throw updateError;
      }

      // Record the transfer
      const { error: transferError } = await supabase
        .from('lead_transfers')
        .insert([{
          lead_id: leadId,
          from_user_id: leadData.assigned_to || leadData.created_by,
          to_user_id: selectedUser,
          reason: reason || 'Lead transfer',
          transferred_by: profile.id
        }]);

      if (transferError) {
        throw transferError;
      }

      // Create activity record
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          title: 'Lead Transferred',
          description: `Lead "${leadName}" transferred to ${teamMembers.find(m => m.id === selectedUser)?.full_name}. Reason: ${reason || 'No reason provided'}`,
          type: 'note',
          lead_id: leadId,
          created_by: profile.id
        });

      if (activityError) {
        console.error('Error creating activity:', activityError);
      }

      toast({
        title: 'Success',
        description: `Lead transferred successfully to ${teamMembers.find(m => m.id === selectedUser)?.full_name}`,
      });

      setIsDialogOpen(false);
      setSelectedUser('');
      setReason('');
      onTransferSuccess?.();
      
    } catch (error) {
      console.error('Error transferring lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to transfer lead. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCheck className="h-4 w-4" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Lead</DialogTitle>
          <DialogDescription>
            Transfer "{leadName}" to another team member
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Owner</Label>
            <div className="p-2 bg-muted rounded text-sm">
              {currentOwner || 'Not assigned'}
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
            <span>Transfer to</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Select Team Member</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser} required>
              <SelectTrigger>
                <SelectValue placeholder="Choose a team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex flex-col">
                      <span>{member.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {member.role} {member.department && `• ${member.department}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Transfer (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why are you transferring this lead?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedUser || loading}>
              {loading ? 'Transferring...' : 'Transfer Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};