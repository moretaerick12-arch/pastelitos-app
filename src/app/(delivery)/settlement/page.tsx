'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle, Info, Loader2, WifiOff } from 'lucide-react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function SettlementPage() {
  const router = useRouter();
  const supabase = createClient();
  const formatMoney = (amount: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);

  const [submitting, setSubmitting] = useState(false);
  
  // Use dexie queries for offline calculations
  const routeMeta = useLiveQuery(() => db.meta.get('current_route_id'));
  const localSales = useLiveQuery(() => db.local_sales.toArray()) || [];
  const localPayments = useLiveQuery(() => db.local_payments.toArray()) || [];
  const inventory = useLiveQuery(() => db.local_inventory.toArray()) || [];
  const syncQueueCount = useLiveQuery(() => db.sync_queue.count()) || 0;

  const [isSettled, setIsSettled] = useState(false);
  const [deliveredCash, setDeliveredCash] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Calculate stats from local DB
  const totalSalesCash = localSales.reduce((acc, sale) => acc + (sale.paid_amount || 0), 0);
  const totalCollectionsCash = localPayments.reduce((acc, payment) => acc + (payment.amount || 0), 0);
  const expectedCash = totalSalesCash + totalCollectionsCash;

  const inventoryDispatched = inventory.reduce((acc, item) => acc + (item.quantity_dispatched || 0), 0);
  
  // Inventory Sold (from local sales details)
  const inventorySold = localSales.reduce((acc, sale) => {
    const saleTotalQty = sale.details?.reduce((sum, d) => sum + (d.quantity || 0), 0) || 0;
    return acc + saleTotalQty;
  }, 0);

  // We don't have local returns implemented yet, default to 0
  const inventoryReturned = 0; 

  const deliveredNum = Number(deliveredCash) || 0;
  const difference = deliveredCash !== '' ? deliveredNum - expectedCash : null;

  const handleSettlement = async () => {
    setErrorMsg('');
    if (deliveredCash === '') return setErrorMsg('Ingresa el efectivo a entregar');
    if (!routeMeta) return setErrorMsg('No hay ruta activa');
    
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('calculate_daily_reconciliation', {
        p_daily_route_id: routeMeta.value,
        p_delivered_cash: deliveredNum
      });

      if (error) throw error;
      
      setIsSettled(true);
      
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error al procesar el cuadre');
    } finally {
      setSubmitting(false);
    }
  };

  if (!routeMeta) {
    return (
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
        <p className="text-slate-500">No hay ruta activa para cuadrar hoy. Descarga tu ruta primero.</p>
      </div>
    );
  }

  if (isSettled) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 mt-4 bg-white rounded-2xl shadow-sm border border-indigo-100 animate-fade-in">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-5 text-indigo-500">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Cuadre Completado</h2>
        <p className="text-slate-500 text-sm mb-6">Tu ruta de hoy ha sido cerrada exitosamente.</p>
        <button 
          onClick={() => router.push('/ruta')}
          className="bg-indigo-50 text-indigo-600 font-semibold py-3 px-6 rounded-xl hover:bg-indigo-100 transition-colors w-full"
        >
          Volver a Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8 animate-fade-in">
      {syncQueueCount > 0 && (
        <div className="bg-amber-100 text-amber-800 p-4 rounded-xl flex items-start gap-3 border border-amber-200">
          <WifiOff size={24} className="flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <h4 className="font-bold text-amber-900 mb-1">Tienes transacciones sin sincronizar</h4>
            <p className="text-sm">Conéctate a internet y sincroniza en la pestaña Inicio antes de cuadrar, o perderás información de las ventas y cobros.</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-100">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <span className="text-xs text-slate-500 font-medium">Ventas (Efectivo)</span>
          <div className="text-lg font-bold text-slate-800 mt-1">{formatMoney(totalSalesCash)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <span className="text-xs text-slate-500 font-medium">Cobros Realizados</span>
          <div className="text-lg font-bold text-slate-800 mt-1">{formatMoney(totalCollectionsCash)}</div>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Info size={16} className="text-indigo-500" />
          Resumen de Inventario
        </h3>
        <div className="flex justify-between items-center py-2 border-b border-slate-50">
          <span className="text-sm text-slate-600">Despachado</span>
          <span className="font-semibold text-slate-800">{inventoryDispatched}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-50">
          <span className="text-sm text-slate-600">Vendido</span>
          <span className="font-semibold text-slate-800">{inventorySold}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-slate-600">Devoluciones</span>
          <span className="font-semibold text-slate-800">{inventoryReturned}</span>
        </div>
        
        {inventoryDispatched - inventorySold - inventoryReturned > 0 && (
          <div className="mt-3 bg-amber-50 p-2.5 rounded-xl text-xs text-amber-700 border border-amber-200">
            Faltan unidades por justificar (Vender o Devolver).
          </div>
        )}
      </div>

      {/* Cash Input */}
      <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-lg mt-2 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500 rounded-full opacity-20 blur-2xl"></div>
        
        <div className="flex justify-between items-center mb-6">
          <span className="text-slate-300 font-medium">Efectivo Esperado</span>
          <span className="text-2xl font-bold text-white">{formatMoney(expectedCash)}</span>
        </div>

        <div className="mb-2">
          <label className="block text-xs font-medium text-slate-400 mb-2">Efectivo a Entregar</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">RD$</span>
            <input
              type="number"
              placeholder="0.00"
              value={deliveredCash}
              onChange={(e) => setDeliveredCash(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-4 pl-14 pr-4 text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[60px]"
            />
          </div>
        </div>

        {difference !== null && (
          <div className={`mt-4 p-3 rounded-xl flex items-center justify-between text-sm font-medium ${
            difference === 0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            difference < 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            <span>
              {difference === 0 ? '¡Cuadrado perfecto!' :
               difference < 0 ? 'Faltante:' : 'Sobrante:'}
            </span>
            <span className="font-bold">{formatMoney(Math.abs(difference))}</span>
          </div>
        )}

        <button
          onClick={handleSettlement}
          disabled={submitting || deliveredCash === '' || syncQueueCount > 0}
          className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center min-h-[52px]"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            'Cerrar Cuadre'
          )}
        </button>
      </div>
    </div>
  );
}
