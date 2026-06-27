import React, { useState, useMemo } from 'react';
import { useSales } from '../../hooks/useSales';
import { useSettings } from '../../hooks/useSettings';
import { PageSkeleton } from '../shared/PageSkeleton';
import { ReceiptPrint } from '../shared/ReceiptPrint';
import { FileText, Search, Printer, DollarSign, ChevronDown, ChevronUp, Calendar, ArrowUpRight, Coins, ShieldCheck, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export function SalesHistoryView() {
  const { invoices, recordDebtPayment, isLoading, isPayingDebt } = useSales();
  const { settings } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'all' | 'cash' | 'debt' | 'partial'>('all');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Receipt Modal State
  const [printingInvoice, setPrintingInvoice] = useState<any>(null);

  // Debt Payment Modal State
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [debtPayAmount, setDebtPayAmount] = useState('');

  const payingInvoice = useMemo(() => {
    return invoices.find(inv => inv.id === payingInvoiceId) || null;
  }, [invoices, payingInvoiceId]);

  const handleOpenPrint = (inv: any) => {
    setPrintingInvoice(inv);
  };

  const handleOpenPayDebt = (id: string, remaining: number) => {
    setPayingInvoiceId(id);
    setDebtPayAmount(remaining.toFixed(2));
  };

  const handleSaveDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoiceId) return;
    const amount = parseFloat(debtPayAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('الرجاء إدخال قيمة صحيحة للدفعة المسددة');
      return;
    }

    if (payingInvoice && amount > Number(payingInvoice.remaining_debt_usd)) {
      toast.error(`القيمة المدخلة أكبر من الدين المتبقي بالفاتورة (${payingInvoice.remaining_debt_usd})`);
      return;
    }

    try {
      await recordDebtPayment({ invoiceId: payingInvoiceId, amountUsd: amount });
      setPayingInvoiceId(null);
      setDebtPayAmount('');
    } catch (err) {}
  };

  // Filtered List
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMethod = selectedMethod === 'all' || inv.payment_method === selectedMethod;
      return matchesSearch && matchesMethod;
    });
  }, [invoices, searchQuery, selectedMethod]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            <span>سجل الفواتير والمبيعات التراكمية</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">عرض كشوفات الفواتير التفصيلية، سداد ذمم الديون والذمم المدينة، وإصدار إيصالات الطباعة</p>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        
        {/* Search header bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/20">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة أو العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-850 rounded-xl px-4 py-2 pr-9 text-xs focus:outline-none focus:border-indigo-505 transition"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>

            {/* Filter Method */}
            <select
              value={selectedMethod}
              onChange={(e: any) => setSelectedMethod(e.target.value)}
              className="bg-slate-800/50 border border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-505 cursor-pointer"
            >
              <option value="all">كل طرق الدفع</option>
              <option value="cash">نقدي (Cash)</option>
              <option value="debt">ذمة دين كامل (Debt)</option>
              <option value="partial">مسدد جزئي (Partial)</option>
            </select>
          </div>

          <span className="font-extrabold text-slate-400 text-[11px]">
            تم تحميل عدد <strong className="text-slate-100">{filteredInvoices.length} فاتورة</strong> مؤخراً
          </span>
        </div>

        {/* Invoices List table */}
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-bold">لا يوجد فواتير مسجلة مطابقة لخيارات الفرز</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/20">
                  <th className="p-4">الفاتورة</th>
                  <th className="p-4 text-center">العميل</th>
                  <th className="p-4 text-center">الإجمالي ($)</th>
                  <th className="p-4 text-center">الإجمالي (ل.س)</th>
                  <th className="p-4 text-center">طريقة السداد</th>
                  <th className="p-4 text-center">المسدد</th>
                  <th className="p-4 text-center">المتبقي دين</th>
                  <th className="p-4 text-center">التاريخ</th>
                  <th className="p-4 text-left">خيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-semibold text-slate-300">
                {filteredInvoices.map(inv => {
                  const isExpanded = expandedInvoiceId === inv.id;
                  const hasRemainingDebt = Number(inv.remaining_debt_usd) > 0;

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="hover:bg-slate-800/20 transition">
                        <td className="p-4">
                          <button
                            onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                            className="font-extrabold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{inv.invoice_number}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="p-4 text-center">{inv.customer_name || 'زبون نقدي'}</td>
                        <td className="p-4 text-center font-mono font-bold text-slate-200">${Number(inv.total_usd).toFixed(2)}</td>
                        <td className="p-4 text-center font-mono font-bold text-indigo-400">{Number(inv.total_syp).toLocaleString()} ل.س</td>
                        <td className="p-4 text-center">
                          {inv.payment_method === 'cash' && <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-emerald-500/15">نقدي (كامل)</span>}
                          {inv.payment_method === 'debt' && <span className="bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-rose-500/15">كامل ذمة دين</span>}
                          {inv.payment_method === 'partial' && <span className="bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-amber-500/15">مسدد جزئي</span>}
                        </td>
                        <td className="p-4 text-center font-mono">${Number(inv.paid_usd).toFixed(2)}</td>
                        <td className="p-4 text-center font-mono text-rose-400 font-bold">
                          {hasRemainingDebt ? `$${Number(inv.remaining_debt_usd).toFixed(2)}` : '---'}
                        </td>
                        <td className="p-4 text-center text-slate-500 font-mono">
                          {new Date(inv.sale_date).toLocaleDateString('ar-SY')}
                        </td>
                        <td className="p-4 text-left space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleOpenPrint(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            title="طباعة حرارية"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {hasRemainingDebt && (
                            <button
                              onClick={() => handleOpenPayDebt(inv.id, Number(inv.remaining_debt_usd))}
                              className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-[10px] font-black transition cursor-pointer"
                            >
                              سداد جزء
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Detail row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-5 bg-slate-950/40 border-b border-slate-800">
                            <div className="space-y-4 max-w-2xl">
                              <h4 className="font-extrabold text-xs text-slate-400">مكونات السلع المشتراة بالفاتورة:</h4>
                              <div className="grid grid-cols-1 gap-2.5">
                                {inv.items.map((item: any, i: number) => (
                                  <div key={i} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                                    <span className="font-extrabold text-slate-200">{item.product_name}</span>
                                    <div className="space-x-4 space-x-reverse font-mono">
                                      <span className="text-slate-500">الكمية: <strong className="text-slate-300">{item.quantity} {item.is_weight ? 'كغ' : 'ق'}</strong></span>
                                      <span className="text-slate-500">سعر الوحدة: <strong className="text-slate-300">${item.price_usd.toFixed(2)}</strong></span>
                                      <span className="text-slate-500">الإجمالي: <strong className="text-indigo-400">${(item.quantity * item.price_usd).toFixed(2)}</strong></span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Pay Debt Modal Backdrop */}
      {payingInvoiceId && payingInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <form onSubmit={handleSaveDebtPayment} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-black text-sm text-slate-100">تسجيل سداد دفعة دين</h3>
            <p className="text-xs text-slate-400">الفاتورة: {payingInvoice.invoice_number}</p>
            <p className="text-xs text-slate-400">العميل: {payingInvoice.customer_name}</p>
            <p className="text-xs text-rose-400">الدين المتبقي الكلي: ${Number(payingInvoice.remaining_debt_usd).toFixed(2)}</p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">المبلغ المسدد نقداً الآن ($)</label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="أدخل المبلغ المسدد بالدولار..."
                value={debtPayAmount}
                onChange={(e) => setDebtPayAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-indigo-400 font-bold focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayingInvoiceId(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isPayingDebt}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-550 text-white font-black text-xs transition cursor-pointer"
              >
                {isPayingDebt ? 'جاري التحويل...' : 'تثبيت السداد الآن'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipt Printable Component Modal */}
      {printingInvoice && (
        <ReceiptPrint
          isOpen={!!printingInvoice}
          invoice={printingInvoice}
          settings={settings}
          onClose={() => setPrintingInvoice(null)}
        />
      )}

    </div>
  );
}
