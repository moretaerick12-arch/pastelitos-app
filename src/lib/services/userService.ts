import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';

export interface CreateUserData {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  salary?: number;
  commission_rate?: number | null;
}

export const userService = {
  /**
   * Get all user profiles
   */
  async getUsers() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: (data as Profile[]) || [], error };
  },

  /**
   * Create a new user (Auth + Profile)
   */
  async createUser(userData: CreateUserData) {
    const supabase = createClient();
    
    // Default password if not provided
    const password = userData.password || 'Patria2026*';

    // 1. Sign up user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
        }
      }
    });

    if (authError) {
      // If error is user already registered, or other error, return it
      return { data: null, error: authError };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { data: null, error: new Error('No se pudo obtener el ID del usuario creado') };
    }

    // 2. Insert into profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        first_name: userData.first_name.trim(),
        last_name: userData.last_name.trim(),
        phone: userData.phone?.trim() || null,
        role: userData.role,
        salary: userData.salary || 0,
        commission_rate: userData.commission_rate || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return { data: profileData, error: profileError };
  },

  /**
   * Update an existing profile
   */
  async updateUser(id: string, updates: Partial<Profile>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  /**
   * Delete user profile
   */
  async deleteUser(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    return { error };
  },

  /**
   * Lookup email or profile by username / name
   */
  async resolveEmailFromIdentifier(identifier: string): Promise<string> {
    const trimmed = identifier.trim().toLowerCase();
    
    // If it's already an email, return as is
    if (trimmed.includes('@')) {
      return trimmed;
    }

    try {
      const supabase = createClient();
      // Search profile by first_name or phone
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${trimmed}%,phone.eq.${trimmed}`)
        .limit(1);

      if (data && data.length > 0) {
        // If we have a matching name like 'nene' or 'joelito' or 'erick',
        // check standard company pattern or return default mapped email
        const user = data[0];
        const sanitized = (user.first_name || trimmed).toLowerCase().replace(/\s+/g, '');
        return `${sanitized}@pastelitos.com`;
      }
    } catch {
      // fallback
    }

    // Fallback: construct standard company email
    return `${trimmed}@pastelitos.com`;
  }
};
