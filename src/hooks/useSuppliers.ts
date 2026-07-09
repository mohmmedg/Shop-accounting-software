import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Supplier } from '../types';
import { toast } from 'sonner';

export function useSuppliers() {
  const queryClient = useQueryClient();

  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const hasSupabaseCreds = import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY;
      if (!hasSupabaseCreds) {
        return [] as Supplier[];
      }
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (error) throw new Error(`فشل تحميل الموردين: ${error.message}`);
      return (data ?? []) as Supplier[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const addSupplier = useMutation({
    mutationFn: async (supplier: Omit<Supplier, 'id'>) => {
      const payload = {
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        rating: Number(supplier.rating || 3),
        total_purchases_usd: Number(supplier.total_purchases_usd || 0),
        notes: supplier.notes || '',
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('تم إضافة المورد بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل إضافة المورد');
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async (supplier: Supplier) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          name: supplier.name,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          rating: Number(supplier.rating),
          total_purchases_usd: Number(supplier.total_purchases_usd),
          notes: supplier.notes,
        })
        .eq('id', supplier.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('تم تحديث بيانات المورد بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل تحديث بيانات المورد');
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('تم حذف المورد بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل حذف المورد');
    },
  });

  return {
    suppliers: suppliersQuery.data ?? [],
    isLoading: suppliersQuery.isLoading,
    addSupplier: addSupplier.mutateAsync,
    updateSupplier: updateSupplier.mutateAsync,
    deleteSupplier: deleteSupplier.mutateAsync,
    isAdding: addSupplier.isPending,
    isUpdating: updateSupplier.isPending,
    isDeleting: deleteSupplier.isPending,
  };
}
