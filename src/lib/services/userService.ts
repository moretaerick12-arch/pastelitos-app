import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { HISTORICAL_DRIVERS } from '@/lib/data/historicalData';

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
   * Get all user profiles (combines Supabase with historical drivers)
   */
  async getUsers() {
    const supabase = createClient();
    let supabaseUsers: Profile[] = [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        supabaseUsers = data as Profile[];
      }
    } catch {
      // fallback
    }

    // Master Admin
    const ownerAdmin: Profile = {
      id: 'd0000000-0000-0000-0000-000000000000',
      first_name: 'Erick',
      last_name: 'Moreta',
      phone: '809-555-0100',
      role: 'admin',
      salary: 0,
      commission_rate: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Merge without duplicates by first_name or id
    const userMap = new Map<string, Profile>();
    userMap.set(ownerAdmin.id, ownerAdmin);

    HISTORICAL_DRIVERS.forEach((d) => {
      userMap.set(d.id, {
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone,
        role: d.role as UserRole,
        salary: d.salary,
        commission_rate: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    supabaseUsers.forEach((u) => {
      userMap.set(u.id, u);
    });

    return { data: Array.from(userMap.values()), error: null };
  },

  /**
   * Create a new user (Auth + Profile)
   */
  async createUser(userData: CreateUserData) {
    const supabase = createClient();
    const password = userData.password || '123456';

    try {
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

      const userId = authData?.user?.id || `u-${Date.now()}`;

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
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Update an existing profile
   */
  async updateUser(id: string, updates: Partial<Profile>) {
    const supabase = createClient();
    try {
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
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Delete user profile
   */
  async deleteUser(id: string) {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },

  /**
   * Lookup email or profile by username / name
   */
  async resolveEmailFromIdentifier(identifier: string): Promise<string> {
    const trimmed = identifier.trim().toLowerCase();
    
    // Direct mappings for owner & admin
    if (trimmed === 'moretaerick' || trimmed === 'moretaerick12' || trimmed === 'erick' || trimmed === 'admin') {
      return 'moretaerick12@gmail.com';
    }

    // Driver mappings from Excel
    if (trimmed === 'joelito' || trimmed === 'juelito' || trimmed === 'joel') {
      return 'joelito@pastelitos.com';
    }
    if (trimmed === 'nene') {
      return 'nene@pastelitos.com';
    }
    if (trimmed === 'meloso') {
      return 'meloso@pastelitos.com';
    }
    if (trimmed === 'laly') {
      return 'laly@pastelitos.com';
    }

    if (trimmed.includes('@')) {
      return trimmed;
    }

    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${trimmed}%,phone.eq.${trimmed}`)
        .limit(1);

      if (data && data.length > 0) {
        const user = data[0];
        const sanitized = (user.first_name || trimmed).toLowerCase().replace(/\s+/g, '');
        return `${sanitized}@pastelitos.com`;
      }
    } catch {
      // fallback
    }

    return `${trimmed}@pastelitos.com`;
  }
};
