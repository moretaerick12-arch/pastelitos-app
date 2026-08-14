'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Wallet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { SyncManager } from '@/lib/sync/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';

function CollectionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';

  const formatMoney = (amount: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);

  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>(initialClientId);
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Use dexie queries
  const clientsWithDebt = useLiveQuery(() => 
    db.local_clients.filter(c => c.current_balance > 0).toArray()
  ) || [];
  const allClients = useLiveQuery(() => db.local_clients.toArray()) || [];
  const userMeta = useLiveQuery(() => db.meta.get('repartidor_id'));

  useEffect(() => {
    if (initialClientId && !selectedClient) {
      setSelectedClient(initialClientId);
    }
  }, [initialClientId, selectedClient]);

  const selectedClientData = allClients.find(c => c.id === selectedClient);
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
          current_balance: Math.max(0, selectedClientData.current_balance - numAmount)
        });
      }

      router.push('/ruta');
      
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error al procesar el cobro');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-8 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link href="/ruta" className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-slate-800">Registrar Cobro</h1>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-100">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Client Selection */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Cliente a cobrar</label>
        <select 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[44px]"
          value={selectedClient}
          onChange={(e) => {
            setSelectedClient(e.target.value);
            setAmount('');
          }}
        >
          <option value="">Selecciona un colmado...</option>
          {allClients.map(c => (
            <option key={c.id} value={c.id}>
              #{c.visit_order} - {c.name} {c.current_balance > 0 ? `(Debe ${formatMoney(c.current_balance)})` : '(Al día)'}
            </option>
          ))}
        </select>

        {selectedClientData && (
          <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center gap-1">
            <span className="text-emerald-700 text-xs font-medium">Deuda Registrada</span>
            <span className="text-2xl font-black text-emerald-800">{formatMoney(selectedClientData.current_balance)}</span>
          </div>
        )}
      </div>

      {/* Amount Input */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Monto a Cobrar</label>
        
        <div className="relative mb-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">RD$</span>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3.5 pl-14 pr-4 text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[52px]"
          />
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {quickAmounts.map(val => (
            <button
              key={val}
              type="button"
              onClick={() => setAmount(val.toString())}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[40px]"
            >
              +{val}
            </button>
          ))}
        </div>

        {selectedClientData && selectedClientData.current_balance > 0 && (
          <button 
            type="button"
            onClick={() => setAmount(selectedClientData.current_balance.toString())}
            className="w-full text-emerald-700 text-xs font-bold py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            Saldar deuda completa ({formatMoney(selectedClientData.current_balance)})
          </button>
        )}

        {isOverpaying && (
          <div className="mt-3 bg-amber-50 text-amber-700 p-2.5 rounded-xl text-xs flex gap-2 border border-amber-200">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <p>El monto ingresado es mayor a la deuda actual del cliente.</p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Notas (Opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Pago en efectivo dejado por el encargado..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[70px] resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !selectedClient || numAmount <= 0}
        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2 text-sm min-h-[52px]"
      >
        {submitting ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            <CheckCircle2 size={18} />
            Confirmar Cobro
          </>
        )}
      </button>
    </div>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-emerald-500" size={28} />
      </div>
    }>
      <CollectionForm />
    </Suspense>
  );
}
