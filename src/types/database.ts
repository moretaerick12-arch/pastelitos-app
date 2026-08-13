export type UserRole = 'admin' | 'repartidor';
export type ClientStatus = 'activo' | 'inactivo';
export type RouteStatus = 'pendiente' | 'en_curso' | 'completada' | 'cancelada';
export type SaleType = 'contado' | 'credito';
export type ReturnReason = 'mal_estado' | 'caducado' | 'no_solicitado' | 'otro';
export type ReconciliationStatus = 'pendiente' | 'cuadrado' | 'con_diferencia';
export type TransactionType = 'ingreso' | 'egreso';
export type AssetStatus = 'en_almacen' | 'prestado' | 'en_reparacion' | 'perdido';
export type SaleVoidStatus = 'activa' | 'anulada';
export type PaymentVoidStatus = 'activo' | 'anulado';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  salary: number | null;
  commission_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_person: string | null;
  address: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  credit_limit: number;
  current_balance: number;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price_per_unit: number;
  cost_per_unit: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionBatch {
  id: string;
  product_id: string;
  batch_date: string;
  quantity_produced: number;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  name: string;
  zone: string | null;
  is_seed: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteClient {
  id: string;
  route_id: string;
  client_id: string;
  visit_order: number;
  created_at: string;
  updated_at: string;
}

export interface DailyRoute {
  id: string;
  route_id: string;
  repartidor_id: string;
  route_date: string;
  status: RouteStatus;
  created_at: string;
  updated_at: string;
}

export interface DailyRouteInventory {
  id: string;
  daily_route_id: string;
  product_id: string;
  quantity_dispatched: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  client_id: string;
  daily_route_id: string;
  repartidor_id: string;
  sale_type: SaleType;
  total_amount: number;
  paid_amount: number;
  status: SaleVoidStatus;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleDetail {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

export interface Return {
  id: string;
  daily_route_id: string;
  client_id: string;
  product_id: string;
  quantity: number;
  reason: ReturnReason;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  client_id: string;
  repartidor_id: string | null;
  amount: number;
  payment_date: string;
  status: PaymentVoidStatus;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReconciliation {
  id: string;
  daily_route_id: string;
  expected_cash: number;
  delivered_cash: number;
  difference: number;
  status: ReconciliationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashFlow {
  id: string;
  transaction_type: TransactionType;
  amount: number;
  description: string;
  reference_id: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  repartidor_id: string;
  daily_route_id: string | null;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  name: string;
  asset_type: string;
  status: AssetStatus;
  current_client_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id: string;
  table_name: string;
  operation: string;
  record_id: string;
  payload: any;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      clients: {
        Row: Client;
        Insert: Partial<Client>;
        Update: Partial<Client>;
      };
      products: {
        Row: Product;
        Insert: Partial<Product>;
        Update: Partial<Product>;
      };
      production_batches: {
        Row: ProductionBatch;
        Insert: Partial<ProductionBatch>;
        Update: Partial<ProductionBatch>;
      };
      routes: {
        Row: Route;
        Insert: Partial<Route>;
        Update: Partial<Route>;
      };
      route_clients: {
        Row: RouteClient;
        Insert: Partial<RouteClient>;
        Update: Partial<RouteClient>;
      };
      daily_routes: {
        Row: DailyRoute;
        Insert: Partial<DailyRoute>;
        Update: Partial<DailyRoute>;
      };
      daily_route_inventory: {
        Row: DailyRouteInventory;
        Insert: Partial<DailyRouteInventory>;
        Update: Partial<DailyRouteInventory>;
      };
      sales: {
        Row: Sale;
        Insert: Partial<Sale>;
        Update: Partial<Sale>;
      };
      sale_details: {
        Row: SaleDetail;
        Insert: Partial<SaleDetail>;
        Update: Partial<SaleDetail>;
      };
      returns: {
        Row: Return;
        Insert: Partial<Return>;
        Update: Partial<Return>;
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment>;
        Update: Partial<Payment>;
      };
      daily_reconciliations: {
        Row: DailyReconciliation;
        Insert: Partial<DailyReconciliation>;
        Update: Partial<DailyReconciliation>;
      };
      cash_flow: {
        Row: CashFlow;
        Insert: Partial<CashFlow>;
        Update: Partial<CashFlow>;
      };
      commissions: {
        Row: Commission;
        Insert: Partial<Commission>;
        Update: Partial<Commission>;
      };
      assets: {
        Row: Asset;
        Insert: Partial<Asset>;
        Update: Partial<Asset>;
      };
      sync_queue: {
        Row: SyncQueueItem;
        Insert: Partial<SyncQueueItem>;
        Update: Partial<SyncQueueItem>;
      };
    };
  };
}
