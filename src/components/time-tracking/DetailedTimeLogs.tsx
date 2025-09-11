import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Clock, Calendar, Download, User, LogIn, LogOut } from 'lucide-react';
import { format, isToday, isYesterday, startOfDay, endOfDay, subDays } from 'date-fns';

interface DetailedTimeLog {
  id: string;
  user_id: string;
  login_time: string | null;
  logout_time: string | null;
  status: 'logged_in' | 'logged_out';
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  };
}

interface DetailedTimeLogsProps {
  className?: string;
}

export const DetailedTimeLogs: React.FC<DetailedTimeLogsProps> = ({ className }) => {
  const { profile } = useAuth();
  const [timeLogs, setTimeLogs] = useState<DetailedTimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Only show to admin and manager roles
  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return null;
  }

  useEffect(() => {
    fetchTimeLogs();
    
    // Set up real-time listener
    const channel = supabase
      .channel('detailed_time_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs'
        },
        () => {
          fetchTimeLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const fetchTimeLogs = async () => {
    try {
      const startDate = startOfDay(selectedDate);
      const endDate = endOfDay(selectedDate);

      // First get all time logs for the date range
      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (timeLogsError) throw timeLogsError;

      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, user_id');

      if (profilesError) throw profilesError;

      // Combine the data
      const transformedData = (timeLogsData || []).map(log => {
        const profile = (profilesData || []).find(p => p.user_id === log.user_id);
        return {
          ...log,
          profile: profile || null
        };
      }).filter(log => log.profile) as DetailedTimeLog[];

      setTimeLogs(transformedData);
    } catch (error) {
      console.error('Error fetching detailed time logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (loginTime: string | null, logoutTime: string | null) => {
    if (!loginTime) return 'N/A';
    
    const login = new Date(loginTime);
    const logout = logoutTime ? new Date(logoutTime) : new Date();
    const diff = logout.getTime() - login.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    return format(new Date(timestamp), 'h:mm:ss a');
  };

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const getStatusColor = (status: string, logoutTime: string | null) => {
    if (status === 'logged_in' && !logoutTime) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status: string, logoutTime: string | null) => {
    if (status === 'logged_in' && !logoutTime) {
      return 'Online';
    }
    return 'Completed';
  };

  const exportToCSV = () => {
    const csvData = timeLogs.map(log => ({
      'Employee Name': log.profile?.full_name || 'Unknown',
      'Role': log.profile?.role || 'N/A',
      'Login Time': log.login_time ? format(new Date(log.login_time), 'yyyy-MM-dd h:mm:ss a') : 'N/A',
      'Logout Time': log.logout_time ? format(new Date(log.logout_time), 'yyyy-MM-dd h:mm:ss a') : 'Still Online',
      'Duration': calculateDuration(log.login_time, log.logout_time),
      'Status': getStatusText(log.status, log.logout_time)
    }));

    const csvString = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `time-logs-${format(selectedDate, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Logs - Admin View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group logs by user
  const groupedLogs = timeLogs.reduce((acc, log) => {
    const userId = log.user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(log);
    return acc;
  }, {} as Record<string, DetailedTimeLog[]>);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Team Time Logs - {formatDateHeader(selectedDate)}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
              Previous Day
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              disabled={isToday(selectedDate)}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
              disabled={isToday(selectedDate)}
            >
              Next Day
            </Button>
            {timeLogs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {timeLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No time logs found for {formatDateHeader(selectedDate)}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLogs).map(([userId, userLogs]) => {
              const profile = userLogs[0]?.profile;
              if (!profile) return null;

              return (
                <div key={userId} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{profile.full_name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{profile.role}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {userLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <LogIn className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Login:</span>
                            <span>{formatTime(log.login_time)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <LogOut className="h-4 w-4 text-red-600" />
                            <span className="font-medium">Logout:</span>
                            <span>{formatTime(log.logout_time)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Duration:</span>
                            <span>{calculateDuration(log.login_time, log.logout_time)}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(log.status, log.logout_time)}>
                          {getStatusText(log.status, log.logout_time)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};