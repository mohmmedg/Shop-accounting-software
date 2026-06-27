import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Expense } from '../types';
import { toast } from 'sonner';

export function useExpenses() {
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (error) {
        toast.error(`خطأ في تحميل المصاريف: ${error.message}`);
        throw error;
      }
      return data as Expense[];
    },
    staleTime: 1000 * 60,
  });

  const addExpense = useMutation({
    mutationFn: async (expense: Omit<Expense, 'id'>) => {
      const payload = {
        description: expense.description,
        category: expense.category,
        amount_usd: Number(expense.amount_usd),
        amount_syp: Number(expense.amount_syp),
        expense_date: expense.expense_date || new Date().toISOString(),
        payment_method: expense.payment_method || 'cash',
        approved_by: expense.approved_by || 'المدير العام',
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Deduct from open cash register if payment method is cash
      if (payload.payment_method === 'cash') {
        const { data: openShifts } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('status', 'open');
        const openShift = openShifts?.[0];

        if (openShift) {
          const closingUsd = (openShift.closing_balance_usd ?? openShift.opening_balance_usd) - payload.amount_usd;
          const closingSyp = (openShift.closing_balance_syp ?? openShift.opening_balance_syp) - payload.amount_syp;

          await supabase.from('cash_registers').update({
            closing_balance_usd: closingUsd,
            closing_balance_syp: closingSyp,
          }).eq('id', openShift.id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cash_registers'] });
      toast.success('تم تسجيل المصروف بنجاح وتحديث الصندوق المالي');
    },
    onError: (err: any) => {
      toast.error(`فشل تسجيل المصروف: ${err.message}`);
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      // Find the expense to reimburse the drawer if deleted
      const { data: exp, error: fetchErr } = await supabase.from('expenses').select('*').eq('id', id).single();
      if (fetchErr) throw fetchErr;

      const { error: deleteErr } = await supabase.from('expenses').delete().eq('id', id);
      if (deleteErr) throw deleteErr;

      if (exp && exp.payment_method === 'cash') {
        const { data: openShifts } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('status', 'open');
        const openShift = openShifts?.[0];

        if (openShift) {
          const closingUsd = (openShift.closing_balance_usd ?? openShift.opening_balance_usd) + Number(exp.amount_usd);
          const closingSyp = (openShift.closing_balance_syp ?? openShift.opening_balance_syp) + Number(exp.amount_syp);

          await supabase.from('cash_registers').update({
            closing_balance_usd: closingUsd,
            closing_balance_syp: closingSyp,
          }).eq('id', openShift.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cash_registers'] });
      toast.success('تم حذف المصروف بنجاح وتعديل الصندوق المالي');
    },
    onError: (err: any) => {
      toast.error(`فشل حذف المصروف: ${err.message}`);
    },
  });

  return {
    expenses: expensesQuery.data ?? [],
    isLoading: expensesQuery.isLoading,
    addExpense: addExpense.mutateAsync,
    deleteExpense: deleteExpense.mutateAsync,
    isAdding: addExpense.isPending,
    isDeleting: deleteExpense.isPending,
  };
}
