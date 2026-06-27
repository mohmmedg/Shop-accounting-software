import React, { useState, useMemo } from 'react';
import { useDiscounts } from '../../hooks/useDiscounts';
import { useProducts } from '../../hooks/useProducts';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { PageSkeleton } from '../shared/PageSkeleton';
import { BadgePercent, PlusCircle, Trash2, ShieldCheck, ShieldAlert, Calendar, DollarSign, Tag, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

export function DiscountsView() {
  const { discounts, addDiscount, toggleDiscount, deleteDiscount, isLoading } = useDiscounts();
  const { products } = useProducts();

  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed' | 'buy_x_get_y'>('percent');
  const [value, setValue] = useState('');
  const [productId, setProductId] = useState('');
  const [minPurchaseUsd, setMinPurchaseUsd] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('الرجاء إدخال اسم العرض الترويجي');
      return;
    }
    if (!code.trim()) {
      toast.error('الرجاء تعيين رمز قسيمة الخصم');
      return;
    }

    try {
      await addDiscount({
        name,
        code: code.toUpperCase(),
        type,
        value: Number(value) || 0,
        product_id: productId || null,
        min_purchase_usd: Number(minPurchaseUsd) || 0,
        is_active: isActive,
        start_date: startDate || null,
        end_date: endDate || null,
      } as any);

      // Reset
      setShowForm(false);
      setName('');
      setCode('');
      setType('percent');
      setValue('');
      setProductId('');
      setMinPurchaseUsd('');
      setStartDate('');
      setEndDate('');
      setIsActive(true);
    } catch (err) {}
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleDiscount({ id, is_active: !currentStatus });
    } catch (err) {}
  };

  const handleDeleteClick = (id: string) => {
    setDiscountToDelete(id);
  };

  const confirmDeleteDiscount = async () => {
    if (!discountToDelete) return;
    try {
      await deleteDiscount(discountToDelete);
    } catch (err) {}
    setDiscountToDelete(null);
  };

  // Filtered
  const filteredDiscounts = useMemo(() => {
    if (!searchQuery.trim()) return discounts;
    const q = searchQuery.toLowerCase();
    return discounts.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.code.toLowerCase().includes(q)
    );
  }, [discounts, searchQuery]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <BadgePercent className="w-6 h-6 text-indigo-400" />
            <span>قسائم الخصم والعروض والترويج</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">إنشاء قسائم شراء ذكية، خصومات مئوية، عروض شراء صنف والحصول على صنف إضافي، وتتبع استخداماتها بالفواتير</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition shadow-lg cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? 'إلغاء العملية' : 'إنشاء قسيمة أو عرض'}</span>
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-6 space-y-6 shadow-xl animate-fadeIn">
          <h3 className="font-black text-sm text-slate-100 border-b border-slate-800 pb-3">تفاصيل تسجيل قسيمة أو عرض ترويجي جديد</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            
            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">اسم العرض الترويجي</label>
              <input
                type="text"
                placeholder="مثال: خصم عيد الأضحى المبارك..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Code */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">رمز الكود المكتوب (Coupon Code)</label>
              <input
                type="text"
                placeholder="مثال: EID2026"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs font-mono font-bold tracking-wider focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">نوع العرض</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="percent">نسبة مئوية من الفاتورة (%)</option>
                <option value="fixed">خصم بمبلغ ثابت بالدولار ($)</option>
                <option value="buy_x_get_y">اشترِ x واحصل على y مجاناً</option>
              </select>
            </div>

            {/* Value */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">قيمة الخصم الرقمية</label>
              <input
                type="number"
                placeholder={type === 'percent' ? '15%' : '10$'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Linked Product ID */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">مرتبط بسلعة معينة (اختياري)</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="">-- يطبق على كامل الفاتورة --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Min Purchase USD */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">الحد الأدنى لقيمة المشتريات ($)</label>
              <input
                type="number"
                placeholder="50"
                value={minPurchaseUsd}
                onChange={(e) => setMinPurchaseUsd(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">تاريخ تفعيل العرض</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">تاريخ انتهاء الصلاحية</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

          </div>

          {/* Active Checkbox */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActiveDiscount"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-700 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isActiveDiscount" className="text-xs font-black text-slate-300 select-none cursor-pointer">تفعيل الكوبون فوراً للعمل بالصناديق</label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition cursor-pointer"
            >
              حفظ العرض الترويجي
            </button>
          </div>
        </form>
      )}

      {/* Main Grid View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        
        {/* Search header bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/20">
          <span className="font-black text-slate-100 text-xs">سجل قسائم الخصم المسجلة بالنظام</span>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="ابحث بالعرض أو رمز القسيمة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-800 rounded-xl px-4 py-2 pr-9 text-xs focus:outline-none focus:border-indigo-500 transition"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          </div>
        </div>

        {/* Results List */}
        {filteredDiscounts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-600 mb-2">
              <BadgePercent className="w-8 h-8" />
            </div>
            <p className="text-sm font-black text-slate-400">لا يوجد قسائم خصومات مطابقة للبحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredDiscounts.map(disc => (
              <div key={disc.id} className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/20 transition flex flex-col justify-between space-y-4">
                
                {/* Header info */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-100">{disc.name}</h4>
                    <span className="font-mono text-xs text-indigo-400 block font-bold mt-1.5 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/10 w-fit">
                      {disc.code}
                    </span>
                  </div>

                  {/* Toggle Activation Button */}
                  <button
                    onClick={() => handleToggle(disc.id, disc.is_active)}
                    className="text-slate-400 hover:text-slate-200 transition"
                    title={disc.is_active ? 'تعطيل العرض' : 'تفعيل العرض'}
                  >
                    {disc.is_active ? (
                      <ToggleRight className="w-7 h-7 text-emerald-500 cursor-pointer" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-600 cursor-pointer" />
                    )}
                  </button>
                </div>

                {/* Body details */}
                <div className="space-y-2 text-xs border-t border-b border-slate-800/40 py-3.5">
                  
                  <div className="flex items-center gap-2 text-slate-400 font-bold">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <span>قيمة الخصم: <strong className="text-amber-500">
                      {disc.type === 'percent' ? `${disc.value}%` : disc.type === 'fixed' ? `$${disc.value}` : 'مكافأة مجانية'}
                    </strong></span>
                  </div>

                  {disc.min_purchase_usd > 0 && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      <span>الحد الأدنى للشراء: <strong className="text-slate-200">${disc.min_purchase_usd}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>الصلاحية: 
                      <span className="text-[10px] text-slate-500 mr-1.5 font-mono">
                        {disc.start_date || 'غير محدد'} إلى {disc.end_date || 'غير محدد'}
                      </span>
                    </span>
                  </div>

                  {disc.product_id && (
                    <div className="bg-slate-900 p-2 rounded-lg text-[10px] text-slate-400 font-bold">
                      مقترن بالسلعة ID: {disc.product_id}
                    </div>
                  )}

                </div>

                {/* Bottom usages counters and actions */}
                <div className="flex justify-between items-center text-xs">
                  <div className="text-[10px] text-slate-500 font-bold">
                    مرات الاستخدام بالفواتير: <strong className="text-indigo-400 font-mono text-xs">{disc.usages} مرة</strong>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteClick(disc.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                    title="حذف القسيمة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={discountToDelete !== null}
        title="حذف العرض / الخصم نهائياً"
        message="هل أنت متأكد من رغبتك في حذف هذا العرض تماماً؟ لا يمكن التراجع عن هذا القرار بعد حذفه."
        confirmLabel="نعم، احذف العرض"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmDeleteDiscount}
        onCancel={() => setDiscountToDelete(null)}
      />

    </div>
  );
}
