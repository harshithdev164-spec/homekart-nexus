// Report Type Definitions

export type ReportCategory = 
  | 'sales_performance'
  | 'lead_management'
  | 'property'
  | 'agent_performance'
  | 'marketing'
  | 'activity'
  | 'financial'
  | 'custom';

export type ReportType =
  | 'revenue'
  | 'conversion_funnel'
  | 'win_loss'
  | 'deal_analysis'
  | 'lead_source'
  | 'lead_lifecycle'
  | 'detailed_leads'
  | 'followup_compliance'
  | 'inventory'
  | 'property_performance'
  | 'geographic'
  | 'agent_metrics'
  | 'team_comparison'
  | 'campaign_performance'
  | 'marketing_attribution'
  | 'activity_summary'
  | 'communication'
  | 'revenue_tracking'
  | 'commission'
  | 'profitability';

export type ChartType = 
  | 'bar'
  | 'line'
  | 'pie'
  | 'area'
  | 'funnel'
  | 'radar'
  | 'scatter'
  | 'table'
  | 'map';

export type ExportFormat = 'excel' | 'pdf' | 'csv' | 'json';

export type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ReportFilter {
  dateRange?: DateRange;
  timeRange?: TimeRange;
  employeeIds?: string[];
  teamIds?: string[];
  propertyTypes?: string[];
  leadSources?: string[];
  statuses?: string[];
  locations?: string[];
  [key: string]: any;
}

export interface ReportConfig {
  id?: string;
  name: string;
  category: ReportCategory;
  type: ReportType;
  filters: ReportFilter;
  fields: string[];
  grouping?: string[];
  sorting?: { field: string; direction: 'asc' | 'desc' }[];
  chartType?: ChartType;
  isPublic?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportData {
  id: string;
  config: ReportConfig;
  data: any;
  summary?: ReportSummary;
  charts?: ChartData[];
  generatedAt: string;
  generatedBy: string;
}

export interface ReportSummary {
  totalRecords: number;
  metrics: { [key: string]: number | string };
  insights?: string[];
}

export interface ChartData {
  type: ChartType;
  title: string;
  data: any[];
  config?: any;
}

// Sales Performance Types
export interface RevenueData {
  period: string;
  revenue: number;
  deals: number;
  averageDealSize: number;
  target?: number;
  variance?: number;
}

export interface ConversionFunnelData {
  stage: string;
  count: number;
  percentage: number;
  dropOffRate?: number;
}

export interface WinLossData {
  won: number;
  lost: number;
  winRate: number;
  averageDealSize: number;
  totalValue: number;
}

// Lead Management Types
export interface LeadSourceData {
  source: string;
  leads: number;
  converted: number;
  conversionRate: number;
  revenue: number;
  costPerLead?: number;
  roi?: number;
}

export interface LeadAgingData {
  ageRange: string;
  count: number;
  percentage: number;
  averageAge: number;
}

// Property Types
export interface InventoryData {
  status: string;
  count: number;
  averageDaysOnMarket: number;
  averagePrice: number;
  totalValue: number;
}

export interface PropertyPerformanceData {
  propertyId: string;
  title: string;
  views: number;
  inquiries: number;
  visits: number;
  deals: number;
  conversionRate: number;
}

// Agent Performance Types
export interface AgentMetricsData {
  agentId: string;
  agentName: string;
  calls: number;
  visits: number;
  leads: number;
  deals: number;
  revenue: number;
  conversionRate: number;
  averageDealSize: number;
  goal?: number;
  achievement?: number;
}

// Marketing Types
export interface CampaignData {
  campaignId: string;
  name: string;
  type: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  cost: number;
  roi: number;
}

// Activity Types
export interface ActivitySummaryData {
  date: string;
  calls: number;
  visits: number;
  meetings: number;
  emails: number;
  tasks: number;
  completed: number;
}

// Financial Types
export interface RevenueTrackingData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
}

export interface CommissionData {
  agentId: string;
  agentName: string;
  deals: number;
  revenue: number;
  commissionRate: number;
  commissionAmount: number;
  paid: number;
  pending: number;
}

// Report Template
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: ReportCategory;
  type: ReportType;
  config: Partial<ReportConfig>;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Scheduled Report
export interface ScheduledReport {
  id: string;
  reportConfig: ReportConfig;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    timezone?: string;
  };
  recipients: string[];
  format: ExportFormat;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Report Favorite
export interface ReportFavorite {
  id: string;
  userId: string;
  reportConfig: ReportConfig;
  createdAt: string;
}

// Report Share
export interface ReportShare {
  id: string;
  reportId: string;
  sharedWith: string;
  permission: 'view' | 'edit';
  createdAt: string;
  createdBy: string;
}

