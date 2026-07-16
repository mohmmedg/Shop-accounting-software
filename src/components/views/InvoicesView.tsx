import React, { useState, useMemo } from 'react';
import { useSales } from '../../hooks/useSales';
import { useSettings } from '../../hooks/useSettings';
import { PageSkeleton } from '../shared/PageSkeleton';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import {
  Search,
  Calendar,
  DollarSign,
  Printer,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  X,
  CreditCard,
  Edit2,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export const InvoicesView: React.FC = () => {
  const { invoices, isLoading: loadingSales, recordDebtPayment, updateInvoiceTotal, deleteInvoice } = useSales();
  const { settings, isLoading: loadingSettings } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Expand invoice log row state
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Debt payment state
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [debtPayAmountUsd, setDebtPayAmountUsd] = useState('');

  // Active printing overlay
  const [printingInvoice, setPrintingInvoice] = useState<any | null>(null);

  // Edit invoice total price state
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editTotalUsd, setEditTotalUsd] = useState('');

  // Delete invoice confirmation state
  const [invoiceToDelete, setInvoiceToDelete] = useState<any | null>(null);

  // 1. Calculations for upper summary stats
  const stats = useMemo(() => {
    const totalCount = invoices.length;
    const totalSalesUsd = invoices.reduce((acc, inv) => acc + Number(inv.total_usd), 0);
    const totalSalesSyp = invoices.reduce((acc, inv) => acc + Number(inv.total_syp), 0);

    const paidUsd = invoices.reduce((acc, inv) => acc + Number(inv.paid_usd), 0);
    const debtUsd = invoices.reduce((acc, inv) => acc + Number(inv.remaining_debt_usd), 0);

    return {
      totalCount,
      totalSalesUsd,
      totalSalesSyp,
      paidUsd,
      paidSyp: Math.round(paidUsd * (settings?.usd_to_syp_rate || 15000)),
      debtUsd,
      debtSyp: Math.round(debtUsd * (settings?.usd_to_syp_rate || 15000))
    };
  }, [invoices, settings]);

  // 2. Filtered list
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return invoices.filter(inv => {
      const invNum = inv.invoice_number || '';
      const custName = inv.customer_name || '';
      const matchesSearch = invNum.toLowerCase().includes(q) || custName.toLowerCase().includes(q);
      const matchesMethod = methodFilter === '' || inv.payment_method === methodFilter;
      const matchesDate = dateFilter === '' || (inv.sale_date && inv.sale_date.startsWith(dateFilter));

      return matchesSearch && matchesMethod && matchesDate;
    });
  }, [invoices, searchQuery, methodFilter, dateFilter]);

  const toggleExpand = (id: string) => {
    setExpandedInvoiceId(prev => (prev === id ? null : id));
  };

  const handleOpenDebtPay = (inv: any) => {
    setPayingInvoice(inv);
    setDebtPayAmountUsd(Number(inv.remaining_debt_usd).toString());
  };

  const handleDebtPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    const payVal = parseFloat(debtPayAmountUsd);
    if (isNaN(payVal) || payVal <= 0 || payVal > Number(payingInvoice.remaining_debt_usd)) {
      toast.error('الرجاء إدخال قيمة صحيحة لا تتجاوز الديون المتبقية للفاتورة');
      return;
    }

    try {
      await recordDebtPayment({ invoiceId: payingInvoice.id, amountUsd: payVal });
      toast.success('تم تسجيل دفعة تسديد ذمة الدين بنجاح وتحديث الحساب المالي');
      setPayingInvoice(null);
    } catch (err) {}
  };

  const handleOpenEditInvoice = (inv: any) => {
    setEditingInvoice(inv);
    setEditTotalUsd(Number(inv.total_usd).toString());
  };

  const handleEditInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    const newTotal = parseFloat(editTotalUsd);
    if (isNaN(newTotal) || newTotal < 0) {
      toast.error('الرجاء إدخال قيمة صحيحة للسعر الإجمالي');
      return;
    }
    try {
      await updateInvoiceTotal({ invoiceId: editingInvoice.id, newTotalUsd: newTotal });
      setEditingInvoice(null);
    } catch (err) {}
  };

  const handleDeleteInvoiceClick = (inv: any) => {
    setInvoiceToDelete(inv);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      await deleteInvoice(invoiceToDelete.id);
    } catch (err) {}
    setInvoiceToDelete(null);
  };

  if (loadingSales || loadingSettings) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right font-bold" dir="rtl" id="invoices-workspace">
      
      {/* Top Header Bar */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-400 animate-pulse" />
          <span>أرشيف وسجلات الفواتير المالية والديون</span>
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">تتبع الديون المترتبة، استعراض فواتير المبيعات، تسجيل المدفوعات التاريخية، وطباعة الفواتير الحرارية</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="invoices-stats-grid">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl"><FileText className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي الفواتير</span>
            <span className="text-sm font-black text-slate-100 block mt-1">{stats.totalCount} فاتورة</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl"><DollarSign className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">المقبوضات النقدية</span>
            <span className="text-sm font-mono font-black text-emerald-400 block mt-1">${stats.paidUsd.toFixed(1)}</span>
            <span className="text-[9px] text-slate-500 block mt-0.5">≈ {stats.paidSyp.toLocaleString()} ل.س</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl animate-pulse"><CreditCard className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">الذمم والديون المتبقية</span>
            <span className="text-sm font-mono font-black text-rose-400 block mt-1">${stats.debtUsd.toFixed(1)}</span>
            <span className="text-[9px] text-slate-500 block mt-0.5">≈ {stats.debtSyp.toLocaleString()} ل.س</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter log bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4" id="invoices-filters">
        <div className="relative">
          <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو اسم العميل..."
            className="w-full pr-9 pl-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-505 font-bold"
          />
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-300 font-bold focus:outline-none focus:border-indigo-505 cursor-pointer"
          >
            <option value="">كل طرق السداد</option>
            <option value="cash">سداد نقدي كامل</option>
            <option value="debt">ذمم / دين بالكامل</option>
            <option value="partial">سداد جزئي ومتبقي دين</option>
          </select>
        </div>

        <div className="relative">
          <Calendar className="absolute right-3 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-400 focus:outline-none focus:border-indigo-505 font-mono cursor-pointer"
          />
        </div>
      </div>

      {/* Invoices List Display */}
      <div className="space-y-4" id="invoices-cards-list">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 font-bold">لم يتم العثور على أي فواتير مطابقة لخيارات البحث المحددة</div>
        ) : (
          filteredInvoices.map(inv => {
            const isExpanded = expandedInvoiceId === inv.id;
            const formattedDate = new Date(inv.sale_date).toLocaleString('ar-SY');

            return (
              <div
                key={inv.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition overflow-hidden"
              >
                {/* Upper row header */}
                <div
                  onClick={() => toggleExpand(inv.id)}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-slate-950/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded-xl font-mono text-xs font-black shrink-0">
                      INV
                    </span>
                    <div>
                      <span className="font-mono font-black text-indigo-400 block text-xs md:text-sm">
                        {inv.invoice_number}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1 mt-1 font-mono">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-bold">العميل</span>
                    <span className="text-xs text-slate-200 font-extrabold block mt-0.5">{inv.customer_name}</span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="font-black text-slate-100 text-sm block">${Number(inv.total_usd).toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-emerald-400 block mt-0.5">≈ {Number(inv.total_syp).toLocaleString()} ل.س</span>
                  </div>

                  {/* Payment tag */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black border ${
                      inv.payment_method === 'cash' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' :
                      inv.payment_method === 'debt' ? 'bg-rose-500/10 text-rose-400 border-rose-500/10 animate-pulse' : 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                    }`}>
                      {inv.payment_method === 'cash' ? 'سداد كامل' : inv.payment_method === 'debt' ? 'دين/ذمم' : 'سداد جزئي'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="bg-slate-950/40 border-t border-slate-800 p-5 text-right space-y-4">
                    <div className="overflow-x-auto bg-slate-950 border border-slate-850 rounded-xl text-xs">
                      <table className="w-full text-right">
                        <thead>
                          <tr className="border-b border-slate-850 bg-slate-950 text-slate-500 font-black">
                            <th className="p-3">اسم السلعة</th>
                            <th className="p-3 text-center">الكمية/الوزن</th>
                            <th className="p-3 text-center">سعر الوحدة</th>
                            <th className="p-3 text-left">المجموع ($)</th>
                            <th className="p-3 text-left">المجموع (ل.س)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300">
                          {(inv.items || []).map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-900/40 font-semibold">
                              <td className="p-3 font-extrabold text-slate-200">{item.product_name}</td>
                              <td className="p-3 text-center font-mono">
                                {Number(item.quantity).toFixed(item.is_weight ? 3 : 0)} {item.is_weight ? 'كغ' : 'قطعة'}
                              </td>
                              <td className="p-3 text-center font-mono">${Number(item.price_usd).toFixed(2)}</td>
                              <td className="p-3 text-left font-black text-slate-100 font-mono">${Number(item.quantity * item.price_usd).toFixed(2)}</td>
                              <td className="p-3 text-left text-emerald-400 font-black font-mono">{Number(item.quantity * item.price_syp).toLocaleString()} ل.س</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Debts payment & actions */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 border border-slate-850 p-4 rounded-xl text-xs">
                      <div className="space-y-1.5">
                        <div className="text-slate-400 font-bold">
                          المبلغ المقبوض: <span className="text-emerald-400 font-black font-mono">${Number(inv.paid_usd).toFixed(2)} ({Number(inv.paid_syp).toLocaleString()} ل.س)</span>
                        </div>
                        {Number(inv.remaining_debt_usd) > 0 && (
                          <div className="text-rose-400 font-black">
                            الذمم الدفترية المتبقية: <span className="font-mono">${Number(inv.remaining_debt_usd).toFixed(2)} ({Number(inv.remaining_debt_syp).toLocaleString()} ل.س)</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0 font-black text-[10px]">
                        {Number(inv.remaining_debt_usd) > 0 && (
                          <button
                            onClick={() => handleOpenDebtPay(inv)}
                            className="bg-rose-600 hover:bg-rose-550 text-white px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>سداد قسط من الدين</span>
                          </button>
                        )}
                        <button
                          onClick={() => setPrintingInvoice(inv)}
                          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-indigo-400 px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>معاينة الفاتورة الحرارية</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditInvoice(inv)}
                          className="bg-slate-900 border border-slate-800 hover:border-amber-700 text-amber-400 px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل السعر الإجمالي</span>
                        </button>
                        <button
                          onClick={() => handleDeleteInvoiceClick(inv)}
                          className="bg-rose-950/40 border border-rose-900/60 hover:border-rose-600 text-rose-400 px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الفاتورة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Debt payment Form Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="debt-payment-installment-modal" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button onClick={() => setPayingInvoice(null)} className="text-slate-400 hover:text-slate-205">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400 animate-pulse" />
                <span>تسديد دين فاتورة العميل</span>
              </h3>
            </div>
            
            <form onSubmit={handleDebtPaySubmit} className="space-y-4 font-bold text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                <p>الفاتورة: <span className="text-indigo-400 font-mono">{payingInvoice.invoice_number}</span></p>
                <p>الزبون: <span className="text-slate-100">{payingInvoice.customer_name}</span></p>
                <p>المستحق الدفتري: <span className="text-rose-400 font-mono font-black">${Number(payingInvoice.remaining_debt_usd).toFixed(2)} ({Number(payingInvoice.remaining_debt_syp).toLocaleString()} ل.س)</span></p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">قيمة دفعة الصرف المستلمة ($):</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={Number(payingInvoice.remaining_debt_usd)}
                  required
                  value={debtPayAmountUsd}
                  onChange={(e) => setDebtPayAmountUsd(e.target.value)}
                  className="w-full text-center text-3xl font-black text-slate-100 bg-slate-950 border border-slate-850 rounded-xl p-3 focus:outline-none focus:border-indigo-505"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg cursor-pointer"
              >
                تثبيت وقيد الدفعة فورا
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Invoice Print Popup Preview */}
      {printingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="invoice-print-receipt-preview" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right flex flex-col h-[90dvh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 shrink-0">
              <button onClick={() => setPrintingInvoice(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100">🧾 معاينة الإيصال الحراري</h3>
            </div>

            <div className="flex-1 overflow-y-auto my-3 p-4 border border-dashed border-slate-700 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 space-y-4" id="thermal-invoice-canv">
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-800">
                <h2 className="text-xs font-black text-slate-100">{settings?.store_name || 'كاشير دمشق'}</h2>
                <p>هاتف: {settings?.store_phone || '---'}</p>
                <p className="text-[9px] text-slate-500">{new Date(printingInvoice.sale_date).toLocaleString('ar-SY')}</p>
                <p className="font-bold text-indigo-400 text-[11px] mt-1.5 bg-indigo-500/5 py-1 rounded">رقم المعاملة: {printingInvoice.invoice_number}</p>
                <p className="text-[10px] text-slate-400 mt-1">المستلم: {printingInvoice.customer_name}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-800 space-y-2">
                <div className="flex justify-between font-black text-slate-100">
                  <span className="w-16 text-left">المجموع</span>
                  <span className="w-12 text-center">السعر</span>
                  <span className="w-12 text-center">الكمية</span>
                  <span className="flex-1 text-right">الصنف</span>
                </div>
                <div className="space-y-1 text-slate-400">
                  {(printingInvoice.items || []).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="w-16 text-left font-mono">${Number(item.quantity * item.price_usd).toFixed(1)}</span>
                      <span className="w-12 text-center font-mono">${Number(item.price_usd).toFixed(1)}</span>
                      <span className="w-12 text-center font-mono">{Number(item.quantity).toFixed(item.is_weight ? 3 : 0)}</span>
                      <span className="flex-1 text-right truncate font-sans font-semibold">{item.product_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="py-2 space-y-1.5 text-right font-sans font-bold">
                <div className="flex justify-between text-slate-200">
                  <span>المجموع الإجمالي ($):</span>
                  <span className="font-mono">${Number(printingInvoice.total_usd).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 text-xs font-black border-t border-dashed border-slate-800 pt-1.5">
                  <span>القيمة بالليرة السورية:</span>
                  <span className="font-mono">{Number(printingInvoice.total_syp).toLocaleString()} ل.س</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[10px] pt-1">
                  <span>المسدد المقبوض:</span>
                  <span className="font-mono">${Number(printingInvoice.paid_usd).toFixed(2)} ({Number(printingInvoice.paid_syp).toLocaleString()} ل.س)</span>
                </div>
                {Number(printingInvoice.remaining_debt_usd) > 0 && (
                  <div className="flex justify-between text-rose-400 text-[11px] font-black">
                    <span>ذمم الديون المتبقية:</span>
                    <span className="font-mono">${Number(printingInvoice.remaining_debt_usd).toFixed(2)} ({Number(printingInvoice.remaining_debt_syp).toLocaleString()} ل.س)</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-800 space-y-1 text-slate-500 text-[9px]">
                <p>شكراً لزيارتكم مخازننا!</p>
                <p>دمشق - الجمهورية العربية السورية</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المعاينة</span>
              </button>
              <button
                onClick={() => setPrintingInvoice(null)}
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 font-black py-3 rounded-xl border border-slate-850 cursor-pointer text-xs"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Total Price Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="invoice-edit-total-modal" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button onClick={() => setEditingInvoice(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <span>تعديل السعر الإجمالي للفاتورة</span>
              </h3>
            </div>

            <form onSubmit={handleEditInvoiceSubmit} className="space-y-4 font-bold text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                <p>الفاتورة: <span className="text-indigo-400 font-mono">{editingInvoice.invoice_number}</span></p>
                <p>الزبون: <span className="text-slate-100">{editingInvoice.customer_name}</span></p>
                <p>المبلغ المقبوض حالياً: <span className="text-emerald-400 font-mono font-black">${Number(editingInvoice.paid_usd).toFixed(2)}</span></p>
                <p className="text-[10px] text-slate-500 leading-relaxed">سيتم إعادة احتساب الذمم المتبقية تلقائياً بناءً على الفرق بين السعر الجديد والمبلغ المقبوض</p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">السعر الإجمالي الجديد ($):</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={editTotalUsd}
                  onChange={(e) => setEditTotalUsd(e.target.value)}
                  className="w-full text-center text-3xl font-black text-slate-100 bg-slate-950 border border-slate-850 rounded-xl p-3 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-550 text-white font-black py-3 rounded-xl shadow-lg cursor-pointer"
              >
                حفظ السعر الجديد
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Dialog */}
      <ConfirmDialog
        isOpen={invoiceToDelete !== null}
        title="حذف الفاتورة نهائياً"
        message={
          invoiceToDelete
            ? `هل أنت متأكد من رغبتك في حذف الفاتورة ${invoiceToDelete.invoice_number}؟ سيتم إرجاع البضاعة إلى المخزون وعكس أي ذمم أو مبالغ مسجلة على العميل والصندوق. لا يمكن التراجع عن هذا القرار.`
            : ''
        }
        confirmLabel="نعم، احذف الفاتورة"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmDeleteInvoice}
        onCancel={() => setInvoiceToDelete(null)}
      />
    </div>
  );
};
