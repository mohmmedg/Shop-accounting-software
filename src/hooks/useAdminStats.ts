import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface AdminStats {
  // Today
  todaySalesUsd: number;
  todayInvoiceCount: number;
  todayProfitUsd: number;
  todayExpensesUsd: number;
  // Total debts
  totalDebtUsd: number;
  totalDebtCount: number;
  // Returns
  totalReturnsUsd: number;
  totalReturnCount: number;
  // Stock
  lowStockCount: number;
  outOfStockCount: number;
  // Employees
  activeEmployeeCount: number;
  // Active shift
  activeShiftEmployee: string | null;
  activeShiftCashUsd: number;
  // Top performer this month
  topSellerName: string | null;
  topSellerUsd: number;
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Run all queries in parallel
      const [
        todayInvoices,
        todayExpenses,
        allInvoices,
        returns,
        products,
        employees,
        activeShift,
      ] = await Promise.all([
        supabase.from('invoices').select('total_usd, profit_usd').gte('sale_date', `${today}T00:00:00`),
        supabase.from('expenses').select('amount_usd').gte('expense_date', `${today}T00:00:00`),
        supabase.from('invoices').select('remaining_debt_usd'),
        supabase.from('returns').select('refund_amount_usd'),
        supabase.from('products').select('quantity, warning_limit'),
        supabase.from('employees').select('id, name, total_sales_usd, is_active'),
        supabase.from('cash_registers').select('employee_name, closing_balance_usd').eq('status', 'open').limit(1),
      ]);

      const invoices = todayInvoices.data ?? [];
      const expenses = todayExpenses.data ?? [];
      const allInv = allInvoices.data ?? [];
      const ret = returns.data ?? [];
      const prods = products.data ?? [];
      const emps = employees.data ?? [];
      const shift = activeShift.data ?? [];

      // Today stats
      const todaySalesUsd = invoices.reduce((s, i) => s + (i.total_usd || 0), 0);
      const todayProfitUsd = invoices.reduce((s, i) => s + (i.profit_usd || 0), 0);
      const todayExpensesUsd = expenses.reduce((s, e) => s + (e.amount_usd || 0), 0);

      // Debts
      const totalDebtUsd = allInv.reduce((s, i) => s + (i.remaining_debt_usd || 0), 0);
      const totalDebtCount = allInv.filter(i => (i.remaining_debt_usd || 0) > 0).length;

      // Returns
      const totalReturnsUsd = ret.reduce((s, r) => s + (r.refund_amount_usd || 0), 0);

      // Stock
      const lowStockCount = prods.filter(p => p.quantity > 0 && p.quantity <= p.warning_limit).length;
      const outOfStockCount = prods.filter(p => p.quantity <= 0).length;

      // Top seller this month
      const activeEmps = emps.filter(e => e.is_active);
      const topSeller = activeEmps.reduce((top, e) =>
        (e.total_sales_usd || 0) > (top?.total_sales_usd || 0) ? e : top,
        activeEmps[0]
      );

      return {
        todaySalesUsd,
        todayInvoiceCount: invoices.length,
        todayProfitUsd,
        todayExpensesUsd,
        totalDebtUsd,
        totalDebtCount,
        totalReturnsUsd,
        totalReturnCount: ret.length,
        lowStockCount,
        outOfStockCount,
        activeEmployeeCount: activeEmps.length,
        activeShiftEmployee: shift[0]?.employee_name || null,
        activeShiftCashUsd: shift[0]?.closing_balance_usd || 0,
        topSellerName: topSeller?.name || null,
        topSellerUsd: topSeller?.total_sales_usd || 0,
      };
    },
    staleTime: 1000 * 60 * 3, // refresh every 3 minutes
    refetchInterval: 1000 * 60 * 5, // auto-refresh every 5 minutes
  });
}
