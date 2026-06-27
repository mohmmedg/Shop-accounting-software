import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { toast } from 'sonner';

export function useProducts() {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) {
        toast.error(`خطأ في تحميل المنتجات: ${error.message}`);
        throw error;
      }
      return (data || []).map((p: any) => ({
        ...p,
        sale_type: p.sale_type || (p.sold_by_weight ? 'weight' : 'piece'),
        price_per_kg: p.price_per_kg || (p.sold_by_weight ? p.price_usd : undefined),
        stock_grams: p.stock_grams || (p.sold_by_weight ? p.quantity * 1000 : undefined),
        price_tiers: {
          wholesale_usd: p.wholesale_price_usd || 0,
          vip_usd: p.vip_price_usd || 0,
        }
      })) as Product[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const addProduct = useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      const payload = {
        name: product.name,
        barcode: product.barcode || null,
        category: product.category || 'عام',
        image_url: product.image_url || '',
        price_usd: Number(product.price_usd),
        price_syp: Number(product.price_syp),
        cost_usd: Number(product.cost_usd),
        quantity: Number(product.quantity),
        warning_limit: Number(product.warning_limit),
        sold_by_weight: product.sold_by_weight,
        sale_type: product.sale_type || (product.sold_by_weight ? 'weight' : 'piece'),
        price_per_kg: product.price_per_kg ? Number(product.price_per_kg) : (product.sold_by_weight ? Number(product.price_usd) : null),
        stock_grams: product.stock_grams ? Number(product.stock_grams) : (product.sold_by_weight ? Number(product.quantity) * 1000 : null),
        wholesale_price_usd: Number(product.wholesale_price_usd || product.price_tiers?.wholesale_usd || 0),
        vip_price_usd: Number(product.vip_price_usd || product.price_tiers?.vip_usd || 0),
        expiry_date: product.expiry_date || null,
      };

      const { data, error } = await supabase
        .from('products')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Log inventory movement if quantity > 0
      if (payload.quantity > 0) {
        await supabase.from('inventory_movements').insert({
          product_id: data.id,
          product_name: data.name,
          movement_type: 'in',
          quantity_before: 0,
          quantity_after: payload.quantity,
          change_amount: payload.quantity,
          reference_id: 'رصيد أول المدة',
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      toast.success('تم إضافة المنتج بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل إضافة المنتج');
    },
  });

  const updateProduct = useMutation({
    mutationFn: async (product: Product) => {
      const payload = {
        name: product.name,
        barcode: product.barcode || null,
        category: product.category || 'عام',
        image_url: product.image_url || '',
        price_usd: Number(product.price_usd),
        price_syp: Number(product.price_syp),
        cost_usd: Number(product.cost_usd),
        quantity: Number(product.quantity),
        warning_limit: Number(product.warning_limit),
        sold_by_weight: product.sold_by_weight,
        sale_type: product.sale_type || (product.sold_by_weight ? 'weight' : 'piece'),
        price_per_kg: product.price_per_kg ? Number(product.price_per_kg) : (product.sold_by_weight ? Number(product.price_usd) : null),
        stock_grams: product.stock_grams !== undefined ? Number(product.stock_grams) : (product.sold_by_weight ? Number(product.quantity) * 1000 : null),
        wholesale_price_usd: Number(product.wholesale_price_usd || product.price_tiers?.wholesale_usd || 0),
        vip_price_usd: Number(product.vip_price_usd || product.price_tiers?.vip_usd || 0),
        expiry_date: product.expiry_date || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('تم تحديث المنتج بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل تحديث المنتج');
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      // Fetch product name first
      let productName = 'منتج مجهول';
      try {
        const { data } = await supabase.from('products').select('name').eq('id', id).single();
        if (data) productName = data.name;
      } catch (err) {
        console.warn('Failed to get product name for audit:', err);
      }

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;

      // Log action
      try {
        const savedUserStr = localStorage.getItem('store_current_user');
        const currentUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        await supabase.from('audit_logs').insert({
          employee_id: currentUser?.id || null,
          employee_name: currentUser?.name || 'مجهول',
          action_type: 'delete_product',
          entity_type: 'product',
          entity_id: id,
          entity_name: productName,
          description: `تم حذف المنتج نهائياً: ${productName}`,
        });
      } catch (err) {
        console.warn('Product delete audit log failed:', err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('تم حذف المنتج بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل حذف المنتج');
    },
  });

  return {
    products: productsQuery.data ?? [],
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    addProduct: addProduct.mutateAsync,
    updateProduct: updateProduct.mutateAsync,
    deleteProduct: deleteProduct.mutateAsync,
    isAdding: addProduct.isPending,
    isUpdating: updateProduct.isPending,
    isDeleting: deleteProduct.isPending,
  };
}
