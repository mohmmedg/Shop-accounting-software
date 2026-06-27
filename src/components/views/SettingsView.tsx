import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { PageSkeleton } from '../shared/PageSkeleton';
import { Settings, DollarSign, CheckCircle, Phone, Store, MapPin, AlertOctagon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const SettingsView: React.FC = () => {
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();

  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [exchangeRate, setExchangeRate] = useState('15000');
  const [warningLimit, setWarningLimit] = useState('10');
  const [taxRate, setTaxRate] = useState('0');

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name || '');
      setStorePhone(settings.store_phone || '');
      setStoreAddress(settings.store_address || '');
      setExchangeRate((settings.usd_to_syp_rate || 15000).toString());
      setWarningLimit((settings.default_warning_limit || 10).toString());
      setTaxRate((settings.tax_rate_percent || 0).toString());
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseInt(exchangeRate);
    const limit = parseInt(warningLimit);
    const tax = parseFloat(taxRate);

    if (isNaN(rate) || rate <= 0) {
      toast.error('الرجاء إدخال سعر صرف دولار سليم وصحيح');
      return;
    }

    try {
      await updateSettings({
        store_name: storeName,
        store_phone: storePhone,
        store_address: storeAddress,
        usd_to_syp_rate: rate,
        default_warning_limit: limit,
        tax_rate_percent: tax
      });
      toast.success('تم حفظ إعدادات المحل وتحديث سعر الصرف بنجاح');
    } catch (err) {}
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl" id="settings-workspace">
      
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400 animate-spin" />
            <span>الإعدادات العامة وصرف الليرة السورية</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">تحديث هوية المتجر، تعديل سعر الصرف لفرع دمشق وتعديل آلي موازي لأسعار السلع</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-bold text-slate-300">
        
        {/* Left column: Exchange Rate */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>سعر الصرف بسوق دمشق</span>
            </h3>

            <p className="text-xs text-slate-400 font-bold leading-relaxed">
              تعتمد مبيعات الجملة والتجزئة في أسواق دمشق على تحديث مستمر لسعر صرف الليرة السورية مقابل الدولار لضمان دقة هوامش الأرباح وإعادة الشراء من الموردين.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-500 block">سعر صرف الـ 1 دولار مقابل ل.س:</label>
              <input
                type="number"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="w-full text-center text-4xl font-black text-amber-500 bg-slate-950 border border-slate-800 rounded-xl p-4 focus:outline-none focus:border-amber-500 transition"
              />
              <span className="text-[10px] text-amber-600/80 font-bold block text-center">
                ملاحظة: تعديل هذا المعدل سيغير قيم فواتير ل.س فورياً!
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl text-xs text-slate-300 space-y-2.5 border border-slate-800/80">
              <div className="flex justify-between font-mono font-bold">
                <span>{parseInt(exchangeRate || '15000').toLocaleString()} ل.س</span>
                <span className="font-sans text-slate-500">سعر الصرف الأساسي لـ 1$</span>
              </div>
              <div className="flex justify-between font-mono font-bold border-t border-slate-800/60 pt-2.5 text-amber-500">
                <span>{(parseInt(exchangeRate || '15000') * 100).toLocaleString()} ل.س</span>
                <span className="font-sans text-slate-500">سعر الـ 100$ الموازي</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Store Profile details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-black text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-400" />
              <span>بيانات المتجر والترويسة والضريبة</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">اسم المنشأة / المحل</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs font-black focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">رقم هاتف المنشأة بالفواتير</label>
                <input
                  type="text"
                  required
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs font-black focus:outline-none focus:border-indigo-500 transition text-center font-mono"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-slate-400 block">العنوان المطبوع على الإيصالات</label>
                <input
                  type="text"
                  required
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs font-black focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">حد تنبيه المخزون الافتراضي</label>
                <input
                  type="number"
                  required
                  value={warningLimit}
                  onChange={(e) => setWarningLimit(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs font-black focus:outline-none focus:border-indigo-500 transition text-center"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">ضريبة المبيعات الافتراضية (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs font-black focus:outline-none focus:border-indigo-500 transition text-center"
                />
              </div>
            </div>

            {/* Advisory note */}
            <div className="bg-rose-500/10 border-r-4 border-rose-500 rounded-xl p-4 text-rose-300 font-bold text-xs leading-relaxed space-y-1.5 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-rose-200 block">⚠️ تنبيه حول تعديل الصرف:</span>
                تعديل سعر صرف الليرة السورية سيغير فوراً حساب الفروقات السورية وعملات البيع والشراء عبر شاشات نقاط البيع والتقارير المالية.
              </div>
            </div>

            {/* Save Buttons */}
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-4 rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{isUpdating ? 'جاري الحفظ والتحويل المالي...' : 'تثبيت وحفظ إعدادات المنشأة'}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
