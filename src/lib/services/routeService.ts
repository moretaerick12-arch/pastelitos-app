import { createClient } from '@/lib/supabase/client';
import { Route } from '@/types/database';

export const routeService = {
  async getAll() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('routes')
      .select(`
        *,
        route_clients (count)
      `)
      .order('name');
    return { data, error };
  },

  async getById(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('routes')
      .select(`
        *,
        route_clients (
          id,
          visit_order,
          clients (*)
        )
      `)
      .eq('id', id)
      .single();
      
    if (data && data.route_clients) {
      data.route_clients.sort((a: any, b: any) => a.visit_order - b.visit_order);
    }
    
    return { data, error };
  },

  async create(routeData: Partial<Route>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('routes')
      .insert([routeData])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, routeData: Partial<Route>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('routes')
      .update(routeData)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async addClient(routeId: string, clientId: string, visitOrder: number) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('route_clients')
      .insert([
        { route_id: routeId, client_id: clientId, visit_order: visitOrder }
      ])
      .select()
      .single();
    return { data, error };
  },

  async removeClient(routeId: string, clientId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('route_clients')
      .delete()
      .eq('route_id', routeId)
      .eq('client_id', clientId);
    return { data, error };
  },

  async reorderClients(routeId: string, clientOrders: { clientId: string, visitOrder: number }[]) {
    const supabase = createClient();
    const updates = clientOrders.map(({ clientId, visitOrder }) => ({
      route_id: routeId,
      client_id: clientId,
      visit_order: visitOrder
    }));
    
    // Simplest approach using upsert
    const { data, error } = await supabase
      .from('route_clients')
      .upsert(updates, { onConflict: 'route_id,client_id' })
      .select();
      
    return { data, error };
  }
};
