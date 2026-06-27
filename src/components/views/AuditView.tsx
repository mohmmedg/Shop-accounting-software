import React, { useState, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useProducts } from '../../hooks/useProducts';
import { PageSkeleton } from '../shared/PageSkeleton';
import { ClipboardList, PlusCircle, Search, Sparkles, TrendingUp, TrendingDown, ClipboardCheck, AlertCircle, FileText, UserSquare2 } from 'lucide-react';
import { toast } from 'sonner';

export function AuditView() {
  const { checks, addInventoryCheck, isLoading: loadingInventory } = useInventory();
  const { products, isLoading: loadingProducts } = useProducts();

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [notes, setNotes] = useState('');
  const [conductedBy, setConductedBy] = useState('أمين المستودع');

  // Selected Product System Qty
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Autocomplete products
  const searchedProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const term = productSearch.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.barcode && p.barcode.toLowerCase().includes(term))
    ).slice(0, 5);
  }, [products, productSearch]);

  // Calculated discrepancy
  const systemQty = selectedProduct?.quantity ?? 0;
  const difference = useMemo(() => {
    if (!actualQty) return 0;
    return Number(actualQty) - systemQty;
  }, [actualQty, systemQty]);

  const handleSelectProduct = (id: string, name: string) => {
    setSelectedProductId(id);
    setProductSearch(name);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error('الرجاء اختيار السلعة المطلوب جردها');
      return;
    }
    if (!actualQty.trim()) {
      toast.error('الرجاء إدخال الكمية الفعلية المقاسة بالمخزن');
      return;
    }

    const physical = Number(actualQty);
    if (isNaN(physical) || physical < 0) {
      toast.error('الرجاء إدخال كمية صحيحة');
      return;
    }

    try {
      await addInventoryCheck({
        product_id: selectedProductId,
        product_name: selectedProduct?.name || '',
        expected_quantity: systemQty,
        actual_quantity: physical,
        difference: physical - systemQty,
        conducted_by: conductedBy,
        notes,
      });

      // Clear
      setShowAddForm(false);
      setSelectedProductId('');
      setProductSearch('');
      setActualQty('');
      setNotes('');
    } catch (err) {}
  };

  // Summarize discrepancies
  const stats = useMemo(() => {
    let excessCount = 0;
    let shortCount = 0;
    let exactCount = 0;

    checks.forEach(c => {
      if (c.difference > 0) excessCount++;
      else if (c.difference < 0) shortCount++;
      else exactCount++;
    });

    return {
      excessCount,
      shortCount,
      exactCount,
      totalChecks: checks.length
    };
  }, [checks]);

  const filteredChecks = useMemo(() => {
    if (!searchQuery.trim()) return checks;
    const q = searchQuery.toLowerCase();
    return checks.filter(c => 
      c.product_name.toLowerCase().includes(q) || 
      c.conducted_by.toLowerCase().includes(q)
    );
  }, [checks, searchQuery]);

  if (loadingInventory || loadingProducts) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-400" />
            <span>جرد المستودعات وتدقيق المخزون</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">مطابقة الكميات الدفترية للنظام بالكميات الحقيقية على الرفوف وتحديث أرصدة السلع المسجلة</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition shadow-lg cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showAddForm ? 'إلغاء الجرد' : 'بدء جرد صنف جديد'}</span>
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">عمليات جرد الصنف اليوم</span>
            <span className="text-xl font-black text-slate-100 block mt-1">{stats.totalChecks} جرد</span>
          </div>
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">فوارق فائضة (زيادة)</span>
            <span className="text-xl font-black text-emerald-400 block mt-1">{stats.excessCount} أصناف</span>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">فوارق عجز (نقص)</span>
            <span className="text-xl font-black text-rose-400 block mt-1">{stats.shortCount} أصناف</span>
          </div>
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">مطابقات تامة</span>
            <span className="text-xl font-black text-slate-100 block mt-1">{stats.exactCount} أصناف</span>
          </div>
          <div className="p-2 bg-slate-850 text-slate-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Start Inventory Check Form */}
      {showAddForm && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-6 space-y-6 shadow-xl animate-fadeIn">
          <h3 className="font-black text-sm text-slate-100 border-b border-slate-800 pb-3">تسجيل جرد صنف ومطابقة مستودع</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Product Autocomplete */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-400">ابحث عن السلعة المطلوب جردها</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="اكتب اسم الصنف أو الباركود..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    if (!e.target.value) setSelectedProductId('');
                  }}
                  className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              </div>

              {/* Autocomplete Box */}
              {searchedProducts.length > 0 && !selectedProductId && (
                <div className="absolute right-0 left-0 bg-slate-800 border border-slate-700 rounded-xl mt-1.5 shadow-2xl z-20 overflow-hidden divide-y divide-slate-700">
                  {searchedProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p.id, p.name)}
                      className="w-full text-right px-4 py-3 hover:bg-slate-700 text-xs font-bold block transition"
                    >
                      <div className="flex justify-between">
                        <span>{p.name}</span>
                        <span className="text-indigo-400 font-mono text-[10px]">{p.quantity} وحدة متوفرة</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* System Quantity (Disabled) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">الكمية المسجلة دفترية في النظام</label>
              <input
                type="number"
                disabled
                value={selectedProductId ? systemQty : ''}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* Physical counted quantity */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">الكمية المقاسة الفعلية (العد الفعلي للرفوف)</label>
              <input
                type="number"
                step="any"
                disabled={!selectedProductId}
                placeholder="أدخل العدد المقاس..."
                value={actualQty}
                onChange={(e) => setActualQty(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition font-mono font-bold text-indigo-400"
              />
            </div>

            {/* Conducted By */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">أمين الجرد المكلف</label>
              <input
                type="text"
                value={conductedBy}
                onChange={(e) => setConductedBy(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-400">تفسير التباين / ملاحظات أمين المستودع</label>
              <input
                type="text"
                placeholder="مثال: تبخر بالوزن، عينات إتلاف لم تدون، فائض هبة من المورد..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

          </div>

          {/* Real-time discrepancy widget */}
          {selectedProduct && actualQty !== '' && (
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-bold">
              <div>
                <span className="text-slate-500 block">حالة تباين المطابقة:</span>
                <span className="text-slate-200 block text-sm mt-1">
                  الفرق = <strong className={difference > 0 ? 'text-emerald-400' : difference < 0 ? 'text-rose-500' : 'text-slate-300'}>
                    {difference > 0 ? `+${difference}` : difference}
                  </strong> وحدة
                </span>
              </div>
              
              {difference > 0 ? (
                <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-lg flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>هنالك فائض بالمستودع مقارنة بالدفاتر (سيتم زيادة رصيد السلعة)</span>
                </div>
              ) : difference < 0 ? (
                <div className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded-lg flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4" />
                  <span>هنالك تباين نقصان وعجز (سيتم تخفيض رصيد السلعة وتوثيق الفارق)</span>
                </div>
              ) : (
                <div className="p-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>الكميات متطابقة تماماً 100%!</span>
                </div>
              )}
            </div>
          )}

          {/* Actions Submit */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition cursor-pointer"
            >
              حفظ الجرد ومطابقة الأرصدة
            </button>
          </div>
        </form>
      )}

      {/* Audit Logs Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        
        {/* Search header bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/20">
          <span className="font-black text-slate-100 text-xs">سجل عمليات جرد المطابقة السابقة</span>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="ابحث بالسلعة أو أمين الجرد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-800 rounded-xl px-4 py-2 pr-9 text-xs focus:outline-none focus:border-indigo-500 transition"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          </div>
        </div>

        {/* Results List */}
        {filteredChecks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-600 mb-2">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <p className="text-sm font-black text-slate-400">لا يوجد عمليات جرد مسجلة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/20">
                  <th className="p-4">الصنف المجرود</th>
                  <th className="p-4 text-center">الكمية المقدرة</th>
                  <th className="p-4 text-center">الكمية الفعلية</th>
                  <th className="p-4 text-center">التباين الحاصل</th>
                  <th className="p-4 text-center">مكلف الجرد</th>
                  <th className="p-4 text-center">أسباب وتفسيرات التباين</th>
                  <th className="p-4 text-left">تاريخ الجرد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-semibold text-slate-300">
                {filteredChecks.map(chk => (
                  <tr key={chk.id} className="hover:bg-slate-800/20 transition">
                    <td className="p-4 font-extrabold text-slate-100">{chk.product_name}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-400">{chk.expected_quantity}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-200">{chk.actual_quantity}</td>
                    <td className="p-4 text-center font-mono">
                      {chk.difference > 0 ? (
                        <span className="text-emerald-400 font-bold">+{chk.difference} (فائض)</span>
                      ) : chk.difference < 0 ? (
                        <span className="text-rose-400 font-bold">{chk.difference} (عجز)</span>
                      ) : (
                        <span className="text-slate-500 font-bold">0 (مطابق)</span>
                      )}
                    </td>
                    <td className="p-4 text-center text-slate-400 font-sans flex items-center gap-1.5 justify-center">
                      <UserSquare2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>{chk.conducted_by}</span>
                    </td>
                    <td className="p-4 text-center text-slate-400 font-sans">{chk.notes || '---'}</td>
                    <td className="p-4 text-left text-[10px] text-slate-500 font-mono">
                      {new Date(chk.date).toLocaleString('ar-SY', { hour12: false })}
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
