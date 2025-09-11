import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePopupNotifications, PopupNotification } from './PopupNotification';

export const EnhancedNotificationCenter: React.FC = () => {
  const { user, profile } = useAuth();
  const {
    notifications,
    closeNotification,
    showSuccess,
    showInfo,
    showWarning,
    showPromotion,
  } = usePopupNotifications();

  useEffect(() => {
    if (!user || !profile) return;

    // Show welcome notification for new users
    const lastLogin = localStorage.getItem('last-login');
    const currentTime = new Date().toISOString();
    
    if (!lastLogin) {
      showSuccess(
        'Welcome to HomeKart CRM! 🎉',
        `Hello ${profile.full_name}, welcome to your dashboard. Get started by exploring your leads and properties.`,
        [
          {
            label: 'Take Tour',
            action: () => {
              // Add tour functionality here
              console.log('Starting app tour...');
            }
          }
        ]
      );
    }
    
    localStorage.setItem('last-login', currentTime);

    // Setup real-time listeners with popup notifications
    const setupEnhancedListeners = () => {
      // Listen for new leads with enhanced notifications
      const leadsChannel = supabase
        .channel('enhanced_leads_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'leads'
          },
          async (payload) => {
            const newLead = payload.new;
            if (newLead.created_by !== profile?.id) {
              // Get creator profile name
              const { data: creatorProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', newLead.created_by)
                .single();

              showInfo(
                '🎯 New Lead Alert',
                `${newLead.name} (${newLead.phone}) has been added by ${creatorProfile?.full_name || 'Unknown User'}`,
                [
                  {
                    label: 'View Lead',
                    action: () => {
                      window.location.href = '/leads';
                    }
                  },
                  {
                    label: 'Assign to Me',
                    action: async () => {
                      await supabase
                        .from('leads')
                        .update({ assigned_to: profile.id })
                        .eq('id', newLead.id);
                      
                      showSuccess('Lead Assigned', `${newLead.name} has been assigned to you!`);
                    },
                    variant: 'outline'
                  }
                ]
              );
            }
          }
        )
        .subscribe();

      // Listen for lead transfers with enhanced notifications
      const transfersChannel = supabase
        .channel('enhanced_transfers_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'lead_transfers'
          },
          async (payload) => {
            const transfer = payload.new;
            
            // Get related data
            const [leadResult, fromProfileResult, toProfileResult] = await Promise.all([
              supabase.from('leads').select('name, phone').eq('id', transfer.lead_id).single(),
              supabase.from('profiles').select('full_name').eq('id', transfer.from_user_id).single(),
              supabase.from('profiles').select('full_name').eq('id', transfer.to_user_id).single()
            ]);

            const leadName = leadResult.data?.name || 'Unknown Lead';
            const fromUser = fromProfileResult.data?.full_name || 'Unknown User';
            const toUser = toProfileResult.data?.full_name || 'Unknown User';

            // Show different notifications based on user involvement
            if (transfer.to_user_id === profile.id) {
              showSuccess(
                '📨 Lead Transfer - You Received',
                `${leadName} has been transferred to you from ${fromUser}`,
                [
                  {
                    label: 'Contact Now',
                    action: () => {
                      window.location.href = `/leads?highlight=${transfer.lead_id}`;
                    }
                  }
                ]
              );
            } else if (transfer.from_user_id === profile.id) {
              showInfo(
                '📤 Lead Transfer - You Sent',
                `${leadName} has been transferred from you to ${toUser}`
              );
            } else {
              showInfo(
                '🔄 Team Lead Transfer',
                `${leadName} transferred from ${fromUser} to ${toUser}`
              );
            }
          }
        )
        .subscribe();

      // Listen for high-value leads (promotional notification)
      const highValueLeadsChannel = supabase
        .channel('high_value_leads_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'leads'
          },
          (payload) => {
            const newLead = payload.new;
            if (newLead.budget_max && newLead.budget_max > 10000000) { // 1 Crore+
              showPromotion(
                '💎 High-Value Lead Alert!',
                `Premium lead ${newLead.name} with budget ₹${(newLead.budget_max / 10000000).toFixed(1)}Cr+ just arrived!`,
                [
                  {
                    label: 'Claim Lead',
                    action: async () => {
                      await supabase
                        .from('leads')
                        .update({ assigned_to: profile.id })
                        .eq('id', newLead.id);
                      
                      showSuccess('Success!', 'High-value lead claimed successfully!');
                    }
                  },
                  {
                    label: 'View Details',
                    action: () => {
                      window.location.href = '/leads';
                    },
                    variant: 'outline'
                  }
                ]
              );
            }
          }
        )
        .subscribe();

      // Listen for team member status changes
      const timeLogsChannel = supabase
        .channel('time_logs_popup_notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'time_logs'
          },
          async (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const timeLog = payload.new;
              
              if (timeLog.user_id !== user?.id) {
                const { data: userProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('user_id', timeLog.user_id)
                  .single();

                const userName = userProfile?.full_name || 'Team Member';
                
                if (timeLog.status === 'logged_in' && payload.eventType === 'INSERT') {
                  showInfo(
                    '🟢 Team Update',
                    `${userName} just logged in and is now available`,
                    [
                      {
                        label: 'Send Message',
                        action: () => {
                          window.location.href = '/messages';
                        },
                        variant: 'outline'
                      }
                    ]
                  );
                } else if (timeLog.status === 'logged_out' && timeLog.logout_time) {
                  showInfo(
                    '🔴 Team Update',
                    `${userName} has logged out`
                  );
                }
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(leadsChannel);
        supabase.removeChannel(transfersChannel);
        supabase.removeChannel(highValueLeadsChannel);
        supabase.removeChannel(timeLogsChannel);
      };
    };

    const cleanup = setupEnhancedListeners();

    // Show daily motivation for morning login
    const hour = new Date().getHours();
    const lastMotivation = localStorage.getItem('last-motivation-date');
    const today = new Date().toDateString();
    
    if (hour >= 9 && hour <= 11 && lastMotivation !== today) {
      setTimeout(() => {
        showPromotion(
          '🌟 Daily Motivation',
          'Great morning! Ready to convert some leads today? Your success starts with the first call!',
          [
            {
              label: 'View My Leads',
              action: () => {
                window.location.href = '/leads';
              }
            },
            {
              label: 'Skip',
              action: () => {},
              variant: 'outline'
            }
          ]
        );
        localStorage.setItem('last-motivation-date', today);
      }, 3000);
    }

    return cleanup;
  }, [user, profile]);

  return (
    <PopupNotification 
      notifications={notifications} 
      onClose={closeNotification}
      position="top-right"
    />
  );
};