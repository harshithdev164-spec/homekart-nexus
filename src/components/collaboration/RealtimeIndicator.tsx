import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface RealtimeIndicatorProps {
  channel: string;
}

interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  online_at: string;
}

export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({ channel }) => {
  const { profile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!profile) return;

    const roomChannel = supabase.channel(`room_${channel}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = roomChannel.presenceState();
        const users: PresenceUser[] = [];
        Object.keys(newState).forEach(key => {
          const presences = newState[key];
          if (presences && presences.length > 0) {
            presences.forEach((presence: any) => {
              if (presence && presence.user_id && presence.full_name) {
                users.push(presence as PresenceUser);
              }
            });
          }
        });
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          const userStatus = {
            user_id: profile.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            online_at: new Date().toISOString(),
          };
          await roomChannel.track(userStatus);
        }
      });

    return () => {
      supabase.removeChannel(roomChannel);
      setIsConnected(false);
    };
  }, [channel, profile]);

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
        {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isConnected ? 'Connected' : 'Disconnected'}
      </Badge>
      {onlineUsers.length > 0 && (
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {onlineUsers.length} online
        </Badge>
      )}
    </div>
  );
};