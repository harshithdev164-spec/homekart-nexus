import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Clock, Users } from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  status: 'logged_in' | 'logged_out';
  login_time?: string;
  session_duration?: string;
}

interface TeamTimeStatusProps {
  className?: string;
}

export const TeamTimeStatus: React.FC<TeamTimeStatusProps> = ({ className }) => {
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamStatus();
    
    // Set up real-time listener for time logs
    const channel = supabase
      .channel('team_time_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs'
        },
        () => {
          fetchTeamStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTeamStatus = async () => {
    try {
      // Get all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, user_id')
        .eq('is_active', true);

      if (!profilesData) return;

      // Get current time logs for each user
      const teamStatus = await Promise.all(
        profilesData.map(async (profile) => {
          const { data: timeLogData } = await supabase
            .from('time_logs')
            .select('*')
            .eq('user_id', profile.user_id)
            .eq('status', 'logged_in')
            .order('created_at', { ascending: false })
            .limit(1);

          const currentLog = timeLogData && timeLogData.length > 0 ? timeLogData[0] : null;
          
          let sessionDuration = '';
          if (currentLog?.login_time) {
            const loginTime = new Date(currentLog.login_time);
            const now = new Date();
            const diff = now.getTime() - loginTime.getTime();
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            sessionDuration = `${hours}h ${minutes}m`;
          }

          return {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            status: currentLog ? 'logged_in' : 'logged_out',
            login_time: currentLog?.login_time,
            session_duration: sessionDuration
          } as TeamMember;
        })
      );

      setTeamMembers(teamStatus);
    } catch (error) {
      console.error('Error fetching team status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const onlineMembers = teamMembers.filter(m => m.status === 'logged_in');
  const offlineMembers = teamMembers.filter(m => m.status === 'logged_out');

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Status
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {onlineMembers.length} online, {offlineMembers.length} offline
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Online Members */}
          {onlineMembers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-2">Online</h4>
              <div className="space-y-2">
                {onlineMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url} alt={member.full_name} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{member.full_name}</div>
                        {member.session_duration && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {member.session_duration}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      Online
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offline Members */}
          {offlineMembers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Offline</h4>
              <div className="space-y-2">
                {offlineMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8 opacity-60">
                          <AvatarImage src={member.avatar_url} alt={member.full_name} />
                          <AvatarFallback className="bg-gray-400 text-white text-xs">
                            {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                      </div>
                      <div className="text-sm font-medium text-gray-600">{member.full_name}</div>
                    </div>
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                      Offline
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};