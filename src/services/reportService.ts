import { supabase } from '@/integrations/supabase/client';
import {
  ReportConfig,
  ReportData,
  ReportFilter,
  DateRange,
  RevenueData,
  ConversionFunnelData,
  LeadSourceData,
  InventoryData,
  AgentMetricsData,
  CampaignData,
  ActivitySummaryData,
  RevenueTrackingData,
  CommissionData,
  ReportSummary,
  ChartData,
} from '@/types/reports';
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';

// Helper function to safely convert to number
const toNumber = (value: any): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

// Helper function to get date range based on time range
export const getDateRange = (timeRange: string, customRange?: DateRange): DateRange => {
  const now = new Date();
  let start: Date;
  let end: Date = endOfDay(now);

  switch (timeRange) {
    case 'today':
      start = startOfDay(now);
      break;
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      start = startOfMonth(now);
      break;
    case 'quarter':
      start = startOfQuarter(now);
      break;
    case 'year':
      start = startOfYear(now);
      break;
    case 'custom':
      if (customRange) {
        return customRange;
      }
      start = startOfMonth(now);
      break;
    default:
      start = startOfMonth(now);
  }

  return { startDate: startOfDay(start), endDate: end };
};

// Sales Performance Reports

export const getRevenueData = async (filter: ReportFilter): Promise<RevenueData[]> => {
  const dateRange = filter.dateRange || getDateRange(filter.timeRange || 'month');
  
  const { data: leads } = await supabase
    .from('leads')
    .select('status, budget_min, budget_max, created_at')
    .gte('created_at', dateRange.startDate.toISOString())
    .lte('created_at', dateRange.endDate.toISOString());

  if (!leads) return [];

  // Group by period (daily, weekly, monthly based on range)
  const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
  const groupBy = daysDiff <= 7 ? 'day' : daysDiff <= 90 ? 'week' : 'month';

  const grouped = new Map<string, { revenue: number; deals: number }>();

  leads.forEach((lead) => {
    if (lead.status === 'closed_won') {
      const date = new Date(lead.created_at);
      let key: string;

      if (groupBy === 'day') {
        key = format(date, 'yyyy-MM-dd');
      } else if (groupBy === 'week') {
        key = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else {
        key = format(startOfMonth(date), 'yyyy-MM');
      }

      const revenue = (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
      const existing = grouped.get(key) || { revenue: 0, deals: 0 };
      grouped.set(key, {
        revenue: existing.revenue + revenue,
        deals: existing.deals + 1,
      });
    }
  });

  return Array.from(grouped.entries()).map(([period, data]) => ({
    period,
    revenue: data.revenue,
    deals: data.deals,
    averageDealSize: data.deals > 0 ? data.revenue / data.deals : 0,
  }));
};

export const getConversionFunnelData = async (filter: ReportFilter): Promise<ConversionFunnelData[]> => {
  const dateRange = filter.dateRange || getDateRange(filter.timeRange || 'month');
  
  const { data: leads } = await supabase
    .from('leads')
    .select('status, created_at')
    .gte('created_at', dateRange.startDate.toISOString())
    .lte('created_at', dateRange.endDate.toISOString());

  if (!leads) return [];

  const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won'];
  const counts = new Map<string, number>();

  stages.forEach((stage) => {
    counts.set(stage, 0);
  });

  leads.forEach((lead) => {
    const count = counts.get(lead.status) || 0;
    counts.set(lead.status, count + 1);
  });

  const total = leads.length;
  let previousCount = total;

  return stages.map((stage, index) => {
    const count = counts.get(stage) || 0;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const dropOffRate = index > 0 && previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;
    previousCount = count;

    return {
      stage: stage.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      count,
      percentage,
      dropOffRate,
    };
  });
};

// Lead Management Reports

export const getLeadSourceData = async (filter: ReportFilter): Promise<LeadSourceData[]> => {
  const dateRange = filter.dateRange || getDateRange(filter.timeRange || 'month');
  
  const { data: leads } = await supabase
    .from('leads')
    .select('source, status, budget_min, budget_max, created_at')
    .gte('created_at', dateRange.startDate.toISOString())
    .lte('created_at', dateRange.endDate.toISOString());

  if (!leads) return [];

  const sourceMap = new Map<string, { leads: number; converted: number; revenue: number }>();

  leads.forEach((lead) => {
    const source = lead.source || 'Unknown';
    const existing = sourceMap.get(source) || { leads: 0, converted: 0, revenue: 0 };
    
    existing.leads += 1;
    
    if (lead.status === 'closed_won') {
      existing.converted += 1;
      existing.revenue += (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
    }
    
    sourceMap.set(source, existing);
  });

  return Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    leads: data.leads,
    converted: data.converted,
    conversionRate: data.leads > 0 ? (data.converted / data.leads) * 100 : 0,
    revenue: data.revenue,
  }));
};

