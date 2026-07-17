import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Invoice, PaymentMethod, DebtPayment } from '../types';
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

export interface InvoiceLineItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  price_usd: number;
  price_syp: number;
  cost_usd: number;
  is_weight: boolean;
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

  // سجل كل دفعات الديون مع بيانات الفاتورة الأصلية (للتوزيع النسبي للربح على يوم القبض الفعلي)
  const debtPaymentsQuery = useQuery({
    queryKey: ['debt_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*, invoice:invoices(total_usd, profit_usd, items)')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) {
        toast.error(`خطأ في تحميل سجل تسديد الديون: ${error.message}`);
        throw error;
      }
      return data as DebtPayment[];
    },
    staleTime: 1000 * 60,
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
      queryClient.invalidateQueries({ queryKey: ['debt_payments'] });
      toast.success('تم تسجيل دفعة الدين بنجاح وتحديث الصندوق');
    },
    onError: (err: any) => {
      toast.error(`فشل تسجيل الدفعة: ${err.message}`);
    },
  });

  // Edit the overall (total) price of an already-issued invoice — recomputes remaining debt & customer stats
  const updateInvoiceTotal = useMutation({
    mutationFn: async ({ invoiceId, newTotalUsd }: { invoiceId: string; newTotalUsd: number }) => {
      const activeRate = settings?.usd_to_syp_rate ?? 15000;

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      if (fetchError || !invoice) throw new Error('لم يتم العثور على الفاتورة');

      const oldTotalUsd = Number(invoice.total_usd);
      const paidUsd = Number(invoice.paid_usd);
      const newTotalSyp = Math.round(newTotalUsd * activeRate);

      const newRemainingDebtUsd = Math.max(0, newTotalUsd - paidUsd);
      const newRemainingDebtSyp = Math.round(newRemainingDebtUsd * activeRate);
      const newMethod: PaymentMethod = newRemainingDebtUsd <= 0 ? 'cash' : (paidUsd > 0 ? 'partial' : 'debt');

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          total_usd: newTotalUsd,
          total_syp: newTotalSyp,
          remaining_debt_usd: newRemainingDebtUsd,
          remaining_debt_syp: newRemainingDebtSyp,
          payment_method: newMethod,
        })
        .eq('id', invoiceId);
      if (updateError) throw updateError;

      // Reflect the price difference on the customer's cumulative purchase total
      if (invoice.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('total_purchases_usd')
          .eq('id', invoice.customer_id)
          .single();
        if (customer) {
          const diff = newTotalUsd - oldTotalUsd;
          const newTotal = Math.max(0, Number(customer.total_purchases_usd ?? 0) + diff);
          await supabase.from('customers').update({ total_purchases_usd: newTotal }).eq('id', invoice.customer_id);
        }
      }

      // Audit trail
      if (currentUser?.id) {
        try {
          await supabase.from('audit_logs').insert({
            employee_id: currentUser.id,
            employee_name: currentUser.name,
            action_type: 'edit_invoice',
            entity_type: 'invoice',
            entity_id: invoiceId,
            entity_name: invoice.invoice_number,
            old_value: { total_usd: oldTotalUsd, total_syp: invoice.total_syp, remaining_debt_usd: invoice.remaining_debt_usd },
            new_value: { total_usd: newTotalUsd, total_syp: newTotalSyp, remaining_debt_usd: newRemainingDebtUsd },
            description: `تعديل السعر الإجمالي للفاتورة ${invoice.invoice_number} من $${oldTotalUsd.toFixed(2)} إلى $${newTotalUsd.toFixed(2)}`,
          });
        } catch (err) {
          console.warn('Audit log failed:', err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast.success('تم تعديل السعر الإجمالي للفاتورة بنجاح');
    },
    onError: (err: any) => {
      toast.error(`فشل تعديل الفاتورة: ${err.message}`);
    },
  });

  // Edit the actual products/items sold on an invoice — reconciles stock, totals, debt & customer/employee stats
  const updateInvoiceItems = useMutation({
    mutationFn: async ({ invoiceId, items }: { invoiceId: string; items: InvoiceLineItemInput[] }) => {
      if (!items || items.length === 0) throw new Error('يجب أن تحتوي الفاتورة على منتج واحد على الأقل');

      const activeRate = settings?.usd_to_syp_rate ?? 15000;

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      if (fetchError || !invoice) throw new Error('لم يتم العثور على الفاتورة');

      const oldItems = (invoice.items || []) as any[];

      // 1. Reconcile stock — apply only the net difference per product (handles added/removed/changed items)
      const qtyByProduct = new Map<string, { old: number; new: number; name: string }>();
      oldItems.forEach((it: any) => {
        const entry = qtyByProduct.get(it.product_id) || { old: 0, new: 0, name: it.product_name };
        entry.old += Number(it.quantity);
        qtyByProduct.set(it.product_id, entry);
      });
      items.forEach((it) => {
        const entry = qtyByProduct.get(it.product_id) || { old: 0, new: 0, name: it.product_name };
        entry.new += Number(it.quantity);
        entry.name = it.product_name;
        qtyByProduct.set(it.product_id, entry);
      });

      for (const [productId, { old: oldQty, new: newQty, name }] of qtyByProduct.entries()) {
        const diff = newQty - oldQty; // positive => extra stock must be deducted, negative => stock must be restored
        if (diff === 0) continue;

        const { data: product } = await supabase
          .from('products')
          .select('quantity, stock_grams, sold_by_weight')
          .eq('id', productId)
          .single();

        const currentQty = product?.quantity ?? 0;
        const newProductQty = Math.max(0, currentQty - diff);
        const currentGrams = product?.stock_grams !== undefined ? product.stock_grams : (product?.sold_by_weight ? currentQty * 1000 : undefined);
        const newGrams = currentGrams !== undefined ? Math.max(0, currentGrams - diff * 1000) : undefined;

        await supabase.from('products').update({
          quantity: newProductQty,
          stock_grams: newGrams,
          updated_at: new Date().toISOString(),
        }).eq('id', productId);

        await supabase.from('inventory_movements').insert({
          product_id: productId,
          product_name: name,
          movement_type: 'adjustment',
          quantity_before: currentQty,
          quantity_after: newProductQty,
          change_amount: -diff,
          reference_id: invoice.invoice_number,
          date: new Date().toISOString(),
        });
      }

      // 2. Recompute totals from the new item list (existing discount is preserved as-is)
      const subtotalUsd = items.reduce((acc, it) => acc + Number(it.quantity) * Number(it.price_usd), 0);
      const discountUsd = Number(invoice.discount_usd || 0);
      const newTotalUsd = Math.max(0, subtotalUsd - discountUsd);
      const newTotalSyp = Math.round(newTotalUsd * activeRate);

      const totalCostUsd = items.reduce((acc, it) => acc + Number(it.quantity) * Number(it.cost_usd || 0), 0);
      const newProfitUsd = Math.max(0, newTotalUsd - totalCostUsd);
      const newProfitSyp = Math.round(newProfitUsd * activeRate);

      const paidUsd = Number(invoice.paid_usd);
      const newRemainingDebtUsd = Math.max(0, newTotalUsd - paidUsd);
      const newRemainingDebtSyp = Math.round(newRemainingDebtUsd * activeRate);
      const newMethod: PaymentMethod = newRemainingDebtUsd <= 0 ? 'cash' : (paidUsd > 0 ? 'partial' : 'debt');

      // 3. Persist the new items + recomputed totals on the invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          items,
          total_usd: newTotalUsd,
          total_syp: newTotalSyp,
          remaining_debt_usd: newRemainingDebtUsd,
          remaining_debt_syp: newRemainingDebtSyp,
          payment_method: newMethod,
          profit_usd: newProfitUsd,
          profit_syp: newProfitSyp,
        })
        .eq('id', invoiceId);
      if (updateError) throw updateError;

      // 4. Replace the linked per-item "sales" rows to match the new item list
      await supabase.from('sales').delete().eq('invoice_id', invoiceId);
      const salesRecords = items.map(item => ({
        invoice_id: invoiceId,
        product_id: item.product_id,
        product_name: item.product_name,
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name,
        quantity: Number(item.quantity),
        price_per_unit_usd: Number(item.price_usd),
        total_usd: Number(item.quantity * item.price_usd),
        profit_usd: Number((item.price_usd - (item.cost_usd || 0)) * item.quantity),
        sale_date: invoice.sale_date,
      }));
      if (salesRecords.length > 0) {
        const { error: salesError } = await supabase.from('sales').insert(salesRecords);
        if (salesError) throw salesError;
      }

      // 5. Reflect the price difference on the customer's cumulative purchase total
      const oldTotalUsd = Number(invoice.total_usd);
      const totalDiff = newTotalUsd - oldTotalUsd;
      if (invoice.customer_id && totalDiff !== 0) {
        const { data: customer } = await supabase
          .from('customers')
          .select('total_purchases_usd')
          .eq('id', invoice.customer_id)
          .single();
        if (customer) {
          const newCustTotal = Math.max(0, Number(customer.total_purchases_usd ?? 0) + totalDiff);
          await supabase.from('customers').update({ total_purchases_usd: newCustTotal }).eq('id', invoice.customer_id);
        }
      }

      // 6. Reflect the price difference on the employee's recorded sales total
      if (invoice.employee_id && totalDiff !== 0) {
        const { data: emp } = await supabase.from('employees').select('total_sales_usd').eq('id', invoice.employee_id).single();
        if (emp) {
          await supabase.from('employees').update({
            total_sales_usd: Math.max(0, Number(emp.total_sales_usd ?? 0) + totalDiff),
          }).eq('id', invoice.employee_id);
        }
      }

      // 7. Audit trail
      if (currentUser?.id) {
        try {
          await supabase.from('audit_logs').insert({
            employee_id: currentUser.id,
            employee_name: currentUser.name,
            action_type: 'edit_invoice',
            entity_type: 'invoice',
            entity_id: invoiceId,
            entity_name: invoice.invoice_number,
            old_value: { items: oldItems, total_usd: oldTotalUsd },
            new_value: { items, total_usd: newTotalUsd },
            description: `تعديل منتجات الفاتورة ${invoice.invoice_number} — السعر الإجمالي الجديد $${newTotalUsd.toFixed(2)}`,
          });
        } catch (err) {
          console.warn('Audit log failed:', err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast.success('تم تعديل منتجات الفاتورة بنجاح وتحديث المخزون والحسابات');
    },
    onError: (err: any) => {
      toast.error(`فشل تعديل منتجات الفاتورة: ${err.message}`);
    },
  });

  // Permanently delete an invoice and reverse every linked transaction (stock, cash, customer, employee stats)
  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      if (fetchError || !invoice) throw new Error('لم يتم العثور على الفاتورة');

      // 1. Remove linked sale rows & debt-payment history for this invoice
      await supabase.from('sales').delete().eq('invoice_id', invoiceId);
      await supabase.from('debt_payments').delete().eq('invoice_id', invoiceId);

      // 2. Restore stock for every item sold on this invoice
      const items = (invoice.items || []) as any[];
      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('quantity, stock_grams, sold_by_weight')
          .eq('id', item.product_id)
          .single();

        if (product) {
          const currentQty = product.quantity ?? 0;
          const newQty = currentQty + Number(item.quantity);
          const currentGrams = product.stock_grams !== undefined ? product.stock_grams : (product.sold_by_weight ? currentQty * 1000 : undefined);
          const newGrams = currentGrams !== undefined ? currentGrams + Number(item.quantity) * 1000 : undefined;

          await supabase.from('products').update({
            quantity: newQty,
            stock_grams: newGrams,
            updated_at: new Date().toISOString(),
          }).eq('id', item.product_id);

          await supabase.from('inventory_movements').insert({
            product_id: item.product_id,
            product_name: item.product_name,
            movement_type: 'in',
            quantity_before: currentQty,
            quantity_after: newQty,
            change_amount: Number(item.quantity),
            reference_id: invoice.invoice_number,
            date: new Date().toISOString(),
          });
        }
      }

      // 3. Reverse the customer's cumulative purchases & loyalty points
      if (invoice.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('total_purchases_usd, loyalty_points')
          .eq('id', invoice.customer_id)
          .single();
        if (customer) {
          const newTotal = Math.max(0, Number(customer.total_purchases_usd ?? 0) - Number(invoice.total_usd));
          const pointsEarned = Math.floor(Number(invoice.total_usd) * 10);
          const newPoints = Math.max(0, Number(customer.loyalty_points ?? 0) - pointsEarned);
          const tier = newPoints >= 1000 ? 'platinum' : newPoints >= 500 ? 'gold' : newPoints >= 200 ? 'silver' : 'bronze';
          await supabase.from('customers').update({
            total_purchases_usd: newTotal,
            loyalty_points: newPoints,
            loyalty_tier: tier,
          }).eq('id', invoice.customer_id);
        }
      }

      // 4. Reverse the employee's recorded sales total
      if (invoice.employee_id) {
        const { data: emp } = await supabase.from('employees').select('total_sales_usd').eq('id', invoice.employee_id).single();
        if (emp) {
          await supabase.from('employees').update({
            total_sales_usd: Math.max(0, Number(emp.total_sales_usd ?? 0) - Number(invoice.total_usd)),
          }).eq('id', invoice.employee_id);
        }
      }

      // 5. Reverse whatever cash was actually collected for this invoice from the open shift
      const paidUsd = Number(invoice.paid_usd || 0);
      const paidSyp = Number(invoice.paid_syp || 0);
      if (paidUsd > 0 || paidSyp > 0) {
        const { data: openShifts } = await supabase.from('cash_registers').select('*').eq('status', 'open');
        const openShift = openShifts?.[0];
        if (openShift) {
          const closingUsd = (openShift.closing_balance_usd ?? openShift.opening_balance_usd) - paidUsd;
          const closingSyp = (openShift.closing_balance_syp ?? openShift.opening_balance_syp) - paidSyp;
          await supabase.from('cash_registers').update({
            closing_balance_usd: closingUsd,
            closing_balance_syp: closingSyp,
          }).eq('id', openShift.id);
        }
      }

      // 6. Audit trail before the invoice row is gone
      if (currentUser?.id) {
        try {
          await supabase.from('audit_logs').insert({
            employee_id: currentUser.id,
            employee_name: currentUser.name,
            action_type: 'cancel_invoice',
            entity_type: 'invoice',
            entity_id: invoiceId,
            entity_name: invoice.invoice_number,
            old_value: invoice,
            new_value: null,
            description: `حذف الفاتورة ${invoice.invoice_number} للعميل ${invoice.customer_name} بقيمة $${Number(invoice.total_usd).toFixed(2)}`,
          });
        } catch (err) {
          console.warn('Audit log failed:', err);
        }
      }

      // 7. Finally remove the invoice itself
      const { error: deleteError } = await supabase.from('invoices').delete().eq('id', invoiceId);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['debt_payments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['cash_registers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast.success('تم حذف الفاتورة وعكس كافة الحركات المرتبطة بها بنجاح');
    },
    onError: (err: any) => {
      toast.error(`فشل حذف الفاتورة: ${err.message}`);
    },
  });

  return {
    invoices: invoicesQuery.data ?? [],
    todayInvoices: todayInvoicesQuery.data ?? [],
    debtPayments: debtPaymentsQuery.data ?? [],
    isLoading: invoicesQuery.isLoading || todayInvoicesQuery.isLoading,
    createInvoice: createInvoice.mutateAsync,
    isCreating: createInvoice.isPending,
    recordDebtPayment: recordDebtPayment.mutateAsync,
    isPayingDebt: recordDebtPayment.isPending,
    updateInvoiceTotal: updateInvoiceTotal.mutateAsync,
    isUpdatingInvoice: updateInvoiceTotal.isPending,
    updateInvoiceItems: updateInvoiceItems.mutateAsync,
    isUpdatingInvoiceItems: updateInvoiceItems.isPending,
    deleteInvoice: deleteInvoice.mutateAsync,
    isDeletingInvoice: deleteInvoice.isPending,
  };
}
