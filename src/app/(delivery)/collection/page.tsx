'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { db } from '@/lib/db';
import { SyncManager } from '@/lib/sync/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';

export default function CollectionPage() {
  const router = useRouter();
  const formatMoney = (amount: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);

  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Use dexie queries
  const clientsWithDebt = useLiveQuery(() => 
    db.local_clients.filter(c => c.current_balance > 0).toArray()
  ) || [];
  const userMeta = useLiveQuery(() => db.meta.get('repartidor_id'));

  const selectedClientData = clientsWithDebt.find(c => c.id === selectedClient);
  const numAmount = Number(amount) || 0;
  const isOverpaying = selectedClientData ? numAmount > selectedClientData.current_balance : false;

  const quickAmounts = [500, 1000, 2000, 5000];

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!selectedClient) return setErrorMsg('Selecciona un cliente');
    if (numAmount <= 0) return setErrorMsg('Ingresa un monto válido');
    if (!userMeta) return setErrorMsg('Faltan datos. Sincroniza tu ruta primero.');
    
    setSubmitting(true);
    try {
      const paymentId = uuidv4();
      const payload = {
        id: paymentId,
        client_id: selectedClient,
        repartidor_id: userMeta.value,
        amount: numAmount,
        notes: notes.trim() || null,
        status: 'activo',
        payment_date: new Date().toISOString(),
        synced: false
      };

      await SyncManager.enqueuePayment(payload);
      
      // Update local client balance
      if (selectedClientData) {
        await db.local_clients.update(selectedClient, {
          current_balance: selectedClientData.current_balance - numAmount
        });
      }

      router.push('/ruta');
      
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error al procesar el cobro');
      setSubmitting(false);
    }
  };

  if (!clientsWithDebt && !userMeta) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
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
        <label className="block text-sm font-semibold text-slate-700 mb-2">Cliente a cobrar</label>
        <select 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[44px]"
          value={selectedClient}
          onChange={(e) => {
            setSelectedClient(e.target.value);
            setAmount('');
          }}
        >
          <option value="">Selecciona un colmado...</option>
          {clientsWithDebt.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {clientsWithDebt.length === 0 && (
          <p className="text-xs text-slate-400 mt-2">No hay clientes con balances pendientes en tu ruta de hoy.</p>
        )}

        {selectedClientData && (
          <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center gap-1">
            <span className="text-emerald-700 text-sm font-medium">Deuda Actual</span>
            <span className="text-2xl font-bold text-emerald-800">{formatMoney(selectedClientData.current_balance)}</span>
          </div>
        )}
      </div>

      {/* Amount Input */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-sm font-semibold text-slate-700 mb-3">Monto a Cobrar</label>
        
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">RD$</span>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-4 pl-14 pr-4 text-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[60px]"
          />
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {quickAmounts.map(val => (
            <button
              key={val}
              onClick={() => setAmount(val.toString())}
              className="bg-slate-50 border border-slate-200 text-slate-600 font-medium py-2 rounded-lg text-sm hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px]"
            >
              +{val}
            </button>
          ))}
        </div>

        {selectedClientData && (
          <button 
            onClick={() => setAmount(selectedClientData.current_balance.toString())}
            className="w-full text-emerald-600 text-sm font-medium py-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Saldar deuda completa
          </button>
        )}

        {isOverpaying && (
          <div className="mt-4 bg-amber-50 text-amber-700 p-2.5 rounded-xl text-xs flex gap-2 border border-amber-200">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p>El monto ingresado es mayor a la deuda actual del cliente.</p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Notas (Opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Escriba algún detalle..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[80px] resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !selectedClient || numAmount <= 0}
        className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center min-h-[52px]"
      >
        {submitting ? (
          <Loader2 className="animate-spin" size={24} />
        ) : (
          <>
            <CheckCircle2 size={20} className="mr-2" />
            Confirmar Cobro
          </>
        )}
      </button>
    </div>
  );
}
