import React, { useState, useMemo } from 'react';
import { useCashRegister } from '../../hooks/useCashRegister';
import { useAuth } from '../../hooks/useAuth';
import { PageSkeleton } from '../shared/PageSkeleton';
import { Coins, PlusCircle, Ban, History, CheckCircle2, AlertOctagon, TrendingUp, TrendingDown, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export function CashRegisterView() {
  const { cashRegisters, activeShift, openShift, closeShift, isLoading, isOpening, isClosing } = useCashRegister();
  const { currentUser } = useAuth();

  const [showOpenForm, setShowOpenForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);

  // Form states
  const [openingUsd, setOpeningUsd] = useState('100');
  const [openingSyp, setOpeningSyp] = useState('1500000');

  const [actualUsd, setActualUsd] = useState('');
  const [actualSyp, setActualSyp] = useState('');

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usd = parseFloat(openingUsd) || 0;
    const syp = parseFloat(openingSyp) || 0;

    if (usd < 0 || syp < 0) {
      toast.error('الرجاء إدخال مبالغ فتح الصندوق بشكل صحيح (أكبر من أو تساوي الصفر)');
      return;
    }

    try {
      await openShift({ openingUsd: usd, openingSyp: syp });
      setShowOpenForm(false);
    } catch (err) {}
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const usd = parseFloat(actualUsd);
    const syp = parseFloat(actualSyp);

    if (isNaN(usd) || usd < 0 || isNaN(syp) || syp < 0) {
      toast.error('الرجاء إدخال مبالغ العد الفعلي للصندوق لإغلاق الوردية');
      return;
    }

    try {
      await closeShift({
        shiftId: activeShift.id,
        actualUsd: usd,
        actualSyp: syp
      });
      setShowCloseForm(false);
      setActualUsd('');
      setActualSyp('');
    } catch (err) {}
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Coins className="w-6 h-6 text-indigo-400" />
            <span>الصندوق وحسابات فترات الكاشير</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">فتح وإغلاق ورديات الصناديق اليومية، مطابقة الرصيد الدفتري للنظام بالعد الفعلي، وضبط تباينات العجز والفائض المالي</p>
        </div>
      </div>

      {/* Active Shift status widget */}
      {activeShift ? (
        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 shadow-xl space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[11px] font-black border border-emerald-500/15">الوردية الحالية مفتوحة ونشطة</span>
              <h3 className="text-sm font-black text-slate-100 pt-1">
                مسؤول الصندوق المكلف: <strong className="text-indigo-400">{activeShift.employee_name}</strong>
              </h3>
              <p className="text-[10px] text-slate-500 font-bold">بدأت الفترة في: {new Date(activeShift.open_date).toLocaleString('ar-SY', { hour12: false })}</p>
            </div>

            <button
              onClick={() => {
                setActualUsd(Number(activeShift.closing_balance_usd || activeShift.opening_balance_usd).toString());
                setActualSyp(Number(activeShift.closing_balance_syp || activeShift.opening_balance_syp).toString());
                setShowCloseForm(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition shadow-lg cursor-pointer animate-pulse"
            >
              <Ban className="w-4 h-4" />
              <span>إنهاء فترة الكاشير وإغلاق الصندوق</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs font-bold">
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
              <span className="text-slate-500 text-[10px] block">رصيد الافتتاح دولار</span>
              <span className="text-lg font-black text-slate-300 font-mono">${activeShift.opening_balance_usd.toFixed(2)}</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
              <span className="text-slate-500 text-[10px] block">رصيد الافتتاح ليرة</span>
              <span className="text-lg font-black text-slate-300 font-mono">{activeShift.opening_balance_syp.toLocaleString()} ل.س</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
              <span className="text-slate-500 text-[10px] block">الرصيد الدفتري الحالي دولار</span>
              <span className="text-lg font-black text-emerald-400 font-mono">${Number(activeShift.closing_balance_usd || activeShift.opening_balance_usd).toFixed(2)}</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
              <span className="text-slate-500 text-[10px] block">الرصيد الدفتري الحالي ليرة</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{Number(activeShift.closing_balance_syp || activeShift.opening_balance_syp).toLocaleString()} ل.س</span>
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
          <div className="p-4 bg-amber-500/10 rounded-full text-amber-500 border border-amber-500/10">
            <Coins className="w-10 h-10" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="font-black text-slate-100 text-sm">صندوق الصالة مغلق حالياً</h3>
            <p className="text-xs text-slate-400 font-bold">لا توجد فترة كاشير نشطة ومفتوحة بالصالة الآن. لتسجيل عمليات بيع أو استلام سلع أو سداد دين أو جرد، يجب فتح صندوق وبدء وردية جديدة أولاً.</p>
          </div>

          <button
            onClick={() => setShowOpenForm(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-extrabold text-xs transition shadow-lg cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>بَدء وردية جديدة وفتح الصندوق</span>
          </button>
        </div>
      )}

      {/* Start Shift Modal */}
      {showOpenForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <form onSubmit={handleOpenShiftSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-black text-sm text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Coins className="w-4 h-4 text-indigo-400" />
              <span>إدخال عُهدة ورصيد افتتاح الصندوق</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">عهدة الافتتاح بالدولار ($)</label>
              <input
                type="number"
                step="any"
                required
                value={openingUsd}
                onChange={(e) => setOpeningUsd(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">عهدة الافتتاح بالليرة السورية (ل.س)</label>
              <input
                type="number"
                required
                value={openingSyp}
                onChange={(e) => setOpeningSyp(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOpenForm(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isOpening}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition cursor-pointer"
              >
                {isOpening ? 'جاري الفتح...' : 'بَدء الوردية الآن'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseForm && activeShift && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <form onSubmit={handleCloseShiftSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-black text-sm text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Ban className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>عد ومطابقة رصيد إغلاق الصندوق الفعلي</span>
            </h3>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-[11px] text-slate-400 space-y-1.5 font-bold">
              <div className="flex justify-between">
                <span>المبلغ المتوقع دفترياً بالدولار:</span>
                <span className="text-emerald-400">${Number(activeShift.closing_balance_usd || activeShift.opening_balance_usd).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>المبلغ المتوقع دفترياً بالليرة:</span>
                <span className="text-emerald-400">{Number(activeShift.closing_balance_syp || activeShift.opening_balance_syp).toLocaleString()} ل.س</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">المبلغ المقاس الفعلي بالصندوق دولار ($)</label>
              <input
                type="number"
                step="any"
                required
                value={actualUsd}
                onChange={(e) => setActualUsd(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-indigo-400 font-bold focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">المبلغ المقاس الفعلي بالصندوق ليرة (ل.س)</label>
              <input
                type="number"
                required
                value={actualSyp}
                onChange={(e) => setActualSyp(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-indigo-400 font-bold focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseForm(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isClosing}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition cursor-pointer"
              >
                {isClosing ? 'جاري المطابقة والإغلاق...' : 'تثبيت ومطابقة الإغلاق الآن'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shifts History Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        
        <div className="p-4 border-b border-slate-800 bg-slate-950/20">
          <span className="font-black text-slate-100 text-xs flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <span>سجل وأرصيف فترات إغلاق الصناديق السابقة</span>
          </span>
        </div>

        {cashRegisters.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-bold">لا يوجد فترات صناديق مغلقة سابقة بالأرشيف</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/10">
                  <th className="p-4">مسؤول الصندوق</th>
                  <th className="p-4 text-center">الافتتاح (دولار)</th>
                  <th className="p-4 text-center">الافتتاح (ل.س)</th>
                  <th className="p-4 text-center">المتوقع دفترياً (دولار)</th>
                  <th className="p-4 text-center">المقاس فعلياً (دولار)</th>
                  <th className="p-4 text-center">التباين الحاصل (دولار)</th>
                  <th className="p-4 text-center">توقيت البدء</th>
                  <th className="p-4 text-center">توقيت الإغلاق</th>
                  <th className="p-4 text-left">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {cashRegisters.map(shift => {
                  const expectedUsd = shift.closing_balance_usd || shift.opening_balance_usd;
                  const actualUsdVal = shift.actual_closing_usd;
                  const diffUsd = actualUsdVal !== null ? actualUsdVal - expectedUsd : 0;

                  return (
                    <tr key={shift.id} className="hover:bg-slate-800/20 transition">
                      <td className="p-4 font-extrabold text-slate-100">{shift.employee_name}</td>
                      <td className="p-4 text-center font-mono text-slate-400">${shift.opening_balance_usd.toFixed(2)}</td>
                      <td className="p-4 text-center font-mono text-slate-400">{shift.opening_balance_syp.toLocaleString()}</td>
                      <td className="p-4 text-center font-mono text-slate-300">${expectedUsd.toFixed(2)}</td>
                      <td className="p-4 text-center font-mono">
                        {actualUsdVal !== null ? `$${actualUsdVal.toFixed(2)}` : <span className="text-slate-500 font-normal">--</span>}
                      </td>
                      <td className="p-4 text-center font-mono font-bold">
                        {shift.status === 'closed' && actualUsdVal !== null ? (
                          diffUsd > 0 ? (
                            <span className="text-emerald-400">+{diffUsd.toFixed(2)} (فائض)</span>
                          ) : diffUsd < 0 ? (
                            <span className="text-rose-400">{diffUsd.toFixed(2)} (عجز)</span>
                          ) : (
                            <span className="text-slate-400">0 (مطابق تماماً)</span>
                          )
                        ) : (
                          <span className="text-slate-500 font-normal">--</span>
                        )}
                      </td>
                      <td className="p-4 text-center text-slate-500 font-mono text-[10px]">
                        {new Date(shift.open_date).toLocaleString('ar-SY', { hour12: false })}
                      </td>
                      <td className="p-4 text-center text-slate-500 font-mono text-[10px]">
                        {shift.close_date ? new Date(shift.close_date).toLocaleString('ar-SY', { hour12: false }) : '---'}
                      </td>
                      <td className="p-4 text-left">
                        {shift.status === 'open' ? (
                          <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/15">نشط مفتوح</span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full text-[10px]">مغلق</span>
                        )}
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
  );
}
