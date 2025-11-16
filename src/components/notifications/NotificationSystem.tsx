import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Bell, User, UserCheck, UserPlus } from 'lucide-react';

interface NotificationSystemProps {
  className?: string;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ className }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfiles();
      setupRealtimeListeners();
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, user_id');
      
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const getProfileName = (userId: string) => {
    const profileData = profiles.find(p => p.user_id === userId);
    return profileData?.full_name || 'Unknown User';
  };

  const getProfileNameById = (profileId: string) => {
    const profileData = profiles.find(p => p.id === profileId);
    return profileData?.full_name || 'Unknown User';
  };

  const setupRealtimeListeners = () => {
    // Listen for new leads
    const leadsChannel = supabase
      .channel('notification_leads_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          const newLead = payload.new;
          if (newLead.created_by !== profile?.id) {
            toast({
              title: "🎯 New Lead Added",
              description: `${newLead.name} has been added by ${getProfileNameById(newLead.created_by)}`,
            });
          }
        }
      )
      .subscribe();

    // Listen for lead transfers
    const transfersChannel = supabase
      .channel('notification_transfers_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_transfers'
        },
        async (payload) => {
          const transfer = payload.new;
          
          // Fetch lead name
          const { data: leadData } = await supabase
            .from('leads')
            .select('name')
            .eq('id', transfer.lead_id)
            .single();

          const leadName = leadData?.name || 'Unknown Lead';
          
          toast({
            title: "🔄 Lead Transfer",
            description: `${leadName} transferred from ${getProfileNameById(transfer.from_user_id)} to ${getProfileNameById(transfer.to_user_id)}`,
          });
        }
      )
      .subscribe();

    // Listen for lead assignments (updates where assigned_to changes)
    const assignmentsChannel = supabase
      .channel('notification_assignments_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads'
        },
        async (payload) => {
          const oldLead = payload.old;
          const newLead = payload.new;
          
          // Check if assignment changed
          if (oldLead.assigned_to !== newLead.assigned_to && newLead.assigned_to) {
            toast({
              title: "👤 Lead Assignment",
              description: `${newLead.name} has been assigned to ${getProfileNameById(newLead.assigned_to)}`,
            });
            
            // Email is sent automatically by database trigger
            // This is a backup call for cases where trigger might not fire
            // (e.g., if http extension is not available)
            try {
              await supabase.functions.invoke("send-lead-assignment-email", {
                body: {
                  leadId: newLead.id,
                  assignedToId: newLead.assigned_to,
                  isTransfer: oldLead.assigned_to !== null,
                },
              });
            } catch (emailError) {
              // Silently fail - trigger should handle it, or email already sent
              console.log("Backup email notification attempted:", emailError);
            }
          }
        }
      )
      .subscribe();

    // Listen for new activities
    const activitiesChannel = supabase
      .channel('notification_activities_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities'
        },
        (payload) => {
          const activity = payload.new;
          if (activity.created_by !== profile?.id) {
            toast({
              title: "📋 New Activity",
              description: `${activity.title} - ${getProfileNameById(activity.created_by)}`,
            });
          }
        }
      )
      .subscribe();

    // Listen for time tracking updates (login/logout)
    const timeTrackingChannel = supabase
      .channel('notification_time_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const timeLog = payload.new;
            
            // Only show notifications for other users, not yourself
            if (timeLog.user_id !== user?.id) {
              const userName = getProfileName(timeLog.user_id);
              
              if (timeLog.status === 'logged_in' && payload.eventType === 'INSERT') {
                toast({
                  title: "🟢 Team Member Online",
                  description: `${userName} has logged in`,
                });
              } else if (timeLog.status === 'logged_out' && timeLog.logout_time) {
                toast({
                  title: "🔴 Team Member Offline",
                  description: `${userName} has logged out`,
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(transfersChannel);
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(timeTrackingChannel);
    };
  };

  return null; // This component only manages notifications, no UI
};