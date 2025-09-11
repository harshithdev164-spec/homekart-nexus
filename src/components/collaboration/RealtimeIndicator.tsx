import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = React.memo(({ channel }) => {
  const { profile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  // Memoize user status to prevent object recreation on every render
  const userStatus = useMemo(() => {
    if (!profile) return null;
    
    return {
      user_id: profile.user_id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      online_at: new Date().toISOString(),
    };
  }, [profile?.user_id, profile?.full_name, profile?.avatar_url]);

  // Memoize presence sync handler to prevent recreation
  const handlePresenceSync = useCallback((roomChannel: any) => {
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
  }, []);

  useEffect(() => {
    if (!profile || !userStatus) return;

    let mounted = true;

    const roomChannel = supabase.channel(`room_${channel}`, {
      config: {
        presence: {
          key: profile.user_id,
        },
      },
    })
      .on('presence', { event: 'sync' }, () => {
        if (!mounted) return;
        handlePresenceSync(roomChannel);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (!mounted) return;
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await roomChannel.track(userStatus);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(roomChannel);
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [channel, profile, userStatus, handlePresenceSync]);

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
});