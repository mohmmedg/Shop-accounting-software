import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Return } from '../types';
import { toast } from 'sonner';

export function useReturns() {
  const queryClient = useQueryClient();

  const returnsQuery = useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .order('return_date', { ascending: false });
      if (error) {
        toast.error(`خطأ في تحميل المرتجعات: ${error.message}`);
        throw error;
      }
      return data as Return[];
    },
    staleTime: 1000 * 60,
  });

  const addReturn = useMutation({
    mutationFn: async (retData: Omit<Return, 'id' | 'return_date'>) => {
      const returnDate = new Date().toISOString();

      const payload = {
        invoice_id: retData.invoice_id,
        product_id: retData.product_id,
        product_name: retData.product_name,
        customer_id: retData.customer_id,
        customer_name: retData.customer_name || 'زبون نقدي',
        quantity: Number(retData.quantity),
        refund_amount_usd: Number(retData.refund_amount_usd),
        refund_amount_syp: Number(retData.refund_amount_syp),
        reason: retData.reason || '',
        action_taken: retData.action_taken || 'refund',
        return_date: returnDate,
      };

      // 1. Insert into returns
      const { data, error } = await supabase
        .from('returns')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // 2. Restock product
      const { data: product } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', payload.product_id)
        .single();

      const currentQty = product?.quantity ?? 0;
      const newQty = currentQty + payload.quantity;

      await supabase
        .from('products')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', payload.product_id);

      // 3. Log movement in inventory_movements
      await supabase.from('inventory_movements').insert({
        product_id: payload.product_id,
        product_name: payload.product_name,
        movement_type: 'return',
        quantity_before: currentQty,
        quantity_after: newQty,
        change_amount: payload.quantity,
        reference_id: payload.invoice_id || 'مرتجع عام',
        date: returnDate,
      });

      // 4. If action_taken is refund, deduct from open shift
      if (payload.action_taken === 'refund' && (payload.refund_amount_usd > 0 || payload.refund_amount_syp > 0)) {
        const { data: openShifts } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('status', 'open');
        const openShift = openShifts?.[0];

        if (openShift) {
          const closingUsd = (openShift.closing_balance_usd ?? openShift.opening_balance_usd) - payload.refund_amount_usd;
          const closingSyp = (openShift.closing_balance_syp ?? openShift.opening_balance_syp) - payload.refund_amount_syp;

          await supabase.from('cash_registers').update({
            closing_balance_usd: closingUsd,
            closing_balance_syp: closingSyp,
          }).eq('id', openShift.id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash_registers'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم تسجيل مرتجع المبيعات بنجاح وتحديث المخزون');
    },
    onError: (err: any) => {
      toast.error(`فشل تسجيل المرتجع: ${err.message}`);
    },
  });

  return {
    returns: returnsQuery.data ?? [],
    isLoading: returnsQuery.isLoading,
    addReturn: addReturn.mutateAsync,
    isAdding: addReturn.isPending,
  };
}
