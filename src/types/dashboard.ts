// Dashboard Type Definitions

export type WidgetSize = 'small' | 'medium' | 'large';

export type WidgetType =
  | 'revenue_snapshot'
  | 'pipeline_health'
  | 'quick_stats'
  | 'goal_progress'
  | 'lead_pipeline_kanban'
  | 'pipeline_funnel'
  | 'lead_velocity'
  | 'hot_leads'
  | 'lead_source'
  | 'quick_actions'
  | 'activity_feed'
  | 'team_activity'
  | 'activity_heatmap'
  | 'tasks'
  | 'meetings'
  | 'followup_reminders'
  | 'overdue_items'
  | 'activity_calendar'
  | 'revenue_chart'
  | 'commission_tracker'
  | 'expense_summary'
  | 'profitability'
  | 'budget_vs_actual'
  | 'campaign_roi'
  | 'lead_source_roi'
  | 'social_media_metrics'
  | 'email_performance'
  | 'lead_scoring'
  | 'predictive_analytics'
  | 'recommendations'
  | 'anomaly_detection'
  | 'map_view'
  | 'location_heatmap'
  | 'regional_performance'
  | 'period_comparison'
  | 'year_over_year'
  | 'team_benchmarks';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position?: { row: number; col: number };
  visible: boolean;
  refreshInterval?: number;
  filters?: Record<string, any>;
  [key: string]: any;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueSnapshot {
  totalRevenue: number;
  targetRevenue: number;
  progress: number;
  trend: number;
  period: string;
}

export interface PipelineHealth {
  totalPipelineValue: number;
  dealsInProgress: number;
  averageWinProbability: number;
  stages: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
}

export interface QuickStats {
  todayActivities: number;
  pendingFollowUps: number;
  overdueTasks: number;
  upcomingMeetings: number;
}

export interface GoalProgress {
  goalId: string;
  title: string;
  target: number;
  current: number;
  progress: number;
  deadline: string;
  status: 'on_track' | 'at_risk' | 'behind';
}

export interface HotLead {
  id: string;
  name: string;
  score: number;
  status: string;
  assignedTo: string;
  lastContacted: string;
  nextFollowUp: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ActivityItem {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'task' | 'lead_update' | 'property_update';
  title: string;
  description: string;
  user: string;
  timestamp: string;
  metadata?: any;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed';
  leadId?: string;
  propertyId?: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  type: 'meeting' | 'site_visit' | 'call';
  scheduledAt: string;
  leadId?: string;
  propertyId?: string;
  participants: string[];
  location?: string;
}

export interface CommissionData {
  agentId: string;
  agentName: string;
  totalCommission: number;
  paid: number;
  pending: number;
  deals: number;
}

export interface CampaignMetrics {
  campaignId: string;
  name: string;
  type: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  roi: number;
}

export interface LeadScore {
  leadId: string;
  leadName: string;
  score: number;
  factors: Array<{
    factor: string;
    impact: number;
  }>;
  recommendations: string[];
}

export interface PredictiveMetric {
  metric: string;
  current: number;
  predicted: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Anomaly {
  id: string;
  type: 'unusual_activity' | 'performance_drop' | 'data_inconsistency';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: string;
  metadata?: any;
}

export interface MapMarker {
  id: string;
  type: 'lead' | 'property';
  lat: number;
  lng: number;
  title: string;
  data: any;
}

export interface RegionalPerformance {
  region: string;
  leads: number;
  deals: number;
  revenue: number;
  conversionRate: number;
}

export interface ComparisonData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

