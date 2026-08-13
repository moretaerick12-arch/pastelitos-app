"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DollarSign, AlertCircle, Ban } from "lucide-react";

export default function FinancesPage() {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin] = useState(true); // Should come from auth/session in real app

  const supabase = createClient();

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // Receivables: clients with balance > 0
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, current_balance")
        .gt("current_balance", 0)
        .order("current_balance", { ascending: false });
      
      setReceivables(clients || []);

      // Fetch recent sales and payments for transaction history
      const { data: recentSales } = await supabase
        .from("sales")
        .select("id, created_at, total_amount, status, clients(name)")
        .order("created_at", { ascending: false })
        .limit(10);

      const { data: recentPayments } = await supabase
        .from("payments")
        .select("id, created_at, amount, status, clients(name)")
        .order("created_at", { ascending: false })
        .limit(10);

      const combined = [
        ...(recentSales || []).map((s: any) => ({ 
          id: s.id, 
          date: s.created_at, 
          type: "Venta", 
          amount: s.total_amount, 
          client: s.clients?.name ?? 'N/A',
          status: s.status,
          table: "sales"
        })),
        ...(recentPayments || []).map((p: any) => ({ 
          id: p.id, 
          date: p.created_at, 
          type: "Cobro", 
          amount: p.amount, 
          client: p.clients?.name ?? 'N/A',
          status: p.status,
          table: "payments"
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

      setTransactions(combined);
    } catch (err) {
      console.error("Error fetching finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);
  };

  const handleVoid = async (id: string, table: string) => {
    if (!confirm("¿Está seguro que desea anular esta transacción? Esta acción es irreversible.")) return;

    try {
      // In a real app we would call a secure RPC to handle voiding logic correctly (updating balances, inventory, etc)
      const rpcName = table === "sales" ? "void_sale" : "void_payment";
      
      // Fallback if RPC doesn't exist yet, we update status. (Note: doesn't reverse balances on its own unless triggers exist)
      const { error } = await supabase
        .from(table)
        .update({ status: 'anulada', voided_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      alert("Transacción anulada correctamente.");
      fetchFinanceData();
    } catch (err) {
      console.error("Error anular transaccion:", err);
      alert("Hubo un error al anular la transacción.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <DollarSign className="text-amber-500" />
          Finanzas
        </h1>
        <p className="text-gray-400 mt-1">Gestión de cuentas por cobrar y transacciones</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Accounts Receivable */}
        <div className="bg-[#1a1a24] rounded-xl border border-white/5 shadow-xl flex flex-col h-[600px]">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Cuentas por Cobrar
            </h2>
            <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
              Total: {formatCurrency(receivables.reduce((acc, curr) => acc + Number(curr.current_balance), 0))}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {loading ? (
               <div className="p-6 space-y-4">
                 {[1,2,3,4].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-skeleton"></div>)}
               </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1f1f2e] sticky top-0">
                  <tr className="text-gray-400">
                    <th className="p-4 font-medium">Cliente</th>
                    <th className="p-4 font-medium text-right">Balance Pendiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {receivables.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-medium">{r.name}</td>
                      <td className="p-4 text-amber-500 font-bold text-right">{formatCurrency(r.current_balance)}</td>
                    </tr>
                  ))}
                  {receivables.length === 0 && (
                    <tr><td colSpan={2} className="p-8 text-center text-gray-500">No hay cuentas por cobrar.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#1a1a24] rounded-xl border border-white/5 shadow-xl flex flex-col h-[600px]">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-semibold text-white">Historial de Transacciones</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {loading ? (
               <div className="p-6 space-y-4">
                 {[1,2,3,4].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-skeleton"></div>)}
               </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1f1f2e] sticky top-0">
                  <tr className="text-gray-400">
                    <th className="p-4 font-medium">Fecha</th>
                    <th className="p-4 font-medium">Detalle</th>
                    <th className="p-4 font-medium">Monto</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((tx) => {
                    const isVoid = tx.status.includes('anulada');
                    return (
                      <tr key={`${tx.table}-${tx.id}`} className={`hover:bg-white/5 transition-colors ${isVoid ? 'opacity-50' : ''}`}>
                        <td className="p-4 text-gray-400">
                          {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="p-4">
                          <p className={`font-medium ${isVoid ? 'line-through text-gray-500' : 'text-white'}`}>{tx.type}</p>
                          <p className="text-xs text-gray-500">{tx.client}</p>
                        </td>
                        <td className={`p-4 font-bold ${tx.type === 'Cobro' && !isVoid ? 'text-emerald-500' : ''} ${isVoid ? 'line-through' : ''}`}>
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isVoid ? 'bg-gray-500/10 text-gray-500' : 
                            tx.status.includes('activ') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {isAdmin && !isVoid && (
                            <button 
                              onClick={() => handleVoid(tx.id, tx.table)}
                              className="text-red-500/80 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                              title="Anular transacción"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {transactions.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay transacciones recientes.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
