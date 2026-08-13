'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Loader2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { db } from '@/lib/db';
import { SyncManager } from '@/lib/sync/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';

export default function SalePage() {
  const router = useRouter();
  const formatMoney = (amount: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);

  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  
  // Use dexie queries
  const clients = useLiveQuery(() => db.local_clients.toArray()) || [];
  const inventory = useLiveQuery(() => db.local_inventory.toArray()) || [];
  const routeMeta = useLiveQuery(() => db.meta.get('current_route_id'));
  const userMeta = useLiveQuery(() => db.meta.get('repartidor_id'));

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
    ? selectedClientData.current_balance >= selectedClientData.credit_limit 
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
        <p className="text-slate-500">No hay datos locales. Descarga tu ruta primero en la pestaña Inicio.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8 animate-fade-in">
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-100">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Client Selection */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Cliente</label>
        <select 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[44px]"
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
        >
          <option value="">Selecciona un colmado...</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {selectedClientData && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between">
            <div>
              <span className="text-slate-500">Balance actual</span>
              <div className="font-semibold text-slate-800">{formatMoney(selectedClientData.current_balance)}</div>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Límite</span>
              <div className="font-semibold text-slate-800">{formatMoney(selectedClientData.credit_limit)}</div>
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
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Productos</h3>
        <div className="flex flex-col gap-3">
          {inventory.map(item => {
            const qty = cartState[item.product_id] || 0;
            return (
            <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-800">{item.name}</h4>
                <p className="text-xs text-slate-500">{formatMoney(item.price_per_unit)} / ud</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-100">
                <button 
                  onClick={() => updateQuantity(item.product_id, -1)}
                  className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-sm active:bg-slate-100 transition-colors disabled:opacity-50"
                  disabled={qty === 0}
                >
                  <Minus size={18} />
                </button>
                <span className="w-6 text-center font-semibold text-slate-800">{qty}</span>
                <button 
                  onClick={() => updateQuantity(item.product_id, 1)}
                  className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-amber-600 shadow-sm active:bg-slate-100 transition-colors"
                >
                  <Plus size={18} />
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
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Tipo de Venta</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setSaleType('contado')}
            className={`py-3 px-2 rounded-xl text-sm font-medium transition-colors border min-h-[44px] flex items-center justify-center gap-2 ${
              saleType === 'contado' 
                ? 'bg-amber-50 border-amber-500 text-amber-700' 
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {saleType === 'contado' && <Check size={16} />}
            Al Contado
          </button>
          <button
            onClick={() => setSaleType('credito')}
            className={`py-3 px-2 rounded-xl text-sm font-medium transition-colors border min-h-[44px] flex items-center justify-center gap-2 ${
              saleType === 'credito' 
                ? 'bg-amber-50 border-amber-500 text-amber-700' 
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {saleType === 'credito' && <Check size={16} />}
            A Crédito
          </button>
        </div>

        {saleType === 'credito' && (
          <div className="animate-fade-in">
            <label className="block text-xs font-medium text-slate-500 mb-1">Abono Inicial (Opcional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">RD$</span>
              <input
                type="number"
                placeholder="0.00"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[44px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary & Submit */}
      <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-lg mt-2 sticky bottom-4 z-20">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-300 font-medium">Total de la venta</span>
          <span className="text-2xl font-bold text-amber-400">{formatMoney(totalAmount)}</span>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={submitting || totalAmount === 0 || !selectedClient}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center min-h-[52px]"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <ShoppingCart size={20} className="mr-2" />
              Confirmar Venta
            </>
          )}
        </button>
      </div>
    </div>
  );
}
