import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useEmployees } from '../../hooks/useEmployees';
import { useSettings } from '../../hooks/useSettings';
import { Lock, Eye, EyeOff, KeyRound, AlertCircle, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export function LoginView() {
  const { login } = useAuth();
  const { employees, isLoading: loadingEmployees } = useEmployees();
  const { settings } = useSettings();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  // Hidden barcode scanning support
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    // Select first active employee as default if loaded
    const activeEmployees = employees.filter(e => e.is_active);
    if (activeEmployees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(activeEmployees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      const now = Date.now();
      
      // If typing is very fast (interval < 30ms), it's likely a hardware scanner
      if (now - lastKeyTime.current > 100) {
        barcodeBuffer.current = '';
      }
      
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 2) {
          const barcode = barcodeBuffer.current;
          barcodeBuffer.current = '';
          e.preventDefault();
          
          // Attempt automatic login with barcode
          // Find employee matching this barcode
          const emp = employees.find(x => x.barcode === barcode && x.is_active);
          if (emp) {
            try {
              setIsSubmitting(true);
              await login(emp.pin_code, barcode);
            } catch (err) {
              setShouldShake(true);
              setTimeout(() => setShouldShake(false), 500);
            } finally {
              setIsSubmitting(false);
            }
          } else {
            toast.error('بطاقة الموظف الممسوحة غير مسجلة أو غير نشطة');
          }
        }
      } else if (e.key !== 'Shift') {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [employees, login]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      toast.error('الرجاء اختيار الموظف أولاً');
      return;
    }
    if (pin.length < 4) {
      toast.error('الرجاء إدخال رمز PIN (4 أرقام على الأقل)');
      return;
    }

    try {
      setIsSubmitting(true);
      const emp = employees.find(x => x.id === selectedEmployeeId);
      if (!emp) throw new Error('الموظف غير موجود');
      
      await login(pin, emp.barcode);
    } catch (err) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden" dir="rtl">
      
      {/* Visual background ambient details */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-10" />

      {/* Main card panel */}
      <div className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8 ${shouldShake ? 'animate-bounce' : ''}`}>
        
        {/* Store Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-2">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-l from-indigo-300 to-indigo-500 bg-clip-text text-transparent">
            {settings.store_name || 'ALkhal'}
          </h1>
          <p className="text-xs text-slate-500 font-semibold">بوابة التاجر الدمشقي لإدارة الأعمال الذكية</p>
        </div>

        {/* Form panel */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Employee dropdown selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block">اختر حساب الموظف</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 text-sm font-bold focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              disabled={loadingEmployees || isSubmitting}
            >
              {loadingEmployees ? (
                <option>جاري تحميل قائمة الموظفين...</option>
              ) : activeEmployees.length === 0 ? (
                <option>لا يوجد موظفين مسجلين</option>
              ) : (
                activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position === 'admin' ? 'مدير عام' : emp.position === 'cashier' ? 'كاشير مبيعات' : 'أمين مستودع'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Pin code input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block">رمز المرور PIN</label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                disabled={isSubmitting}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-10 py-3 text-slate-100 text-center font-bold tracking-[0.5em] text-lg focus:outline-none focus:border-indigo-500 transition"
              />
              <div className="absolute top-1/2 -translate-y-1/2 right-3.5 text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute top-1/2 -translate-y-1/2 left-3.5 text-slate-500 hover:text-slate-300 transition"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || loadingEmployees || activeEmployees.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-extrabold text-sm transition shadow-lg shadow-indigo-600/10 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
          </button>
          
        </form>

        {/* Barcode scanner notification footer */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold text-center">
          <AlertCircle className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>يدعم مسح بطاقة الموظف عبر الباركود مباشرة للدخول التلقائي</span>
        </div>

      </div>
    </div>
  );
}
