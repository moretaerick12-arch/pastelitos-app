import { Client, DailyRoute, DailyRouteInventory, Product, RouteClient, Sale, SaleDetail } from './database';

export interface DailyRouteWithDetails extends DailyRoute {
  clients: (RouteClient & { client: Client })[];
  inventory: (DailyRouteInventory & { product: Product })[];
}

export interface SaleWithDetails extends Sale {
  items: (SaleDetail & { product: Product })[];
}

export interface ClientWithBalance extends Client {
  credit_info?: {
    limit: number;
    available: number;
  };
}

export interface RouteSettlement {
  daily_route_id: string;
  total_sales: number;
  cash_sales: number;
  credit_sales: number;
  payments_collected: number;
  expected_cash: number;
  actual_cash?: number;
  difference?: number;
}

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
