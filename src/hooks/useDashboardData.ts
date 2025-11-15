import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getRevenueSnapshot,
  getPipelineHealth,
  getQuickStats,
  getHotLeads,
  getActivityFeed,
  getTodayTasks,
  getUpcomingMeetings,
  getFollowUpReminders,
  getOverdueItems,
  getCommissionData,
  getCampaignMetrics,
  getPeriodComparison,
} from '@/services/dashboardService';

interface UseDashboardDataOptions {
  timeRange?: string;
  employeeId?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export const useDashboardData = (options: UseDashboardDataOptions = {}) => {
  const { timeRange = 'month', employeeId, enabled = true, refetchInterval } = options;
  const queryClient = useQueryClient();

  // Revenue Snapshot
  const revenueSnapshot = useQuery({
    queryKey: ['dashboard', 'revenue-snapshot', timeRange, employeeId],
    queryFn: () => getRevenueSnapshot(timeRange, employeeId),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval,
  });

  // Pipeline Health
  const pipelineHealth = useQuery({
    queryKey: ['dashboard', 'pipeline-health', employeeId],
    queryFn: () => getPipelineHealth(employeeId),
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchInterval,
  });

  // Quick Stats
  const quickStats = useQuery({
    queryKey: ['dashboard', 'quick-stats', employeeId],
    queryFn: () => getQuickStats(employeeId),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: refetchInterval || 60000, // Refresh every minute
  });

  // Hot Leads
  const hotLeads = useQuery({
    queryKey: ['dashboard', 'hot-leads', employeeId],
    queryFn: () => getHotLeads(10, employeeId),
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchInterval,
  });

  // Activity Feed
  const activityFeed = useQuery({
    queryKey: ['dashboard', 'activity-feed', employeeId],
    queryFn: () => getActivityFeed(20, employeeId),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: refetchInterval || 30000, // Refresh every 30 seconds
  });

  // Today's Tasks
  const todayTasks = useQuery({
    queryKey: ['dashboard', 'today-tasks', employeeId],
    queryFn: () => getTodayTasks(employeeId),
    enabled,
    staleTime: 1 * 60 * 1000,
    refetchInterval,
  });

  // Upcoming Meetings
  const upcomingMeetings = useQuery({
    queryKey: ['dashboard', 'upcoming-meetings', employeeId],
    queryFn: () => getUpcomingMeetings(7, employeeId),
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchInterval,
  });

  // Follow-up Reminders
  const followUpReminders = useQuery({
    queryKey: ['dashboard', 'followup-reminders', employeeId],
    queryFn: () => getFollowUpReminders(employeeId),
    enabled,
    staleTime: 1 * 60 * 1000,
    refetchInterval,
  });

  // Overdue Items
  const overdueItems = useQuery({
    queryKey: ['dashboard', 'overdue-items', employeeId],
    queryFn: () => getOverdueItems(employeeId),
    enabled,
    staleTime: 1 * 60 * 1000,
    refetchInterval,
  });

  // Commission Data
  const commissionData = useQuery({
    queryKey: ['dashboard', 'commission', timeRange, employeeId],
    queryFn: () => getCommissionData(timeRange, employeeId),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval,
  });

  // Campaign Metrics
  const campaignMetrics = useQuery({
    queryKey: ['dashboard', 'campaign-metrics', timeRange],
    queryFn: () => getCampaignMetrics(timeRange),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval,
  });

  // Period Comparison
  const getComparison = useCallback(
    (metric: 'revenue' | 'leads' | 'deals' | 'activities') => {
      return useQuery({
        queryKey: ['dashboard', 'comparison', metric, timeRange, employeeId],
        queryFn: () => getPeriodComparison(metric, timeRange, employeeId),
        enabled,
        staleTime: 5 * 60 * 1000,
        refetchInterval,
      });
    },
    [timeRange, employeeId, enabled, refetchInterval]
  );

  // Refresh all data
  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  return {
    revenueSnapshot,
    pipelineHealth,
    quickStats,
    hotLeads,
    activityFeed,
    todayTasks,
    upcomingMeetings,
    followUpReminders,
    overdueItems,
    commissionData,
    campaignMetrics,
    getComparison,
    refreshAll,
  };
};