export const getLeadAgingData = async (filter: ReportFilter): Promise<any[]> => {
  const dateRange = filter.dateRange || getDateRange(filter.timeRange || 'month');
  
  const { data: leads } = await supabase
    .from('leads')
    .select('created_at, status, updated_at')
    .gte('created_at', dateRange.startDate.toISOString())
    .lte('created_at', dateRange.endDate.toISOString())
    .neq('status', 'closed_won')
    .neq('status', 'closed_lost');

  if (!leads) return [];

  const ageRanges = [
    { label: '0-7 days', min: 0, max: 7 },
    { label: '8-15 days', min: 8, max: 15 },
    { label: '16-30 days', min: 16, max: 30 },
    { label: '31-60 days', min: 31, max: 60 },
    { label: '60+ days', min: 61, max: Infinity },
  ];

  const now = new Date();
  const counts = new Map<string, number>();

  ageRanges.forEach((range) => {
    counts.set(range.label, 0);
  });

  leads.forEach((lead) => {
    const age = Math.floor((now.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const range = ageRanges.find((r) => age >= r.min && age <= r.max);
    if (range) {
      const count = counts.get(range.label) || 0;
      counts.set(range.label, count + 1);
    }
  });

  const total = leads.length;

  return ageRanges.map((range) => {
    const count = counts.get(range.label) || 0;
    return {
      ageRange: range.label,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      averageAge: count > 0 ? (range.min + range.max) / 2 : 0,
    };
  });
};

export const getDetailedLeadsData = async (filter: ReportFilter): Promise<any[]> => {
  const dateRange = filter.dateRange || getDateRange(filter.timeRange || 'month');
  
  let query = supabase
    .from('leads')
    .select(`
      id,
      name,
      email,
      phone,
      source,
      status,
      budget_min,
      budget_max,
      preferred_location,
      property_type,
      notes,
      project_name,
      created_at,
      updated_at,
      last_contacted,
      next_followup,
      assigned_to,
      created_by,
      profiles!leads_assigned_to_fkey(id, full_name, email, role),
      created_by_profile:profiles!leads_created_by_fkey(id, full_name, email, role)
    `)
    .gte('created_at', dateRange.startDate.toISOString())
    .lte('created_at', dateRange.endDate.toISOString())
    .order('created_at', { ascending: false });

  // Apply filters
  if (filter.employeeIds && filter.employeeIds.length > 0) {
    query = query.in('assigned_to', filter.employeeIds);
  }

  if (filter.statuses && filter.statuses.length > 0) {
    query = query.in('status', filter.statuses);
  }

  if (filter.leadSources && filter.leadSources.length > 0) {
    query = query.in('source', filter.leadSources);
  }

  const { data: leads } = await query;

  if (!leads) return [];

  // Format leads data for display
  return leads.map((lead: any) => {
    const assignedProfile = lead.profiles || null;
    const createdByProfile = lead.created_by_profile || null;
    const now = new Date();
    const createdDate = new Date(lead.created_at);
    const ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      'Lead ID': lead.id,
      'Name': lead.name || '',
      'Email': lead.email || '',
      'Phone': lead.phone || '',
      'Source': lead.source || 'Unknown',
      'Status': lead.status || 'new',
      'Budget Min': lead.budget_min ? `₹${toNumber(lead.budget_min).toLocaleString()}` : '',
      'Budget Max': lead.budget_max ? `₹${toNumber(lead.budget_max).toLocaleString()}` : '',
      'Budget Range': lead.budget_min || lead.budget_max 
        ? `${lead.budget_min ? `₹${toNumber(lead.budget_min).toLocaleString()}` : ''}${lead.budget_max ? (lead.budget_min ? ' - ' : '') + `₹${toNumber(lead.budget_max).toLocaleString()}` : ''}`
        : 'Not specified',
      'Preferred Location': lead.preferred_location || '',
      'Property Type': lead.property_type || '',
      'Project Name': lead.project_name || '',
      'Assigned To': assignedProfile?.full_name || 'Unassigned',
      'Assigned To Email': assignedProfile?.email || '',
      'Assigned To Role': assignedProfile?.role || '',
      'Created By': createdByProfile?.full_name || 'Unknown',
      'Created By Email': createdByProfile?.email || '',
      'Created At': format(createdDate, 'PPpp'),
      'Last Contacted': lead.last_contacted ? format(new Date(lead.last_contacted), 'PPpp') : 'Never',
      'Next Follow Up': lead.next_followup ? format(new Date(lead.next_followup), 'PPpp') : 'Not scheduled',
      'Age (Days)': ageInDays,
      'Notes': lead.notes || '',
    };
  });
};

// Property Reports

export const getInventoryData = async (filter: ReportFilter): Promise<InventoryData[]> => {
  const { data: properties } = await supabase
    .from('properties')
    .select('status, price, created_at, updated_at');

  if (!properties) return [];

  const statusMap = new Map<string, { count: number; totalValue: number; days: number[] }>();

  const now = new Date();

  properties.forEach((property) => {
    const status = property.status || 'available';
    const existing = statusMap.get(status) || { count: 0, totalValue: 0, days: [] };
    
    existing.count += 1;
    existing.totalValue += toNumber(property.price);
    
    const daysOnMarket = Math.floor(
      (now.getTime() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    existing.days.push(daysOnMarket);
    
    statusMap.set(status, existing);
  });

  return Array.from(statusMap.entries()).map(([status, data]) => ({
    status: status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    count: data.count,
    averageDaysOnMarket: data.days.length > 0 
      ? data.days.reduce((a, b) => a + b, 0) / data.days.length 
      : 0,
    averagePrice: data.count > 0 ? data.totalValue / data.count : 0,
    totalValue: data.totalValue,
  }));
};

// Agent Performance Reports

export const getAgentMetricsData = async (filter: ReportFilter): Promise<AgentMetricsData[]> => {
  const dateRange = filter.dateRange || getDateRange(filter.timeRange || 'month');
  
  // Get reports data
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      *,
      profiles!reports_generated_by_fkey(id, full_name)
    `)
    .eq('report_type', 'team_performance')
    .gte('generated_at', dateRange.startDate.toISOString())
    .lte('generated_at', dateRange.endDate.toISOString());

  if (!reports) return [];

  // Get leads data
  const { data: leads } = await supabase
    .from('leads')
    .select('assigned_to, status, budget_min, budget_max, created_at')
    .gte('created_at', dateRange.startDate.toISOString())
    .lte('created_at', dateRange.endDate.toISOString());

  const agentMap = new Map<string, AgentMetricsData>();

  // Process reports
  reports.forEach((report: any) => {
    const agentId = report.generated_by;
    const agentName = report.profiles?.full_name || 'Unknown';
    const data = report.data || {};

    const existing = agentMap.get(agentId) || {
      agentId,
      agentName,
      calls: 0,
      visits: 0,
      leads: 0,
      deals: 0,
      revenue: 0,
      conversionRate: 0,
      averageDealSize: 0,
    };

    existing.calls += toNumber(data.calls_to_agents);
    existing.visits += toNumber(data.primary_sites_visited) + toNumber(data.client_visit);
    existing.leads += toNumber(data.leads_registered);

    agentMap.set(agentId, existing);
  });

  // Process leads
  if (leads) {
    leads.forEach((lead) => {
      if (lead.assigned_to) {
        const existing = agentMap.get(lead.assigned_to);
        if (existing) {
          if (lead.status === 'closed_won') {
            existing.deals += 1;
            existing.revenue += (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
          }
        }
      }
    });
  }

  // Calculate metrics
  return Array.from(agentMap.values()).map((agent) => ({
    ...agent,
    conversionRate: agent.leads > 0 ? (agent.deals / agent.leads) * 100 : 0,
    averageDealSize: agent.deals > 0 ? agent.revenue / agent.deals : 0,
  }));
};

// Marketing Reports

export const getCampaignData = async (filter: ReportFilter): Promise<CampaignData[]> => {
  const dateRange = filter.dateRange || getDateRange(filter.timeRange || 'month');
  
  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .gte('created_at', dateRange.startDate.toISOString())
    .lte('created_at', dateRange.endDate.toISOString());

  if (!campaigns) return [];

  return campaigns.map((campaign: any) => {
    const metrics = campaign.metrics || {};
    const sent = toNumber(metrics.sent);
    const opened = toNumber(metrics.opened);
    const clicked = toNumber(metrics.clicked);
    const converted = toNumber(metrics.converted);

    return {
      campaignId: campaign.id,
      name: campaign.title,
      type: campaign.campaign_type,
      sent,
      opened,
      clicked,
      converted,
      revenue: 0, // Would need to link to deals
      cost: 0, // Would need cost tracking
      roi: 0, // Calculate from revenue and cost
    };
  });
};

// Activity Reports

export const getActivitySummaryData = async (filter: ReportFilter): Promise<ActivitySummaryData[]> => {
  const dateRange = filter.dateRange || getDateRange(filter.timeRange || 'month');
  
  const { data: activities } = await supabase
    .from('activities')
    .select('type, is_completed, created_at')
    .gte('created_at', dateRange.startDate.toISOString())
    .lte('created_at', dateRange.endDate.toISOString());

  if (!activities) return [];

  const dateMap = new Map<string, ActivitySummaryData>();

  activities.forEach((activity) => {
    const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
    const existing = dateMap.get(date) || {
      date,
      calls: 0,
      visits: 0,
      meetings: 0,
      emails: 0,
      tasks: 0,
      completed: 0,
    };

    switch (activity.type) {
      case 'call':
        existing.calls += 1;
        break;
      case 'property_visit':
        existing.visits += 1;
        break;
      case 'meeting':
        existing.meetings += 1;
        break;
      case 'email':
        existing.emails += 1;
        break;
      case 'task':
        existing.tasks += 1;
        if (activity.is_completed) {
          existing.completed += 1;
        }
        break;
    }

    dateMap.set(date, existing);
  });

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

// Financial Reports

export const getRevenueTrackingData = async (filter: ReportFilter): Promise<RevenueTrackingData[]> => {
  const revenueData = await getRevenueData(filter);
  
  // This would need expense data from a separate table
  // For now, returning revenue data with placeholder expenses
  return revenueData.map((data) => ({
    period: data.period,
    revenue: data.revenue,
    expenses: 0, // Would need expense tracking
    profit: data.revenue,
    margin: 100, // Would calculate from expenses
  }));
};

export const getCommissionData = async (filter: ReportFilter): Promise<CommissionData[]> => {
  const agentMetrics = await getAgentMetricsData(filter);
  
  // Assuming a standard commission rate - would need to be configurable
  const commissionRate = 2.5; // 2.5%

  return agentMetrics.map((agent) => ({
    agentId: agent.agentId,
    agentName: agent.agentName,
    deals: agent.deals,
    revenue: agent.revenue,
    commissionRate,
    commissionAmount: (agent.revenue * commissionRate) / 100,
    paid: 0, // Would need payment tracking
    pending: (agent.revenue * commissionRate) / 100,
  }));
};

// Main report generation function
export const generateReport = async (config: ReportConfig): Promise<ReportData> => {
  let data: any = {};
  let summary: ReportSummary = { totalRecords: 0, metrics: {} };
  let charts: ChartData[] = [];

  try {
    switch (config.type) {
      case 'revenue':
        data = await getRevenueData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalRevenue: data.reduce((sum: number, item: RevenueData) => sum + item.revenue, 0),
            totalDeals: data.reduce((sum: number, item: RevenueData) => sum + item.deals, 0),
          },
        };
        charts = [{
          type: 'line',
          title: 'Revenue Trend',
          data,
          config: { dataKey: 'revenue', xKey: 'period' },
        }];
        break;

      case 'conversion_funnel':
        data = await getConversionFunnelData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalLeads: data[0]?.count || 0,
            converted: data[data.length - 1]?.count || 0,
          },
        };
        charts = [{
          type: 'funnel',
          title: 'Conversion Funnel',
          data,
          config: { dataKey: 'count', nameKey: 'stage' },
        }];
        break;

      case 'lead_lifecycle':
        data = await getLeadAgingData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalLeads: data.reduce((sum: number, item: any) => sum + item.count, 0),
          },
        };
        charts = [{
          type: 'bar',
          title: 'Lead Aging Analysis',
          data,
          config: { dataKey: 'count', xKey: 'ageRange' },
        }];
        break;

      case 'detailed_leads':
        data = await getDetailedLeadsData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalLeads: data.length,
            assignedLeads: data.filter((lead: any) => lead['Assigned To'] !== 'Unassigned').length,
            unassignedLeads: data.filter((lead: any) => lead['Assigned To'] === 'Unassigned').length,
          },
        };
        break;

      case 'lead_source':
        data = await getLeadSourceData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalLeads: data.reduce((sum: number, item: LeadSourceData) => sum + item.leads, 0),
            totalConverted: data.reduce((sum: number, item: LeadSourceData) => sum + item.converted, 0),
          },
        };
        charts = [{
          type: 'bar',
          title: 'Lead Source Performance',
          data,
          config: { dataKey: 'leads', xKey: 'source' },
        }];
        break;

      case 'inventory':
        data = await getInventoryData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalProperties: data.reduce((sum: number, item: InventoryData) => sum + item.count, 0),
          },
        };
        charts = [{
          type: 'pie',
          title: 'Inventory Status',
          data,
          config: { dataKey: 'count', nameKey: 'status' },
        }];
        break;

      case 'agent_metrics':
        data = await getAgentMetricsData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalAgents: data.length,
            totalRevenue: data.reduce((sum: number, item: AgentMetricsData) => sum + item.revenue, 0),
          },
        };
        charts = [{
          type: 'bar',
          title: 'Agent Performance',
          data,
          config: { dataKey: 'revenue', xKey: 'agentName' },
        }];
        break;

      case 'campaign_performance':
        data = await getCampaignData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalCampaigns: data.length,
            totalSent: data.reduce((sum: number, item: CampaignData) => sum + item.sent, 0),
          },
        };
        break;

      case 'activity_summary':
        data = await getActivitySummaryData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalCalls: data.reduce((sum: number, item: ActivitySummaryData) => sum + item.calls, 0),
            totalVisits: data.reduce((sum: number, item: ActivitySummaryData) => sum + item.visits, 0),
          },
        };
        charts = [{
          type: 'line',
          title: 'Activity Trend',
          data,
          config: { dataKey: 'calls', xKey: 'date' },
        }];
        break;

      case 'revenue_tracking':
        data = await getRevenueTrackingData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalRevenue: data.reduce((sum: number, item: RevenueTrackingData) => sum + item.revenue, 0),
            totalProfit: data.reduce((sum: number, item: RevenueTrackingData) => sum + item.profit, 0),
          },
        };
        break;

      case 'commission':
        data = await getCommissionData(config.filters);
        summary = {
          totalRecords: data.length,
          metrics: {
            totalCommission: data.reduce((sum: number, item: CommissionData) => sum + item.commissionAmount, 0),
          },
        };
        break;

      default:
        data = [];
    }
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }

  return {
    id: config.id || `report-${Date.now()}`,
    config,
    data,
    summary,
    charts,
    generatedAt: new Date().toISOString(),
    generatedBy: config.createdBy || '',
  };
};

