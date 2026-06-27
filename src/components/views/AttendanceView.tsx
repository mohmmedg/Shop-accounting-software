import React, { useState, useMemo } from 'react';
import { useAttendance } from '../../hooks/useAttendance';
import { useEmployees } from '../../hooks/useEmployees';
import { PageSkeleton } from '../shared/PageSkeleton';
import { CalendarCheck, Barcode, PlusCircle, Search, ClipboardList, CheckCircle, Clock, AlertTriangle, UserSquare2 } from 'lucide-react';
import { toast } from 'sonner';

export function AttendanceView() {
  const { attendance, checkInEmployee, checkOutEmployee, addManualAttendance, isLoading } = useAttendance();
  const { employees } = useEmployees();

  const [barcodeInput, setBarcodeInput] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Manual entry states
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState('08:00');
  const [checkOutTime, setCheckOutTime] = useState('17:00');
  const [status, setStatus] = useState<'present' | 'absent' | 'late' | 'half_day'>('present');

  // Handle barcode scanning manually entered
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    // Find employee with barcode
    const emp = employees.find(x => x.barcode === barcodeInput && x.is_active);
    if (!emp) {
      toast.error('لم يتم العثور على موظف نشط بهذا الباركود');
      setBarcodeInput('');
      return;
    }

    try {
      // Check if employee has an open attendance session (checked in today, check_out is null)
      const todayDateStr = new Date().toISOString().split('T')[0];
      const activeCheckIn = attendance.find(a => a.employee_id === emp.id && a.date === todayDateStr && !a.check_out);

      if (activeCheckIn) {
        // Clock out
        await checkOutEmployee({ employeeId: emp.id });
      } else {
        // Clock in
        await checkInEmployee({ employeeId: emp.id, employeeName: emp.name });
      }
    } catch (err) {}
    setBarcodeInput('');
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      toast.error('الرجاء اختيار الموظف أولاً');
      return;
    }

    const emp = employees.find(x => x.id === selectedEmployeeId);
    if (!emp) return;

    // Calculate work hours
    const [inH, inM] = checkInTime.split(':').map(Number);
    const [outH, outM] = checkOutTime.split(':').map(Number);
    const inMin = inH * 60 + inM;
    const outMin = outH * 60 + outM;
    
    let diffHrs = 0;
    if (outMin > inMin) {
      diffHrs = Math.round(((outMin - inMin) / 60) * 100) / 100;
    }

    const checkInIso = `${manualDate}T${checkInTime}:00`;
    const checkOutIso = `${manualDate}T${checkOutTime}:00`;

    try {
      await addManualAttendance({
        employee_id: selectedEmployeeId,
        employee_name: emp.name,
        check_in: checkInIso,
        check_out: checkOutIso,
        work_hours: diffHrs,
        status,
        date: manualDate,
      });
      setShowManualForm(false);
      setSelectedEmployeeId('');
    } catch (err) {}
  };

  // Summarize monthly totals per employee
  const monthlySummary = useMemo(() => {
    const summary: Record<string, { name: string; present: number; absent: number; late: number; hours: number }> = {};
    
    employees.forEach(emp => {
      summary[emp.id] = { name: emp.name, present: 0, absent: 0, late: 0, hours: 0 };
    });

    attendance.forEach(att => {
      if (!summary[att.employee_id]) return;
      
      if (att.status === 'present') summary[att.employee_id].present++;
      else if (att.status === 'late') summary[att.employee_id].late++;
      else if (att.status === 'absent') summary[att.employee_id].absent++;
      
      summary[att.employee_id].hours += Number(att.work_hours || 0);
    });

    return Object.entries(summary).map(([id, stats]) => ({ id, ...stats }));
  }, [attendance, employees]);

  // Today's log
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayAttendance = useMemo(() => {
    return attendance.filter(a => a.date === todayDateStr);
  }, [attendance, todayDateStr]);

  // Filtered log
  const filteredAttendanceLog = useMemo(() => {
    if (!searchQuery.trim()) return attendance;
    const q = searchQuery.toLowerCase();
    return attendance.filter(a => a.employee_name.toLowerCase().includes(q));
  }, [attendance, searchQuery]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-indigo-400" />
            <span>سجل الحضور والانصراف للكادر</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">مسح بطاقات الدخول السريع أو تسجيل تواقيت الدوام والورديات اليومية يدوياً وتصدير تقارير ساعات العمل</p>
        </div>

        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition shadow-lg cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showManualForm ? 'إلغاء العملية' : 'تسجيل يدوي'}</span>
        </button>
      </div>

      {/* Barcode swipe top panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 justify-between shadow-lg">
        <div className="space-y-1.5 text-center md:text-right">
          <span className="font-extrabold text-sm text-slate-200 flex items-center gap-2 justify-center md:justify-start">
            <Barcode className="w-5 h-5 text-indigo-400" />
            <span>تسجيل الدخول/الخروج الذاتي للموظف</span>
          </span>
          <p className="text-xs text-slate-500 font-bold">يمكن للموظف مسح الباركود الخاص ببطاقته لتسجيل حضوره أو انصرافه تلقائياً</p>
        </div>

        <form onSubmit={handleBarcodeSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="امسح الباركود هنا أو اكتبه..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pl-12 text-center font-bold text-sm text-indigo-400 focus:outline-none focus:border-indigo-500 transition"
          />
          <Barcode className="w-5 h-5 text-slate-600 absolute left-4 top-3.5" />
        </form>
      </div>

      {/* Manual Input Form */}
      {showManualForm && (
        <form onSubmit={handleManualSave} className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-6 space-y-6 shadow-xl animate-fadeIn">
          <h3 className="font-black text-sm text-slate-100 border-b border-slate-800 pb-3">تسجيل حضور/انصراف يدوي لموظف</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
            
            {/* Employee Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">الموظف</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="">-- اختر موظف --</option>
                {employees.filter(e => e.is_active).map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">التاريخ</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Check In */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">ساعة الحضور</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Check Out */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">ساعة الانصراف</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">الحالة</label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="present">حاضر (Present)</option>
                <option value="late">متأخر (Late)</option>
                <option value="absent">غائب (Absent)</option>
                <option value="half_day">نصف يوم (Half Day)</option>
              </select>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition cursor-pointer"
            >
              حفظ السجل
            </button>
          </div>
        </form>
      )}

      {/* Main Grid content layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Log table area */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          
          <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/20">
            <span className="font-black text-slate-100 text-xs flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-400" />
              <span>جدول تسجيلات الحضور السابقة</span>
            </span>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="ابحث باسم الموظف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-800 rounded-xl px-4 py-2 pr-9 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>

          {filteredAttendanceLog.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-bold">لا يوجد سجلات حضور مسجلة حالياً</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/10">
                    <th className="p-4">الموظف</th>
                    <th className="p-4 text-center">التاريخ</th>
                    <th className="p-4 text-center">الحضور</th>
                    <th className="p-4 text-center">الانصراف</th>
                    <th className="p-4 text-center">الساعات</th>
                    <th className="p-4 text-left">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {filteredAttendanceLog.map(att => (
                    <tr key={att.id} className="hover:bg-slate-800/20 transition">
                      <td className="p-4 font-extrabold text-slate-100">{att.employee_name}</td>
                      <td className="p-4 text-center text-slate-400 font-mono">{att.date}</td>
                      <td className="p-4 text-center text-emerald-400 font-mono">
                        {att.check_in ? new Date(att.check_in).toLocaleTimeString('ar-SY', { hour12: false }) : '---'}
                      </td>
                      <td className="p-4 text-center text-rose-400 font-mono">
                        {att.check_out ? new Date(att.check_out).toLocaleTimeString('ar-SY', { hour12: false }) : 'لا زال بالدوام'}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-200">
                        {att.work_hours > 0 ? `${att.work_hours} ساعة` : '---'}
                      </td>
                      <td className="p-4 text-left">
                        {att.status === 'present' && <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/15">حاضر</span>}
                        {att.status === 'late' && <span className="bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/15">متأخر</span>}
                        {att.status === 'absent' && <span className="bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-500/15">غائب</span>}
                        {att.status === 'half_day' && <span className="bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">نصف يوم</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Monthly statistics summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 className="font-black text-xs text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
            <ClipboardList className="w-4 h-4 text-indigo-400" />
            <span>خلاصة دوام الشهر الحالي</span>
          </h3>

          <div className="space-y-4 overflow-y-auto max-h-[360px] divide-y divide-slate-800/40">
            {monthlySummary.map(ms => (
              <div key={ms.id} className="pt-3 first:pt-0 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-xs text-slate-200 flex items-center gap-1.5">
                    <UserSquare2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{ms.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-black bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800/80">
                    إجمالي الساعات: <strong className="text-indigo-400 font-mono">{ms.hours} ساعة</strong>
                  </span>
                </div>
                
                {/* Specific Status Indicators */}
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-center">
                  <div className="bg-slate-950/40 p-1.5 rounded-lg text-emerald-400 border border-slate-800">
                    <span>حضور: {ms.present}</span>
                  </div>
                  <div className="bg-slate-950/40 p-1.5 rounded-lg text-amber-500 border border-slate-800">
                    <span>تأخير: {ms.late}</span>
                  </div>
                  <div className="bg-slate-950/40 p-1.5 rounded-lg text-rose-400 border border-slate-800">
                    <span>غياب: {ms.absent}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
