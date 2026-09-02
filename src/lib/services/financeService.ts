import { createClient } from '@/lib/supabase/client';
import { CashFlow } from '@/types/database';

export interface DriverSaleSummary {
  driverId: string;
  driverName: string;
  cashSales: number;
  creditSales: number;
  totalSales: number;
  salesCount: number;
  totalFiao: number; // outstanding balance floating with this driver
  percentage: number;
}

export interface ExpenseGroupSummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface FortnightlyReportData {
  startDate: string;
  endDate: string;
  totalSales: number;
  totalCashSales: number;
  totalCreditSales: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalReceivables: number;
  driverSummaries: DriverSaleSummary[];
  expenseGroups: ExpenseGroupSummary[];
  expenses: CashFlow[];
  recentTransactions: Array<{
    id: string;
    date: string;
    type: 'Venta' | 'Cobro' | 'Gasto';
    amount: number;
    description: string;
    clientOrDriver?: string;
    status: string;
    table: string;
  }>;
}

const DEFAULT_EXPENSE_SUGGESTIONS = [
  'Gas / Combustible',
  'Sacos de Harina',
  'Queso',
  'Vegetales y Especias',
  'Pago Nene',
  'Pago Joelito',
  'Pago Meloso',
  'Sueldo Empleados',
  'Materiales y Empaques',
  'Aceite',
  'Mantenimiento Vehículo',
  'Alquiler de Local',
  'Préstamo',
  'Electricidad / Servicios',
  'Otros Gastos'
];

