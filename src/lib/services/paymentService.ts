import { createClient } from '@/lib/supabase/client';
import { Payment } from '@/types/database';

export const paymentService = {
  async create(paymentData: Partial<Payment>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();
    return { data, error };
  },

  async getByClient(clientId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', clientId)
      .order('payment_date', { ascending: false });
    return { data, error };
  },

  async getByRepartidor(repartidorId: string, date: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        clients (name)
      `)
      .eq('repartidor_id', repartidorId)
      .eq('payment_date', date)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async voidPayment(paymentId: string, adminId: string, reason: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('void_payment', {
      p_payment_id: paymentId,
      p_admin_id: adminId,
      p_reason: reason
    });
    return { data, error };
  }
};
