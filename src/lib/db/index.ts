import Dexie, { type Table } from 'dexie';

// Define our local database interfaces
export interface LocalClient {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  current_balance: number;
  credit_limit: number;
  visit_order: number;
  visited: boolean;
  lat?: number | null;
  lng?: number | null;
}

export interface LocalInventory {
  product_id: string;
  name: string;
  quantity_dispatched: number;
  price_per_unit: number;
}

export interface LocalSale {
  id: string;
  client_id: string;
  sale_type: 'contado' | 'credito';
  total_amount: number;
  paid_amount: number;
  created_at: string;
  synced: boolean;
  // Sale details nested for easier offline storage
  details: {
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
}

export interface LocalPayment {
  id: string;
  client_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'sale' | 'payment' | 'route';
  payload: any;
  created_at: string;
  status: 'pending' | 'failed';
  error_message?: string;
}

// Subclass Dexie
export class AppDatabase extends Dexie {
  // Declare implicit table properties
  local_clients!: Table<LocalClient, string>;
  local_inventory!: Table<LocalInventory, string>;
  local_sales!: Table<LocalSale, string>;
  local_payments!: Table<LocalPayment, string>;
  sync_queue!: Table<SyncQueueItem, string>;
  meta!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('PastelitosPatriaDB');
    
    // Define tables and indexes
    this.version(1).stores({
      local_clients: 'id, visit_order, visited',
      local_inventory: 'product_id',
      local_sales: 'id, client_id, synced',
      local_payments: 'id, client_id, synced',
      sync_queue: 'id, type, status, created_at',
      meta: 'key'
    });
  }
}

// Export a singleton instance
export const db = new AppDatabase();
