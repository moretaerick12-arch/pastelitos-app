import { createClient } from '@/lib/supabase/client';
import { Product, ProductionBatch } from '@/types/database';

export const productService = {
  async getAll() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    return { data, error };
  },

  async getById(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  async create(productData: Partial<Product>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    return { data, error };
  },

  async update(id: string, productData: Partial<Product>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async addProductionBatch(productId: string, quantity: number) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('production_batches')
      .insert([
        {
          product_id: productId,
          quantity_produced: quantity,
          batch_date: new Date().toISOString().split('T')[0]
        }
      ])
      .select()
      .single();
    return { data, error };
  },

  async getBatches(productId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('production_batches')
      .select('*')
      .eq('product_id', productId)
      .order('batch_date', { ascending: false });
    return { data, error };
  }
};
