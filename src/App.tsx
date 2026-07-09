import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useEmployees } from './hooks/useEmployees';
import { useCashRegister } from './hooks/useCashRegister';
import { PageSkeleton } from './components/shared/PageSkeleton';
import { ConfirmDialog } from './components/shared/ConfirmDialog';
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  TrendingUp,
  Package,
  Users,
  Coins,
  Settings as SettingsIcon,
  Menu,
  Clock,
  Briefcase,
  Unlock,
  Lock,
  PlusCircle,
  TrendingDown,
  UserCheck,
  X,
  Undo2,
  UserSquare2,
  CalendarCheck,
  Percent,
  History,
  ClipboardCheck,
  Shield,
  Eye,
  EyeOff,
  Pencil,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

// Views
import { DashboardView } from './components/views/DashboardView';
import { POSView } from './components/views/POSView';
import { NewSaleView } from './components/views/NewSaleView';
import { ProductsView } from './components/views/ProductsView';
import { InvoicesView } from './components/views/InvoicesView';
import { ReportsView } from './components/views/ReportsView';
import { CustomerAndSupplierView } from './components/views/CustomerAndSupplierView';
import { ExpensesView } from './components/views/ExpensesView';
import { SettingsView } from './components/views/SettingsView';
import { LoginView } from './components/views/LoginView';
import { ReturnsView } from './components/views/ReturnsView';
import { EmployeesView } from './components/views/EmployeesView';
import { AttendanceView } from './components/views/AttendanceView';
import { DiscountsView } from './components/views/DiscountsView';
import { CashRegisterView } from './components/views/CashRegisterView';
import { AuditView } from './components/views/AuditView';
import { SalesHistoryView } from './components/views/SalesHistoryView';
import { AdminView } from './components/views/AdminView';
import { ROLE_PERMISSIONS, Employee } from './types';

