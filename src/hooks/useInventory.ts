import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { InventoryMovement, InventoryCheck } from '../types';
import { toast } from 'sonner';

export function useInventory() {
  const queryClient = useQueryClient();

  const movementsQuery = useQuery({
    queryKey: ['inventory_movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('date', { ascending: false });
      if (error) {
        toast.error(`خطأ في تحميل سجل حركة المخزون: ${error.message}`);
        throw error;
      }
      return data as InventoryMovement[];
    },
    staleTime: 1000 * 60,
  });

  const checksQuery = useQuery({
    queryKey: ['inventory_checks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_checks')
        .select('*')
        .order('date', { ascending: false });
      if (error) {
        toast.error(`خطأ في تحميل عمليات الجرد: ${error.message}`);
        throw error;
      }
      return data as InventoryCheck[];
    },
    staleTime: 1000 * 60,
  });

  const addInventoryCheck = useMutation({
    mutationFn: async (check: Omit<InventoryCheck, 'id' | 'date'>) => {
      const checkDate = new Date().toISOString();
      const payload = {
        product_id: check.product_id,
        product_name: check.product_name,
        expected_quantity: Number(check.expected_quantity),
        actual_quantity: Number(check.actual_quantity),
        difference: Number(check.difference),
        conducted_by: check.conducted_by || 'أمين المستودع',
        notes: check.notes || '',
        date: checkDate,
      };

      // 1. Insert into inventory_checks
      const { data, error } = await supabase
        .from('inventory_checks')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // 2. Update product stock level to actual counted quantity
      const { data: product } = await supabase
        .from('products')
        .select('quantity, sold_by_weight')
        .eq('id', payload.product_id)
        .single();

      const currentQty = product?.quantity ?? 0;
      const isWeight = product?.sold_by_weight === true;

      await supabase
        .from('products')
        .update({
          quantity: payload.actual_quantity,
          // مزامنة stock_grams إجبارياً مع الكمية المصحَّحة لمنتجات الوزن
          // لمنع تباعد الحقلين — وإلا يبقى فحص التوفر عند البيع يعتمد على قيمة قديمة
          ...(isWeight ? { stock_grams: payload.actual_quantity * 1000 } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.product_id);

      // 3. Log the adjustment in inventory_movements
      await supabase.from('inventory_movements').insert({
        product_id: payload.product_id,
        product_name: payload.product_name,
        movement_type: 'adjustment',
        quantity_before: currentQty,
        quantity_after: payload.actual_quantity,
        change_amount: payload.difference,
        reference_id: 'جرد مستودع يدوي',
        date: checkDate,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_checks'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      toast.success('تم تسجيل عملية الجرد وتحديث كميات المخزن بنجاح');
    },
    onError: (err: any) => {
      toast.error(`فشل تسجيل الجرد: ${err.message}`);
    },
  });

  return {
    movements: movementsQuery.data ?? [],
    checks: checksQuery.data ?? [],
    isLoading: movementsQuery.isLoading || checksQuery.isLoading,
    addInventoryCheck: addInventoryCheck.mutateAsync,
    isSubmittingCheck: addInventoryCheck.isPending,
  };
}
