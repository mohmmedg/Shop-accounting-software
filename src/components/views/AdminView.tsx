import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useEmployees } from '../../hooks/useEmployees';
import { useSettings } from '../../hooks/useSettings';
import { useAuditLog } from '../../hooks/useAuditLog';
import { useAdminStats } from '../../hooks/useAdminStats';
import { useSales } from '../../hooks/useSales';
import { useProducts } from '../../hooks/useProducts';
import { supabase } from '../../lib/supabase';
import { PageSkeleton } from '../shared/PageSkeleton';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { toast } from 'sonner';
import {
  Shield, Users, Activity, DollarSign, Database,
  Eye, EyeOff, Edit2, Trash2, Plus, Check, X,
  TrendingUp, TrendingDown, AlertTriangle, Package,
  RefreshCw, Download, Search, ChevronRight, BarChart3,
  History, Settings as SettingsIcon, UserCheck,
  ArrowUp, ArrowDown, FileText, Coins
} from 'lucide-react';
import { ROLE_PERMISSIONS, Employee, EmployeePosition } from '../../types';

type AdminTab = 'monitor' | 'employees' | 'permissions' | 'auditlog' | 'exchange' | 'backup';

export function AdminView() {
  const { currentUser, isAdmin } = useAuth();
  const { employees, addEmployee, updateEmployee, deleteEmployee, isLoading: loadingEmployees } = useEmployees();
  const { settings, updateSettings, isUpdating } = useSettings();
  const { auditLogs, exchangeRateHistory, isLoadingLogs, logAction } = useAuditLog();
  const { data: adminStats, isLoading: loadingStats, refetch: refetchStats } = useAdminStats();
  const { invoices } = useSales();
  const { products } = useProducts();

  const [activeTab, setActiveTab] = useState<AdminTab>('monitor');

  // Employee management state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; name: string }>({ open: false, id: null, name: '' });
  const [empSearch, setEmpSearch] = useState('');
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  // Employee form state
  const [empForm, setEmpForm] = useState({
    name: '', phone: '', position: 'cashier' as EmployeePosition,
    salary: '', commission_rate: '', pin_code: '', barcode: '', hire_date: new Date().toISOString().split('T')[0], is_active: true
  });

  // Exchange rate state
  const [newRate, setNewRate] = useState('');
  const [rateNote, setRateNote] = useState('');
  const [isChangingRate, setIsChangingRate] = useState(false);

  // Audit log filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  // --- GUARD: Only admins can access this view ---
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 animate-fade-in" dir="rtl">
        <Shield className="w-16 h-16 text-red-500/50" />
        <h2 className="text-2xl font-black text-slate-300">وصول مقيّد</h2>
        <p className="text-slate-500 max-w-sm text-sm">هذه الصفحة مخصصة للمدير فقط. تواصل مع المسؤول للحصول على الصلاحيات.</p>
      </div>
    );
  }

  // --- TAB 1: LIVE MONITOR ---
  const MonitorTab = () => {
    if (loadingStats) return <PageSkeleton />;

    const stats = adminStats;
    if (!stats) return null;

    const statCards = [
      { label: 'مبيعات اليوم', value: `$${stats.todaySalesUsd.toFixed(2)}`, sub: `${stats.todayInvoiceCount} فاتورة`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
      { label: 'ربح اليوم التقديري', value: `$${stats.todayProfitUsd.toFixed(2)}`, sub: `بعد التكاليف`, icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
      { label: 'مصاريف اليوم', value: `$${stats.todayExpensesUsd.toFixed(2)}`, sub: 'إجمالي المصاريف', icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
      { label: 'إجمالي الديون المعلقة', value: `$${stats.totalDebtUsd.toFixed(2)}`, sub: `${stats.totalDebtCount} عميل مدين`, icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
      { label: 'أصناف تحتاج طلب', value: stats.lowStockCount.toString(), sub: `${stats.outOfStockCount} منتج نفد تماماً`, icon: Package, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
      { label: 'صندوق الوردية الحالية', value: stats.activeShiftEmployee ? `$${stats.activeShiftCashUsd.toFixed(2)}` : 'مغلق', sub: stats.activeShiftEmployee || 'لا توجد وردية مفتوحة', icon: Coins, color: stats.activeShiftEmployee ? 'text-emerald-400' : 'text-slate-500', bg: stats.activeShiftEmployee ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-900 border-slate-800' },
      { label: 'أفضل بائع', value: stats.topSellerName || '—', sub: stats.topSellerName ? `$${stats.topSellerUsd.toFixed(2)} مبيعات إجمالية` : 'لا توجد مبيعات', icon: UserCheck, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
      { label: 'الموظفون النشطون', value: stats.activeEmployeeCount.toString(), sub: 'حسابات نشطة في النظام', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    ];

    return (
      <div className="space-y-6">
        {/* Refresh button */}
        <div className="flex justify-between items-center">
          <div className="text-right">
            <h3 className="text-base font-black text-slate-200">لوحة المراقبة اللحظية</h3>
            <p className="text-xs text-slate-500">مراقبة دقيقة للأموال والمنتجات والموظفين بشكل فوري</p>
          </div>
          <button onClick={() => refetchStats()} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition border border-slate-800 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث البيانات
          </button>
        </div>

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="admin-stats-cards-grid">
          {statCards.map((card, i) => (
            <div key={i} className={`rounded-2xl border p-5 ${card.bg}`} id={`admin-stat-card-${i}`}>
              <div className="flex justify-between items-start mb-2">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <span className="text-[10px] text-slate-500 font-bold">{card.label}</span>
              </div>
              <p className={`text-2xl font-black ${card.color} text-right font-mono`}>{card.value}</p>
              <p className="text-xs text-slate-500 text-right mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Today's invoices breakdown */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5" id="admin-recent-invoices">
          <h4 className="font-black text-slate-200 mb-4 text-right">آخر 10 فواتير تم إصدارها اليوم</h4>
          {invoices.filter(inv => inv.sale_date?.startsWith(new Date().toISOString().split('T')[0])).slice(0, 10).length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">لا توجد فواتير تم إصدارها اليوم حتى الآن</p>
          ) : (
            <div className="space-y-2">
              {invoices
                .filter(inv => inv.sale_date?.startsWith(new Date().toISOString().split('T')[0]))
                .slice(0, 10)
                .map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${inv.payment_method === 'cash' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : inv.payment_method === 'debt' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                      {inv.payment_method === 'cash' ? 'نقدي' : inv.payment_method === 'debt' ? 'دين كامل' : 'دفع جزئي'}
                    </span>
                    <span className="text-xs text-slate-400 flex-1 text-right mx-3 font-bold">{inv.customer_name}</span>
                    <span className="text-xs font-bold text-slate-500 font-mono pl-3">{inv.invoice_number}</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">${inv.total_usd.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Low stock alert */}
        {stats.lowStockCount > 0 && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5" id="admin-low-stock-panel">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h4 className="font-black text-yellow-400 text-sm">منتجات قاربت على النفاد وتحتاج إلى توريد للرفوف والمخزن ({stats.lowStockCount})</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.filter(p => p.quantity <= p.warning_limit && p.quantity > 0).slice(0, 6).map(p => (
                <div key={p.id} className="bg-slate-950/40 rounded-xl px-4 py-3 flex justify-between items-center border border-slate-850">
                  <span className="text-yellow-400 font-extrabold text-xs font-mono">{p.quantity} {p.sold_by_weight ? 'كغ' : 'قطعة'}</span>
                  <span className="text-slate-300 text-xs font-black text-right">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- TAB 2: EMPLOYEE MANAGEMENT ---
  const EmployeesTab = () => {
    const resetForm = () => setEmpForm({
      name: '', phone: '', position: 'cashier',
      salary: '', commission_rate: '', pin_code: '', barcode: '',
      hire_date: new Date().toISOString().split('T')[0], is_active: true
    });

    const handleAddEmployee = async () => {
      if (!empForm.name.trim() || !empForm.pin_code.trim()) {
        toast.error('الاسم ورمز PIN مطلوبان');
        return;
      }
      if (empForm.pin_code.length < 4) {
        toast.error('PIN يجب أن يكون 4 أرقام على الأقل');
        return;
      }
      try {
        await addEmployee({
          name: empForm.name,
          phone: empForm.phone,
          position: empForm.position,
          salary: Number(empForm.salary) || 0,
          commission_rate: Number(empForm.commission_rate) || 0,
          hire_date: empForm.hire_date,
          is_active: true,
          pin_code: empForm.pin_code,
          barcode: empForm.barcode || undefined,
        });
        await logAction({
          action_type: 'login',
          entity_type: 'employee',
          entity_name: empForm.name,
          description: `تم إضافة موظف جديد: ${empForm.name} بمرتب $${Number(empForm.salary) || 0} وبصيغة وظيفة (${empForm.position})`,
        });
        resetForm();
        setShowAddEmployee(false);
      } catch (err: any) {
        toast.error(err.message);
      }
    };

    const handleUpdateEmployee = async () => {
      if (!editingEmployee) return;
      try {
        const oldData = employees.find(e => e.id === editingEmployee.id);
        await updateEmployee({
          ...editingEmployee,
          name: empForm.name || editingEmployee.name,
          phone: empForm.phone,
          position: empForm.position,
          salary: Number(empForm.salary) || 0,
          commission_rate: Number(empForm.commission_rate) || 0,
          pin_code: empForm.pin_code || editingEmployee.pin_code,
          barcode: empForm.barcode || undefined,
          is_active: empForm.is_active,
        });
        await logAction({
          action_type: 'edit_price',
          entity_type: 'employee',
          entity_id: editingEmployee.id,
          entity_name: editingEmployee.name,
          old_value: { position: oldData?.position, salary: oldData?.salary, is_active: oldData?.is_active },
          new_value: { position: empForm.position, salary: Number(empForm.salary), is_active: empForm.is_active },
          description: `تم تعديل بيانات الموظف: ${editingEmployee.name}`,
        });
        setEditingEmployee(null);
        resetForm();
      } catch (err: any) {
        toast.error(err.message);
      }
    };

    const handleDeleteEmployee = async () => {
      if (!deleteConfirm.id) return;
      if (deleteConfirm.id === currentUser?.id) {
        toast.error('لا يمكنك حذف حسابك الخاص');
        setDeleteConfirm({ open: false, id: null, name: '' });
        return;
      }
      try {
        await deleteEmployee(deleteConfirm.id);
        await logAction({
          action_type: 'delete_employee',
          entity_type: 'employee',
          entity_id: deleteConfirm.id,
          entity_name: deleteConfirm.name,
          description: `تم حذف الموظف: ${deleteConfirm.name} نهائياً من قاعدة البيانات`,
        });
        setDeleteConfirm({ open: false, id: null, name: '' });
      } catch (err: any) {
        toast.error(err.message);
      }
    };

    const startEdit = (emp: Employee) => {
      setEditingEmployee(emp);
      setEmpForm({
        name: emp.name, phone: emp.phone || '', position: emp.position,
        salary: emp.salary?.toString() || '', commission_rate: emp.commission_rate?.toString() || '',
        pin_code: emp.pin_code, barcode: emp.barcode || '',
        hire_date: emp.hire_date, is_active: emp.is_active
      });
    };

    const filteredEmployees = employees.filter(e =>
      e.name.toLowerCase().includes(empSearch.toLowerCase()) || e.position.includes(empSearch)
    );

    const positionLabel = (pos: EmployeePosition) =>
      pos === 'admin' ? 'مدير' : pos === 'cashier' ? 'كاشير' : 'أمين مستودع';

    const positionColor = (pos: EmployeePosition) =>
      pos === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
      pos === 'cashier' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
      'bg-orange-500/10 text-orange-400 border-orange-500/20';

    const EmployeeForm = () => (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4" id="employee-form-container">
        <h4 className="font-black text-slate-200 text-xs text-right">
          {editingEmployee ? `تعديل بيانات الموظف: ${editingEmployee.name}` : 'إضافة موظف جديد لأسرة العمل'}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'الاسم الكامل للموظف *', key: 'name', type: 'text', placeholder: 'مثال: محمد الأحمد' },
            { label: 'رقم الهاتف الجوال', key: 'phone', type: 'tel', placeholder: '09XX XXX XXX' },
            { label: 'رمز PIN للدخول سريعاً *', key: 'pin_code', type: 'text', placeholder: 'رمز رقمي سري (4+ أرقام)' },
            { label: 'باركود بطاقة الموظف', key: 'barcode', type: 'text', placeholder: 'مثال: EMP-998 (اختياري)' },
            { label: 'الراتب الشهري ($)', key: 'salary', type: 'number', placeholder: '0' },
            { label: 'نسبة العمولة من المبيعات (%)', key: 'commission_rate', type: 'number', placeholder: '0' },
            { label: 'تاريخ بدء العمل والتعيين', key: 'hire_date', type: 'date', placeholder: '' },
          ].map(field => (
            <div key={field.key} className="text-right">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5">{field.label}</label>
              <input
                type={field.type}
                value={(empForm as any)[field.key]}
                onChange={e => setEmpForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-200 text-right focus:border-indigo-500 focus:outline-none font-sans"
              />
            </div>
          ))}

          <div className="text-right">
            <label className="block text-[10px] font-bold text-slate-500 mb-1.5">الدور والمنصب الوظيفي</label>
            <select
              value={empForm.position}
              onChange={e => setEmpForm(f => ({ ...f, position: e.target.value as EmployeePosition }))}
              className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-200 text-right focus:border-indigo-500 focus:outline-none"
            >
              <option value="admin">مدير — صلاحيات وتحكم ومراقبة مطلقة</option>
              <option value="cashier">كاشير — مبيعات، فواتير، صندوق، وردية</option>
              <option value="storekeeper">أمين مستودع — تحكم بالبضاعة والمنتجات</option>
            </select>
          </div>

          {editingEmployee && (
            <div className="text-right flex items-center justify-end gap-3 pt-5 pr-2">
              <label className="text-[10px] font-bold text-slate-400">حالة الحساب (نشط ومسموح الدخول)</label>
              <button
                type="button"
                onClick={() => setEmpForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${empForm.is_active ? 'bg-emerald-500' : 'bg-slate-800'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform absolute ${empForm.is_active ? 'left-1' : 'right-1'}`} />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { editingEmployee ? handleUpdateEmployee() : handleAddEmployee(); }}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {editingEmployee ? 'حفظ التعديلات الحالية' : 'إضافة الموظف واعتماده'}
          </button>
          <button
            onClick={() => { setShowAddEmployee(false); setEditingEmployee(null); resetForm(); }}
            className="px-5 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    );

    return (
      <div className="space-y-5">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-slate-500" />
            <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="بحث باسم الموظف أو وظيفته..." className="w-full h-10 bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 text-xs text-slate-200 text-right focus:border-indigo-500 focus:outline-none" />
          </div>
          <button onClick={() => { setShowAddEmployee(true); setEditingEmployee(null); resetForm(); }} className="flex items-center gap-2 px-4 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition cursor-pointer">
            <Plus className="w-4 h-4" /> موظف جديد
          </button>
        </div>

        {(showAddEmployee || editingEmployee) && <EmployeeForm />}

        {loadingEmployees ? <PageSkeleton /> : (
          <div className="space-y-3" id="admin-employees-list">
            {filteredEmployees.map(emp => (
              <div key={emp.id} className={`bg-slate-900 rounded-2xl border p-4 transition-all ${!emp.is_active ? 'opacity-50 border-slate-800' : 'border-slate-800 hover:border-slate-750'}`}>
                <div className="flex items-center justify-between gap-4">
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 text-white ${emp.position === 'admin' ? 'bg-indigo-600' : emp.position === 'cashier' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                      {emp.name.charAt(0)}
                    </div>
                    <div className="text-right min-w-0">
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${positionColor(emp.position)}`}>{positionLabel(emp.position)}</span>
                        {!emp.is_active && <span className="text-[10px] text-red-400 font-extrabold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">مجمّد</span>}
                        {emp.id === currentUser?.id && <span className="text-[10px] text-indigo-400 font-extrabold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">أنت</span>}
                      </div>
                      <p className="font-black text-slate-200 text-xs mt-1">{emp.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">{emp.phone || 'بدون رقم جوال'}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex gap-6 text-right text-[10px] font-bold">
                    <div>
                      <p className="text-slate-500">الراتب الشهري</p>
                      <p className="font-extrabold text-slate-300 font-mono text-xs mt-0.5">${emp.salary || 0}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">مبيعات الموظف</p>
                      <p className="font-extrabold text-emerald-400 font-mono text-xs mt-0.5">${(emp.total_sales_usd || 0).toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">عمولة البيع</p>
                      <p className="font-extrabold text-indigo-400 font-mono text-xs mt-0.5">{emp.commission_rate || 0}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">رمز الدخول PIN</p>
                      <p className="font-mono font-black text-slate-400 text-xs mt-0.5">
                        {showPins[emp.id] ? emp.pin_code : '••••'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setShowPins(p => ({ ...p, [emp.id]: !p[emp.id] }))} className="p-2 text-slate-500 hover:text-slate-300 transition cursor-pointer">
                      {showPins[emp.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => startEdit(emp)} className="p-2 text-slate-500 hover:text-indigo-400 transition cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {emp.id !== currentUser?.id && (
                      <button onClick={() => setDeleteConfirm({ open: true, id: emp.id, name: emp.name })} className="p-2 text-slate-500 hover:text-red-400 transition cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteConfirm.open}
          title="حذف الموظف"
          message={`هل أنت متأكد من حذف الموظف "${deleteConfirm.name}" نهائياً من قاعدة البيانات؟ سيتم فقدان ارتباطاته وسجلاته.`}
          confirmLabel="نعم، احذف الموظف"
          variant="danger"
          onConfirm={handleDeleteEmployee}
          onCancel={() => setDeleteConfirm({ open: false, id: null, name: '' })}
        />
      </div>
    );
  };

  // --- TAB 3: PERMISSIONS ---
  const PermissionsTab = () => {
    const roles: EmployeePosition[] = ['admin', 'cashier', 'storekeeper'];
    const roleLabels: Record<EmployeePosition, string> = { admin: 'المدير العام', cashier: 'الكاشير', storekeeper: 'أمين المستودع' };
    const permLabels: Record<string, string> = {
      can_view_dashboard: 'عرض لوحة التحكم الرئيسية والمؤشرات العالمية',
      can_view_reports: 'عرض التقارير، الرسوم البيانية وصافي الأرباح التقديرية',
      can_view_admin: 'الدخول للوحة الأدمن وتعديل سعر الصرف والنسخ الاحتياطية',
      can_delete_products: 'حذف المنتجات نهائياً من قاعدة البضاعة',
      can_edit_prices: 'تعديل أسعار شراء وبيع المنتجات وتحديد التكاليف',
      can_manage_employees: 'إضافة، تعديل، حذف، وتجميد حسابات الموظفين وسحب PIN',
      can_open_close_shift: 'فتح وإغلاق الوردية المالية وتسجيل عجز الصندوق',
      can_apply_discounts: 'تطبيق الخصومات اليدوية والرموز الترويجية بالفاتورة',
      can_view_costs: 'عرض تكاليف البضائع ومكاسب المبيعات والربح التراكمي',
    };

    return (
      <div className="space-y-5">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden" id="admin-permissions-matrix">
          <div className="p-5 border-b border-slate-800 text-right">
            <h3 className="font-black text-slate-200 text-sm">جدول مصفوفة الأمان وصلاحيات النظام</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-1">هذه الصلاحيات مشفرة وثابتة برمجياً لضمان استقرار العمليات المحاسبية وحماية الأرباح.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/25">
                  <th className="p-3 text-slate-400 font-black">الصلاحية / الوظيفة</th>
                  {roles.map(role => (
                    <th key={role} className="text-center p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' : role === 'cashier' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-orange-500/10 text-orange-400 border-orange-500/25'}`}>
                        {roleLabels[role]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(permLabels).map((perm, i) => (
                  <tr key={perm} className={`border-b border-slate-850/50 last:border-0 ${i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/10'}`}>
                    <td className="p-3 text-slate-300 font-extrabold">{permLabels[perm]}</td>
                    {roles.map(role => (
                      <td key={role} className="text-center p-3">
                        {ROLE_PERMISSIONS[role][perm as keyof typeof ROLE_PERMISSIONS.admin] ? (
                          <div className="inline-flex p-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="inline-flex p-1 bg-rose-500/10 text-rose-500/40 rounded-lg border border-rose-500/10">
                            <X className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-right flex gap-3">
          <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-300 text-xs">حماية الفروق السعرية والتكاليف</h4>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              الكاشير لا يمتلك صلاحية رؤية تكلفة المنتج ولا إجمالي الأرباح في الفواتير لضمان سرية جرد البضاعة. لتسليم موظف صلاحية أوسع، يرجى ترقيته إلى منصب (مدير) من تبويب الموظفين.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // --- TAB 4: AUDIT LOG ---
  const AuditLogTab = () => {
    const actionTypeLabels: Record<string, string> = {
      delete_product: 'حذف منتج', delete_customer: 'حذف عميل', delete_supplier: 'حذف مورد',
      delete_employee: 'حذف موظف', edit_price: 'تعديل سعر', edit_stock: 'تعديل مخزون',
      cancel_invoice: 'إلغاء فاتورة', edit_invoice: 'تعديل فاتورة',
      open_shift: 'فتح وردية مالية', close_shift: 'إغلاق وردية مالية',
      change_exchange_rate: 'تغيير سعر الصرف', add_discount: 'إضافة خصم',
      delete_discount: 'حذف خصم', add_return: 'إضافة مرتجع',
      login: 'تسجيل دخول للنظام', logout: 'تسجيل خروج من النظام', change_settings: 'تعديل إعدادات المتجر',
    };

    const actionColors: Record<string, string> = {
      delete_product: 'text-red-400 bg-red-500/10 border-red-500/20',
      delete_customer: 'text-red-400 bg-red-500/10 border-red-500/20',
      delete_employee: 'text-red-400 bg-red-500/10 border-red-500/20',
      delete_supplier: 'text-red-400 bg-red-500/10 border-red-500/20',
      delete_discount: 'text-red-400 bg-red-500/10 border-red-500/20',
      cancel_invoice: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      edit_price: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      edit_stock: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      edit_invoice: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      change_exchange_rate: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      change_settings: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      open_shift: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      close_shift: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      login: 'text-slate-400 bg-slate-950 border-slate-800',
      logout: 'text-slate-400 bg-slate-950 border-slate-800',
      add_discount: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      add_return: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    };

    const filtered = auditLogs.filter(log => {
      const matchSearch = log.description.toLowerCase().includes(auditSearch.toLowerCase()) || 
                          log.employee_name.toLowerCase().includes(auditSearch.toLowerCase()) || 
                          (log.entity_name || '').toLowerCase().includes(auditSearch.toLowerCase());
      const matchAction = auditActionFilter === 'all' || log.action_type === auditActionFilter;
      return matchSearch && matchAction;
    });

    const formatTime = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleString('ar-SY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-slate-500" />
            <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="بحث باسم الموظف، العملية، أو السجل..." className="w-full h-10 bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 text-xs text-slate-200 text-right focus:border-indigo-500 focus:outline-none" />
          </div>
          <select value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)} className="h-10 bg-slate-900 border border-slate-800 rounded-xl px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none text-right">
            <option value="all">كل تصنيفات العمليات</option>
            {Object.entries(actionTypeLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Log entries */}
        {isLoadingLogs ? <PageSkeleton /> : (
          <div className="space-y-2" id="admin-audit-logs-list">
            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800 text-slate-500">
                <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold">لا توجد سجلات مطابقة لعمليات البحث الحالية</p>
              </div>
            ) : filtered.map(log => (
              <div key={log.id} className="bg-slate-900 rounded-xl border border-slate-800/80 p-3.5 flex items-start gap-4">
                <div className="text-left shrink-0 text-[9px] font-black text-slate-500 w-24 font-mono">{formatTime(log.created_at)}</div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-end gap-2 flex-wrap mb-1.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${actionColors[log.action_type] || 'text-slate-400 bg-slate-800'}`}>
                      {actionTypeLabels[log.action_type] || log.action_type}
                    </span>
                    <span className="text-xs font-black text-slate-300">{log.employee_name}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-200">{log.description}</p>
                  {(log.old_value || log.new_value) && (
                    <div className="mt-2 text-[9px] font-bold text-slate-500 flex gap-3 justify-end flex-wrap bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                      {log.old_value && <span className="font-mono">قبل: {JSON.stringify(log.old_value)}</span>}
                      {log.new_value && <span className="text-indigo-400 font-mono">بعد: {JSON.stringify(log.new_value)}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- TAB 5: EXCHANGE RATE ---
  const ExchangeRateTab = () => {
    const handleChangeRate = async () => {
      const rate = Number(newRate);
      if (!rate || rate <= 0) { toast.error('أدخل سعر صرف صحيح'); return; }
      if (rate === settings?.usd_to_syp_rate) { toast.error('هذا هو السعر الحالي مسبقاً'); return; }

      setIsChangingRate(true);
      try {
        const oldRate = settings?.usd_to_syp_rate || 0;

        // Update settings
        await updateSettings({ ...settings!, usd_to_syp_rate: rate });

        // Save to history table
        await supabase.from('exchange_rate_history').insert({
          old_rate: oldRate,
          new_rate: rate,
          changed_by: currentUser?.name || 'مجهول',
          note: rateNote || '',
        });

        // Log action in audit_logs
        await logAction({
          action_type: 'change_exchange_rate',
          entity_type: 'settings',
          old_value: { rate: oldRate },
          new_value: { rate },
          description: `تم تغيير سعر صرف الدولار من ${oldRate.toLocaleString()} ل.س إلى ${rate.toLocaleString()} ل.س${rateNote ? ` — ${rateNote}` : ''}`,
        });

        setNewRate('');
        setRateNote('');
        toast.success(`تم تغيير سعر الصرف بنجاح إلى ${rate.toLocaleString()} ل.س`);
        if (refetchStats) refetchStats();
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsChangingRate(false);
      }
    };

    return (
      <div className="space-y-5">
        {/* Current rate card */}
        <div className="bg-indigo-600/10 border border-indigo-500/25 rounded-2xl p-6 text-right flex items-center justify-between">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl">
            <DollarSign className="w-8 h-8" />
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-indigo-400 mb-1">سعر صرف العملات النشط والمسعر بالبضائع</p>
            <p className="text-3xl font-black text-indigo-300 font-mono">{(settings?.usd_to_syp_rate || 0).toLocaleString()} <span className="text-base font-sans font-bold">ليرة سورية / $1 دولار</span></p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">تعتمد كافة فواتير المبيعات وحساب موازين الليرة السورية على هذا الرقم فورياً</p>
          </div>
        </div>

        {/* Change rate form */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 text-right">
          <h4 className="font-black text-slate-200 text-xs">تحديث سعر الصرف النشط بالسيستم</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5">السعر الجديد (ليرة سورية)</label>
              <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="مثال: 16200" className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm font-black text-slate-200 text-right focus:border-indigo-500 focus:outline-none font-mono" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5">ملاحظة التغيير والسبب (لسجل المراقبة)</label>
              <input type="text" value={rateNote} onChange={e => setRateNote(e.target.value)} placeholder="مثال: تعديل السوق الموازية" className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-xs font-bold text-slate-200 text-right focus:border-indigo-500 focus:outline-none" />
            </div>
          </div>
          
          {newRate && Number(newRate) !== settings?.usd_to_syp_rate && (
            <div className="bg-slate-950 rounded-xl p-3.5 text-xs font-bold text-slate-400 space-y-1.5 border border-slate-850">
              <div className="flex justify-between items-center">
                <span className="text-orange-400 font-mono">{(settings?.usd_to_syp_rate || 0).toLocaleString()} ل.س</span>
                <span>السعر الحالي المطبق</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={Number(newRate) > (settings?.usd_to_syp_rate || 0) ? 'text-red-400 font-mono' : 'text-emerald-400 font-mono'}>
                  {Number(newRate) > (settings?.usd_to_syp_rate || 0) ? '▲ ارتفاع بـ' : '▼ انخفاض بـ'} {Math.abs(Number(newRate) - (settings?.usd_to_syp_rate || 0)).toLocaleString()} ل.س
                </span>
                <span>فارق التغيير المالي</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-850 pt-1.5 mt-1.5">
                <span className="text-indigo-400 font-black font-mono">{Number(newRate).toLocaleString()} ل.س</span>
                <span>السعر الجديد للاعتماد</span>
              </div>
            </div>
          )}
          
          <button onClick={handleChangeRate} disabled={isChangingRate || isUpdating} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black rounded-xl text-xs transition cursor-pointer">
            {isChangingRate ? 'جاري الاعتماد وتعديل أسعار الفواتير...' : 'تطبيق واعتماد سعر الصرف الجديد'}
          </button>
        </div>

        {/* Rate history */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <h4 className="font-black text-slate-200 text-xs mb-4 text-right">سجل تعديلات سعر الصرف التاريخية</h4>
          {exchangeRateHistory.length === 0 ? (
            <p className="text-center text-slate-500 text-xs py-8">لا توجد تعديلات سابقة مسجلة لسعر الصرف</p>
          ) : (
            <div className="space-y-3" id="admin-rate-history">
              {exchangeRateHistory.map(h => (
                <div key={h.id} className="flex items-center gap-3 py-3 border-b border-slate-850 last:border-0">
                  <div className="text-left text-[9px] font-black text-slate-600 w-24 shrink-0 font-mono">
                    {new Date(h.changed_at).toLocaleString('ar-SY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    {h.note && <span className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]">{h.note}</span>}
                    <span className="text-xs font-bold text-slate-400">{h.changed_by}</span>
                    <div className="flex items-center gap-1.5 text-xs pr-2">
                      <span className="text-orange-400 font-mono">{(Number(h.old_rate) || 0).toLocaleString()}</span>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                      <span className="text-emerald-400 font-mono font-black">{(Number(h.new_rate) || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  {Number(h.new_rate) > Number(h.old_rate) ? <ArrowUp className="w-4 h-4 text-red-400 shrink-0" /> : <ArrowDown className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- TAB 6: BACKUP ---
  const BackupTab = () => {
    const [isExporting, setIsExporting] = useState(false);

    const exportAllData = async () => {
      setIsExporting(true);
      try {
        const [products, customers, suppliers, employees, invoices, expenses, returns, movements, attendance, discounts] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('customers').select('*'),
          supabase.from('suppliers').select('*'),
          supabase.from('employees').select('*'),
          supabase.from('invoices').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('returns').select('*'),
          supabase.from('inventory_movements').select('*'),
          supabase.from('attendance').select('*'),
          supabase.from('discounts').select('*'),
        ]);

        const backup = {
          exported_at: new Date().toISOString(),
          exported_by: currentUser?.name,
          version: '3.0',
          data: {
            products: products.data, customers: customers.data, suppliers: suppliers.data,
            employees: employees.data?.map(e => ({ ...e, pin_code: '****' })), // mask PINs for security
            invoices: invoices.data, expenses: expenses.data, returns: returns.data,
            inventory_movements: movements.data, attendance: attendance.data,
            discounts: discounts.data,
          }
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        await logAction({
          action_type: 'change_settings',
          entity_type: 'settings',
          description: `تم تصدير نسخة احتياطية كاملة وشاملة من البيانات كملف JSON مشفر جزئياً للأمان`,
        });

        toast.success('تم تصدير النسخة الاحتياطية بنجاح كملف JSON');
      } catch (err: any) {
        toast.error(`فشل تصدير البيانات: ${err.message}`);
      } finally {
        setIsExporting(false);
      }
    };

    const exportCSV = async (table: string, label: string) => {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        if (!data || data.length === 0) { toast.error('لا توجد بيانات متاحة بهذا الجدول للتصدير'); return; }

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row =>
          Object.values(row).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
        );
        const csv = '\uFEFF' + [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${label}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`تم تصدير جدول ${label} بنجاح كملف شيت Excel/CSV`);
      } catch (err: any) {
        toast.error(err.message);
      }
    };

    const csvExports = [
      { table: 'products', label: 'المنتجات البضائع', icon: Package },
      { table: 'customers', label: 'حسابات العملاء', icon: Users },
      { table: 'invoices', label: 'سجلات الفواتير', icon: FileText },
      { table: 'expenses', label: 'سجل المصاريف', icon: TrendingDown },
      { table: 'returns', label: 'مرتجعات المبيعات', icon: History },
      { table: 'inventory_movements', label: 'حركة المخزون', icon: Package },
      { table: 'attendance', label: 'الحضور والغياب', icon: UserCheck },
      { table: 'audit_logs', label: 'سجل مراقبة العمليات', icon: Shield },
    ];

    return (
      <div className="space-y-5">
        {/* Full backup */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 text-right">
          <h4 className="font-black text-slate-200 text-xs mb-2">تصدير نسخة احتياطية شاملة للنظام (ملف JSON مرن)</h4>
          <p className="text-[10px] text-slate-500 font-bold mb-4">يصنف هذا الملف كافة حسابات المنتجات، العملاء، الفواتير، المصاريف، ومرتجعات المخزن في ملف مضغوط واحد. أرقام المرور PIN مشفرة تلقائياً.</p>
          <button onClick={exportAllData} disabled={isExporting} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black rounded-xl text-xs transition cursor-pointer">
            <Download className="w-4 h-4" />
            {isExporting ? 'جاري تجهيز وتوليد ملف التصدير التراكمي...' : 'تصدير وحفظ النسخة الاحتياطية الشاملة'}
          </button>
        </div>

        {/* CSV exports */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
          <h4 className="font-black text-slate-200 text-xs mb-4 text-right">تصدير الجداول المحاسبية الفردية (صيغة CSV / Excel)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {csvExports.map(item => (
              <button key={item.table} onClick={() => exportCSV(item.table, item.label)} className="flex flex-col items-center gap-2.5 p-4 bg-slate-950/40 hover:bg-slate-800/60 rounded-xl transition group border border-slate-850 cursor-pointer">
                <item.icon className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition" />
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 transition text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 text-right flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
          <div className="space-y-1">
            <p className="text-[10px] text-yellow-400 font-extrabold">تنبيه حماية البنية التحتية</p>
            <p className="text-[9px] text-slate-400 font-bold leading-relaxed">النسخ الاحتياطي يصدر البيانات المدخلة بالقاعدة فقط ولا يحتوي على حسابات مستخدمي Supabase الأساسية أو التوثيق الخارجي. يرجى تنزيل نسخة شهرية وحفظها بشكل آمن بقرص صلب خارجي.</p>
          </div>
        </div>
      </div>
    );
  };

  // --- TABS DEFINITIONS ---
  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'monitor',     label: 'المراقبة اللحظية', icon: Activity },
    { id: 'employees',   label: 'إدارة الموظفين',   icon: Users },
    { id: 'permissions', label: 'الصلاحيات',        icon: Shield },
    { id: 'auditlog',    label: 'سجل العمليات',      icon: History },
    { id: 'exchange',    label: 'سعر الصرف',         icon: DollarSign },
    { id: 'backup',      label: 'النسخ الاحتياطية',  icon: Database },
  ];

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between" id="admin-view-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black text-slate-200">لوحة تحكم المدير العام</h2>
            <p className="text-[10px] text-slate-500 font-bold">مرحباً {currentUser?.name} — تحكم كامل ومراقبة مطلقة للنظام</p>
          </div>
        </div>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full font-black">ADMIN</span>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" id="admin-view-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'monitor'     && <MonitorTab />}
        {activeTab === 'employees'   && <EmployeesTab />}
        {activeTab === 'permissions' && <PermissionsTab />}
        {activeTab === 'auditlog'    && <AuditLogTab />}
        {activeTab === 'exchange'    && <ExchangeRateTab />}
        {activeTab === 'backup'      && <BackupTab />}
      </div>
    </div>
  );
}
