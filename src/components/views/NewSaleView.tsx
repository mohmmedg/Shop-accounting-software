import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { useSales } from '../../hooks/useSales';
import { useSettings } from '../../hooks/useSettings';
import { PageSkeleton } from '../shared/PageSkeleton';
import {
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Sparkles,
  DollarSign,
  Clock,
  CheckCircle,
  X,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface BasketItem {
  product: any;
  quantity: number;
  price_usd: number;
  sale_mode: 'qty' | 'weight' | 'amount';
  is_weight: boolean;
}

export const NewSaleView: React.FC = () => {
  const { products, isLoading: loadingProducts } = useProducts();
  const { customers, isLoading: loadingCustomers } = useCustomers();
  const { createInvoice, isCreating: submittingSale } = useSales();
  const { settings, isLoading: loadingSettings } = useSettings();

  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Basket form item details
  const [selectedProductId, setSelectedProductId] = useState('');
  const [sellingMode, setSellingMode] = useState<'qty' | 'weight' | 'amount'>('qty');
  const [itemQty, setItemQty] = useState('1');
  const [itemWeight, setItemWeight] = useState('1.00000');
  const [itemTargetAmountSyp, setItemTargetAmountSyp] = useState('50000');
  const [customPriceUsd, setCustomPriceUsd] = useState('');

  // Invoice Adjustments — تعديل مباشر على السعر النهائي بدلاً من إدخال خصم/إضافة منفصلين
  const [finalPriceInput, setFinalPriceInput] = useState(''); // فارغ = لا يوجد تعديل يدوي، يُستخدم المجموع الفرعي كما هو

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debt' | 'partial'>('cash');
  const [partialAmountPaidUsd, setPartialAmountPaidUsd] = useState('');

  // Dialog Overlays
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const productSearchRef = useRef<HTMLInputElement>(null);

  // Keyboard binds
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'F2' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        setShowProductSearch(prev => !prev);
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (basket.length > 0) {
          setShowConfirmDialog(true);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowProductSearch(false);
        setShowConfirmDialog(false);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [basket]);

  useEffect(() => {
    if (showProductSearch) {
      productSearchRef.current?.focus();
    }
  }, [showProductSearch]);

  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const activeProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Adjust active product initial sell price based on customer and mode
  useEffect(() => {
    if (activeProduct) {
      const tierPrice = activeCustomer
        ? (activeCustomer.customer_type === 'wholesale' ? Number(activeProduct.price_tiers?.wholesale_usd || activeProduct.price_usd * 0.9) : (activeCustomer.customer_type === 'vip' ? Number(activeProduct.price_tiers?.vip_usd || activeProduct.price_usd * 0.95) : activeProduct.price_usd))
        : activeProduct.price_usd;
      setCustomPriceUsd(tierPrice.toFixed(2));
      if (activeProduct.sold_by_weight) {
        setSellingMode('weight');
      } else {
        setSellingMode('qty');
      }
    } else {
      setCustomPriceUsd('');
    }
  }, [selectedProductId, activeProduct, selectedCustomerId, activeCustomer]);

  const showStockWarning = useMemo(() => {
    if (!activeProduct) return false;
    return activeProduct.quantity <= activeProduct.warning_limit;
  }, [activeProduct]);

  const searchedProducts = useMemo(() => {
    const f = searchFilter.toLowerCase();
    return products.filter(p => {
      const name = p.name || '';
      const barcode = p.barcode || '';
      return name.toLowerCase().includes(f) || barcode.toLowerCase().includes(f);
    });
  }, [products, searchFilter]);

  // Add Item to Basket
  const handleAddToBasket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;

    let qty = 1;
    let finalPriceUsd = parseFloat(customPriceUsd) || activeProduct.price_usd;

    if (sellingMode === 'qty') {
      qty = parseInt(itemQty) || 1;
      if (qty <= 0) {
        toast.error('الرجاء إدخال كمية صحيحة');
        return;
      }
    } else if (sellingMode === 'weight') {
      qty = parseFloat(itemWeight) || 1.0;
      if (qty <= 0) {
        toast.error('الرجاء إدخال وزن صحيح بالكيلو');
        return;
      }
    } else if (sellingMode === 'amount') {
      const amountSyp = parseFloat(itemTargetAmountSyp) || 0;
      if (amountSyp <= 0) {
        toast.error('الرجاء إدخال مبلغ صحيح');
        return;
      }
      const targetUsd = amountSyp / (settings?.usd_to_syp_rate || 15000);
      qty = targetUsd / finalPriceUsd;
      
      if (!activeProduct.sold_by_weight) {
        qty = Math.round(qty);
        if (qty === 0) qty = 1;
      }
    }

    const isWeight = activeProduct.sale_type === 'weight' || activeProduct.sold_by_weight;
    const stockGramsAvailable = activeProduct.stock_grams !== undefined 
      ? activeProduct.stock_grams 
      : (isWeight ? activeProduct.quantity * 1000 : undefined);

    if (isWeight && stockGramsAvailable !== undefined) {
      const requestedGrams = qty * 1000;
      if (requestedGrams > stockGramsAvailable) {
        toast.error(`الوزن المطلوب (${requestedGrams.toLocaleString()} غ) يتجاوز المخزون المتوفر بالغرام! المتوفر: ${stockGramsAvailable.toLocaleString()} غ`);
        return;
      }
    } else {
      if (qty > activeProduct.quantity) {
        toast.error(`الكمية المطلوبة (${qty.toFixed(3)}) تتجاوز الرصيد المتوفر في المستودع: ${activeProduct.quantity}`);
        return;
      }
    }

    setBasket(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === activeProduct.id);
      if (existingIdx > -1) {
        const item = prev[existingIdx];
        const newQty = item.quantity + qty;
        if (isWeight && stockGramsAvailable !== undefined) {
          const requestedGrams = newQty * 1000;
          if (requestedGrams > stockGramsAvailable) {
            toast.error(`مجموع الوزن في السلة (${requestedGrams.toLocaleString()} غ) يتجاوز المخزون المتوفر بالغرام! المتوفر: ${stockGramsAvailable.toLocaleString()} غ`);
            return prev;
          }
        } else {
          if (newQty > activeProduct.quantity) {
            toast.error(`مجموع الكميات في السلة تتجاوز رصيد المستودع! الأقصى هو ${activeProduct.quantity}`);
            return prev;
          }
        }
        const updated = [...prev];
        updated[existingIdx] = { ...item, quantity: newQty };
        return updated;
      } else {
        return [...prev, {
          product: activeProduct,
          quantity: qty,
          price_usd: finalPriceUsd,
          sale_mode: sellingMode,
          is_weight: activeProduct.sold_by_weight
        }];
      }
    });

    setSelectedProductId('');
    setItemQty('1');
    setItemWeight('1.00000');
    setCustomPriceUsd('');
  };

  const handleRemoveItem = (index: number) => {
    setBasket(prev => prev.filter((_, idx) => idx !== index));
  };

  // BASKET MATHEMATICS
  const totals = useMemo(() => {
    const rate = settings?.usd_to_syp_rate || 15000;
    const subtotalUsd = basket.reduce((acc, item) => acc + item.quantity * item.price_usd, 0);
    const subtotalSyp = Math.round(subtotalUsd * rate);

    // السعر النهائي: إن لم يُعدّله المستخدم يدوياً يبقى مطابقاً للمجموع الفرعي
    const hasOverride = finalPriceInput.trim() !== '';
    const rawFinalUsd = hasOverride ? (parseFloat(finalPriceInput) || 0) : subtotalUsd;
    const finalUsd = Math.max(0, rawFinalUsd);
    const finalSyp = Math.round(finalUsd * rate);

    // الفرق بين السعر النهائي والمجموع الفرعي: سالب = خصم، موجب = إضافة/رسوم
    const diffUsd = finalUsd - subtotalUsd;
    const discountUsd = diffUsd < 0 ? Math.abs(diffUsd) : 0;
    const discountSyp = Math.round(discountUsd * rate);
    const additionUsd = diffUsd > 0 ? diffUsd : 0;
    const additionSyp = Math.round(additionUsd * rate);

    const totalCostUsd = basket.reduce((acc, item) => acc + item.quantity * (item.product.cost_usd || 0), 0);
    const totalCostSyp = Math.round(totalCostUsd * rate);

    const expectedProfitUsd = Math.max(0, finalUsd - totalCostUsd);
    const expectedProfitSyp = Math.max(0, finalSyp - totalCostSyp);

    return {
      subtotalUsd,
      subtotalSyp,
      hasOverride,
      diffUsd,
      discountSyp,
      discountUsd,
      additionSyp,
      additionUsd,
      finalUsd,
      finalSyp,
      expectedProfitUsd,
      expectedProfitSyp,
      totalCostUsd,
      totalCostSyp
    };
  }, [basket, finalPriceInput, settings]);

  const remainingDebts = useMemo(() => {
    let paidUsd = totals.finalUsd;
    if (paymentMethod === 'debt') {
      paidUsd = 0;
    } else if (paymentMethod === 'partial') {
      paidUsd = parseFloat(partialAmountPaidUsd) || 0;
    }

    const remainingUsd = Math.max(0, totals.finalUsd - paidUsd);
    const remainingSyp = Math.round(remainingUsd * (settings?.usd_to_syp_rate || 15000));

    return {
      paidUsd,
      paidSyp: Math.round(paidUsd * (settings?.usd_to_syp_rate || 15000)),
      remainingUsd,
      remainingSyp
    };
  }, [totals, paymentMethod, partialAmountPaidUsd, settings]);

  // SAVE INVOICE COMMITTAL
  const handleFinalSave = async () => {
    if (submittingSale) return; // منع إرسال الفاتورة أكثر من مرة أثناء الحفظ
    if (basket.length === 0) return;
    if (paymentMethod === 'debt' && !selectedCustomerId) {
      toast.error('الرجاء اختيار العميل لحفظ هذه الفاتورة بالدين الآجل');
      return;
    }

    const items = basket.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      price_usd: item.price_usd,
      price_syp: Math.round(item.price_usd * (settings?.usd_to_syp_rate || 15000)),
      cost_usd: item.product.cost_usd || 0,
      is_weight: item.is_weight
    }));

    try {
      await createInvoice({
        customer_id: selectedCustomerId || null,
        customer_name: activeCustomer ? activeCustomer.name : 'عميل نقدي عام',
        items,
        total_usd: totals.finalUsd,
        total_syp: totals.finalSyp,
        payment_method: paymentMethod,
        paid_usd: remainingDebts.paidUsd,
        paid_syp: remainingDebts.paidSyp,
        remaining_debt_usd: remainingDebts.remainingUsd,
        remaining_debt_syp: remainingDebts.remainingSyp,
        sale_date: new Date().toISOString(),
        discount_syp: totals.discountSyp,
        discount_usd: totals.discountUsd,
        profit_syp: totals.expectedProfitSyp,
        profit_usd: totals.expectedProfitUsd
      });

      toast.success('تم تسجيل وحفظ الفاتورة النهائية بنجاح');
      setBasket([]);
      setSelectedCustomerId('');
      setFinalPriceInput('');
      setPartialAmountPaidUsd('');
      setPaymentMethod('cash');
      setShowConfirmDialog(false);
    } catch (err) {}
  };

  if (loadingProducts || loadingCustomers || loadingSettings) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right font-bold" dir="rtl" id="newsale-panel">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span>تسجيل بيع متقدم وتدرج أسعار</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">تخصيص الخصومات والإضافات، بيع الأجزاء بالمبلغ أو الأوزان الدقيقة، وإدارة الذمم والذمم الجزئية للعملاء</p>
        </div>
        <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-xl font-mono">F2 للبحث | Ctrl+Enter لتأكيد الحفظ</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="newsale-workspace">
        
        {/* Left Side: Basket Composer & checkout forms */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Add product composer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>إدراج صنف للفاتورة المفتوحة</span>
            </h3>

            <form onSubmit={handleAddToBasket} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Product Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">السلعة أو المنتج</label>
                  <button
                    type="button"
                    onClick={() => setShowProductSearch(true)}
                    className="w-full flex justify-between items-center p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 font-bold hover:bg-slate-900 text-right cursor-pointer"
                  >
                    <span>{activeProduct ? activeProduct.name : 'ابحث واختر سلعة... (اضغط F2)'}</span>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </button>
                  
                  {activeProduct && (
                    <span className="block text-[10px] font-extrabold text-emerald-400">
                      متاح في المستودع: {activeProduct.quantity} {activeProduct.sold_by_weight ? 'كغ' : 'قطعة'}
                    </span>
                  )}
                </div>

                {/* Selling mode choice */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">طريقة تحديد كمية البيع</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850 text-[10px] font-black">
                    <button
                      type="button"
                      disabled={activeProduct?.sold_by_weight}
                      onClick={() => setSellingMode('qty')}
                      className={`py-2 rounded-lg cursor-pointer ${sellingMode === 'qty' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'} disabled:opacity-30`}
                    >
                      كمية عددية
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellingMode('weight')}
                      className={`py-2 rounded-lg cursor-pointer ${sellingMode === 'weight' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      بالوزن كغ
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellingMode('amount')}
                      className={`py-2 rounded-lg cursor-pointer ${sellingMode === 'amount' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      بالمبلغ ل.س
                    </button>
                  </div>
                </div>
              </div>

              {/* Mode Specific input options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
                {sellingMode === 'qty' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">الكمية المطلوبة (بالقطعة)</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 font-mono font-black text-center text-slate-100 focus:outline-none"
                    />
                  </div>
                )}

                {sellingMode === 'weight' && (
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">الوزن بالكيلوجرام:</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        required
                        value={itemWeight}
                        onChange={(e) => setItemWeight(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-2 font-mono font-black text-center text-slate-100 focus:outline-none"
                      />
                      <div className="flex gap-1 shrink-0 font-black text-[9px]">
                        <button type="button" onClick={() => setItemWeight('0.250')} className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 rounded-lg cursor-pointer">250غ</button>
                        <button type="button" onClick={() => setItemWeight('0.500')} className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 rounded-lg cursor-pointer">500غ</button>
                        <button type="button" onClick={() => setItemWeight('1.000')} className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 rounded-lg cursor-pointer">1كغ</button>
                      </div>
                    </div>
                    {activeProduct && (
                      <div className="text-right text-[11px] text-amber-400 font-bold pt-1.5 flex justify-between items-center bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10 mt-1">
                        <span>السعر المقدر الناتج:</span>
                        <span className="font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs font-black text-amber-300">
                          {(() => {
                            const finalPriceUsd = parseFloat(customPriceUsd) || activeProduct.price_usd;
                            const priceSyp = finalPriceUsd * (settings?.usd_to_syp_rate || 15000);
                            const wt = parseFloat(itemWeight) || 0;
                            return Math.round(wt * priceSyp).toLocaleString();
                          })()} ل.س
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {sellingMode === 'amount' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">مبلغ الشراء المعادل (ل.س)</label>
                      <input
                        type="number"
                        value={itemTargetAmountSyp}
                        onChange={(e) => setItemTargetAmountSyp(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 font-mono font-black text-center text-slate-100 focus:outline-none"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">الوزن المكافئ للسعر</label>
                      <div className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 font-mono font-black text-center text-emerald-400 select-all min-h-[38px] flex items-center justify-center">
                        {activeProduct ? (() => {
                          const finalPriceUsd = parseFloat(customPriceUsd) || activeProduct.price_usd;
                          const priceSyp = finalPriceUsd * (settings?.usd_to_syp_rate || 15000);
                          const amountSyp = parseFloat(itemTargetAmountSyp) || 0;
                          if (priceSyp <= 0) return '0.000 كغ';
                          const qty = amountSyp / priceSyp;
                          const isWeight = activeProduct.sale_type === 'weight' || activeProduct.sold_by_weight;
                          if (isWeight) {
                            const grams = qty * 1000;
                            return `${(grams / 1000).toFixed(3)} كغ (${Math.round(grams).toLocaleString()} غ)`;
                          } else {
                            return `${Math.round(qty)} قطعة`;
                          }
                        })() : <span className="text-slate-600 text-[10px]">ابحث واختر سلعة أولاً ⚠️</span>}
                      </div>
                    </div>
                  </>
                )}

                {/* Custom price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">السعر المقترح ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={customPriceUsd}
                    onChange={(e) => setCustomPriceUsd(e.target.value)}
                    placeholder={activeProduct ? activeProduct.price_usd.toString() : '0.00'}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 font-mono font-black text-center text-indigo-400 focus:outline-none"
                  />
                  {activeProduct && (
                    <span className="text-[8px] text-slate-600 block text-left">
                      التكلفة الفعلية: ${activeProduct.cost_usd || '0.00'}
                    </span>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {showStockWarning && (
                <div className="bg-rose-500/10 border border-rose-500/15 p-3 rounded-lg text-rose-400 text-[10px] font-bold flex items-center gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>تنبيه! رصيد المخزون قارب على النفاد</span>
                </div>
              )}

              {activeCustomer && activeCustomer.customer_type !== 'retail' && (
                <div className="bg-indigo-500/10 border border-indigo-500/15 p-3 rounded-xl text-indigo-400 text-[10px] font-black flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-bounce" />
                  <span>تطبيق تسعيرة {activeCustomer.customer_type === 'wholesale' ? 'الجملة المخفضة' : '💎 VIP التفضيلية'} للزبون {activeCustomer.name} تلقائياً</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedProductId}
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg disabled:opacity-30 cursor-pointer"
              >
                <span>إدراج الصنف المحدد إلى جدول المبيعات</span>
              </button>
            </form>
          </div>

          {/* Composition Basket Table List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-100 mb-4 border-b border-slate-800 pb-3">سلة مشتريات الفاتورة الحالية</h3>
            
            {basket.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-bold">سلة المشتريات فارغة حالياً. اضغط على خيار البحث من الأعلى للبدء</div>
            ) : (
              <div className="overflow-x-auto text-right">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold">
                      <th className="pb-2 text-right">بيان الصنف</th>
                      <th className="pb-2 text-center">الكمية/الوزن</th>
                      <th className="pb-2 text-center">سعر الوحدة</th>
                      <th className="pb-2 text-left">المجموع ($)</th>
                      <th className="pb-2 text-left">المجموع (ل.س)</th>
                      <th className="pb-2 text-center w-12">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 text-slate-300">
                    {basket.map((item, index) => {
                      const totalUsd = item.quantity * item.price_usd;
                      const totalSyp = Math.round(totalUsd * (settings?.usd_to_syp_rate || 15000));
                      return (
                        <tr key={index} className="hover:bg-slate-950/40">
                          <td className="py-3">
                            <span className="font-extrabold text-slate-200 block">{item.product.name}</span>
                            <span className="text-[9px] bg-slate-950 text-slate-500 border border-slate-850 py-0.5 px-2 rounded-full inline-block mt-1">{item.product.category}</span>
                          </td>
                          <td className="py-3 text-center font-bold text-slate-100 font-mono">
                            {item.quantity.toFixed(item.is_weight ? 3 : 0)} {item.is_weight ? 'كغ' : 'قطعة'}
                          </td>
                          <td className="py-3 text-center text-slate-400 font-mono">
                            ${item.price_usd.toFixed(2)}
                          </td>
                          <td className="py-3 text-left font-black text-slate-100 font-mono">
                            ${totalUsd.toFixed(2)}
                          </td>
                          <td className="py-3 text-left font-black text-emerald-400 font-mono">
                            {totalSyp.toLocaleString()} ل.س
                          </td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: CRM selection and Invoice settings */}
        <div className="space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-100 border-b border-slate-800 pb-3">بيانات العميل وخيارات الدفع</h3>
            
            <div className="space-y-4 text-xs">
              {/* Customer Select */}
              <div className="space-y-1">
                <label className="text-slate-400">العميل المستلم</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 font-bold text-slate-300 text-right cursor-pointer focus:outline-none"
                >
                  <option value="">عميل نقدي سريع (مفرق)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.customer_type === 'wholesale' ? '(📦 جملة)' : c.customer_type === 'vip' ? '(💎 VIP)' : ''}
                    </option>
                  ))}
                </select>
                {activeCustomer && (
                  <div className="bg-indigo-500/10 border border-indigo-500/15 p-3 rounded-xl text-indigo-400 text-[10px] space-y-1.5 leading-relaxed">
                    <span className="block">نوع الحساب: <strong className="text-slate-100">{activeCustomer.customer_type === 'wholesale' ? 'جملة' : '💎 كبار شخصيات'}</strong></span>
                    <span className="block font-mono">المشتريات السابقة: ${activeCustomer.total_purchases_usd.toFixed(1)}</span>
                    <span className="block font-mono">النقاط: {activeCustomer.loyalty_points || 0}</span>
                  </div>
                )}
              </div>

              {/* Direct final-price editor — يحسب الخصم أو الإضافة تلقائياً من الفرق مع المجموع الفرعي */}
              <div className="border-t border-slate-850 pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500">عدّل السعر النهائي مباشرة ($)</label>
                  {totals.hasOverride && (
                    <button
                      type="button"
                      onClick={() => setFinalPriceInput('')}
                      className="text-[9px] font-bold text-slate-500 hover:text-indigo-400 underline decoration-dotted cursor-pointer"
                    >
                      ↺ إعادة لسعر السلة الأساسي
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={totals.subtotalUsd.toFixed(2)}
                    value={finalPriceInput}
                    onChange={(e) => setFinalPriceInput(e.target.value)}
                    className={`w-full text-center text-3xl font-black bg-slate-950 border rounded-xl p-3 focus:outline-none transition-colors ${
                      totals.diffUsd < -0.001
                        ? 'text-rose-400 border-rose-500/30 focus:border-rose-500'
                        : totals.diffUsd > 0.001
                          ? 'text-emerald-400 border-emerald-500/30 focus:border-emerald-500'
                          : 'text-slate-100 border-slate-850 focus:border-indigo-500'
                    }`}
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-black">$</span>
                </div>

                {/* Live feedback badge: يوضّح تلقائياً هل هذا خصم أم إضافة وبكم */}
                {totals.diffUsd < -0.001 ? (
                  <div className="flex justify-between items-center bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-[10px] font-black text-rose-400">
                    <span>🔻 خصم مُطبّق على الفاتورة</span>
                    <span className="font-mono">-${totals.discountUsd.toFixed(2)} <span className="text-slate-500 font-bold">(-{totals.discountSyp.toLocaleString()} ل.س)</span></span>
                  </div>
                ) : totals.diffUsd > 0.001 ? (
                  <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-[10px] font-black text-emerald-400">
                    <span>🔺 إضافة/رسوم مُطبّقة على الفاتورة</span>
                    <span className="font-mono">+${totals.additionUsd.toFixed(2)} <span className="text-slate-500 font-bold">(+{totals.additionSyp.toLocaleString()} ل.س)</span></span>
                  </div>
                ) : (
                  <div className="text-center text-[9px] font-bold text-slate-600">بدون أي تعديل — السعر النهائي مطابق لمجموع السلة</div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="border-t border-slate-850 pt-3 space-y-1">
                <label className="text-slate-400 text-[10px]">طريقة سداد الفاتورة</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850 font-black text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      setPartialAmountPaidUsd('');
                    }}
                    className={`py-2 rounded-lg cursor-pointer ${paymentMethod === 'cash' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    نقدي كامل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('debt');
                      setPartialAmountPaidUsd('0');
                    }}
                    className={`py-2 rounded-lg cursor-pointer ${paymentMethod === 'debt' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    ذمم دين
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('partial');
                      setPartialAmountPaidUsd((totals.finalUsd / 2).toFixed(2));
                    }}
                    className={`py-2 rounded-lg cursor-pointer ${paymentMethod === 'partial' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    دفع جزئي
                  </button>
                </div>
              </div>

              {/* Partial amount input */}
              {paymentMethod === 'partial' && (
                <div className="bg-amber-500/10 border border-amber-500/15 p-3 rounded-xl space-y-1.5">
                  <label className="text-amber-400 text-[10px] block">المبلغ المقبوض بالدولار ($):</label>
                  <input
                    type="number"
                    step="any"
                    max={totals.finalUsd}
                    value={partialAmountPaidUsd}
                    onChange={(e) => setPartialAmountPaidUsd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 font-mono font-black text-center text-slate-100 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {[25000, 50000, 100000, 200000, 500000].map(bill => {
                      if (bill > totals.finalSyp) return null;
                      return (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => {
                            setPartialAmountPaidUsd((bill / (settings?.usd_to_syp_rate || 15000)).toFixed(2));
                          }}
                          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-amber-400 py-1 px-2 rounded-lg font-mono text-[9px] font-black cursor-pointer"
                        >
                          {bill.toLocaleString()} ل.س
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[9px] text-slate-500 block text-left">
                    ≈ {(parseFloat(partialAmountPaidUsd || '0') * (settings?.usd_to_syp_rate || 15000)).toLocaleString()} ل.س
                  </span>
                </div>
              )}

              {/* Grand summary box */}
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>المجموع الفرعي بالدولار:</span>
                  <span className="font-mono">${totals.subtotalUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>المجموع الفرعي بالليرة:</span>
                  <span className="font-mono">{totals.subtotalSyp.toLocaleString()} ل.س</span>
                </div>
                {totals.discountSyp > 0 && (
                  <div className="flex justify-between text-[10px] font-bold text-rose-500">
                    <span>خصم الفاتورة:</span>
                    <span className="font-mono">-{totals.discountSyp.toLocaleString()} ل.س <span className="text-[9px] text-slate-500">(≈ ${totals.discountUsd.toFixed(2)})</span></span>
                  </div>
                )}
                {totals.additionSyp > 0 && (
                  <div className="flex justify-between text-[10px] font-bold text-emerald-400">
                    <span>الإضافات والرسوم:</span>
                    <span className="font-mono">+{totals.additionSyp.toLocaleString()} ل.س <span className="text-[9px] text-slate-500">(≈ ${totals.additionUsd.toFixed(2)})</span></span>
                  </div>
                )}
                <div className="border-t border-slate-850 my-1.5"></div>
                <div className="flex justify-between text-xs font-black text-slate-200">
                  <span>المجموع النهائي بالدولار:</span>
                  <span className="font-mono">${totals.finalUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-emerald-400">
                  <span>المجموع النهائي بالليرة:</span>
                  <span className="font-mono">{totals.finalSyp.toLocaleString()} ل.س</span>
                </div>
                <div className="border-t border-slate-850/80 my-1.5"></div>
                <div className="flex justify-between text-xs font-black text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span>صافي ربح الفاتورة:</span>
                  <span className="font-mono text-emerald-400">{totals.expectedProfitSyp.toLocaleString()} ل.س <span className="text-[9px] text-slate-500">(${totals.expectedProfitUsd.toFixed(2)})</span></span>
                </div>

                {remainingDebts.remainingUsd > 0 && (
                  <div className="border-t border-dashed border-slate-800 pt-2 space-y-1 text-rose-400 font-mono text-[10px] font-black">
                    <div className="flex justify-between">
                      <span>الذمم المتبقية للمستند:</span>
                      <span>${remainingDebts.remainingUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المتبقي بالليرة السورية:</span>
                      <span>{remainingDebts.remainingSyp.toLocaleString()} ل.س</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Save Button */}
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={basket.length === 0 || submittingSale}
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg transition disabled:opacity-30 cursor-pointer"
                id="btn-save-newsale"
              >
                <span>تأكيد وحفظ الفاتورة النهائية</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OVERLAY 1: Search Popover selector */}
      {showProductSearch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="popover-product-search" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right flex flex-col h-[70dvh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <button onClick={() => setShowProductSearch(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100">🔍 اختيار صنف من المخزن</h3>
            </div>

            <div className="my-3 shrink-0">
              <input
                ref={productSearchRef}
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="ابحث بالاسم أو الباركود..."
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-indigo-505"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-850 pr-1 text-xs">
              {searchedProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProductId(p.id);
                    setShowProductSearch(false);
                  }}
                  className="w-full text-right py-3 hover:bg-slate-950 px-2 rounded-lg transition flex justify-between items-center cursor-pointer"
                >
                  <div className="text-left font-black text-indigo-400 font-mono">
                    <span>${p.price_usd.toFixed(2)}</span>
                    <span className="block text-[8px] text-slate-500 font-normal">≈ {Math.round(p.price_usd * (settings?.usd_to_syp_rate || 15000)).toLocaleString()} ل.س</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-200 block">{p.name}</span>
                    <span className="text-[10px] bg-slate-950 text-slate-500 border border-slate-850 px-2 py-0.5 rounded-full inline-block mt-1 font-black">
                      رصيد: {p.quantity} {p.sold_by_weight ? 'كغ' : 'قطعة'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY 2: Confirm Commit Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="confirm-save-dialog" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right space-y-4">
            <h3 className="font-black text-sm text-slate-100">⚠️ تأكيد حفظ الفاتورة المقيدة؟</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              سيقوم هذا النظام بتأكيد الفاتورة وحفظها، خصم الكميات من مستودع المحل، تسجيل المبيعات لدفتر الإيرادات، وزيادة رصيد نقاط العميل بنجاح. هل ترغب بالمتابعة؟
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 font-black text-xs">
              <button
                onClick={handleFinalSave}
                disabled={submittingSale}
                className="bg-indigo-600 hover:bg-indigo-550 text-white py-3 rounded-xl shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingSale ? 'جاري الحفظ...' : 'نعـم، تأكيـد وحفـظ'}
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={submittingSale}
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 py-3 rounded-xl border border-slate-850 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تراجـع وإلغـاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
