import { createClient } from '@/lib/supabase/client';
import { RouteStatus } from '@/types/database';

export const dailyRouteService = {
  async createDailyRoute(routeId: string, repartidorId: string, date: string, inventory: { productId: string, quantity: number }[]) {
    const supabase = createClient();
    
    // First create daily route
    const { data: dailyRoute, error: dailyRouteError } = await supabase
      .from('daily_routes')
      .insert([{
        route_id: routeId,
        repartidor_id: repartidorId,
        route_date: date,
        status: 'pendiente'
      }])
      .select()
      .single();
      
    if (dailyRouteError || !dailyRoute) {
      return { data: null, error: dailyRouteError };
    }
    
    // Then dispatch inventory
    if (inventory.length > 0) {
      const inventoryData = inventory.map(item => ({
        daily_route_id: dailyRoute.id,
        product_id: item.productId,
        quantity_dispatched: item.quantity
      }));
      
      const { error: inventoryError } = await supabase
        .from('daily_route_inventory')
        .insert(inventoryData);
        
      if (inventoryError) {
        return { data: dailyRoute, error: inventoryError };
      }
    }
    
    return { data: dailyRoute, error: null };
  },

  async getByDate(date: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_routes')
      .select(`
        *,
        routes (name),
        profiles:repartidor_id (first_name, last_name)
      `)
      .eq('route_date', date);
    return { data, error };
  },

  async getByRepartidor(repartidorId: string, date: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_routes')
      .select(`
        *,
        routes (*),
        daily_route_inventory (
          *,
          products (*)
        )
      `)
      .eq('repartidor_id', repartidorId)
      .eq('route_date', date)
      .single();
    return { data, error };
  },

  async updateStatus(id: string, status: RouteStatus) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_routes')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }
};
