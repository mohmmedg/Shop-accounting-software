import React, { useState, useMemo } from 'react';
import { useReturns } from '../../hooks/useReturns';
import { useSales } from '../../hooks/useSales';
import { useSettings } from '../../hooks/useSettings';
import { PageSkeleton } from '../shared/PageSkeleton';
import { Undo2, Search, PlusCircle, Calendar, DollarSign, RefreshCw, FileText, ShoppingBag, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

export function ReturnsView() {
  const { returns, addReturn, isLoading: loadingReturns } = useReturns();
  const { invoices, isLoading: loadingSales } = useSales();
  const { settings } = useSettings();

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Return form states
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [returnQty, setReturnQty] = useState('1');
  const [actionTaken, setActionTaken] = useState<'refund' | 'exchange'>('refund');
  const [reason, setReason] = useState('');

  // Selected Invoice object and items
  const selectedInvoice = useMemo(() => {
    return invoices.find(inv => inv.id === selectedInvoiceId) || null;
  }, [invoices, selectedInvoiceId]);

  // Invoice autocomplete search
  const searchedInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return [];
    const term = invoiceSearch.toLowerCase();
    return invoices.filter(inv => 
      inv.invoice_number.toLowerCase().includes(term) || 
      inv.customer_name.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [invoices, invoiceSearch]);

  // Selected Product original purchase price and metadata
  const selectedProductInfo = useMemo(() => {
    if (!selectedInvoice || !selectedProductId) return null;
    return selectedInvoice.items.find(item => item.product_id === selectedProductId) || null;
  }, [selectedInvoice, selectedProductId]);

  // Handle invoice choice
  const handleSelectInvoice = (id: string, num: string) => {
    setSelectedInvoiceId(id);
    setInvoiceSearch(num);
    setSelectedProductId(''); // reset product selection
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      toast.error('الرجاء اختيار الفاتورة أولاً');
      return;
    }
    if (!selectedProductId) {
      toast.error('الرجاء اختيار صنف من الفاتورة');
      return;
    }
    if (!selectedProductInfo) return;

    const qty = Number(returnQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('الرجاء إدخال كمية صحيحة');
      return;
    }

    if (qty > selectedProductInfo.quantity) {
      toast.error(`الكمية المدخلة (${qty}) أكبر من الكمية المشتراة بالفاتورة (${selectedProductInfo.quantity})`);
      return;
    }

    const refundUsd = actionTaken === 'refund' ? selectedProductInfo.price_usd * qty : 0;
    const refundSyp = actionTaken === 'refund' ? Math.round(refundUsd * settings.usd_to_syp_rate) : 0;

    try {
      await addReturn({
        invoice_id: selectedInvoiceId,
        product_id: selectedProductId,
        product_name: selectedProductInfo.product_name,
        customer_id: selectedInvoice.customer_id,
        customer_name: selectedInvoice.customer_name,
        quantity: qty,
        refund_amount_usd: refundUsd,
        refund_amount_syp: refundSyp,
        reason,
        action_taken: actionTaken,
      });

      // Clear states
      setShowAddForm(false);
      setSelectedInvoiceId('');
      setInvoiceSearch('');
      setSelectedProductId('');
      setReturnQty('1');
      setReason('');
      setActionTaken('refund');
    } catch (err) {
      // toast is already thrown by hook
    }
  };

  // Stats
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayReturns = returns.filter(r => r.return_date.startsWith(todayStr));
    const totalTodayRefundsUsd = todayReturns.reduce((acc, r) => acc + Number(r.refund_amount_usd), 0);
    const totalTodayRefundsSyp = todayReturns.reduce((acc, r) => acc + Number(r.refund_amount_syp), 0);

    return {
      totalTodayCount: todayReturns.length,
      totalTodayRefundsUsd,
      totalTodayRefundsSyp,
      allTimeCount: returns.length
    };
  }, [returns]);

  // Filter list of returns shown
  const filteredReturns = useMemo(() => {
    if (!searchQuery.trim()) return returns;
    const q = searchQuery.toLowerCase();
    return returns.filter(r => 
      r.product_name.toLowerCase().includes(q) || 
      r.customer_name.toLowerCase().includes(q) ||
      (r.reason && r.reason.toLowerCase().includes(q))
    );
  }, [returns, searchQuery]);

  if (loadingReturns || loadingSales) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl">
      
      {/* Top action header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Undo2 className="w-6 h-6 text-indigo-400" />
            <span>إدارة مرتجعات المبيعات والتعويضات</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">تسهيل عمليات التعويض المالي أو الاستبدال وإرجاع السلع للمستودع وتعديل حسابات الصناديق</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition shadow-lg cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showAddForm ? 'إلغاء العملية' : 'تسجيل مرتجع جديد'}</span>
        </button>
      </div>

      {/* Summary Stats Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">مرتجعات اليوم</span>
            <span className="text-xl font-black text-slate-100 block mt-1">{stats.totalTodayCount} سلع</span>
          </div>
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Undo2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">تعويضات اليوم بالدولار</span>
            <span className="text-xl font-black text-rose-500 block mt-1">${stats.totalTodayRefundsUsd.toFixed(2)}</span>
          </div>
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">تعويضات اليوم بالليرة</span>
            <span className="text-xl font-black text-rose-400 block mt-1">{stats.totalTodayRefundsSyp.toLocaleString()} ل.س</span>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي عدد العمليات</span>
            <span className="text-xl font-black text-slate-100 block mt-1">{stats.allTimeCount} عملية</span>
          </div>
          <div className="p-2 bg-slate-800 text-slate-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Add Return Form */}
      {showAddForm && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-6 space-y-6 shadow-xl animate-fadeIn">
          <h3 className="font-black text-sm text-slate-100 border-b border-slate-800 pb-3">تفاصيل تسجيل عملية المرتجع</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Invoice search Autocomplete */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-400">ابحث عن الفاتورة (رقمها أو اسم العميل)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: INV-2026-0001..."
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    if (!e.target.value) setSelectedInvoiceId('');
                  }}
                  className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              </div>

              {/* Suggestions Box */}
              {searchedInvoices.length > 0 && !selectedInvoiceId && (
                <div className="absolute right-0 left-0 bg-slate-800 border border-slate-700 rounded-xl mt-1.5 shadow-2xl z-20 overflow-hidden divide-y divide-slate-700">
                  {searchedInvoices.map(inv => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => handleSelectInvoice(inv.id, inv.invoice_number)}
                      className="w-full text-right px-4 py-3 hover:bg-slate-700 text-xs font-bold block transition"
                    >
                      <div className="flex justify-between">
                        <span className="text-indigo-400">{inv.invoice_number}</span>
                        <span className="text-slate-400">{new Date(inv.sale_date).toLocaleDateString('ar-SY')}</span>
                      </div>
                      <span className="text-slate-300 block text-[10px] mt-1">{inv.customer_name} • ${inv.total_usd.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product selection from chosen invoice */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">اختر السلعة المرتجعة</label>
              <select
                disabled={!selectedInvoiceId}
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">-- اختر صنف من قائمة الفاتورة --</option>
                {selectedInvoice?.items.map(item => (
                  <option key={item.product_id} value={item.product_id}>
                    {item.product_name} (المشتراة: {item.quantity} • بسعر ${item.price_usd.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">الكمية المرتجعة</label>
              <input
                type="number"
                step="any"
                min="0.01"
                disabled={!selectedProductId}
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Action Taken */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">الإجراء المتبع</label>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setActionTaken('refund')}
                  className={`py-2 px-3 rounded-xl border text-xs font-black transition flex justify-center items-center gap-1.5 cursor-pointer ${actionTaken === 'refund' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800/80'}`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>تعويض نقدي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionTaken('exchange')}
                  className={`py-2 px-3 rounded-xl border text-xs font-black transition flex justify-center items-center gap-1.5 cursor-pointer ${actionTaken === 'exchange' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800/80'}`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>استبدال سلعة</span>
                </button>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-400">سبب الإرجاع</label>
              <input
                type="text"
                placeholder="مثال: تلف بالصنف، وزن مغلوط، انتهاء صلاحية..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

          </div>

          {/* Refund Previews */}
          {selectedProductInfo && (
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 block font-bold">حساب التعويض المالي المتوقع (على أساس السعر بالفاتورة):</span>
                <span className="text-slate-200 font-extrabold block">
                  {returnQty} وحدة × ${selectedProductInfo.price_usd.toFixed(2)} = ${ (Number(returnQty) * selectedProductInfo.price_usd).toFixed(2) }
                </span>
              </div>
              {actionTaken === 'refund' ? (
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black">
                  سيتم خصم ${ (Number(returnQty) * selectedProductInfo.price_usd).toFixed(2) } (${ (Number(returnQty) * selectedProductInfo.price_usd * settings.usd_to_syp_rate).toLocaleString() } ل.س) من الصندوق
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black">
                  استبدال سلعة (لا يوجد حركة سحب نقدي من الصندوق)
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer"
            >
              تسجيل وحفظ المرتجع
            </button>
          </div>
        </form>
      )}

      {/* Main Table section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        
        {/* Search header bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-black text-slate-100 text-xs">سجل المرتجعات السابقة</span>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="ابحث بالسلعة أو العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-800 rounded-xl px-4 py-2 pr-9 text-xs focus:outline-none focus:border-indigo-500 transition"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          </div>
        </div>

        {/* Results List */}
        {filteredReturns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-600 mb-2">
              <Undo2 className="w-8 h-8" />
            </div>
            <p className="text-sm font-black text-slate-400">لا يوجد عمليات مرتجعات مسجلة</p>
            <p className="text-xs text-slate-500">استخدم الزر بالأعلى لتسجيل أول عملية إرجاع سلع وتعديل المخزون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/20">
                  <th className="p-4">السلعة المستلمة</th>
                  <th className="p-4 text-center">العميل</th>
                  <th className="p-4 text-center">الكمية</th>
                  <th className="p-4 text-center">التعويض المالي</th>
                  <th className="p-4 text-center">الإجراء</th>
                  <th className="p-4 text-center">السبب</th>
                  <th className="p-4 text-left">تاريخ العملية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-semibold text-slate-300">
                {filteredReturns.map(ret => (
                  <tr key={ret.id} className="hover:bg-slate-800/20 transition">
                    <td className="p-4">
                      <span className="font-extrabold text-slate-100 block">{ret.product_name}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">رابط الفاتورة: {ret.invoice_id}</span>
                    </td>
                    <td className="p-4 text-center">{ret.customer_name || 'زبون نقدي'}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-200">{ret.quantity}</td>
                    <td className="p-4 text-center">
                      {ret.refund_amount_usd > 0 ? (
                        <div>
                          <span className="text-rose-400 font-mono font-bold">${Number(ret.refund_amount_usd).toFixed(2)}</span>
                          <span className="text-[10px] text-slate-500 block font-sans">({Number(ret.refund_amount_syp).toLocaleString()} ل.س)</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-bold">---</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {ret.action_taken === 'refund' ? (
                        <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full text-[10px]">تعويض مالي</span>
                      ) : (
                        <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full text-[10px]">استبدال</span>
                      )}
                    </td>
                    <td className="p-4 text-center text-slate-400 font-sans">{ret.reason || 'لم يذكر'}</td>
                    <td className="p-4 text-left text-[10px] text-slate-500 font-mono">
                      {new Date(ret.return_date).toLocaleString('ar-SY', { hour12: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