export const financeService = {
  /**
   * Get all cash flow entries within a date range
   */
  async getCashFlow(startDate: string, endDate: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cash_flow')
      .select('*')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });
    return { data, error };
  },

  /**
   * Add a new expense or cash flow entry
   */
  async addExpense(entry: {
    amount: number;
    description: string;
    transaction_date?: string;
    reference_id?: string | null;
  }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cash_flow')
      .insert([
        {
          transaction_type: 'egreso',
          amount: entry.amount,
          description: entry.description.trim(),
          reference_id: entry.reference_id || null,
          transaction_date: entry.transaction_date || new Date().toISOString(),
        }
      ])
      .select()
      .single();
    return { data, error };
  },

  /**
   * Delete an expense
   */
  async deleteExpense(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cash_flow')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  /**
   * Get existing unique expense descriptions for autocomplete suggestions
   */
  async getExpenseSuggestions(): Promise<string[]> {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('cash_flow')
        .select('description')
        .eq('transaction_type', 'egreso')
        .limit(100);

      const savedDescriptions = (data || [])
        .map((d: any) => d.description?.trim())
        .filter(Boolean);

      const combined = Array.from(new Set([...savedDescriptions, ...DEFAULT_EXPENSE_SUGGESTIONS]));
      return combined;
    } catch {
      return DEFAULT_EXPENSE_SUGGESTIONS;
    }
  },

  /**
   * Get overall accounts receivable (clients with balance > 0)
   */
  async getAccountsReceivable() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .gt('current_balance', 0)
      .order('current_balance', { ascending: false });
    return { data, error };
  },

  /**
   * Comprehensive Fortnightly / Period Financial Calculation
   */
  async getFortnightlyReport(startDate: string, endDate: string): Promise<FortnightlyReportData> {
    const supabase = createClient();

    // 1. Fetch Sales in period
    const { data: salesData } = await supabase
      .from('sales')
      .select(`
        id,
        repartidor_id,
        client_id,
        sale_type,
        total_amount,
        paid_amount,
        status,
        created_at,
        profiles ( id, first_name, last_name ),
        clients ( id, name )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .neq('status', 'anulada');

    // 2. Fetch Expenses in period
    const { data: expensesData } = await supabase
      .from('cash_flow')
      .select('*')
      .eq('transaction_type', 'egreso')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    // 3. Fetch Payments in period
    const { data: paymentsData } = await supabase
      .from('payments')
      .select(`
        id,
        client_id,
        repartidor_id,
        amount,
        payment_date,
        status,
        clients ( id, name ),
        profiles ( id, first_name, last_name )
      `)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .neq('status', 'anulado');

    // 4. Fetch all drivers (profiles with role repartidor)
    const { data: driversData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role');

    // 5. Fetch all clients to calculate overall receivables
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name, current_balance')
      .gt('current_balance', 0);

    const sales = salesData || [];
    const expenses = (expensesData || []) as CashFlow[];
    const payments = paymentsData || [];
    const drivers = (driversData || []).filter((p: any) => p.role === 'repartidor' || true);
    const clientsWithBalance = clientsData || [];

    // Calculate Sales Totals
    let totalSales = 0;
    let totalCashSales = 0;
    let totalCreditSales = 0;

    // Driver map
    const driverMap = new Map<string, {
      driverId: string;
      driverName: string;
      cashSales: number;
      creditSales: number;
      totalSales: number;
      salesCount: number;
      totalFiao: number;
    }>();

    // Initialize all drivers
    drivers.forEach((driver: any) => {
      const name = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Repartidor';
      driverMap.set(driver.id, {
        driverId: driver.id,
        driverName: name,
        cashSales: 0,
        creditSales: 0,
        totalSales: 0,
        salesCount: 0,
        totalFiao: 0,
      });
    });

    sales.forEach((s: any) => {
      const amount = Number(s.total_amount || 0);
      const isCredit = s.sale_type === 'credito';
      const unpaidAmount = Math.max(0, amount - Number(s.paid_amount || 0));

      totalSales += amount;
      if (isCredit) {
        totalCreditSales += amount;
      } else {
        totalCashSales += amount;
      }

      const driverId = s.repartidor_id || 'unknown';
      let driverEntry = driverMap.get(driverId);
      if (!driverEntry) {
        const dName = s.profiles ? `${s.profiles.first_name || ''} ${s.profiles.last_name || ''}`.trim() : 'Sin Asignar';
        driverEntry = {
          driverId,
          driverName: dName || 'Repartidor Desconocido',
          cashSales: 0,
          creditSales: 0,
          totalSales: 0,
          salesCount: 0,
          totalFiao: 0,
        };
        driverMap.set(driverId, driverEntry);
      }

      if (isCredit) {
        driverEntry.creditSales += amount;
        driverEntry.totalFiao += unpaidAmount;
      } else {
        driverEntry.cashSales += amount;
      }
      driverEntry.totalSales += amount;
      driverEntry.salesCount += 1;
    });

    // Subtract payments collected by each driver from their Fiao in period
    payments.forEach((p: any) => {
      const driverId = p.repartidor_id;
      if (driverId && driverMap.has(driverId)) {
        const driverEntry = driverMap.get(driverId)!;
        driverEntry.totalFiao = Math.max(0, driverEntry.totalFiao - Number(p.amount || 0));
      }
    });

    // Format driver summaries
    const driverSummaries: DriverSaleSummary[] = Array.from(driverMap.values())
      .map(d => ({
        ...d,
        percentage: totalSales > 0 ? (d.totalSales / totalSales) * 100 : 0
      }))
      .filter(d => d.totalSales > 0 || d.totalFiao > 0)
      .sort((a, b) => b.totalSales - a.totalSales);

    // Calculate Expenses Totals & Categorization
    let totalExpenses = 0;
    const categoryMap = new Map<string, { total: number; count: number }>();

    expenses.forEach((exp) => {
      const amount = Number(exp.amount || 0);
      totalExpenses += amount;

      const desc = exp.description?.trim() || 'Varios';
      const existing = categoryMap.get(desc) || { total: 0, count: 0 };
      existing.total += amount;
      existing.count += 1;
      categoryMap.set(desc, existing);
    });

    const expenseGroups: ExpenseGroupSummary[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate Net Profit & Margins
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const totalReceivables = clientsWithBalance.reduce((acc, curr: any) => acc + Number(curr.current_balance || 0), 0);

    // Combine recent transactions for auditing
    const recentTransactions = [
      ...sales.map((s: any) => ({
        id: s.id,
        date: s.created_at,
        type: 'Venta' as const,
        amount: Number(s.total_amount || 0),
        description: `Venta ${s.sale_type === 'credito' ? 'a Crédito' : 'al Contado'}`,
        clientOrDriver: s.clients?.name ? `${s.clients.name}` : undefined,
        status: s.status || 'activa',
        table: 'sales'
      })),
      ...expenses.map((e) => ({
        id: e.id,
        date: e.transaction_date,
        type: 'Gasto' as const,
        amount: Number(e.amount || 0),
        description: e.description,
        clientOrDriver: undefined,
        status: 'activo',
        table: 'cash_flow'
      })),
      ...payments.map((p: any) => ({
        id: p.id,
        date: p.payment_date,
        type: 'Cobro' as const,
        amount: Number(p.amount || 0),
        description: 'Abono / Cobro de Fiao',
        clientOrDriver: p.clients?.name ? `${p.clients.name}` : undefined,
        status: p.status || 'activo',
        table: 'payments'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);

    return {
      startDate,
      endDate,
      totalSales,
      totalCashSales,
      totalCreditSales,
      totalExpenses,
      netProfit,
      profitMargin,
      totalReceivables,
      driverSummaries,
      expenseGroups,
      expenses,
      recentTransactions
    };
  }
};
