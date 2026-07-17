import React, { useState, useMemo } from 'react';
import { useEmployees } from '../../hooks/useEmployees';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { PageSkeleton } from '../shared/PageSkeleton';
import { UserSquare2, PlusCircle, Search, Trash2, Edit2, Phone, BadgePercent, ShieldCheck, DollarSign, Calendar, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function EmployeesView() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, isLoading, isAdding: isSavingEmployee, isUpdating: isUpdatingEmployee } = useEmployees();

  const [showForm, setShowForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState<'admin' | 'cashier' | 'storekeeper'>('cashier');
  const [salary, setSalary] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showPin, setShowPin] = useState(false);

  const handleEdit = (emp: any) => {
    setEditingEmployeeId(emp.id);
    setName(emp.name);
    setPhone(emp.phone || '');
    setPosition(emp.position);
    setSalary(emp.salary.toString());
    setCommissionRate(emp.commission_rate.toString());
    setPinCode(emp.pin_code);
    setBarcode(emp.barcode || '');
    setIsActive(emp.is_active);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEmployeeId(null);
    setName('');
    setPhone('');
    setPosition('cashier');
    setSalary('');
    setCommissionRate('');
    setPinCode('');
    setBarcode('');
    setIsActive(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingEmployee || isUpdatingEmployee) return; // منع الإرسال المزدوج
    if (!name.trim()) {
      toast.error('الرجاء إدخال اسم الموظف');
      return;
    }
    if (!pinCode.trim() || pinCode.length < 4) {
      toast.error('الرجاء إدخال رمز PIN (4 أرقام على الأقل)');
      return;
    }

    const payload = {
      name,
      phone,
      position,
      salary: Number(salary) || 0,
      commission_rate: Number(commissionRate) || 0,
      pin_code: pinCode,
      barcode: barcode || undefined,
      is_active: isActive,
      hire_date: new Date().toISOString().split('T')[0],
    };

    try {
      if (editingEmployeeId) {
        await updateEmployee({
          id: editingEmployeeId,
          total_sales_usd: employees.find(x => x.id === editingEmployeeId)?.total_sales_usd || 0,
          ...payload,
        } as any);
      } else {
        await addEmployee(payload as any);
      }
      handleCancel();
    } catch (err) {
      // toast in hook
    }
  };

  const handleDeleteClick = (id: string) => {
    setEmployeeToDelete(id);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployee(employeeToDelete);
    } catch (err) {}
    setEmployeeToDelete(null);
  };

  // Filtered list
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(e => 
      e.name.toLowerCase().includes(q) || 
      (e.phone && e.phone.includes(q)) || 
      e.position.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalStaff = employees.length;
    const activeStaff = employees.filter(e => e.is_active).length;
    const totalSalesCommission = employees.reduce((acc, e) => acc + (e.total_sales_usd * (e.commission_rate / 100)), 0);
    const totalSalaries = employees.reduce((acc, e) => acc + e.salary, 0);

    return {
      totalStaff,
      activeStaff,
      totalSalesCommission,
      totalSalaries,
    };
  }, [employees]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <UserSquare2 className="w-6 h-6 text-indigo-400" />
            <span>إدارة الموظفين والصلاحيات والأجور</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">تنسيق ملفات الموظفين، أجورهم، نسب العمولات، الحضور، وتعيين رموز PIN وبطاقات الدخول السريعة</p>
        </div>

        <button
          onClick={() => {
            if (showForm) handleCancel();
            else setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition shadow-lg cursor-pointer animate-pulse"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? 'إلغاء العملية' : 'إضافة موظف جديد'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي عدد الكادر</span>
            <span className="text-xl font-black text-slate-100 block mt-1">{stats.totalStaff} موظف</span>
          </div>
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <UserSquare2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">الموظفين النشطين</span>
            <span className="text-xl font-black text-emerald-400 block mt-1">{stats.activeStaff} نشط</span>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">كتلة الرواتب الثابتة شهرياً</span>
            <span className="text-xl font-black text-indigo-400 block mt-1">${stats.totalSalaries.toLocaleString()}</span>
          </div>
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">تقدير العمولات المستحقة</span>
            <span className="text-xl font-black text-amber-500 block mt-1">${stats.totalSalesCommission.toFixed(2)}</span>
          </div>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
            <BadgePercent className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-6 space-y-6 shadow-xl animate-fadeIn">
          <h3 className="font-black text-sm text-slate-100 border-b border-slate-800 pb-3">
            {editingEmployeeId ? 'تعديل بيانات الموظف الحالي' : 'تسجيل ملف موظف جديد بالمنشأة'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            
            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">الاسم الكامل</label>
              <input
                type="text"
                placeholder="أحمد دمشقي..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">رقم الهاتف الجوال</label>
              <input
                type="text"
                placeholder="0999xxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Position */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">المسمى الوظيفي والصلاحيات</label>
              <select
                value={position}
                onChange={(e: any) => setPosition(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="cashier">كاشير مبيعات وصندوق (صلاحية محدودة)</option>
                <option value="storekeeper">أمين مستودع وجرد (صلاحية متوسطة)</option>
                <option value="admin">مدير عام للنظام (صلاحية كاملة)</option>
              </select>
            </div>

            {/* Fixed Salary */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">الراتب الشهري الثابت ($)</label>
              <input
                type="number"
                placeholder="300"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Commission Rate */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">نسبة عمولة المبيعات %</label>
              <input
                type="number"
                step="any"
                placeholder="1.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* PIN Code */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">رمز تسجيل الدخول PIN (4-6 أرقام)</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  placeholder="1234"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Barcode / ID Card */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">باركود بطاقة الدخول السريع</label>
              <input
                type="text"
                placeholder="مثال: EMP-9988"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Active Status */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">حالة الحساب</label>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-700 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="text-xs font-black text-slate-300 select-none cursor-pointer">الموظف على رأس عمله ونشط حالياً</label>
              </div>
            </div>

          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSavingEmployee || isUpdatingEmployee}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(isSavingEmployee || isUpdatingEmployee) ? 'جاري الحفظ...' : 'حفظ بيانات الموظف'}
            </button>
          </div>
        </form>
      )}

      {/* Employee List Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        
        {/* Search header bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-black text-slate-100 text-xs">سجل وملفات الموظفين بالصالة</span>
          <div className="relative w-full md:w-80">
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

        {/* Results List */}
        {filteredEmployees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-600 mb-2">
              <UserSquare2 className="w-8 h-8" />
            </div>
            <p className="text-sm font-black text-slate-400">لا يوجد موظفين مطابقين للبحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredEmployees.map(emp => {
              const estCommission = emp.total_sales_usd * (emp.commission_rate / 100);
              return (
                <div key={emp.id} className="bg-slate-950/40 rounded-2xl border border-slate-800/60 p-5 space-y-4 hover:border-indigo-500/30 transition relative">
                  
                  {/* Status Badge */}
                  <div className="absolute left-4 top-4">
                    {emp.is_active ? (
                      <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-emerald-500/15">نشط حالياً</span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-rose-500/15">غير نشط</span>
                    )}
                  </div>

                  {/* Profile Header */}
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-100">{emp.name}</h4>
                    <span className="text-[10px] font-bold text-slate-500 block mt-1">
                      {emp.position === 'admin' ? 'مدير عام الصلاحيات' : emp.position === 'cashier' ? 'كاشير مبيعات وصندوق' : 'أمين المستودع والجرد'}
                    </span>
                  </div>

                  {/* Quick Specs */}
                  <div className="space-y-2 text-xs border-t border-b border-slate-800/60 py-3">
                    
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{emp.phone || 'لا يوجد هاتف'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      <span>الراتب الثابت: <strong className="text-indigo-400">${emp.salary}</strong> شهرياً</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <BadgePercent className="w-3.5 h-3.5 text-slate-500" />
                      <span>عمولة المبيعات: <strong className="text-amber-500">{emp.commission_rate}%</strong></span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>حجم المبيعات: <strong className="text-slate-200">${emp.total_sales_usd.toLocaleString()}</strong></span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg text-[10px] text-slate-400 mt-2 font-bold font-mono">
                      <span>PIN: <strong className="text-slate-200">{emp.pin_code}</strong></span>
                      {emp.barcode && <span>البطاقة: <strong className="text-slate-200">{emp.barcode}</strong></span>}
                    </div>

                  </div>

                  {/* Individual performance assessment */}
                  <div className="flex justify-between items-center text-[11px] font-bold bg-slate-900/40 p-2.5 rounded-xl">
                    <span className="text-slate-500">العمولات المقدرة:</span>
                    <span className="text-emerald-400 font-mono">${estCommission.toFixed(2)}</span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleEdit(emp)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(emp.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                      title="حذف الموظف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={employeeToDelete !== null}
        title="حذف الموظف نهائياً"
        message="هل أنت متأكد من رغبتك في حذف هذا الموظف بالكامل من النظام؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="نعم، احذف الموظف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmDeleteEmployee}
        onCancel={() => setEmployeeToDelete(null)}
      />

    </div>
  );
}
