import { createClient } from '@/lib/supabase/client';

export const reconciliationService = {
  async calculate(dailyRouteId: string, deliveredCash: number) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('calculate_daily_reconciliation', {
      p_daily_route_id: dailyRouteId,
      p_delivered_cash: deliveredCash
    });
    return { data, error };
  },

  async getByDailyRoute(dailyRouteId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_reconciliations')
      .select('*')
      .eq('daily_route_id', dailyRouteId)
      .single();
    return { data, error };
  }
};
