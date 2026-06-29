import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ClipboardList, Send, CalendarDays, User, Loader2 } from 'lucide-react';

interface DailyPlan {
  id: string;
  profile_id: string;
  plan_date: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string; role?: string } | null;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

const DailyPlanner: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin';

  // My plan editor
  const [content, setContent] = useState('');
  const [todaysPlan, setTodaysPlan] = useState<DailyPlan | null>(null);
  const [myHistory, setMyHistory] = useState<DailyPlan[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);
  const [loadingMine, setLoadingMine] = useState(true);

  // Admin team view
  const [teamDate, setTeamDate] = useState(today());
  const [teamPlans, setTeamPlans] = useState<DailyPlan[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const fetchMine = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingMine(true);
    const { data } = await (supabase as any)
      .from('daily_plans')
      .select('*')
      .eq('profile_id', profile.id)
      .order('plan_date', { ascending: false })
      .limit(30);

    const plans = (data || []) as DailyPlan[];
    setMyHistory(plans);
    const t = plans.find((p) => p.plan_date === today()) || null;
    setTodaysPlan(t);
    setContent(t?.content || '');
    setLoadingMine(false);
  }, [profile?.id]);

  const fetchTeam = useCallback(async () => {
    setLoadingTeam(true);
    const { data, error } = await (supabase as any)
      .from('daily_plans')
      .select('*, profile:profiles!daily_plans_profile_id_fkey(full_name, role)')
      .eq('plan_date', teamDate)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching team plans:', error);
      toast({ title: 'Error', description: 'Failed to load team plans', variant: 'destructive' });
    } else {
      setTeamPlans((data || []) as DailyPlan[]);
    }
    setLoadingTeam(false);
  }, [teamDate, toast]);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  useEffect(() => {
    if (isAdmin) fetchTeam();
  }, [isAdmin, fetchTeam]);

  const submitPlan = async () => {
    if (!profile?.id) return;
    if (!content.trim()) {
      toast({ title: 'Empty plan', description: 'Write your plan before submitting', variant: 'destructive' });
      return;
    }
    setSavingPlan(true);
    const { error } = await (supabase as any)
      .from('daily_plans')
      .upsert(
        { profile_id: profile.id, plan_date: today(), content: content.trim() },
        { onConflict: 'profile_id,plan_date' }
      );
    setSavingPlan(false);

    if (error) {
      console.error('Error saving plan:', error);
      toast({ title: 'Error', description: 'Failed to submit plan', variant: 'destructive' });
    } else {
      toast({ title: 'Submitted', description: "Today's plan saved" });
      fetchMine();
    }
  };

  const myPlanView = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Today's Plan — {format(new Date(), 'dd MMM yyyy')}
          </CardTitle>
          <CardDescription>
            {todaysPlan ? 'You already submitted today — edit and resubmit to update it.' : 'Share what you plan to accomplish today.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingMine ? (
            <div className="flex items-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...</div>
          ) : (
            <>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"e.g.\n- Follow up with 10 site-visit leads\n- Call assigned data list\n- Close pending negotiation with Mr. Sharma"}
                rows={6}
              />
              <div className="flex items-center gap-2">
                <Button onClick={submitPlan} disabled={savingPlan}>
                  {savingPlan ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {todaysPlan ? 'Update Plan' : 'Submit Plan'}
                </Button>
                {todaysPlan && <Badge variant="secondary">Submitted</Badge>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Recent Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {myHistory.filter((p) => p.plan_date !== today()).length === 0 ? (
            <p className="text-sm text-muted-foreground">No earlier plans yet.</p>
          ) : (
            <div className="space-y-3">
              {myHistory.filter((p) => p.plan_date !== today()).map((p) => (
                <div key={p.id} className="border-l-2 border-primary pl-3">
                  <p className="text-xs text-muted-foreground mb-1">{format(new Date(p.plan_date), 'EEE, dd MMM yyyy')}</p>
                  <p className="text-sm whitespace-pre-wrap">{p.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const teamView = (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={teamDate} onChange={(e) => setTeamDate(e.target.value)} className="w-44" />
          <Badge variant="secondary">{teamPlans.length} submitted</Badge>
        </CardContent>
      </Card>

      {loadingTeam ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
      ) : teamPlans.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No plans submitted for this date.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamPlans.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {p.profile?.full_name || 'Unknown'}
                  {p.profile?.role && <Badge variant="outline" className="ml-1">{p.profile.role}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{p.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Daily Planner</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'Submit your plan and review what the team is planning each day.' : 'Send your daily plan so your manager can see what you’re working on.'}
        </p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="team" className="w-full">
          <TabsList>
            <TabsTrigger value="team">Team Plans</TabsTrigger>
            <TabsTrigger value="mine">My Plan</TabsTrigger>
          </TabsList>
          <TabsContent value="team" className="pt-2">{teamView}</TabsContent>
          <TabsContent value="mine" className="pt-2">{myPlanView}</TabsContent>
        </Tabs>
      ) : (
        myPlanView
      )}
    </div>
  );
};

export default DailyPlanner;
