import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Invoice, PaymentMethod } from '../types';
import { useAuth } from './useAuth';
import { useSettings } from './useSettings';
import { toast } from 'sonner';

export interface CreateInvoiceInput {
  customer_id: string | null;
  customer_name: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price_usd: number;
    price_syp: number;
    cost_usd: number;
    is_weight: boolean;
  }>;
  total_usd: number;
  total_syp: number;
  payment_method: PaymentMethod;
  paid_usd: number;
  paid_syp: number;
  remaining_debt_usd: number;
  remaining_debt_syp: number;
  sale_date?: string;
  discount_syp?: number;
  discount_usd?: number;
  profit_syp?: number;
  profit_usd?: number;
}

export function useSales() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { settings } = useSettings();

  // Invoices list (recent 500)
  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('sale_date', { ascending: false })
        .limit(500);
      if (error) {
        toast.error(`خطأ في تحميل الفواتير: ${error.message}`);
        throw error;
      }
      return data as Invoice[];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Today's invoices only (for Dashboard)
  const todayInvoicesQuery = useQuery({
    queryKey: ['invoices', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .gte('sale_date', `${today}T00:00:00`)
        .lte('sale_date', `${today}T23:59:59`);
      if (error) throw error;
      return data as Invoice[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Create invoice (main POS/Sales transaction)
  const createInvoice = useMutation({
    mutationFn: async (invoiceData: CreateInvoiceInput) => {
      const hasSupabaseCreds = import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY;

      if (!hasSupabaseCreds) {
        // 1. Get next invoice number
        const { count } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true });
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(4, '0')}`;

        const saleDate = invoiceData.sale_date || new Date().toISOString();

        // 2. Insert invoice
        const { data: invoice, error: invError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            customer_id: invoiceData.customer_id,
            customer_name: invoiceData.customer_name || 'زبون نقدي',
            items: invoiceData.items,
            total_usd: Number(invoiceData.total_usd),
            total_syp: Number(invoiceData.total_syp),
            payment_method: invoiceData.payment_method,
            paid_usd: Number(invoiceData.paid_usd),
            paid_syp: Number(invoiceData.paid_syp),
            remaining_debt_usd: Number(invoiceData.remaining_debt_usd),
            remaining_debt_syp: Number(invoiceData.remaining_debt_syp),
            employee_id: currentUser?.id || null,
            sale_date: saleDate,
            discount_syp: invoiceData.discount_syp ? Number(invoiceData.discount_syp) : 0,
            discount_usd: invoiceData.discount_usd ? Number(invoiceData.discount_usd) : 0,
            profit_syp: invoiceData.profit_syp ? Number(invoiceData.profit_syp) : 0,
            profit_usd: invoiceData.profit_usd ? Number(invoiceData.profit_usd) : 0,
          })
          .select()
          .single();

        if (invError) throw invError;

        // 3. Insert individual sale records
        const salesRecords = invoiceData.items.map(item => ({
          invoice_id: invoice.id,
          product_id: item.product_id,
          product_name: item.product_name,
          customer_id: invoiceData.customer_id,
          customer_name: invoiceData.customer_name || 'زبون نقدي',
          quantity: Number(item.quantity),
          price_per_unit_usd: Number(item.price_usd),
          total_usd: Number(item.quantity * item.price_usd),
          profit_usd: Number((item.price_usd - (item.cost_usd || 0)) * item.quantity),
          sale_date: saleDate,
        }));

        const { error: salesError } = await supabase.from('sales').insert(salesRecords);
        if (salesError) throw salesError;

        // 4. Deduct stock for each product & log movement
        for (const item of invoiceData.items) {
          const { data: product } = await supabase
            .from('products')
            .select('quantity, stock_grams, sold_by_weight')
            .eq('id', item.product_id)
            .single();
          
          const currentQty = product?.quantity ?? 0;
          const newQty = Math.max(0, currentQty - item.quantity);

          const currentGrams = product?.stock_grams !== undefined ? product.stock_grams : (product?.sold_by_weight ? currentQty * 1000 : undefined);
          const newGrams = currentGrams !== undefined ? Math.max(0, currentGrams - (item.quantity * 1000)) : undefined;
          
          await supabase
            .from('products')
            .update({ 
              quantity: newQty, 
              stock_grams: newGrams, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', item.product_id);

          // 5. Log inventory movement
          await supabase.from('inventory_movements').insert({
            product_id: item.product_id,
            product_name: item.product_name,
            movement_type: 'out',
            quantity_before: currentQty,
            quantity_after: newQty,
            change_amount: -item.quantity,
            reference_id: invoiceNumber,
            date: saleDate,
          });
        }

        // 6. Update customer if not walk-in
        if (invoiceData.customer_id) {
          const { data: customer } = await supabase
            .from('customers')
            .select('total_purchases_usd, loyalty_points')
            .eq('id', invoiceData.customer_id)
            .single();

          const currentTotal = customer?.total_purchases_usd ?? 0;
          const currentPoints = customer?.loyalty_points ?? 0;

          const newTotal = currentTotal + invoiceData.total_usd;
          const newPoints = currentPoints + Math.floor(invoiceData.total_usd * 10);
          const tier = newPoints >= 1000 ? 'platinum' : newPoints >= 500 ? 'gold' : newPoints >= 200 ? 'silver' : 'bronze';

          await supabase.from('customers').update({
            total_purchases_usd: newTotal,
            loyalty_points: newPoints,
            loyalty_tier: tier,
          }).eq('id', invoiceData.customer_id);
        }

        // 7. Update cash register balance
        const cashAddedUsd = invoiceData.payment_method === 'cash'
          ? invoiceData.total_usd
          : invoiceData.payment_method === 'partial'
            ? invoiceData.paid_usd
            : 0;

        const cashAddedSyp = invoiceData.payment_method === 'cash'
          ? invoiceData.total_syp
          : invoiceData.payment_method === 'partial'
            ? invoiceData.paid_syp
            : 0;

        if (cashAddedUsd > 0 || cashAddedSyp > 0) {
          const { data: openShifts } = await supabase
            .from('cash_registers')
            .select('*')
            .eq('status', 'open');
          
          const openShift = openShifts?.[0];
          
          if (openShift) {
            const closingUsd = (openShift.closing_balance_usd ?? openShift.opening_balance_usd) + cashAddedUsd;
            const closingSyp = (openShift.closing_balance_syp ?? openShift.opening_balance_syp) + cashAddedSyp;

            await supabase.from('cash_registers').update({
              closing_balance_usd: closingUsd,
              closing_balance_syp: closingSyp,
            }).eq('id', openShift.id);
          }
        }

        // 8. Update Employee Sales
        if (currentUser?.id) {
          const { data: emp } = await supabase.from('employees').select('total_sales_usd').eq('id', currentUser.id).single();
          if (emp) {
            await supabase.from('employees').update({
              total_sales_usd: (emp.total_sales_usd ?? 0) + invoiceData.total_usd,
            }).eq('id', currentUser.id);
          }
        }

        return invoice as Invoice;
      }

      // Production: Secure, atomic server-side transaction via custom PL/pgSQL function
      const { data: invoice, error: rpcError } = await supabase.rpc('create_invoice_atomic', {
        p_customer_id: invoiceData.customer_id,
        p_customer_name: invoiceData.customer_name || 'زبون نقدي',
        p_items: invoiceData.items,
        p_total_usd: Number(invoiceData.total_usd),
        p_total_syp: Number(invoiceData.total_syp),
        p_payment_method: invoiceData.payment_method,
        p_paid_usd: Number(invoiceData.paid_usd),
        p_paid_syp: Number(invoiceData.paid_syp),
        p_remaining_debt_usd: Number(invoiceData.remaining_debt_usd),
        p_remaining_debt_syp: Number(invoiceData.remaining_debt_syp),
        p_employee_id: currentUser?.id || null,
        p_discount_usd: invoiceData.discount_usd ? Number(invoiceData.discount_usd) : 0,
        p_discount_syp: invoiceData.discount_syp ? Number(invoiceData.discount_syp) : 0,
        p_profit_usd: invoiceData.profit_usd ? Number(invoiceData.profit_usd) : 0,
        p_profit_syp: invoiceData.profit_syp ? Number(invoiceData.profit_syp) : 0,
        p_sale_date: invoiceData.sale_date || new Date().toISOString()
      });

      if (rpcError) {
        throw rpcError;
      }

      return invoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cash_registers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم تسجيل عملية البيع وإصدار الفاتورة بنجاح');
    },
    onError: (err: any) => {
      toast.error(`فشل تسجيل البيع: ${err.message}`);
    },
  });

  // Record debt payment
  const recordDebtPayment = useMutation({
    mutationFn: async ({ invoiceId, amountUsd }: { invoiceId: string; amountUsd: number }) => {
      const hasSupabaseCreds = import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY;
      const activeRate = settings?.usd_to_syp_rate ?? 15000;
      const amountSyp = Math.round(amountUsd * activeRate);

      if (!hasSupabaseCreds) {
        // Fallback or demo mode - existing logic
        // Get current invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();
        if (invoiceError || !invoice) throw new Error('لم يتم العثور على الفاتورة');

        const remainingDebtUsd = Number(invoice.remaining_debt_usd);
        const newRemainingDebtUsd = Math.max(0, remainingDebtUsd - amountUsd);
        const newRemainingDebtSyp = Math.round(newRemainingDebtUsd * activeRate);

        const paidUsd = Number(invoice.paid_usd);
        const newPaidUsd = paidUsd + amountUsd;
        const newPaidSyp = Math.round(newPaidUsd * activeRate);

        const newMethod: PaymentMethod = newRemainingDebtUsd === 0 ? 'cash' : 'partial';

        // Update invoice
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            remaining_debt_usd: newRemainingDebtUsd,
            remaining_debt_syp: newRemainingDebtSyp,
            paid_usd: newPaidUsd,
            paid_syp: newPaidSyp,
            payment_method: newMethod,
          })
          .eq('id', invoiceId);

        if (updateError) throw updateError;

        // Record payment
        const { error: paymentError } = await supabase.from('debt_payments').insert({
          invoice_id: invoiceId,
          customer_name: invoice.customer_name,
          amount_usd: amountUsd,
          amount_syp: amountSyp,
        });

        if (paymentError) throw paymentError;

        // Update cash register
        const { data: openShifts } = await supabase
          .from('cash_registers')
          .select('*')
          .eq('status', 'open');
        const openShift = openShifts?.[0];

        if (openShift) {
          const closingUsd = (openShift.closing_balance_usd ?? openShift.opening_balance_usd) + amountUsd;
          const closingSyp = (openShift.closing_balance_syp ?? openShift.opening_balance_syp) + amountSyp;

          await supabase.from('cash_registers').update({
            closing_balance_usd: closingUsd,
            closing_balance_syp: closingSyp,
          }).eq('id', openShift.id);
        }
        return;
      }

      // Production: Atomic server-side transaction via custom RPC
      const { data, error: rpcError } = await supabase.rpc('record_debt_payment_atomic', {
        p_invoice_id: invoiceId,
        p_amount_usd: amountUsd,
        p_amount_syp: amountSyp
      });

      if (rpcError) {
        throw rpcError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['cash_registers'] });
      toast.success('تم تسجيل دفعة الدين بنجاح وتحديث الصندوق');
    },
    onError: (err: any) => {
      toast.error(`فشل تسجيل الدفعة: ${err.message}`);
    },
  });

  return {
    invoices: invoicesQuery.data ?? [],
    todayInvoices: todayInvoicesQuery.data ?? [],
    isLoading: invoicesQuery.isLoading || todayInvoicesQuery.isLoading,
    createInvoice: createInvoice.mutateAsync,
    isCreating: createInvoice.isPending,
    recordDebtPayment: recordDebtPayment.mutateAsync,
    isPayingDebt: recordDebtPayment.isPending,
  };
}
