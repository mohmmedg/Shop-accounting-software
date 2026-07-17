import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useExpenses } from '../../hooks/useExpenses';
import { useSettings } from '../../hooks/useSettings';
import { PageSkeleton } from '../shared/PageSkeleton';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import {
  DollarSign,
  Plus,
  FileText,
  TrendingDown,
  Trash2,
  Calendar,
  X,
  PlusCircle,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

const categoryMap: Record<string, string> = {
  'rent': 'إيجار المحل والعقار',
  'electricity': 'اشتراك المولدات والكهرباء',
  'salaries': 'رواتب وأجور ومكافآت',
  'supplies': 'مواد ومستلزمات صالة',
  'maintenance': 'صيانة دورية وآلات',
  'transport': 'نقل وشحن بضائع',
  'other': 'رسوم وفواتير وعامة'
};

const reverseCategoryMap: Record<string, string> = {
  'رواتب وأجور ومكافآت': 'salaries',
  'اشتراك المولدات والكهرباء': 'electricity',
  'إيجار المحل والعقار': 'rent',
  'مواد ومستلزمات صالة': 'supplies',
  'صيانة دورية وآلات': 'maintenance',
  'نقل وشحن بضائع': 'transport',
  'رسوم وفواتير وعامة': 'other'
};

export const ExpensesView: React.FC = () => {
  const { expenses, isLoading, addExpense, deleteExpense, isAdding: isSavingExpense } = useExpenses();
  const { settings } = useSettings();

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('رسوم وفواتير وعامة');
  const [amountSyp, setAmountSyp] = useState('150000');
  const [notes, setNotes] = useState('');

  // Calculations for KPI
  const stats = useMemo(() => {
    const totalUsd = expenses.reduce((acc, exp) => acc + Number(exp.amount_usd), 0);
    const totalSyp = expenses.reduce((acc, exp) => acc + Number(exp.amount_syp), 0);
    return {
      totalUsd,
      totalSyp,
      count: expenses.length
    };
  }, [expenses]);

  // Filtering expenses
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return expenses.filter(e => {
      const expTitle = e.description || '';
      const expCategory = categoryMap[e.category] || e.category || '';
      return expTitle.toLowerCase().includes(q) || expCategory.toLowerCase().includes(q);
    });
  }, [expenses, searchQuery]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingExpense) return; // منع الإرسال المزدوج
    const syp = parseFloat(amountSyp) || 0;
    if (syp <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح وموجب بالليرة السورية');
      return;
    }

    const rate = settings?.usd_to_syp_rate || 15000;
    const usd = syp / rate;

    const finalCategory = reverseCategoryMap[category] || 'other';

    try {
      await addExpense({
        description: title,
        category: finalCategory as any,
        amount_usd: usd,
        amount_syp: syp,
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash'
      });

      toast.success('تم تسجيل المصروف وبند سند الصرف الجديد بنجاح');
      setTitle('');
      setCategory('رسوم وفواتير وعامة');
      setAmountSyp('150000');
      setNotes('');
      setShowAddForm(false);
    } catch (err) {}
  };

  const handleDeleteClick = (id: string) => {
    setExpenseToDelete(id);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpense(expenseToDelete);
      toast.success('تم حذف سند الصرف من سجل المصاريف');
    } catch (err) {}
    setExpenseToDelete(null);
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right font-bold" dir="rtl" id="expenses-panel">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-400" />
            <span>المصاريف التشغيلية والتكاليف العامة</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">تسجيل تكاليف الصالة اليومية كالإيجار، اشتراكات الكهرباء، أجور الصيانة، ومستحقات الموظفين</p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition shadow-lg cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>قيد وتسجيل مصروف جديد</span>
        </button>
      </div>

      {/* KPI summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="expenses-stats-grid font-black">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl"><TrendingDown className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي المصاريف ($)</span>
            <span className="text-sm font-mono font-black text-rose-400 block mt-1">${stats.totalUsd.toFixed(1)}</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl"><DollarSign className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي المصاريف (ل.س)</span>
            <span className="text-sm font-mono font-black text-slate-100 block mt-1">≈ {stats.totalSyp.toLocaleString()} ل.س</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl"><FileText className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">سندات الصرف المقيدة</span>
            <span className="text-sm font-black text-indigo-400 block mt-1">{stats.count} سند صرف</span>
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative" id="expenses-search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم أو تصنيف المصروف التشغيلي..."
          className="w-full pr-4 pl-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-505 font-bold"
        />
      </div>

      {/* Expenses List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-xs font-black text-slate-100 mb-4">جدول حركة سندات الصرف المقيدة</h3>
        
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-bold">لا توجد مصاريف تشغيلية مطابقة للبحث</div>
        ) : (
          <div className="overflow-x-auto text-right">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold">
                  <th className="pb-3 text-right">بيان المصروف</th>
                  <th className="pb-3 text-center">التصنيف</th>
                  <th className="pb-3 text-center">القيمة ($)</th>
                  <th className="pb-3 text-left">القيمة (ل.س)</th>
                  <th className="pb-3 text-left">تاريخ السند</th>
                  <th className="pb-3 text-center">الخيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/65 text-slate-300">
                {filteredExpenses.map((exp) => {
                  const expTitle = exp.description || '';
                  const expCategory = categoryMap[exp.category] || exp.category || '';
                  const expDate = exp.expense_date || '';
                  return (
                    <tr key={exp.id} className="hover:bg-slate-950/40">
                      <td className="py-3.5">
                        <span className="font-extrabold text-slate-200 block">{expTitle}</span>
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/10 px-2 py-0.5 rounded text-[10px]">{expCategory}</span>
                      </td>
                      <td className="py-3.5 text-center text-rose-400 font-black font-mono">${exp.amount_usd.toFixed(2)}</td>
                      <td className="py-3.5 text-left text-slate-100 font-black font-mono">{exp.amount_syp.toLocaleString()} ل.س</td>
                      <td className="py-3.5 text-left text-slate-500 font-mono text-[10px]">
                        {expDate ? new Date(expDate).toLocaleDateString('ar-SY') : '---'}
                      </td>
                      <td className="py-3.5 text-center">
                        <button
                          onClick={() => handleDeleteClick(exp.id)}
                          className="bg-slate-950 hover:bg-rose-500/10 text-rose-500 p-1.5 rounded-lg border border-slate-850 hover:border-rose-500/20 transition cursor-pointer"
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

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            id="add-expense-modal"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-black text-sm text-slate-100 flex items-center gap-1.5">
                  <PlusCircle className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <span>سند قيد مصروف جديد</span>
                </h3>
              </div>
              
              <form onSubmit={handleSave} className="space-y-4 font-bold text-xs text-slate-300">
                <div className="space-y-1">
                  <label className="text-slate-400">بيان المصروف والجهة</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: اشتراك أمبيرات صالة العرض"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">التصنيف الرئيسي للمصروف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-505 text-slate-300 cursor-pointer"
                  >
                    <option value="رواتب وأجور ومكافآت">رواتب وأجور ومكافآت</option>
                    <option value="اشتراك المولدات والكهرباء">اشتراك مولدات ومازوت</option>
                    <option value="إيجار المحل والعقار">إيجار المحل والعقار</option>
                    <option value="مواد ومستلزمات صالة">مواد ومستلزمات صالة</option>
                    <option value="صيانة دورية وآلات">صيانة دورية وآلات</option>
                    <option value="نقل وشحن بضائع">نقل وشحن بضائع</option>
                    <option value="رسوم وفواتير وعامة">فواتير ورسوم عامة</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">المبلغ المقيد بالليرة السورية (ل.س)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={amountSyp}
                    onChange={(e) => setAmountSyp(e.target.value)}
                    className="w-full text-center text-3xl font-black text-emerald-400 bg-slate-950 border border-slate-850 rounded-xl p-2.5 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block text-left pt-1 font-mono">
                    ≈ {(parseFloat(amountSyp || '0') / (settings?.usd_to_syp_rate || 15000)).toFixed(2)}$ مسجلة للمصروف
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">ملاحظات وشروحات إضافية</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none text-slate-100 h-16"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingExpense}
                  className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingExpense ? 'جاري القيد...' : 'قيد وإثبات المصروف'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Expense Confirmation Dialog */}
      <ConfirmDialog
        isOpen={expenseToDelete !== null}
        title="حذف سند المصروف نهائياً"
        message="هل أنت متأكد من رغبتك في حذف هذا المصروف بالكامل من النظام؟ لا يمكن التراجع عن هذا القرار وسيتم تعديل الصندوق المالي في حال كان مسدداً نقدياً."
        confirmLabel="نعم، احذف المصروف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />

    </div>
  );
};
