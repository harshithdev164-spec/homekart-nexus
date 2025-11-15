import { supabase } from '@/integrations/supabase/client';
import {
  RevenueSnapshot,
  PipelineHealth,
  QuickStats,
  GoalProgress,
  HotLead,
  ActivityItem,
  TaskItem,
  MeetingItem,
  CommissionData,
  CampaignMetrics,
  LeadScore,
  PredictiveMetric,
  Anomaly,
  MapMarker,
  RegionalPerformance,
  ComparisonData,
} from '@/types/dashboard';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays, isToday, isPast } from 'date-fns';

// Helper function to safely convert to number
const toNumber = (value: any): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

// Executive Summary Data

export const getRevenueSnapshot = async (timeRange: string, employeeId?: string): Promise<RevenueSnapshot> => {
  const now = new Date();
  let start: Date;
  let end: Date = endOfDay(now);

  switch (timeRange) {
    case 'today':
      start = startOfDay(now);
      break;
    case 'week':
      start = startOfWeek(now);
      break;
    case 'month':
      start = startOfMonth(now);
      break;
    default:
      start = startOfMonth(now);
  }

  let query = supabase
    .from('leads')
    .select('status, budget_min, budget_max, created_at')
    .eq('status', 'closed_won')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (employeeId) {
    query = query.eq('assigned_to', employeeId);
  }

  const { data: leads } = await query;

  const totalRevenue = leads?.reduce((sum, lead) => {
    const avgBudget = (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
    return sum + avgBudget;
  }, 0) || 0;

  // Get previous period for trend calculation
  const prevStart = new Date(start);
  const prevEnd = new Date(end);
  const periodDiff = end.getTime() - start.getTime();
  prevStart.setTime(prevStart.getTime() - periodDiff);
  prevEnd.setTime(prevEnd.getTime() - periodDiff);

  const { data: prevLeads } = await supabase
    .from('leads')
    .select('status, budget_min, budget_max')
    .eq('status', 'closed_won')
    .gte('created_at', prevStart.toISOString())
    .lte('created_at', prevEnd.toISOString());

  const prevRevenue = prevLeads?.reduce((sum, lead) => {
    const avgBudget = (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
    return sum + avgBudget;
  }, 0) || 0;

  const trend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const targetRevenue = totalRevenue * 1.2; // 20% above current as target
  const progress = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;

  return {
    totalRevenue,
    targetRevenue,
    progress,
    trend,
    period: timeRange,
  };
};

export const getPipelineHealth = async (employeeId?: string): Promise<PipelineHealth> => {
  let query = supabase
    .from('leads')
    .select('status, budget_min, budget_max')
    .neq('status', 'closed_won')
    .neq('status', 'closed_lost');

  if (employeeId) {
    query = query.eq('assigned_to', employeeId);
  }

  const { data: leads } = await query;

  const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'];
  const stageData = stages.map((stage) => {
    const stageLeads = leads?.filter((lead) => lead.status === stage) || [];
    const count = stageLeads.length;
    const value = stageLeads.reduce((sum, lead) => {
      const avgBudget = (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
      return sum + avgBudget;
    }, 0);

    return { stage, count, value };
  });

  const totalPipelineValue = stageData.reduce((sum, stage) => sum + stage.value, 0);
  const dealsInProgress = leads?.length || 0;
  const averageWinProbability = 35; // Would need historical data to calculate accurately

  return {
    totalPipelineValue,
    dealsInProgress,
    averageWinProbability,
    stages: stageData,
  };
};

export const getQuickStats = async (employeeId?: string): Promise<QuickStats> => {
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // Today's activities
  let activitiesQuery = supabase
    .from('activities')
    .select('id')
    .gte('created_at', today.toISOString())
    .lte('created_at', todayEnd.toISOString());

  if (employeeId) {
    activitiesQuery = activitiesQuery.eq('created_by', employeeId);
  }

  const { data: activities } = await activitiesQuery;
  const todayActivities = activities?.length || 0;

  // Pending follow-ups
  let followUpsQuery = supabase
    .from('leads')
    .select('id, next_followup')
    .not('next_followup', 'is', null)
    .lte('next_followup', todayEnd.toISOString());

  if (employeeId) {
    followUpsQuery = followUpsQuery.eq('assigned_to', employeeId);
  }

  const { data: followUps } = await followUpsQuery;
  const pendingFollowUps = followUps?.filter((lead) => {
    if (!lead.next_followup) return false;
    const followUpDate = new Date(lead.next_followup);
    return followUpDate <= todayEnd && followUpDate >= today;
  }).length || 0;

  // Overdue tasks
  let tasksQuery = supabase
    .from('tasks')
    .select('id, due_date, is_completed')
    .eq('is_completed', false)
    .lte('due_date', today.toISOString().split('T')[0]);

  if (employeeId) {
    tasksQuery = tasksQuery.eq('assigned_to', employeeId);
  }

  const { data: tasks } = await tasksQuery;
  const overdueTasks = tasks?.length || 0;

  // Upcoming meetings (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  let meetingsQuery = supabase
    .from('visit_schedules')
    .select('id, scheduled_at')
    .gte('scheduled_at', today.toISOString())
    .lte('scheduled_at', nextWeek.toISOString());

  if (employeeId) {
    meetingsQuery = meetingsQuery.eq('assigned_to', employeeId);
  }

  const { data: meetings } = await meetingsQuery;
  const upcomingMeetings = meetings?.length || 0;

  return {
    todayActivities,
    pendingFollowUps,
    overdueTasks,
    upcomingMeetings,
  };
};

export const getHotLeads = async (limit: number = 10, employeeId?: string): Promise<HotLead[]> => {
  let query = supabase
    .from('leads')
    .select(`
      id,
      name,
      status,
      assigned_to,
      last_contacted,
      next_followup,
      created_at,
      budget_min,
      budget_max,
      profiles!leads_assigned_to_fkey(full_name)
    `)
    .neq('status', 'closed_won')
    .neq('status', 'closed_lost')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (employeeId) {
    query = query.eq('assigned_to', employeeId);
  }

  const { data: leads } = await query;

  if (!leads) return [];

  return leads.map((lead: any) => {
    // Calculate lead score based on various factors
    let score = 50; // Base score
    const budget = (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
    if (budget > 5000000) score += 20;
    else if (budget > 2000000) score += 10;

    const daysSinceCreation = Math.floor(
      (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation < 7) score += 15;
    else if (daysSinceCreation < 14) score += 5;

    if (lead.last_contacted) {
      const daysSinceContact = Math.floor(
        (new Date().getTime() - new Date(lead.last_contacted).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceContact < 3) score += 15;
    }

    const priority: 'high' | 'medium' | 'low' = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';

    return {
      id: lead.id,
      name: lead.name,
      score: Math.min(100, score),
      status: lead.status,
      assignedTo: lead.profiles?.full_name || 'Unassigned',
      lastContacted: lead.last_contacted || 'Never',
      nextFollowUp: lead.next_followup || 'Not scheduled',
      priority,
    };
  }).sort((a, b) => b.score - a.score);
};

export const getActivityFeed = async (limit: number = 20, employeeId?: string): Promise<ActivityItem[]> => {
  const activities: ActivityItem[] = [];

  // Get recent activities
  let activitiesQuery = supabase
    .from('activities')
    .select(`
      id,
      type,
      title,
      description,
      created_at,
      created_by,
      lead_id,
      property_id,
      profiles!activities_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (employeeId) {
    activitiesQuery = activitiesQuery.eq('created_by', employeeId);
  }

  const { data: activityData } = await activitiesQuery;

  activityData?.forEach((activity: any) => {
    activities.push({
      id: activity.id,
      type: activity.type as any,
      title: activity.title,
      description: activity.description || '',
      user: activity.profiles?.full_name || 'Unknown',
      timestamp: activity.created_at,
      metadata: {
        leadId: activity.lead_id,
        propertyId: activity.property_id,
      },
    });
  });

  // Get recent lead updates
  let leadsQuery = supabase
    .from('leads')
    .select(`
      id,
      name,
      status,
      updated_at,
      assigned_to,
      profiles!leads_assigned_to_fkey(full_name)
    `)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (employeeId) {
    leadsQuery = leadsQuery.eq('assigned_to', employeeId);
  }

  const { data: leads } = await leadsQuery;

  leads?.forEach((lead: any) => {
    activities.push({
      id: `lead-${lead.id}`,
      type: 'lead_update',
      title: `Lead updated: ${lead.name}`,
      description: `Status changed to ${lead.status}`,
      user: lead.profiles?.full_name || 'System',
      timestamp: lead.updated_at,
      metadata: { leadId: lead.id },
    });
  });

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
};

export const getTodayTasks = async (employeeId?: string): Promise<TaskItem[]> => {
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  let query = supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      priority,
      due_date,
      assigned_to,
      is_completed,
      lead_id,
      property_id,
      profiles!tasks_assigned_to_fkey(full_name)
    `)
    .eq('is_completed', false)
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', todayEnd.toISOString().split('T')[0])
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true });

  if (employeeId) {
    query = query.eq('assigned_to', employeeId);
  }

  const { data: tasks } = await query;

  if (!tasks) return [];

  return tasks.map((task: any) => ({
    id: task.id,
    title: task.title,
    description: task.description || '',
    priority: task.priority as 'low' | 'medium' | 'high',
    dueDate: task.due_date,
    assignedTo: task.profiles?.full_name || 'Unknown',
    status: task.is_completed ? 'completed' : 'pending',
    leadId: task.lead_id,
    propertyId: task.property_id,
  }));
};

export const getUpcomingMeetings = async (days: number = 7, employeeId?: string): Promise<MeetingItem[]> => {
  const today = startOfDay(new Date());
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  let query = supabase
    .from('visit_schedules')
    .select(`
      id,
      title,
      scheduled_at,
      visit_type,
      lead_id,
      property_id,
      assigned_to,
      location,
      profiles!visit_schedules_assigned_to_fkey(full_name)
    `)
    .gte('scheduled_at', today.toISOString())
    .lte('scheduled_at', futureDate.toISOString())
    .order('scheduled_at', { ascending: true });

  if (employeeId) {
    query = query.eq('assigned_to', employeeId);
  }

  const { data: meetings } = await query;

  if (!meetings) return [];

  return meetings.map((meeting: any) => ({
    id: meeting.id,
    title: meeting.title || 'Scheduled Visit',
    type: meeting.visit_type === 'site_visit' ? 'site_visit' : 'meeting',
    scheduledAt: meeting.scheduled_at,
    leadId: meeting.lead_id,
    propertyId: meeting.property_id,
    participants: [meeting.profiles?.full_name || 'Unknown'],
    location: meeting.location || '',
  }));
};

export const getFollowUpReminders = async (employeeId?: string): Promise<any[]> => {
  const today = endOfDay(new Date());
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  let query = supabase
    .from('leads')
    .select(`
      id,
      name,
      next_followup,
      status,
      assigned_to,
      profiles!leads_assigned_to_fkey(full_name)
    `)
    .not('next_followup', 'is', null)
    .gte('next_followup', new Date().toISOString())
    .lte('next_followup', nextWeek.toISOString())
    .order('next_followup', { ascending: true });

  if (employeeId) {
    query = query.eq('assigned_to', employeeId);
  }

  const { data: leads } = await query;

  if (!leads) return [];

  return leads.map((lead: any) => ({
    id: lead.id,
    name: lead.name,
    nextFollowUp: lead.next_followup,
    status: lead.status,
    assignedTo: lead.profiles?.full_name || 'Unassigned',
    isOverdue: new Date(lead.next_followup) < new Date(),
  }));
};

export const getOverdueItems = async (employeeId?: string): Promise<{ tasks: TaskItem[]; followUps: any[] }> => {
  const today = startOfDay(new Date());

  // Overdue tasks
  let tasksQuery = supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      priority,
      due_date,
      assigned_to,
      is_completed,
      profiles!tasks_assigned_to_fkey(full_name)
    `)
    .eq('is_completed', false)
    .lt('due_date', today.toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  if (employeeId) {
    tasksQuery = tasksQuery.eq('assigned_to', employeeId);
  }

  const { data: tasks } = await tasksQuery;

  // Overdue follow-ups
  let followUpsQuery = supabase
    .from('leads')
    .select(`
      id,
      name,
      next_followup,
      status,
      assigned_to,
      profiles!leads_assigned_to_fkey(full_name)
    `)
    .not('next_followup', 'is', null)
    .lt('next_followup', today.toISOString())
    .order('next_followup', { ascending: true });

  if (employeeId) {
    followUpsQuery = followUpsQuery.eq('assigned_to', employeeId);
  }

  const { data: followUps } = await followUpsQuery;

  return {
    tasks: (tasks || []).map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      priority: task.priority as 'low' | 'medium' | 'high',
      dueDate: task.due_date,
      assignedTo: task.profiles?.full_name || 'Unknown',
      status: 'pending',
    })),
    followUps: (followUps || []).map((lead: any) => ({
      id: lead.id,
      name: lead.name,
      nextFollowUp: lead.next_followup,
      status: lead.status,
      assignedTo: lead.profiles?.full_name || 'Unassigned',
    })),
  };
};

export const getCommissionData = async (timeRange: string, employeeId?: string): Promise<CommissionData[]> => {
  const now = new Date();
  let start: Date;

  switch (timeRange) {
    case 'today':
      start = startOfDay(now);
      break;
    case 'week':
      start = startOfWeek(now);
      break;
    case 'month':
      start = startOfMonth(now);
      break;
    default:
      start = startOfMonth(now);
  }

  // Get closed deals
  let query = supabase
    .from('leads')
    .select(`
      id,
      assigned_to,
      budget_min,
      budget_max,
      status,
      profiles!leads_assigned_to_fkey(id, full_name)
    `)
    .eq('status', 'closed_won')
    .gte('created_at', start.toISOString());

  if (employeeId) {
    query = query.eq('assigned_to', employeeId);
  }

  const { data: leads } = await query;

  if (!leads) return [];

  const agentMap = new Map<string, CommissionData>();
  const commissionRate = 2.5; // 2.5%

  leads.forEach((lead: any) => {
    if (!lead.assigned_to) return;

    const agentId = lead.assigned_to;
    const agentName = lead.profiles?.full_name || 'Unknown';
    const revenue = (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
    const commission = (revenue * commissionRate) / 100;

    const existing = agentMap.get(agentId) || {
      agentId,
      agentName,
      totalCommission: 0,
      paid: 0,
      pending: commission,
      deals: 0,
    };

    existing.totalCommission += commission;
    existing.pending += commission;
    existing.deals += 1;

    agentMap.set(agentId, existing);
  });

  return Array.from(agentMap.values());
};

export const getCampaignMetrics = async (timeRange: string): Promise<CampaignMetrics[]> => {
  const now = new Date();
  let start: Date;

  switch (timeRange) {
    case 'today':
      start = startOfDay(now);
      break;
    case 'week':
      start = startOfWeek(now);
      break;
    case 'month':
      start = startOfMonth(now);
      break;
    default:
      start = startOfMonth(now);
  }

  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: false });

  if (!campaigns) return [];

  return campaigns.map((campaign: any) => {
    const metrics = campaign.metrics || {};
    const sent = toNumber(metrics.sent);
    const opened = toNumber(metrics.opened);
    const clicked = toNumber(metrics.clicked);
    const converted = toNumber(metrics.converted);
    const cost = toNumber(metrics.cost) || 0;
    const revenue = toNumber(metrics.revenue) || 0;
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

    return {
      campaignId: campaign.id,
      name: campaign.title,
      type: campaign.campaign_type,
      sent,
      opened,
      clicked,
      converted,
      roi,
    };
  });
};

export const getPeriodComparison = async (
  metric: 'revenue' | 'leads' | 'deals' | 'activities',
  timeRange: string,
  employeeId?: string
): Promise<ComparisonData> => {
  const now = new Date();
  let start: Date;
  let end: Date = endOfDay(now);

  switch (timeRange) {
    case 'today':
      start = startOfDay(now);
      break;
    case 'week':
      start = startOfWeek(now);
      break;
    case 'month':
      start = startOfMonth(now);
      break;
    default:
      start = startOfMonth(now);
  }

  // Get current period data
  let current = 0;

  if (metric === 'revenue') {
    let query = supabase
      .from('leads')
      .select('status, budget_min, budget_max')
      .eq('status', 'closed_won')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (employeeId) {
      query = query.eq('assigned_to', employeeId);
    }

    const { data: leads } = await query;
    current = leads?.reduce((sum, lead) => {
      return sum + (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
    }, 0) || 0;
  } else if (metric === 'leads') {
    let query = supabase.from('leads').select('id').gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    if (employeeId) {
      query = query.eq('assigned_to', employeeId);
    }
    const { data: leads } = await query;
    current = leads?.length || 0;
  } else if (metric === 'deals') {
    let query = supabase
      .from('leads')
      .select('id')
      .eq('status', 'closed_won')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    if (employeeId) {
      query = query.eq('assigned_to', employeeId);
    }
    const { data: deals } = await query;
    current = deals?.length || 0;
  } else if (metric === 'activities') {
    let query = supabase.from('activities').select('id').gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    if (employeeId) {
      query = query.eq('created_by', employeeId);
    }
    const { data: activities } = await query;
    current = activities?.length || 0;
  }

  // Get previous period data
  const periodDiff = end.getTime() - start.getTime();
  const prevStart = new Date(start);
  const prevEnd = new Date(end);
  prevStart.setTime(prevStart.getTime() - periodDiff);
  prevEnd.setTime(prevEnd.getTime() - periodDiff);

  let previous = 0;

  if (metric === 'revenue') {
    let query = supabase
      .from('leads')
      .select('status, budget_min, budget_max')
      .eq('status', 'closed_won')
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString());
    if (employeeId) {
      query = query.eq('assigned_to', employeeId);
    }
    const { data: leads } = await query;
    previous = leads?.reduce((sum, lead) => {
      return sum + (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
    }, 0) || 0;
  } else if (metric === 'leads') {
    let query = supabase.from('leads').select('id').gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString());
    if (employeeId) {
      query = query.eq('assigned_to', employeeId);
    }
    const { data: leads } = await query;
    previous = leads?.length || 0;
  } else if (metric === 'deals') {
    let query = supabase
      .from('leads')
      .select('id')
      .eq('status', 'closed_won')
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString());
    if (employeeId) {
      query = query.eq('assigned_to', employeeId);
    }
    const { data: deals } = await query;
    previous = deals?.length || 0;
  } else if (metric === 'activities') {
    let query = supabase.from('activities').select('id').gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString());
    if (employeeId) {
      query = query.eq('created_by', employeeId);
    }
    const { data: activities } = await query;
    previous = activities?.length || 0;
  }

  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : (current > 0 ? 100 : 0);
  const trend: 'up' | 'down' | 'stable' = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';

  return {
    current,
    previous,
    change,
    changePercent,
    trend,
  };
};

