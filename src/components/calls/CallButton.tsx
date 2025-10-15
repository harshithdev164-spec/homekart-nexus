import React, { useState } from 'react';
import { Phone, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CallButtonProps {
  phoneNumber: string;
  leadId?: string;
  agentId?: string;
  name?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  className?: string;
}

export const CallButton: React.FC<CallButtonProps> = ({
  phoneNumber,
  leadId,
  agentId,
  name,
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [callStatus, setCallStatus] = useState<string>('completed');
  const [duration, setDuration] = useState<string>('');

  const handleCall = () => {
    // Open phone dialer
    window.open(`tel:${phoneNumber}`, '_self');
    
    // Show log dialog after initiating call
    setTimeout(() => {
      setShowLogDialog(true);
    }, 1000);
  };

  const handleLogCall = async () => {
    if (!profile) return;

    try {
      const durationSeconds = duration ? parseInt(duration) * 60 : null;

      const { error } = await supabase.from('call_logs').insert({
        lead_id: leadId || null,
        agent_id: agentId || null,
        called_by: profile.id,
        phone_number: phoneNumber,
        call_type: 'outgoing',
        call_status: callStatus,
        duration: durationSeconds,
        notes: notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Call logged successfully',
        description: `Call to ${name || phoneNumber} has been recorded.`,
      });

      setShowLogDialog(false);
      setNotes('');
      setCallStatus('completed');
      setDuration('');
    } catch (error) {
      console.error('Error logging call:', error);
      toast({
        title: 'Error',
        description: 'Failed to log call. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleCall}
        className={className}
      >
        {showIcon && <Phone className="h-4 w-4 mr-2" />}
        Call
      </Button>

      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Call</DialogTitle>
            <DialogDescription>
              Record details about your call with {name || phoneNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="call-status">Call Status</Label>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger id="call-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <input
                id="duration"
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Optional"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about the call..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLogDialog(false)}
              className="w-full sm:w-auto"
            >
              Skip
            </Button>
            <Button onClick={handleLogCall} className="w-full sm:w-auto">
              <PhoneCall className="h-4 w-4 mr-2" />
              Save Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
