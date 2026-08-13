import { createClient } from '@/lib/supabase/client';
import { CashFlow } from '@/types/database';

export const financeService = {
  async getCashFlow(startDate: string, endDate: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cash_flow')
      .select('*')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });
    return { data, error };
  },

  async addEntry(entryData: Partial<CashFlow>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cash_flow')
      .insert([entryData])
      .select()
      .single();
    return { data, error };
  },

  async getAccountsReceivable() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .gt('current_balance', 0)
      .order('current_balance', { ascending: false });
    return { data, error };
  }
};
