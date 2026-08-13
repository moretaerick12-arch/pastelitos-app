import { createClient } from '@/lib/supabase/client';
import { Client } from '@/types/database';

export const clientService = {
  async getAll() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    return { data, error };
  },

  async getById(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async create(clientData: Partial<Client>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, clientData: Partial<Client>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .update({ status: 'inactivo' })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }
};
