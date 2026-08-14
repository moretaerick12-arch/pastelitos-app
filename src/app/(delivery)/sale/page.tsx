'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Check, Loader2, Minus, Plus, ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { SyncManager } from '@/lib/sync/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';

function SaleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';

  const formatMoney = (amount: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);

  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>(initialClientId);
  
  // Use dexie queries
  const clients = useLiveQuery(() => db.local_clients.toArray()) || [];
  const inventory = useLiveQuery(() => db.local_inventory.toArray()) || [];
  const routeMeta = useLiveQuery(() => db.meta.get('current_route_id'));
  const userMeta = useLiveQuery(() => db.meta.get('repartidor_id'));

  useEffect(() => {
    if (initialClientId && !selectedClient) {
      setSelectedClient(initialClientId);
    }
  }, [initialClientId, selectedClient]);

  const [cartState, setCartState] = useState<Record<string, number>>({});
  const [saleType, setSaleType] = useState<'contado' | 'credito'>('contado');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const updateQuantity = (productId: string, delta: number) => {
    setCartState(prev => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: Math.max(0, current + delta) };
    });
  };

  const totalAmount = inventory.reduce((sum, item) => {
    const qty = cartState[item.product_id] || 0;
    return sum + (qty * item.price_per_unit);
  }, 0);

  const activeCartItems = inventory
    .filter(item => (cartState[item.product_id] || 0) > 0)
    .map(item => ({
      ...item,
      quantity: cartState[item.product_id] || 0
    }));

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const isCreditLimitReached = selectedClientData 
    ? selectedClientData.current_balance >= selectedClientData.credit_limit && selectedClientData.credit_limit > 0
    : false;

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!selectedClient) return setErrorMsg('Selecciona un cliente');
    if (activeCartItems.length === 0) return setErrorMsg('Agrega al menos un producto');
    if (!routeMeta || !userMeta) return setErrorMsg('Faltan datos de la ruta. Sincroniza primero.');
    
    let paidAmtNum = 0;
    if (saleType === 'contado') {
      paidAmtNum = totalAmount;
    } else {
      paidAmtNum = Number(paidAmount) || 0;
      if (paidAmtNum < 0) return setErrorMsg('Monto inicial inválido');
      if (paidAmtNum > totalAmount) return setErrorMsg('El abono no puede ser mayor al total');
    }

    setSubmitting(true);
    try {
      const saleId = uuidv4();
      const payload = {
        id: saleId,
        client_id: selectedClient,
        daily_route_id: routeMeta.value,
        repartidor_id: userMeta.value,
        sale_type: saleType,
        total_amount: totalAmount,
        paid_amount: paidAmtNum,
        status: 'activa',
        created_at: new Date().toISOString(),
        synced: false,
        details: activeCartItems.map(item => ({
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price_per_unit,
          subtotal: item.quantity * item.price_per_unit
        }))
      };

      await SyncManager.enqueueSale(payload);
      
      // Update local client
      await db.local_clients.update(selectedClient, { visited: true });

      // Update current balance if credit and not fully paid
      if (saleType === 'credito') {
        const debtAdded = totalAmount - paidAmtNum;
        if (debtAdded > 0 && selectedClientData) {
            await db.local_clients.update(selectedClient, { 
                current_balance: selectedClientData.current_balance + debtAdded 
            });
        }
      }

      router.push('/ruta');
      
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error al guardar la venta');
      setSubmitting(false);
    }
  };

  if (clients.length === 0 && inventory.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
        <p className="text-slate-500">No hay datos locales. Descarga tu ruta primero en la pestaña Ruta.</p>
        <Link href="/ruta" className="mt-4 inline-block bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-xs">
          Ir a Ruta
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link href="/ruta" className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-slate-800">Nueva Venta</h1>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-100">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Client Selection */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Cliente de Entrega</label>
        <select 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[44px]"
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
        >
          <option value="">Selecciona un colmado...</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              #{c.visit_order} - {c.name} {c.visited ? '(Visitado)' : ''}
            </option>
          ))}
        </select>

        {selectedClientData && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between">
            <div>
              <span className="text-slate-500 font-medium">Balance actual</span>
              <div className="font-bold text-slate-800">{formatMoney(selectedClientData.current_balance)}</div>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium">Límite Crédito</span>
              <div className="font-bold text-slate-800">{formatMoney(selectedClientData.credit_limit)}</div>
            </div>
          </div>
        )}

        {isCreditLimitReached && (
          <div className="mt-3 bg-amber-50 text-amber-700 p-2.5 rounded-xl text-xs flex gap-2 border border-amber-200">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p>Este colmado ha alcanzado o superado su límite de crédito.</p>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Productos</h3>
        <div className="flex flex-col gap-3">
          {inventory.map(item => {
            const qty = cartState[item.product_id] || 0;
            return (
            <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-sm font-bold text-slate-800 truncate">{item.name}</h4>
                <p className="text-xs text-slate-500">{formatMoney(item.price_per_unit)} / ud</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-100 shrink-0">
                <button 
                  onClick={() => updateQuantity(item.product_id, -1)}
                  className="w-9 h-9 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-sm active:bg-slate-100 transition-colors disabled:opacity-50"
                  disabled={qty === 0}
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-bold text-slate-800 text-sm">{qty}</span>
                <button 
                  onClick={() => updateQuantity(item.product_id, 1)}
                  className="w-9 h-9 flex items-center justify-center bg-white rounded-lg text-amber-600 shadow-sm active:bg-slate-100 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )})}
          {inventory.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No hay productos en inventario</p>
          )}
        </div>
      </div>

      {/* Payment Type */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Tipo de Venta</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setSaleType('contado')}
            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
              saleType === 'contado' 
                ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20' 
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {saleType === 'contado' && <Check size={14} />}
            Al Contado
          </button>
          <button
            onClick={() => setSaleType('credito')}
            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
              saleType === 'credito' 
                ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20' 
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {saleType === 'credito' && <Check size={14} />}
            A Crédito
          </button>
        </div>

        {saleType === 'credito' && (
          <div className="animate-fade-in mt-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Abono Inicial (Opcional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">RD$</span>
              <input
                type="number"
                placeholder="0.00"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[44px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary & Submit */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl mt-1 sticky bottom-20 z-20 border border-slate-800">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-300 text-xs font-medium">Total de la venta</span>
          <span className="text-xl font-black text-amber-400">{formatMoney(totalAmount)}</span>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={submitting || totalAmount === 0 || !selectedClient}
          className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2 text-sm"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <ShoppingCart size={18} />
              Confirmar Venta
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SalePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-amber-500" size={28} />
      </div>
    }>
      <SaleForm />
    </Suspense>
  );
}
