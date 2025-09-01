import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Clock } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  last_contacted?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface LeadAssignmentIndicatorProps {
  leads: Lead[];
  onLeadUpdate: (updatedLead: Lead) => void;
}

export const LeadAssignmentIndicator: React.FC<LeadAssignmentIndicatorProps> = ({
  leads,
  onLeadUpdate
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
    fetchCurrentUser();
    
    // Subscribe to real-time lead changes
    const channel = supabase
      .channel('lead-assignments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('Lead updated:', payload);
          onLeadUpdate(payload.new as Lead);
          
          // Show toast notification
          if (payload.new.assigned_to && payload.new.assigned_to !== payload.old.assigned_to) {
            const assignedProfile = profiles.find(p => p.id === payload.new.assigned_to);
            toast({
              title: 'Lead Assigned',
              description: `Lead "${payload.new.name}" assigned to ${assignedProfile?.full_name || 'Unknown'}`
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profiles, onLeadUpdate, toast]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email');
    
    if (data) {
      setProfiles(data);
    }
  };

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

  const assignLeadToMe = async (leadId: string) => {
    if (!currentUser) return;

    const { error } = await supabase
      .from('leads')
      .update({ assigned_to: currentUser.id })
      .eq('id', leadId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign lead',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Lead assigned to you successfully'
      });
    }
  };

  const getProfileName = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile?.full_name || 'Unknown';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lead Assignments</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Real-time updates enabled
        </div>
      </div>

      <div className="space-y-2">
        {leads.map((lead) => {
          const assignedProfile = lead.assigned_to ? profiles.find(p => p.id === lead.assigned_to) : null;
          const isUnassigned = !lead.assigned_to;
          
          return (
            <div
              key={lead.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-sm text-muted-foreground">{lead.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={lead.status === 'new' ? 'default' : 'secondary'}>
                  {lead.status}
                </Badge>

                {isUnassigned ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Unassigned</Badge>
                    <button
                      onClick={() => assignLeadToMe(lead.id)}
                      className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                      Take Lead
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {assignedProfile ? getInitials(assignedProfile.full_name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {assignedProfile?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">Assigned</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};