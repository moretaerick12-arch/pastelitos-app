import { db } from '../db';
import { createClient } from '../supabase/client';
import { v4 as uuidv4 } from 'uuid';

export class SyncManager {
  private static isSyncing = false;
  private static supabase = createClient();

  static async sync() {
    if (this.isSyncing) return;
    if (!navigator.onLine) return;

    this.isSyncing = true;
    try {
      const pendingItems = await db.sync_queue
        .where('status')
        .equals('pending')
        .toArray();

      for (const item of pendingItems) {
        try {
          if (item.type === 'sale') {
            await this.syncSale(item.payload);
          } else if (item.type === 'payment') {
            await this.syncPayment(item.payload);
          } else if (item.type === 'route') {
            await this.syncRoute(item.payload);
          }

          // Mark as successfully synced by deleting from queue
          await db.sync_queue.delete(item.id);
          
          // Also update the local_sales or local_payments to mark as synced
          if (item.type === 'sale') {
            await db.local_sales.update(item.payload.id, { synced: true });
          } else if (item.type === 'payment') {
            await db.local_payments.update(item.payload.id, { synced: true });
          }
          
        } catch (error: any) {
          console.error(`Failed to sync item ${item.id}:`, error);
          // Update status to failed, but we can try again later
          await db.sync_queue.update(item.id, { 
            status: 'failed', 
            error_message: error.message || 'Unknown error' 
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private static async syncSale(payload: any) {
    const { details, ...saleData } = payload;
    
    // Insert sale
    const { error: saleError } = await this.supabase
      .from('sales')
      .insert(saleData);

    if (saleError) throw saleError;

    // Insert details
    if (details && details.length > 0) {
      const { error: detailsError } = await this.supabase
        .from('sale_details')
        .insert(details);
        
      if (detailsError) throw detailsError;
    }
    
    // Record into global sync_queue table for audit purposes
    await this.supabase.from('sync_queue').insert({
        table_name: 'sales',
        operation: 'INSERT',
        record_id: saleData.id,
        payload: payload,
        status: 'completed'
    });
  }

  private static async syncPayment(payload: any) {
    const { error } = await this.supabase
      .from('payments')
      .insert(payload);

    if (error) throw error;
    
    // Record into global sync_queue table for audit purposes
    await this.supabase.from('sync_queue').insert({
        table_name: 'payments',
        operation: 'INSERT',
        record_id: payload.id,
        payload: payload,
        status: 'completed'
    });
  }

  // Helper to enqueue a new sale
  static async enqueueSale(salePayload: any) {
    await db.local_sales.add(salePayload);
    await db.sync_queue.add({
      id: uuidv4(),
      type: 'sale',
      payload: salePayload,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    // Trigger sync immediately if online
    if (navigator.onLine) {
      this.sync();
    }
  }

  // Helper to enqueue a new payment
  static async enqueuePayment(paymentPayload: any) {
    await db.local_payments.add(paymentPayload);
    await db.sync_queue.add({
      id: uuidv4(),
      type: 'payment',
      payload: paymentPayload,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    // Trigger sync immediately if online
    if (navigator.onLine) {
      this.sync();
    }
  }

  private static async syncRoute(payload: any) {
    const { route, route_clients, daily_route, new_clients } = payload;
    
    // Insert any newly created clients first
    if (new_clients && new_clients.length > 0) {
      const { error: clientsError } = await this.supabase
        .from('clients')
        .insert(new_clients);
      if (clientsError) throw clientsError;
    }

    // Insert route
    const { error: routeError } = await this.supabase
      .from('routes')
      .insert(route);
    if (routeError) throw routeError;

    // Insert route_clients
    if (route_clients && route_clients.length > 0) {
      const { error: rcError } = await this.supabase
        .from('route_clients')
        .insert(route_clients);
      if (rcError) throw rcError;
    }

    // Insert daily_route
    if (daily_route) {
      const { error: drError } = await this.supabase
        .from('daily_routes')
        .insert(daily_route);
      if (drError) throw drError;
    }

    // Record into global sync_queue table
    await this.supabase.from('sync_queue').insert({
        table_name: 'routes',
        operation: 'INSERT',
        record_id: route.id,
        payload: payload,
        status: 'completed'
    });
  }

  static async enqueueRouteCreation(routePayload: any) {
    const { route, route_clients, daily_route, new_clients } = routePayload;

    // Populate local db so they can see their newly created route immediately
    if (new_clients && new_clients.length > 0) {
      const clientsToInsert = new_clients.map((c: any, idx: number) => ({
        id: c.id,
        name: c.name,
        address: c.address,
        phone: null,
        current_balance: 0,
        credit_limit: 0,
        visit_order: idx + 1,
        visited: false
      }));
      await db.local_clients.bulkAdd(clientsToInsert);
    }
    
    // Save metadata
    await db.meta.put({ key: 'current_route_id', value: daily_route.id });
    await db.meta.put({ key: 'repartidor_id', value: daily_route.repartidor_id });

    // Enqueue for sync
    await db.sync_queue.add({
      id: uuidv4(),
      type: 'route',
      payload: routePayload,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    if (navigator.onLine) {
      this.sync();
    }
  }
}
