import { createClient } from '@/lib/supabase/client';
import { Sale, SaleDetail } from '@/types/database';

export const salesService = {
  async create(saleData: Partial<Sale>, saleDetails: Partial<SaleDetail>[]) {
    const supabase = createClient();
    
    // First create the sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([saleData])
      .select()
      .single();
      
    if (saleError || !sale) {
      return { data: null, error: saleError };
    }
    
    // Then create details
    if (saleDetails.length > 0) {
      const details = saleDetails.map(detail => ({
        ...detail,
        sale_id: sale.id
      }));
      
      const { error: detailsError } = await supabase
        .from('sale_details')
        .insert(details);
        
      if (detailsError) {
        return { data: sale, error: detailsError };
      }
    }
    
    return { data: sale, error: null };
  },

  async getByDailyRoute(dailyRouteId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        clients (name),
        sale_details (
          *,
          products (name)
        )
      `)
      .eq('daily_route_id', dailyRouteId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getByClient(clientId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_details (
          *,
          products (name)
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async voidSale(saleId: string, adminId: string, reason: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('void_sale', {
      p_sale_id: saleId,
      p_admin_id: adminId,
      p_reason: reason
    });
    return { data, error };
  }
};
