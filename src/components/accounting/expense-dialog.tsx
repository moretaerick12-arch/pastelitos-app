"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, Calendar, Tag, FileText, CheckCircle2, Loader2, Plus } from "lucide-react";
import { financeService } from "@/lib/services/financeService";

interface ExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseDialog({ isOpen, onClose, onSuccess }: ExpenseDialogProps) {
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      financeService.getExpenseSuggestions().then((list) => {
        setSuggestions(list);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  const handleSelectSuggestion = (item: string) => {
    setDescription(item);
    setShowDropdown(false);
  };

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes((description || "").toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Por favor ingresa un monto válido mayor a 0.");
      return;
    }
    if (!description.trim()) {
      setError("Por favor ingresa una descripción o concepto del gasto.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedDateIso = new Date(date + "T12:00:00").toISOString();
      const { error: saveError } = await financeService.addExpense({
        amount: numAmount,
        description: description.trim(),
        transaction_date: selectedDateIso,
      });

      if (saveError) throw saveError;

      // Reset
      setAmount("");
      setDescription("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error saving expense:", err);
      setError("No se pudo guardar el gasto. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const quickBadges = [
    "Gas / Combustible",
    "Sacos de Harina",
    "Queso",
    "Vegetales",
    "Pago Nene",
    "Pago Joelito",
    "Pago Meloso",
    "Materiales / Fundas",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#181824] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={() => setShowDropdown(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registrar Gasto Operativo</h2>
              <p className="text-xs text-gray-400">Registra compras, combustible, nómina y otros pagos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
              <span>Monto del Gasto (RD$)</span>
              <span className="text-xs text-amber-400 font-semibold">Requerido</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                RD$
              </span>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#101018] border border-white/10 rounded-xl pl-16 pr-4 py-3 text-2xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[100, 500, 1000, 2000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-lg border border-white/5 transition-all active:scale-95"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/20 ml-auto"
                >
                  Borrar
                </button>
              )}
            </div>
          </div>

          {/* Concept / Description with Autocomplete */}
          <div className="space-y-2 relative" onClick={(e) => e.stopPropagation()}>
            <label className="text-sm font-medium text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-400" />
                Concepto o Descripción
              </span>
              <span className="text-xs text-gray-400">Escribe o selecciona</span>
            </label>

            <div className="relative">
              <input
                type="text"
                required
                placeholder="Ej. Gasolina, Sacos de harina, Pago nene..."
                value={description}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setShowDropdown(true);
                }}
                className="w-full bg-[#101018] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
              />

              {/* Autocomplete Dropdown */}
              {showDropdown && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#1f1f2e] border border-white/15 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-white/5">
                  {filteredSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestion(item)}
                      className="px-4 py-2.5 hover:bg-amber-500/15 hover:text-amber-300 text-gray-200 text-sm cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <span>{item}</span>
                      <Plus className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick selection chips */}
            <div className="pt-1">
              <p className="text-xs text-gray-400 mb-1.5">Frecuentes:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickBadges.map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => setDescription(badge)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      description === badge
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold"
                        : "bg-white/5 text-gray-400 border-white/5 hover:text-gray-200 hover:bg-white/10"
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              Fecha del Gasto
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#101018] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Guardar Gasto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
