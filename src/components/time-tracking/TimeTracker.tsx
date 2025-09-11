import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, LogIn, LogOut, Timer } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TimeLog {
  id: string;
  user_id: string;
  login_time: string | null;
  logout_time: string | null;
  status: 'logged_in' | 'logged_out';
  created_at: string;
  updated_at: string;
}

interface TimeTrackerProps {
  className?: string;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({ className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStatus, setCurrentStatus] = useState<'logged_in' | 'logged_out'>('logged_out');
  const [currentSession, setCurrentSession] = useState<TimeLog | null>(null);
  const [sessionTime, setSessionTime] = useState<string>('00:00:00');

  useEffect(() => {
    if (user) {
      checkCurrentStatus();
    }
  }, [user]);

  // Update session time every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentStatus === 'logged_in' && currentSession?.login_time) {
      interval = setInterval(() => {
        const loginTime = new Date(currentSession.login_time!);
        const now = new Date();
        const diff = now.getTime() - loginTime.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setSessionTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentStatus, currentSession]);

  const checkCurrentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'logged_in')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentStatus('logged_in');
        setCurrentSession(data[0] as TimeLog);
      } else {
        setCurrentStatus('logged_out');
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Error checking time log status:', error);
    }
  };

  const handleLoginTime = async () => {
    try {
      // First, close any existing open sessions
      await supabase
        .from('time_logs')
        .update({
          logout_time: new Date().toISOString(),
          status: 'logged_out'
        })
        .eq('user_id', user!.id)
        .eq('status', 'logged_in');

      // Create new login session
        const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: user!.id,
          login_time: new Date().toISOString(),
          status: 'logged_in'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentStatus('logged_in');
      setCurrentSession(data as TimeLog);
      
      toast({
        title: "Logged In",
        description: "Time tracking started successfully",
      });
    } catch (error) {
      console.error('Error logging in time:', error);
      toast({
        title: "Error",
        description: "Failed to log in time",
        variant: "destructive",
      });
    }
  };

  const handleLogoutTime = async () => {
    try {
      if (currentSession) {
        const { error } = await supabase
          .from('time_logs')
          .update({
            logout_time: new Date().toISOString(),
            status: 'logged_out'
          })
          .eq('id', currentSession.id);

        if (error) throw error;

        setCurrentStatus('logged_out');
        setCurrentSession(null);
        setSessionTime('00:00:00');
        
        toast({
          title: "Logged Out",
          description: "Time tracking stopped successfully",
        });
      }
    } catch (error) {
      console.error('Error logging out time:', error);
      toast({
        title: "Error",
        description: "Failed to log out time",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {currentStatus === 'logged_in' ? (
        <>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Timer className="h-3 w-3 mr-1" />
            {sessionTime}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogoutTime}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Log Out
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoginTime}
          className="text-green-600 hover:text-green-700"
        >
          <LogIn className="h-4 w-4 mr-1" />
          Log In
        </Button>
      )}
    </div>
  );
};