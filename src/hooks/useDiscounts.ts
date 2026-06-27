import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Discount } from '../types';
import { toast } from 'sonner';

export function useDiscounts() {
  const queryClient = useQueryClient();

  const discountsQuery = useQuery({
    queryKey: ['discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        toast.error(`خطأ في تحميل الخصومات: ${error.message}`);
        throw error;
      }
      return data as Discount[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const addDiscount = useMutation({
    mutationFn: async (discount: Omit<Discount, 'id' | 'usages'>) => {
      const payload = {
        name: discount.name,
        code: discount.code.toUpperCase(),
        type: discount.type,
        value: Number(discount.value),
        product_id: discount.product_id || null,
        min_purchase_usd: Number(discount.min_purchase_usd || 0),
        is_active: discount.is_active !== undefined ? discount.is_active : true,
        start_date: discount.start_date || null,
        end_date: discount.end_date || null,
        usages: 0,
      };

      const { data, error } = await supabase
        .from('discounts')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('تم إضافة العرض/الخصم بنجاح');
    },
    onError: (err: any) => {
      toast.error(`فشل إضافة الخصم: ${err.message}`);
    },
  });

  const toggleDiscount = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('discounts')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('تم تحديث حالة العرض');
    },
    onError: (err: any) => {
      toast.error(`فشل تحديث حالة العرض: ${err.message}`);
    },
  });

  const deleteDiscount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('discounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('تم حذف العرض بنجاح');
    },
    onError: (err: any) => {
      toast.error(`فشل حذف العرض: ${err.message}`);
    },
  });

  const incrementDiscountUsages = useMutation({
    mutationFn: async (id: string) => {
      const { data: disc } = await supabase.from('discounts').select('usages').eq('id', id).single();
      const usages = (disc?.usages ?? 0) + 1;
      const { data, error } = await supabase
        .from('discounts')
        .update({ usages })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });

  return {
    discounts: discountsQuery.data ?? [],
    isLoading: discountsQuery.isLoading,
    addDiscount: addDiscount.mutateAsync,
    toggleDiscount: toggleDiscount.mutateAsync,
    deleteDiscount: deleteDiscount.mutateAsync,
    incrementDiscountUsages: incrementDiscountUsages.mutateAsync,
    isAdding: addDiscount.isPending,
  };
}
