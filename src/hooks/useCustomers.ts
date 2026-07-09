import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';
import { toast } from 'sonner';

export function useCustomers() {
  const queryClient = useQueryClient();

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const hasSupabaseCreds = import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY;
      if (!hasSupabaseCreds) {
        return [] as Customer[];
      }
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw new Error(`فشل تحميل العملاء: ${error.message}`);
      return (data ?? []) as Customer[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const addCustomer = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'total_purchases_usd' | 'loyalty_points' | 'loyalty_tier'>) => {
      const payload = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        customer_type: customer.customer_type || 'retail',
        total_purchases_usd: 0,
        loyalty_points: 0,
        loyalty_tier: 'bronze',
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم إضافة العميل بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل إضافة العميل');
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async (customer: Customer) => {
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          customer_type: customer.customer_type,
          total_purchases_usd: Number(customer.total_purchases_usd),
          loyalty_points: Number(customer.loyalty_points),
          loyalty_tier: customer.loyalty_tier,
        })
        .eq('id', customer.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم تحديث بيانات العميل بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل تحديث بيانات العميل');
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم حذف العميل بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل حذف العميل');
    },
  });

  return {
    customers: customersQuery.data ?? [],
    isLoading: customersQuery.isLoading,
    addCustomer: addCustomer.mutateAsync,
    updateCustomer: updateCustomer.mutateAsync,
    deleteCustomer: deleteCustomer.mutateAsync,
    isAdding: addCustomer.isPending,
    isUpdating: updateCustomer.isPending,
    isDeleting: deleteCustomer.isPending,
  };
}
