import React, { useState, useMemo } from 'react';
import { useCustomers } from '../../hooks/useCustomers';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useSales } from '../../hooks/useSales';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { PageSkeleton } from '../shared/PageSkeleton';
import { Invoice, InvoiceItem } from '../../types';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MapPin,
  Award,
  Sparkles,
  Truck,
  Star,
  X,
  TrendingUp,
  Wallet,
  CreditCard,
  FileEdit,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

export const CustomerAndSupplierView: React.FC = () => {
  const {
    customers,
    isLoading: loadingCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer
  } = useCustomers();

  const {
    suppliers,
    isLoading: loadingSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier
  } = useSuppliers();

  const {
    invoices,
    isLoading: loadingSales,
    recordDebtPayment,
    updateInvoiceItems,
    isUpdatingInvoice
  } = useSales();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [showCustForm, setShowCustForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  const [showSuppForm, setShowSuppForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  // Form Inputs: Customer
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custType, setCustType] = useState<'retail' | 'wholesale' | 'vip'>('retail');

  // Form Inputs: Supplier
  const [suppName, setSuppName] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppEmail, setSuppEmail] = useState('');
  const [suppAddress, setSuppAddress] = useState('');
  const [suppRating, setSuppRating] = useState('5');
  const [suppNotes, setSuppNotes] = useState('');

  // ====== حساب دين وسجل مشتريات كل عميل ======
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // نافذة تسديد الدين
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [debtPayAmountUsd, setDebtPayAmountUsd] = useState('');

  // نافذة تعديل الفاتورة (المنتجات المُباعة)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editItems, setEditItems] = useState<InvoiceItem[]>([]);

  const customerDebtMap = useMemo(() => {
    const map: Record<string, { totalDebtUsd: number; invoiceCount: number }> = {};
    invoices.forEach(inv => {
      if (!inv.customer_id) return;
      if (!map[inv.customer_id]) map[inv.customer_id] = { totalDebtUsd: 0, invoiceCount: 0 };
      map[inv.customer_id].totalDebtUsd += Number(inv.remaining_debt_usd || 0);
      map[inv.customer_id].invoiceCount += 1;
    });
    return map;
  }, [invoices]);

  const viewingCustomerInvoices = useMemo(() => {
    if (!viewingCustomer) return [];
    return invoices
      .filter(inv => inv.customer_id === viewingCustomer.id)
      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
  }, [invoices, viewingCustomer]);

  // 1. FILTERS
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(c => {
      const name = c.name || '';
      const phone = c.phone || '';
      return name.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
    });
  }, [customers, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => {
      const name = s.name || '';
      const phone = s.phone || '';
      return name.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
    });
  }, [suppliers, searchQuery]);

  // 2. FORM ACTIONS: CUSTOMER
  const handleOpenCustAdd = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setCustAddress('');
    setCustType('retail');
    setShowCustForm(true);
  };

  const handleOpenCustEdit = (c: any) => {
    setEditingCustomer(c);
    setCustName(c.name);
    setCustPhone(c.phone || '');
    setCustEmail(c.email || '');
    setCustAddress(c.address || '');
    setCustType(c.customer_type || 'retail');
    setShowCustForm(true);
  };

  const handleCustSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateCustomer({
          ...editingCustomer,
          name: custName,
          phone: custPhone,
          email: custEmail,
          address: custAddress,
          customer_type: custType
        });
        toast.success('تم تعديل بيانات العميل بنجاح');
      } else {
        await addCustomer({
          name: custName,
          phone: custPhone,
          email: custEmail,
          address: custAddress,
          customer_type: custType
        });
        toast.success('تم تسجيل العميل بنجاح وتفعيل رصيد الولاء');
      }
      setShowCustForm(false);
    } catch (err) {}
  };

  const handleCustDeleteClick = (id: string) => {
    setCustomerToDelete(id);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomer(customerToDelete);
      toast.success('تم حذف العميل من قاعدة البيانات');
    } catch (err) {}
    setCustomerToDelete(null);
  };

  // 3. FORM ACTIONS: SUPPLIER
  const handleOpenSuppAdd = () => {
    setEditingSupplier(null);
    setSuppName('');
    setSuppPhone('');
    setSuppEmail('');
    setSuppAddress('');
    setSuppRating('5');
    setSuppNotes('');
    setShowSuppForm(true);
  };

  const handleOpenSuppEdit = (s: any) => {
    setEditingSupplier(s);
    setSuppName(s.name);
    setSuppPhone(s.phone || '');
    setSuppEmail(s.email || '');
    setSuppAddress(s.address || '');
    setSuppRating(s.rating?.toString() || '5');
    setSuppNotes(s.notes || '');
    setShowSuppForm(true);
  };

  const handleSuppSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseInt(suppRating) || 5;
    try {
      if (editingSupplier) {
        await updateSupplier({
          ...editingSupplier,
          name: suppName,
          phone: suppPhone,
          email: suppEmail,
          address: suppAddress,
          rating: r,
          notes: suppNotes
        });
        toast.success('تم تحديث بيانات المورد بنجاح');
      } else {
        await addSupplier({
          name: suppName,
          phone: suppPhone,
          email: suppEmail,
          address: suppAddress,
          rating: r,
          notes: suppNotes,
          total_purchases_usd: 0
        });
        toast.success('تم تسجيل المورد الجديد لقائمة التوريد');
      }
      setShowSuppForm(false);
    } catch (err) {}
  };

  const handleSuppDeleteClick = (id: string) => {
    setSupplierToDelete(id);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteSupplier(supplierToDelete);
      toast.success('تم حذف المورد من قاعدة البيانات');
    } catch (err) {}
    setSupplierToDelete(null);
  };

  // 4. DEBT PAYMENT
  const handleDebtPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    const payVal = parseFloat(debtPayAmountUsd);
    if (isNaN(payVal) || payVal <= 0 || payVal > Number(payingInvoice.remaining_debt_usd)) {
      toast.error('الرجاء إدخال قيمة صحيحة لا تتجاوز الديون المتبقية للفاتورة');
      return;
    }
    try {
      await recordDebtPayment({ invoiceId: payingInvoice.id, amountUsd: payVal });
      toast.success('تم تسجيل دفعة تسديد ذمة الدين بنجاح وتحديث الحساب المالي');
      setPayingInvoice(null);
      setDebtPayAmountUsd('');
    } catch (err) {}
  };

  // 5. EDIT INVOICE ITEMS
  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditItems(inv.items.map(it => ({ ...it })));
  };

  const handleEditItemQtyChange = (index: number, value: string) => {
    const qty = parseFloat(value) || 0;
    setEditItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: qty } : it));
  };

  const handleEditItemPriceChange = (index: number, value: string) => {
    const price = parseFloat(value) || 0;
    setEditItems(prev => prev.map((it, i) => i === index ? { ...it, price_usd: price } : it));
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveInvoiceEdit = async () => {
    if (!editingInvoice) return;
    const validItems = editItems.filter(it => it.quantity > 0);
    if (validItems.length === 0) {
      toast.error('يجب أن تحتوي الفاتورة على صنف واحد على الأقل بكمية أكبر من صفر');
      return;
    }
    try {
      await updateInvoiceItems({ invoiceId: editingInvoice.id, items: validItems });
      setEditingInvoice(null);
      setEditItems([]);
    } catch (err) {}
  };

  const editItemsTotalUsd = useMemo(
    () => editItems.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price_usd) || 0), 0),
    [editItems]
  );

  if (loadingCustomers || loadingSuppliers || loadingSales) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl" id="crm-workspace">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div className="flex gap-3 items-center">
          {activeTab === 'customers' ? (
            <Users className="w-6 h-6 text-indigo-400" />
          ) : (
            <Truck className="w-6 h-6 text-indigo-400" />
          )}
          <div>
            <h2 className="text-xl font-black text-slate-100">
              {activeTab === 'customers' ? 'إدارة العملاء و برنامج الولاء' : 'سجل الموردين وسلاسل التوريد'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              {activeTab === 'customers' 
                ? 'تتبع الزبائن المسجلين، نوع الحساب، وحصيلة نقاط مستويات ترقية الولاء التراكمية' 
                : 'التحكم وتوثيق علاقات الموردين وتتبع حجم المشتريات من المصانع'}
            </p>
          </div>
        </div>

        <button
          onClick={activeTab === 'customers' ? handleOpenCustAdd : handleOpenSuppAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition shadow-lg cursor-pointer shrink-0 animate-fade-in"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'customers' ? 'تسجيل عميل ولاء جديد' : 'إدراج مورد جديد'}</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl flex shrink-0">
        <div className="grid grid-cols-2 gap-2 w-full bg-slate-950 p-1 rounded-xl font-black text-xs">
          <button
            onClick={() => {
              setActiveTab('customers');
              setSearchQuery('');
            }}
            className={`py-2.5 rounded-lg transition cursor-pointer ${activeTab === 'customers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            👥 عملاء ولاء دمشق والـ CRM
          </button>
          <button
            onClick={() => {
              setActiveTab('suppliers');
              setSearchQuery('');
            }}
            className={`py-2.5 rounded-lg transition cursor-pointer ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            🚚 سجلات الموردين الصناعيين
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative" id="crm-search-bar">
        <Search className="absolute right-7 top-7 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'customers' ? 'ابحث عن عميل بالاسم أو رقم هاتف الولاء...' : 'ابحث عن مورد بالاسم أو هاتف التواصل...'}
          className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl font-semibold text-right text-xs text-slate-200 focus:outline-none"
        />
      </div>

      {/* Lists */}
      <div>
        {activeTab === 'customers' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="customers-cards-grid">
            {filteredCustomers.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500 font-bold">لا يوجد زبائن مسجلين يطابقون خيارات البحث</div>
            ) : (
              filteredCustomers.map(c => {
                const accentColor = 
                  c.customer_type === 'wholesale' ? 'border-indigo-500/35' :
                  c.customer_type === 'vip' ? 'border-pink-500/35' : 'border-emerald-500/35';

                const debtInfo = customerDebtMap[c.id];
                const hasDebt = debtInfo && debtInfo.totalDebtUsd > 0.001;

                return (
                  <div
                    key={c.id}
                    onClick={() => setViewingCustomer(c)}
                    className={`bg-slate-900 border ${hasDebt ? 'border-rose-500/40' : accentColor} rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition font-bold text-right cursor-pointer`}
                  >
                    
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center text-[10px]">
                        <div className="flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded border ${
                            c.customer_type === 'wholesale' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10' :
                            c.customer_type === 'vip' ? 'bg-pink-500/10 text-pink-400 border-pink-500/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                          }`}>
                            {c.customer_type === 'wholesale' ? 'جملة 📦' : c.customer_type === 'vip' ? 'VIP 💎' : 'مفرق'}
                          </span>
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/10 px-2 py-0.5 rounded uppercase">
                            ★ {c.loyalty_tier || 'BRONZE'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-100 text-sm">{c.name}</h4>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-400 font-semibold">
                        <div className="flex items-center gap-2 justify-end">
                          <span>{c.phone}</span>
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-2 justify-end">
                            <span className="truncate max-w-[200px]">{c.email}</span>
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        )}
                        {c.address && (
                          <div className="flex items-center gap-2 justify-end">
                            <span>{c.address}</span>
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Loyalty info */}
                      <div className="grid grid-cols-2 gap-2 text-center pt-1 font-black">
                        <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                          <span className="text-[9px] text-slate-500 block">نقاط الولاء</span>
                          <span className="text-sm font-mono text-indigo-400 mt-1 block">{c.loyalty_points || 0} نقطة</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                          <span className="text-[9px] text-slate-500 block">حجم المشتريات</span>
                          <span className="text-sm font-mono text-emerald-400 mt-1 block">${Number(c.total_purchases_usd || 0).toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Debt badge */}
                      <div className={`flex items-center justify-between p-2.5 rounded-xl border ${hasDebt ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-950 border-slate-850'}`}>
                        <span className={`text-xs font-mono font-black ${hasDebt ? 'text-rose-400' : 'text-slate-500'}`}>
                          {hasDebt ? `$${debtInfo.totalDebtUsd.toFixed(2)}` : '$0.00'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5" />
                          {hasDebt ? 'دين مستحق — اضغط للتفاصيل' : 'لا يوجد دين'}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-slate-950 border-t border-slate-850 p-2.5 flex justify-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleCustDeleteClick(c.id)}
                        className="bg-slate-900 hover:bg-slate-850 text-rose-500 text-xs px-3 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                      <button
                        onClick={() => handleOpenCustEdit(c)}
                        className="bg-slate-900 hover:bg-slate-850 text-indigo-400 text-xs px-3 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="suppliers-cards-grid">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500 font-bold">لا يوجد موردين مسجلين حالياً</div>
            ) : (
              filteredSuppliers.map(s => (
                <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-right flex flex-col justify-between min-h-[220px] font-bold">
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3.5 h-3.5 ${idx < (s.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-800'}`}
                          />
                        ))}
                      </div>
                      <h4 className="font-extrabold text-slate-100 text-sm">{s.name}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 font-semibold border-b border-slate-850 pb-3">
                      <div className="flex items-center gap-2 justify-end">
                        <span>{s.phone}</span>
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="truncate max-w-[150px]">{s.email}</span>
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div className="flex items-center gap-2 justify-end col-span-2">
                        <span>{s.address}</span>
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 font-normal line-clamp-2 leading-relaxed min-h-[32px]">
                      {s.notes || 'لا توجد ملاحظات إضافية لهذا المورد الصناعي'}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-850 pt-3 text-xs">
                    <span className="text-slate-500">حجم الطلب التراكمي: <strong className="text-emerald-400 font-mono font-black">${Number(s.total_purchases_usd || 0).toLocaleString()}</strong></span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSuppDeleteClick(s.id)}
                        className="bg-slate-950 hover:bg-slate-850 text-rose-500 p-2 rounded-xl border border-slate-850 hover:border-slate-800 transition cursor-pointer"
                        title="حذف المورد"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenSuppEdit(s)}
                        className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/10 hover:bg-indigo-600/20 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
                      >
                        تعديل البيانات
                      </button>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Customer Modal */}
      {showCustForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="modal-customer-add-edit" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <button onClick={() => setShowCustForm(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100">
                {editingCustomer ? '📝 تعديل بيانات العميل' : '👥 تسجيل عميل ولاء جديد'}
              </h3>
            </div>
            
            <form onSubmit={handleCustSave} className="space-y-4 font-bold text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-slate-400">اسم العميل الكامل</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">رقم الهاتف الجوال</label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-center font-mono text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-left font-mono text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">عنوان السكن والاقامة</label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">برنامج تسعير العميل</label>
                <select
                  value={custType}
                  onChange={(e) => setCustType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-slate-300 cursor-pointer"
                >
                  <option value="retail">سعر المفرق العادي</option>
                  <option value="wholesale">سعر جملة المستودع المخفض</option>
                  <option value="vip">سعر الـ VIP للعملاء المميزين</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 cursor-pointer mt-2"
              >
                حفظ بيانات العميل
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSuppForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="modal-supplier-add-edit" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <button onClick={() => setShowSuppForm(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100">
                {editingSupplier ? '📝 تعديل بيانات المورد' : '🚚 تسجيل مورد بضائع جديد'}
              </h3>
            </div>

            <form onSubmit={handleSuppSave} className="space-y-4 font-bold text-xs text-slate-300">
              <div className="space-y-1">
                <label className="text-slate-400">اسم المورد أو المصنع</label>
                <input
                  type="text"
                  required
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">رقم الهاتف والتواصل</label>
                <input
                  type="text"
                  required
                  value={suppPhone}
                  onChange={(e) => setSuppPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-center font-mono text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={suppEmail}
                  onChange={(e) => setSuppEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-left font-mono text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">العنوان المستودعات والمكاتب</label>
                <input
                  type="text"
                  value={suppAddress}
                  onChange={(e) => setSuppAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-505 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">تقييم المورد للتوريد</label>
                <select
                  value={suppRating}
                  onChange={(e) => setSuppRating(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-slate-300 cursor-pointer"
                >
                  <option value="5">⭐⭐⭐⭐⭐ ممتاز وسريع</option>
                  <option value="4">⭐⭐⭐⭐ جيد جداً</option>
                  <option value="3">⭐⭐⭐ متوسط المواعيد</option>
                  <option value="2">⭐⭐ بطيء في التوريد</option>
                  <option value="1">⭐ ضعيف الجودة</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">ملاحظات توريد الأصناف</label>
                <textarea
                  value={suppNotes}
                  onChange={(e) => setSuppNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none text-slate-100 h-16"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 cursor-pointer mt-2"
              >
                تسجيل وحفظ المورد
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Debts & Invoices Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="modal-customer-debts" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl text-right flex flex-col max-h-[90dvh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
              <button onClick={() => { setViewingCustomer(null); setExpandedInvoiceId(null); }} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <div className="text-right">
                <h3 className="font-black text-sm text-slate-100 flex items-center gap-2 justify-end">
                  <span>{viewingCustomer.name}</span>
                  <Wallet className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">سجل الفواتير والديون الكاملة لهذا العميل</p>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 font-bold block">إجمالي الدين المستحق</span>
                <span className="text-lg font-black text-rose-400 font-mono block mt-1">
                  ${(customerDebtMap[viewingCustomer.id]?.totalDebtUsd || 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 font-bold block">عدد الفواتير</span>
                <span className="text-lg font-black text-slate-100 font-mono block mt-1">
                  {viewingCustomerInvoices.length}
                </span>
              </div>
            </div>

            {/* Invoices list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {viewingCustomerInvoices.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-bold text-xs">لا توجد فواتير مسجلة لهذا العميل</div>
              ) : (
                viewingCustomerInvoices.map(inv => {
                  const hasDebt = Number(inv.remaining_debt_usd) > 0.001;
                  const isExpanded = expandedInvoiceId === inv.id;
                  return (
                    <div key={inv.id} className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                        className="w-full flex items-center justify-between p-3 text-xs font-bold cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.payment_method === 'cash' ? 'bg-emerald-500/10 text-emerald-400' :
                            inv.payment_method === 'debt' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {inv.payment_method === 'cash' ? 'نقداً' : inv.payment_method === 'debt' ? 'دين' : 'جزئي'}
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="font-mono text-indigo-400 block">{inv.invoice_number}</span>
                          <span className="text-[9px] text-slate-500 block">{new Date(inv.sale_date).toLocaleDateString('ar-SY')}</span>
                        </div>
                        <div className="text-left">
                          <span className="font-mono text-slate-200 block">${Number(inv.total_usd).toFixed(2)}</span>
                          {hasDebt && (
                            <span className="text-[9px] text-rose-400 font-mono block">متبقي: ${Number(inv.remaining_debt_usd).toFixed(2)}</span>
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-850 p-3 space-y-3">
                          {/* Items list */}
                          <div className="space-y-1 text-[11px] text-slate-400">
                            {inv.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="font-mono">${Number(item.quantity * item.price_usd).toFixed(2)}</span>
                                <span>{item.product_name} × {item.quantity}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-850">
                            {hasDebt && (
                              <button
                                onClick={() => { setPayingInvoice(inv); setDebtPayAmountUsd(''); }}
                                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-550 text-white text-[11px] font-black px-3 py-2 rounded-lg cursor-pointer transition"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>دفع الدين (كامل أو جزئي)</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditInvoice(inv)}
                              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-amber-400 text-[11px] font-black px-3 py-2 rounded-lg border border-slate-800 cursor-pointer transition"
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              <span>تعديل المنتجات المُباعة</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debt payment Form Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] p-4" id="crm-debt-payment-modal" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button onClick={() => setPayingInvoice(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400 animate-pulse" />
                <span>تسديد دين فاتورة العميل</span>
              </h3>
            </div>

            <form onSubmit={handleDebtPaySubmit} className="space-y-4 font-bold text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                <p>الفاتورة: <span className="text-indigo-400 font-mono">{payingInvoice.invoice_number}</span></p>
                <p>الزبون: <span className="text-slate-100">{payingInvoice.customer_name}</span></p>
                <p>المستحق الدفتري: <span className="text-rose-400 font-mono font-black">${Number(payingInvoice.remaining_debt_usd).toFixed(2)} ({Number(payingInvoice.remaining_debt_syp).toLocaleString()} ل.س)</span></p>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">قيمة دفعة الصرف المستلمة ($) — يمكن أن تكون كاملة أو جزئية:</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={Number(payingInvoice.remaining_debt_usd)}
                  required
                  value={debtPayAmountUsd}
                  onChange={(e) => setDebtPayAmountUsd(e.target.value)}
                  className="w-full text-center text-3xl font-black text-slate-100 bg-slate-950 border border-slate-850 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setDebtPayAmountUsd(String(payingInvoice.remaining_debt_usd))}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                >
                  تعبئة كامل المبلغ المستحق تلقائياً
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg cursor-pointer"
              >
                تثبيت وقيد الدفعة فوراً
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Items Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] p-4" id="crm-edit-invoice-modal" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-right flex flex-col max-h-[90dvh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
              <button onClick={() => { setEditingInvoice(null); setEditItems([]); }} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-amber-400" />
                <span>تعديل منتجات فاتورة {editingInvoice.invoice_number}</span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {editItems.map((item, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex items-center gap-2">
                  <button
                    onClick={() => handleRemoveEditItem(idx)}
                    className="text-rose-500 hover:text-rose-400 p-1.5 shrink-0 cursor-pointer"
                    title="حذف الصنف من الفاتورة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-100 block truncate">{item.product_name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <label className="text-[9px] text-slate-500">الكمية</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => handleEditItemQtyChange(idx, e.target.value)}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-center font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <label className="text-[9px] text-slate-500">السعر $</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.price_usd}
                      onChange={(e) => handleEditItemPriceChange(idx, e.target.value)}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-center font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}
              {editItems.length === 0 && (
                <div className="text-center py-8 text-slate-500 font-bold text-xs">لا توجد أصناف — لا يمكن حفظ فاتورة فارغة</div>
              )}
            </div>

            <div className="shrink-0 pt-4 border-t border-slate-850 mt-3 space-y-3">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-slate-400">الإجمالي الجديد بعد التعديل:</span>
                <span className="text-emerald-400 font-mono text-base">${editItemsTotalUsd.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/10 rounded-lg p-2">
                ⚠️ سيُعاد حساب الربح والدين المتبقي تلقائياً، وسيُطابَق فرق الكميات مع المخزون فوراً (زيادة تخصم إضافياً، ونقصان يُعيد للمخزون).
              </p>
              <button
                onClick={handleSaveInvoiceEdit}
                disabled={isUpdatingInvoice}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-black py-3 rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isUpdatingInvoice ? 'جاري الحفظ...' : 'حفظ التعديلات وتحديث المخزون'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Dialog */}
      <ConfirmDialog
        isOpen={customerToDelete !== null}
        title="حذف العميل نهائياً"
        message="هل أنت متأكد من رغبتك في حذف هذا العميل من برنامج الولاء وقاعدة البيانات بالكامل؟"
        confirmLabel="نعم، احذف العميل"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmDeleteCustomer}
        onCancel={() => setCustomerToDelete(null)}
      />

      {/* Delete Supplier Confirmation Dialog */}
      <ConfirmDialog
        isOpen={supplierToDelete !== null}
        title="حذف المورد نهائياً"
        message="هل أنت متأكد من رغبتك في حذف هذا المورد بالكامل من قاعدة البيانات؟ لا يمكن التراجع عن هذا القرار."
        confirmLabel="نعم، احذف المورد"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmDeleteSupplier}
        onCancel={() => setSupplierToDelete(null)}
      />

    </div>
  );
};
