import React, { useState, useMemo } from 'react';
import { useCustomers } from '../../hooks/useCustomers';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useSales } from '../../hooks/useSales';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { PageSkeleton } from '../shared/PageSkeleton';
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
  ChevronDown,
  ChevronUp,
  CreditCard,
  Package
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

  const { invoices } = useSales();

  // Which customer's registered debt/goods panel is expanded
  const [expandedDebtCustomerId, setExpandedDebtCustomerId] = useState<string | null>(null);

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

  // Group unpaid/partial invoices ("البضاعة الدين") per customer
  const customerDebtMap = useMemo(() => {
    const map: Record<string, { totalDebtUsd: number; totalDebtSyp: number; invoices: any[] }> = {};
    invoices.forEach(inv => {
      if (inv.customer_id && Number(inv.remaining_debt_usd) > 0) {
        if (!map[inv.customer_id]) {
          map[inv.customer_id] = { totalDebtUsd: 0, totalDebtSyp: 0, invoices: [] };
        }
        map[inv.customer_id].totalDebtUsd += Number(inv.remaining_debt_usd);
        map[inv.customer_id].totalDebtSyp += Number(inv.remaining_debt_syp);
        map[inv.customer_id].invoices.push(inv);
      }
    });
    return map;
  }, [invoices]);

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

  if (loadingCustomers || loadingSuppliers) {
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

                return (
                  <div key={c.id} className={`bg-slate-900 border ${accentColor} rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition font-bold text-right`}>
                    
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

                      {/* Registered debt / goods on credit for this customer */}
                      {customerDebtMap[c.id] && (
                        <div className="border border-rose-500/20 bg-rose-500/5 rounded-xl p-2.5 space-y-2">
                          <button
                            type="button"
                            onClick={() => setExpandedDebtCustomerId(prev => (prev === c.id ? null : c.id))}
                            className="w-full flex justify-between items-center text-[10px] cursor-pointer"
                          >
                            <span className="flex items-center gap-1 text-rose-400">
                              {expandedDebtCustomerId === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>عرض البضاعة الدين المسجلة</span>
                            </span>
                            <span className="font-mono font-black text-rose-400">${customerDebtMap[c.id].totalDebtUsd.toFixed(2)}</span>
                          </button>

                          {expandedDebtCustomerId === c.id && (
                            <div className="space-y-2 pt-2 border-t border-rose-500/10 max-h-56 overflow-y-auto">
                              {customerDebtMap[c.id].invoices.map(inv => (
                                <div key={inv.id} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-[10px] space-y-1.5">
                                  <div className="flex justify-between text-slate-500 font-mono">
                                    <span className="text-indigo-400">{inv.invoice_number}</span>
                                    <span>{new Date(inv.sale_date).toLocaleDateString('ar-SY')}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {(inv.items || []).map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center text-slate-300">
                                        <span className="flex items-center gap-1 truncate">
                                          <Package className="w-3 h-3 text-slate-600 shrink-0" />
                                          <span className="truncate">{item.product_name}</span>
                                        </span>
                                        <span className="font-mono shrink-0">
                                          {Number(item.quantity).toFixed(item.is_weight ? 3 : 0)} × ${Number(item.price_usd).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex justify-between text-rose-400 font-black border-t border-slate-850 pt-1">
                                    <span>المتبقي على هذه الفاتورة:</span>
                                    <span className="font-mono">${Number(inv.remaining_debt_usd).toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-slate-950 border-t border-slate-850 p-2.5 flex justify-end gap-2 shrink-0">
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
