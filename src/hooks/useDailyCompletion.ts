import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface PendingTask {
  label: string;
  /** route the user should go to in order to complete this task */
  href: string;
  actionLabel: string;
}

/**
 * Returns the list of end-of-day tasks a user still has to complete before
 * they're allowed to log out:
 *   1. Submit today's daily report
 *   2. Update every data-calling record assigned to them for today
 *
 * Returns an empty array when nothing is pending (or on error, to avoid
 * trapping the user if a check fails).
 */
export async function getPendingDailyTasks(profileId: string): Promise<PendingTask[]> {
  const pending: PendingTask[] = [];
  const today = format(new Date(), 'yyyy-MM-dd');

  try {
    // 1. Daily report submitted for today?
    const { data: reports, error: reportError } = await supabase
      .from('reports')
      .select('id')
      .eq('generated_by', profileId)
      .eq('report_type', 'team_performance')
      .eq('filters->>report_date', today)
      .limit(1);

    if (!reportError && (!reports || reports.length === 0)) {
      pending.push({
        label: 'Submit your daily report',
        href: '/reports',
        actionLabel: 'Go to Reports',
      });
    }

    // 2. All of today's assigned data-calling records updated?
    const { data: batches } = await (supabase as any)
      .from('call_data_batches')
      .select('id')
      .eq('assigned_to', profileId)
      .eq('call_date', today);

    const batchIds = (batches || []).map((b: any) => b.id);
    if (batchIds.length > 0) {
      const { count } = await (supabase as any)
        .from('call_data_records')
        .select('id', { count: 'exact', head: true })
        .in('batch_id', batchIds)
        .eq('status', 'pending');

      if ((count ?? 0) > 0) {
        pending.push({
          label: `Update ${count} pending calling record${count === 1 ? '' : 's'}`,
          href: '/data-calling',
          actionLabel: 'Go to Data Calling',
        });
      }
    }
  } catch (err) {
    console.error('Error checking daily completion:', err);
    return [];
  }

  return pending;
}