// Small reusable panel: shows current user's avatar, name, position, PIN code (viewable/editable) and a logout button.
function UserPinPanel({
  currentUser,
  onLogout,
  updateEmployee,
  setCurrentUser,
}: {
  currentUser: Employee | null;
  onLogout: () => void;
  updateEmployee: (employee: Employee) => Promise<any>;
  setCurrentUser: (user: Employee | null) => void;
}) {
  const [showPin, setShowPin] = useState(true);
  const [editing, setEditing] = useState(false);
  const [pinDraft, setPinDraft] = useState(currentUser?.pin_code || '');
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;

  const startEdit = () => {
    setPinDraft(currentUser.pin_code || '');
    setEditing(true);
    setShowPin(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setPinDraft(currentUser.pin_code || '');
  };

  const savePin = async () => {
    const trimmed = pinDraft.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      toast.error('رمز الدخول (PIN) يجب أن يتكوّن من 4 إلى 6 أرقام');
      return;
    }
    setSaving(true);
    try {
      const updated = { ...currentUser, pin_code: trimmed };
      await updateEmployee(updated);
      setCurrentUser(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 min-w-0 overflow-hidden">
      <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-white">
        {currentUser.name?.charAt(0) || 'م'}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-xs font-bold text-slate-300 truncate">{currentUser.name}</p>
        <p className="text-[10px] text-slate-500">{currentUser.position === 'admin' ? 'مدير' : 'موظف'}</p>

        {editing ? (
          <div className="flex items-center gap-1 mt-1 min-w-0">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pinDraft}
              onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
              className="w-14 min-w-0 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <button
              onClick={savePin}
              disabled={saving}
              className="text-emerald-400 hover:text-emerald-300 cursor-pointer p-0.5 disabled:opacity-50 shrink-0"
              title="حفظ"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={cancelEdit}
              className="text-slate-500 hover:text-red-400 cursor-pointer p-0.5 shrink-0"
              title="إلغاء"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-600 shrink-0">PIN:</span>
            <span className="text-[10px] font-mono text-indigo-400 truncate">
              {showPin ? currentUser.pin_code : '••••'}
            </span>
            <button
              onClick={() => setShowPin(!showPin)}
              className="text-slate-500 hover:text-slate-300 cursor-pointer p-0.5 shrink-0"
              title={showPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
            >
              {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
            <button
              onClick={startEdit}
              className="text-slate-500 hover:text-indigo-400 cursor-pointer p-0.5 shrink-0"
              title="تعديل الرمز"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition cursor-pointer p-1 self-start shrink-0">
        <Unlock className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function App() {
  const { currentUser, setCurrentUser, logout, isAuthenticated, isAdmin } = useAuth();
  const { settings, isLoading: loadingSettings } = useSettings();
  const { employees, updateEmployee, isLoading: loadingEmployees } = useEmployees();
  const { activeShift, openShift, closeShift, isLoading: loadingCash } = useCashRegister();

  const [currentView, setView] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCloseShiftConfirm, setShowCloseShiftConfirm] = useState(false);

  // Shift Opening form states
  const [openingUsd, setOpeningUsd] = useState('150');
  const [openingSyp, setOpeningSyp] = useState('2250000');

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openShift({
        openingUsd: parseFloat(openingUsd) || 0,
        openingSyp: parseFloat(openingSyp) || 0
      });
      setShowShiftModal(false);
    } catch (err: any) {
      toast.error(err.message || 'فشل فتح الصندوق');
    }
  };

  const handleCloseShift = () => {
    setShowCloseShiftConfirm(true);
  };

  const handleCloseShiftConfirmed = async () => {
    if (!activeShift) return;
    setShowCloseShiftConfirm(false);
    try {
      await closeShift({
        shiftId: activeShift.id,
        actualUsd: activeShift.closing_balance_usd || 0,
        actualSyp: activeShift.closing_balance_syp || 0,
      });
      toast.success('تم إغلاق الوردية بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل إغلاق الصندوق');
    }
  };

  if (!isAuthenticated) {
    return <LoginView />;
  }

  if (loadingSettings || loadingEmployees || loadingCash) {
    return <PageSkeleton />;
  }

  const resolvedSettings = settings || {
    store_name: 'ALkhal',
    usd_to_syp_rate: 15000
  };

  const PermissionDeniedView = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 rounded-2xl border border-slate-800 p-8 max-w-lg mx-auto" id="permission-denied-view">
      <div className="w-16 h-16 bg-red-950/40 border border-red-800/50 text-red-400 rounded-2xl flex items-center justify-center mb-6 shadow-xl" id="denied-icon-wrapper">
        <Shield className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-100 mb-2">وصول غير مصرح به</h2>
      <p className="text-slate-400 max-w-sm text-xs leading-relaxed font-bold">
        منصبك الحالي ({currentUser?.position === 'admin' ? 'مدير عام' : currentUser?.position === 'storekeeper' ? 'أمين مستودع' : 'كاشير مبيعات'}) لا يملك الصلاحيات الكافية لفتح هذه الصفحة.
      </p>
    </div>
  );

  // Render subview based on current state
  const renderView = () => {
    const role = currentUser?.position || 'cashier';
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;

    switch (currentView) {
      case 'dashboard':     return permissions.can_view_dashboard ? <DashboardView /> : <PermissionDeniedView />;
      case 'pos':           return <POSView />;
      case 'newsale':       return <NewSaleView />;
      case 'products':      return <ProductsView />;
      case 'invoices':      return <InvoicesView />;
      case 'saleshistory':  return <SalesHistoryView />;
      case 'reports':       return permissions.can_view_reports ? <ReportsView /> : <PermissionDeniedView />;
      case 'crm':           return <CustomerAndSupplierView />;
      case 'returns':       return <ReturnsView />;
      case 'discounts':     return permissions.can_apply_discounts ? <DiscountsView /> : <PermissionDeniedView />;
      case 'employees':     return permissions.can_manage_employees ? <EmployeesView /> : <PermissionDeniedView />;
      case 'attendance':    return <AttendanceView />;
      case 'cashregister':  return permissions.can_open_close_shift ? <CashRegisterView /> : <PermissionDeniedView />;
      case 'audit':         return <AuditView />;
      case 'expenses':      return permissions.can_view_costs ? <ExpensesView /> : <PermissionDeniedView />;
      case 'settings':      return permissions.can_view_admin ? <SettingsView /> : <PermissionDeniedView />;
      case 'admin':         return permissions.can_view_admin ? <AdminView /> : <PermissionDeniedView />;
      default:              return <DashboardView />;
    }
  };

  const navItems = [
    { id: 'dashboard',      label: 'لوحة التحكم الرئيسية',       icon: LayoutDashboard },
    { id: 'pos',            label: 'كاشير POS السريع',            icon: ShoppingCart,   highlight: true },
    { id: 'newsale',        label: 'تسجيل بيع متقدم',             icon: PlusCircle },
    { id: 'products',       label: 'إدارة المنتجات والمستودع',     icon: Package },
    { id: 'invoices',       label: 'أرشيف الفواتير والديون',       icon: FileText },
    { id: 'saleshistory',   label: 'سجل المبيعات الكامل',          icon: History },
    { id: 'reports',        label: 'التقارير الذكية والأرباح',      icon: TrendingUp },
    { id: 'crm',            label: 'العملاء والموردين CRM',        icon: Users },
    { id: 'returns',        label: 'مرتجعات المبيعات',             icon: Undo2 },
    { id: 'discounts',      label: 'العروض والخصومات',             icon: Percent },
    { id: 'employees',      label: 'الموظفين والرواتب',            icon: UserSquare2 },
    { id: 'attendance',     label: 'الحضور والانصراف',             icon: CalendarCheck },
    { id: 'cashregister',   label: 'صندوق الكاش والورديات',        icon: Coins },
    { id: 'audit',          label: 'جرد المستودع',                 icon: ClipboardCheck },
    { id: 'expenses',       label: 'المصاريف والتكاليف',           icon: TrendingDown },
    { id: 'admin',          label: 'لوحة المدير العام',            icon: Shield,         adminOnly: true },
    { id: 'settings',       label: 'لوحة سعر الصرف والإعدادات',    icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans" dir="rtl" id="app-root">
      
      {/* Top sticky header bar */}
      <header className="bg-slate-900/85 backdrop-blur-md text-slate-100 sticky top-0 z-40 shadow-lg border-b border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex justify-between items-center">
          
          {/* Logo brand & responsive toggles */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-right">
              <h1 className="text-lg font-black bg-gradient-to-l from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tight">
                {resolvedSettings.store_name}
              </h1>
              <span className="text-[10px] text-slate-500 block font-semibold">بوابة التاجر الدمشقي لإدارة الأعمال الذكية</span>
            </div>
          </div>

          {/* Center Info widgets */}
          <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
            {/* Real-time exchange rate preview */}
            <div className="bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <span className="text-indigo-400 font-mono text-sm font-black">{(resolvedSettings.usd_to_syp_rate || 15000).toLocaleString()} ل.س</span>
              <span className="text-[10px] text-slate-500">سعر الصرف الموازى لـ 1$</span>
            </div>

            {/* Cash register drawer status */}
            <div className="bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              {activeShift ? (
                <>
                  <span className="bg-emerald-500 w-2 h-2 rounded-full animate-ping"></span>
                  <span className="text-emerald-400">وردية الكاش مفتوحة</span>
                  <button
                    onClick={handleCloseShift}
                    className="mr-2 text-rose-400 hover:text-rose-300 font-black underline text-[10px] cursor-pointer"
                  >
                    إغلاق صندوق الصالة
                  </button>
                </>
              ) : (
                <>
                  <span className="bg-red-500 w-2 h-2 rounded-full"></span>
                  <span className="text-red-400">صندوق الصالة مغلق</span>
                  <button
                    onClick={() => setShowShiftModal(true)}
                    className="mr-2 text-indigo-400 hover:text-indigo-300 font-black underline text-[10px] cursor-pointer"
                  >
                    افتح وردية جديدة
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right User profiling select */}
          <div className="flex items-center gap-3">
            <div className="text-left hidden sm:block">
              <span className="text-[10px] text-slate-500 block font-bold">الموظف الحالي</span>
              <span className="text-xs font-extrabold text-indigo-400">
                {currentUser?.name || 'زائر'} ({currentUser?.position === 'admin' ? 'مدير عام' : 'كاشير مبيعات'})
              </span>
            </div>
            
            {employees.length > 0 && (
              <div className="relative group">
                <select
                  value={currentUser?.id || ''}
                  onChange={(e) => {
                    const emp = employees.find(x => x.id === e.target.value);
                    if (emp) setCurrentUser(emp);
                  }}
                  className="bg-slate-800/80 text-slate-200 font-bold p-1.5 rounded-lg text-xs cursor-pointer focus:outline-none border border-slate-700"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main layout frame */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row relative">
        
        {/* Desktop sidebar — fixed left/right panel */}
        <nav className="hidden lg:flex flex-col w-64 min-w-0 shrink-0 bg-slate-900 border-l border-slate-800 h-[calc(100vh-68px)] sticky top-[68px] overflow-y-auto">
          {/* Store info */}
          <div className="p-4 border-b border-slate-800">
            <h1 className="text-base font-black bg-gradient-to-l from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              {resolvedSettings.store_name}
            </h1>
            <span className="text-[10px] text-slate-500">نظام إدارة المحل</span>
          </div>

          {/* Nav items */}
          <div className="flex-1 p-3 space-y-1">
            {navItems.filter(item => !item.adminOnly || isAdmin).map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-right cursor-pointer ${
                  currentView === item.id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                } ${item.highlight ? 'border border-emerald-500/30 bg-emerald-500/5' : ''}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Bottom: user info + PIN + logout */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/20">
            <UserPinPanel
              currentUser={currentUser}
              onLogout={logout}
              updateEmployee={updateEmployee}
              setCurrentUser={setCurrentUser}
            />
          </div>
        </nav>

        {/* Mobile Navigation Sidebar Drawer */}
        <aside className={`lg:hidden w-64 bg-slate-950 text-slate-400 shrink-0 border-l border-slate-800 z-50 flex flex-col fixed inset-y-0 right-0 transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-200 ease-in-out`}>
          
          {/* Mobile Sidebar Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center shrink-0">
            <span className="text-sm font-black text-slate-100">قائمة التنقل</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick info profile */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 text-right space-y-2">
            <span className="text-[10px] font-bold text-slate-600 block uppercase">مؤسسة الأعمال الموحدة</span>
            <span className="text-xs font-black text-slate-300 block">صالة الشام المركزية</span>
            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>دمشق، سوريا (توقيت محلي)</span>
            </div>

            {/* Mobile-only Quick Stats Widgets */}
            <div className="pt-2 mt-2 border-t border-slate-800/60 space-y-2">
              <div className="bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800/80 flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500">سعر صرف الـ 1$:</span>
                <span className="text-indigo-400 font-mono text-xs font-black">{(resolvedSettings.usd_to_syp_rate || 15000).toLocaleString()} ل.س</span>
              </div>
              <div className="bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800/80 flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500">حالة الصندوق المالي:</span>
                {activeShift ? (
                  <div className="flex items-center gap-1.5">
                    <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-ping"></span>
                    <span className="text-emerald-400">مفتوح</span>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleCloseShift();
                      }}
                      className="text-rose-400 hover:text-rose-300 underline text-[9px] cursor-pointer"
                    >
                      (إغلاق)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="bg-red-500 w-1.5 h-1.5 rounded-full"></span>
                    <span className="text-red-400">مغلق</span>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowShiftModal(true);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 underline text-[9px] cursor-pointer"
                    >
                      (فتح)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Links navigation list */}
          <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
            {navItems.filter(item => !item.adminOnly || isAdmin).map(item => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold text-right transition cursor-pointer ${isActive ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-black shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'hover:bg-slate-800/50 hover:text-slate-200'}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile: user info + PIN + logout (mirrors desktop sidebar) */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/20">
            <UserPinPanel
              currentUser={currentUser}
              onLogout={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              updateEmployee={updateEmployee}
              setCurrentUser={setCurrentUser}
            />
          </div>

          {/* Sidebar bottom signature */}
          <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600 text-center font-semibold">
            <span>مخازن الشام الكبرى © 2026</span>
          </div>
        </aside>

        {/* Backdrop for mobile menu drawer */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden cursor-pointer"
          />
        )}

        {/* Core dynamic body view container */}
        <main className="flex-1 p-4 md:p-6 overflow-hidden min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              id={`view-${currentView}`}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* SHIFT MODAL: Open Register Shift */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="modal-shift-open-form" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button onClick={() => setShowShiftModal(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                <Unlock className="w-5 h-5 text-indigo-400 animate-pulse" />
                <span>فتح وردية صندوق جديدة</span>
              </h3>
            </div>
            
            <form onSubmit={handleOpenShiftSubmit} className="space-y-4 font-bold text-xs text-slate-300">
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                الرجاء جرد وتسجيل كاش الصندوق الابتدائي المتوفر في درج المحل قبل بدء استلام وردية البيع الحالية لتسجيل العجز والزيادة.
              </p>

              <div className="space-y-1">
                <label className="text-slate-400">الرصيد الابتدائي بالدولار ($)</label>
                <input
                  type="number"
                  required
                  value={openingUsd}
                  onChange={(e) => setOpeningUsd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 font-mono font-black text-center text-slate-100 focus:outline-none focus:border-indigo-505"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">الرصيد الابتدائي بالليرة السورية (ل.س)</label>
                <input
                  type="number"
                  required
                  value={openingSyp}
                  onChange={(e) => setOpeningSyp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 font-mono font-black text-center text-slate-100 focus:outline-none focus:border-indigo-505"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg cursor-pointer text-xs"
              >
                تأكيد فتح صندوق الصالة والبدء بالبيع
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Confirm Dialog */}
      <ConfirmDialog
        isOpen={showCloseShiftConfirm}
        title="إغلاق الوردية والوردية المالية"
        message="هل أنت متأكد من رغبتك بإغلاق الوردية الحالية وموازنة كاش الصندوق المالي؟"
        confirmLabel="نعم، أغلق الوردية"
        cancelLabel="إلغاء"
        variant="warning"
        onConfirm={handleCloseShiftConfirmed}
        onCancel={() => setShowCloseShiftConfirm(false)}
      />

    </div>
  );
}
