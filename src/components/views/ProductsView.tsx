import React, { useState, useMemo } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { useSettings } from '../../hooks/useSettings';
import { PageSkeleton } from '../shared/PageSkeleton';
import {
  Plus,
  Search,
  AlertTriangle,
  Trash2,
  Edit2,
  RefreshCw,
  Package,
  Layers,
  X,
  Upload,
  Coins,
  Sparkles,
  Bell,
  BellRing,
  Tags
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = ['غذائيات', 'زيوت وسمنة', 'بقوليات', 'مشروبات', 'منظفات', 'أجبان وألبان'];
const CATEGORIES_STORAGE_KEY = 'alkhal_product_categories';

export const ProductsView: React.FC = () => {
  const {
    products,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct
  } = useProducts();

  const { settings } = useSettings();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'low' | 'out'>('all');

  // Modals state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [showRestockForm, setShowRestockForm] = useState<any | null>(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState<any | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Category management
  const [categoryOptions, setCategoryOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  });
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Form Inputs: Product Form
  const [nameInput, setNameInput] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('غذائيات');
  const [priceUsdInput, setPriceUsdInput] = useState('1.0');
  const [costUsdInput, setCostUsdInput] = useState('0.8');
  const [quantityInput, setQuantityInput] = useState('50');
  const [warningLimitInput, setWarningLimitInput] = useState('10');
  const [soldByWeightInput, setSoldByWeightInput] = useState(false);
  const [saleType, setSaleType] = useState<'piece' | 'weight'>('piece');
  const [pricePerKgInput, setPricePerKgInput] = useState('');
  const [stockGramsInput, setStockGramsInput] = useState('');
  const [wholesaleUsdInput, setWholesaleUsdInput] = useState('0.9');
  const [vipUsdInput, setVipUsdInput] = useState('0.95');
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Form Inputs: Restock & Adjustments
  const [restockQty, setRestockQty] = useState('10');
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustmentNotes, setAdjustmentNotes] = useState('تسوية مخزون يدوية');

  const [isAlertsCollapsed, setIsAlertsCollapsed] = useState(false);

  // 1. Calculations for upper KPI cards
  const summary = useMemo(() => {
    const total = products.length;
    const instock = products.filter(p => p.quantity > p.warning_limit).length;
    const low = products.filter(p => p.quantity <= p.warning_limit && p.quantity > 0).length;
    const out = products.filter(p => p.quantity === 0).length;

    return { total, instock, low, out };
  }, [products]);

  // Extract all low stock products (quantity <= warning_limit)
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.quantity <= p.warning_limit);
  }, [products]);

  // Categories list extraction (merges manual list with any category already used by real products)
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return Array.from(set);
  }, [products]);

  // Full options shown inside the add/edit product form's category dropdown
  const productFormCategoryOptions = useMemo(() => {
    const merged = new Set([...categoryOptions, ...categories]);
    return Array.from(merged);
  }, [categoryOptions, categories]);

  React.useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categoryOptions));
    } catch {}
  }, [categoryOptions]);

  const handleAddCategory = () => {
    const name = newCategoryInput.trim();
    if (!name) return;
    if (categoryOptions.includes(name)) {
      toast.error('هذا التصنيف موجود بالفعل');
      return;
    }
    setCategoryOptions(prev => [...prev, name]);
    setNewCategoryInput('');
    toast.success('تمت إضافة التصنيف بنجاح');
  };

  const handleDeleteCategory = (name: string) => {
    const usedCount = products.filter(p => p.category === name).length;
    if (usedCount > 0) {
      toast.error(`لا يمكن حذف "${name}" لأنه مستخدم في ${usedCount} صنف حالياً`);
      return;
    }
    setCategoryOptions(prev => prev.filter(c => c !== name));
    if (categoryInput === name) {
      const remaining = categoryOptions.filter(c => c !== name);
      setCategoryInput(remaining[0] || '');
    }
    toast.success('تم حذف التصنيف بنجاح');
  };

  // Filtering products list
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
      const matchesCategory = categoryFilter === '' || p.category === categoryFilter;
      
      let matchesStock = true;
      if (stockFilter === 'instock') matchesStock = p.quantity > p.warning_limit;
      else if (stockFilter === 'low') matchesStock = p.quantity <= p.warning_limit && p.quantity > 0;
      else if (stockFilter === 'out') matchesStock = p.quantity === 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, categoryFilter, stockFilter]);

  // Launch Add Form
  const handleOpenAdd = () => {
    setIsSavingProduct(false);
    setEditingProductId(null);
    setNameInput('');
    setBarcodeInput(`621${Math.floor(100000000 + Math.random() * 900000000)}`);
    setCategoryInput('غذائيات');
    setPriceUsdInput('1.00');
    setCostUsdInput('0.80');
    setQuantityInput('50');
    setWarningLimitInput((settings?.default_warning_limit || 10).toString());
    setSoldByWeightInput(false);
    setSaleType('piece');
    setPricePerKgInput('');
    setStockGramsInput('');
    setWholesaleUsdInput('0.90');
    setVipUsdInput('0.95');
    setImageUrlInput('https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80');
    setShowProductForm(true);
  };

  // Launch Edit Form
  const handleOpenEdit = (p: any) => {
    setEditingProductId(p.id);
    setNameInput(p.name);
    setBarcodeInput(p.barcode || '');
    setCategoryInput(p.category);
    setPriceUsdInput(p.price_usd.toString());
    setCostUsdInput(p.cost_usd.toString());
    setQuantityInput(p.quantity.toString());
    setWarningLimitInput(p.warning_limit.toString());
    setSoldByWeightInput(p.sold_by_weight);
    
    const sType = p.sale_type || (p.sold_by_weight ? 'weight' : 'piece');
    setSaleType(sType);
    setPricePerKgInput(p.price_per_kg?.toString() || (p.sold_by_weight ? p.price_usd.toString() : ''));
    setStockGramsInput(p.stock_grams?.toString() || (p.sold_by_weight ? (p.quantity * 1000).toString() : ''));

    setWholesaleUsdInput(p.price_tiers?.wholesale_usd?.toString() || (p.price_usd * 0.9).toString());
    setVipUsdInput(p.price_tiers?.vip_usd?.toString() || (p.price_usd * 0.95).toString());
    setImageUrlInput(p.image_url || '');
    setShowProductForm(true);
  };

  // Product Form Save Submit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProduct) return; // منع الضغط المتكرر أثناء الحفظ
    setIsSavingProduct(true);
    const isWeight = saleType === 'weight';
    const price = isWeight ? (parseFloat(pricePerKgInput) || 0) : (parseFloat(priceUsdInput) || 0);
    const qty = isWeight ? ((parseFloat(stockGramsInput) || 0) / 1000) : (parseFloat(quantityInput) || 0);
    const cost = parseFloat(costUsdInput) || 0;
    const limit = parseFloat(warningLimitInput) || 10;
    const syp = Math.round(price * (settings?.usd_to_syp_rate || 15000));

    const productPayload = {
      name: nameInput,
      barcode: barcodeInput,
      category: categoryInput,
      price_usd: price,
      price_syp: syp,
      cost_usd: cost,
      quantity: qty,
      warning_limit: limit,
      sold_by_weight: isWeight,
      sale_type: saleType,
      price_per_kg: isWeight ? price : undefined,
      stock_grams: isWeight ? (parseFloat(stockGramsInput) || 0) : undefined,
      wholesale_price_usd: parseFloat(wholesaleUsdInput) || price * 0.9,
      vip_price_usd: parseFloat(vipUsdInput) || price * 0.95,
      image_url: imageUrlInput || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80'
    };

    try {
      if (editingProductId) {
        await updateProduct({ id: editingProductId, ...productPayload });
        toast.success('تم تحديث الصنف بنجاح');
      } else {
        await addProduct(productPayload);
        toast.success('تمت إضافة المنتج الجديد بنجاح');
      }
      setShowProductForm(false);
    } catch (err) {
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Submit Restock
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRestockForm) return;
    const extraQty = parseFloat(restockQty);
    if (isNaN(extraQty) || extraQty <= 0) {
      toast.error('الرجاء إدخال كمية إعادة تعبئة صحيحة');
      return;
    }
    try {
      const newQty = (showRestockForm.quantity || 0) + extraQty;
      await updateProduct({
        ...showRestockForm,
        quantity: newQty
      });
      toast.success(`تمت إضافة ${extraQty} وحدة لمخزون الصنف`);
      setShowRestockForm(null);
    } catch (err) {}
  };

  // Submit Stock Adjustment Override
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustmentForm) return;
    const targetQty = parseFloat(adjustQty);
    if (isNaN(targetQty) || targetQty < 0) {
      toast.error('الرجاء إدخال كمية صحيحة للتسوية');
      return;
    }
    try {
      await updateProduct({
        ...showAdjustmentForm,
        quantity: targetQty
      });
      toast.success(`تمت تسوية مخزون السلعة بنجاح إلى ${targetQty}`);
      setShowAdjustmentForm(null);
    } catch (err) {}
  };

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete);
      toast.success('تم حذف الصنف من سجلات المستودع');
    } catch (err) {}
    setProductToDelete(null);
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 text-right" dir="rtl" id="products-workspace">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            <span>إدارة المنتجات والمخازن العامة</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">إضافة الأصناف، تسعير المنتجات، التحكم ببرامج البيع، وإعادة تزويد المستودعات</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white font-black text-xs transition shadow-lg cursor-pointer shrink-0"
          id="btn-add-product"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة صنف جديد للمستودع</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="inventory-stats-grid">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl"><Package className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي السلع</span>
            <span className="text-sm font-black text-slate-100 block mt-1">{summary.total} صنف</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl"><Sparkles className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">متوفر ومستقر</span>
            <span className="text-sm font-black text-emerald-400 block mt-1">{summary.instock} صنف</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl animate-pulse"><AlertTriangle className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">مخزون منخفض</span>
            <span className="text-sm font-black text-amber-400 block mt-1">{summary.low} صنف</span>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl"><AlertTriangle className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">منتهي / نفذ كلياً</span>
            <span className="text-sm font-black text-rose-400 block mt-1">{summary.out} صنف</span>
          </div>
        </div>
      </div>

      {/* Active Low Stock Alerts Notification Panel */}
      {lowStockProducts.length > 0 && (
        <div 
          className="bg-slate-900/40 border border-amber-500/10 rounded-2xl overflow-hidden transition-all duration-300" 
          id="low-stock-notifications-panel"
        >
          {/* Header */}
          <div className="bg-amber-500/[0.02] px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
              </div>
              <div className="text-right">
                <h3 className="font-extrabold text-xs text-amber-400 flex items-center gap-2">
                  <span>نظام تنبيهات نقص المخزن النشط</span>
                  <span className="bg-amber-500/25 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                    {lowStockProducts.length}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">تنبيهات فورية للمنتجات التي دنت كميتها من حد الطلب الأدنى للتموين</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsAlertsCollapsed(!isAlertsCollapsed)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-900/80 hover:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 transition cursor-pointer self-end sm:self-auto"
            >
              {isAlertsCollapsed ? 'عرض تفاصيل التنبيهات 📂' : 'طي قائمة التنبيهات 📁'}
            </button>
          </div>

          {/* Alert list body */}
          {!isAlertsCollapsed && (
            <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {lowStockProducts.map(p => {
                  const percent = p.warning_limit > 0 ? Math.min(100, Math.round((p.quantity / p.warning_limit) * 100)) : 0;
                  const isOut = p.quantity === 0;

                  return (
                    <div 
                      key={`alert-${p.id}`} 
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-4 bg-slate-950/40 ${
                        isOut ? 'border-rose-500/10 hover:border-rose-500/20' : 'border-amber-500/10 hover:border-amber-500/20'
                      }`}
                    >
                      <div className="flex-1 min-w-0 text-right space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOut ? 'bg-rose-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                          <h4 className="font-extrabold text-xs text-slate-200 truncate">{p.name}</h4>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                          <span>الرصيد: <strong className={isOut ? 'text-rose-400' : 'text-amber-400'}>{p.sold_by_weight ? `${p.quantity} كغ` : `${p.quantity} قطعة`}</strong></span>
                          <span>الحد الأدنى: <strong className="text-slate-400">{p.warning_limit}</strong></span>
                        </div>

                        {/* Visual indicator bar */}
                        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isOut ? 'bg-rose-500' : 'bg-amber-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => {
                          setRestockQty('10');
                          setShowRestockForm(p);
                        }}
                        className="p-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg border border-indigo-500/10 hover:border-indigo-600 transition shrink-0 cursor-pointer"
                        title="إعادة تعبئة سريعة"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters Row */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center" id="products-search-filters">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن صنف بالاسم أو الباركود..."
            className="w-full pr-10 pl-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-505 text-right font-semibold"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto font-black text-[11px] text-slate-300">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-505 cursor-pointer"
          >
            <option value="">جميع التصنيفات</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-505 cursor-pointer"
          >
            <option value="all">كل كميات المستودع</option>
            <option value="instock">متوفر بكثرة</option>
            <option value="low">تنبيه بالنفاد</option>
            <option value="out">نفذ تماماً</option>
          </select>
        </div>
      </div>

      {/* Grid Shelf */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="products-shelf-grid">
        {filteredProducts.map(p => {
          const isLow = p.quantity <= p.warning_limit;
          const isOut = p.quantity === 0;
          const marginPercent = p.price_usd > 0 ? Math.round(((p.price_usd - p.cost_usd) / p.price_usd) * 100) : 0;

          return (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition relative"
            >
              <div className={`h-1 ${isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />

              <div className="p-4 flex-1 text-right space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="bg-slate-950 text-slate-400 px-2 py-0.5 rounded-md border border-slate-850">{p.category}</span>
                  <div className="flex gap-1 shrink-0">
                    {p.sold_by_weight && <span className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10">⚖️ كغ</span>}
                    {isOut ? (
                      <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10 animate-pulse">نفذ</span>
                    ) : isLow ? (
                      <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10">منخفض</span>
                    ) : (
                      <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">متوفر</span>
                    )}
                  </div>
                </div>

                <h4 className="font-extrabold text-slate-100 text-xs md:text-sm line-clamp-2 leading-relaxed min-h-[40px]">
                  {p.name}
                </h4>
                
                <span className="text-[9px] text-slate-500 font-mono block">الباركود: {p.barcode || '---'}</span>

                {/* Multiple Tiers Price Card */}
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-[11px] text-slate-400 space-y-1.5 font-semibold">
                  <div className="flex justify-between font-bold">
                    <span className="text-emerald-400 font-mono">{(p.price_usd * (settings?.usd_to_syp_rate || 15000)).toLocaleString()} ل.س</span>
                    <span className="text-slate-200 font-mono">${p.price_usd.toFixed(2)}</span>
                    <span>{p.sold_by_weight ? 'الكيلو (مفرق)' : 'مفرق'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono">{(Number(p.price_tiers?.wholesale_usd || p.price_usd * 0.9) * (settings?.usd_to_syp_rate || 15000)).toLocaleString()} ل.س</span>
                    <span className="font-mono">${Number(p.price_tiers?.wholesale_usd || p.price_usd * 0.9).toFixed(2)}</span>
                    <span>{p.sold_by_weight ? 'الكيلو (جملة)' : 'جملة'}</span>
                  </div>
                  <div className="flex justify-between text-indigo-400">
                    <span className="font-mono">{(Number(p.price_tiers?.vip_usd || p.price_usd * 0.95) * (settings?.usd_to_syp_rate || 15000)).toLocaleString()} ل.س</span>
                    <span className="font-mono">${Number(p.price_tiers?.vip_usd || p.price_usd * 0.95).toFixed(2)}</span>
                    <span>{p.sold_by_weight ? 'الكيلو (VIP)' : 'VIP'}</span>
                  </div>
                  <div className="border-t border-slate-850/60 my-1 pt-1 flex justify-between text-[10px] text-slate-500">
                    <span>الهامش: %{marginPercent}</span>
                    <span className="font-mono">التكلفة: ${p.cost_usd}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <span>الرصيد المتاح:</span>
                  <span className={`text-xs md:text-sm font-black font-mono ${isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-slate-200'}`}>
                    {p.sold_by_weight ? (
                      <span>
                        {((p.stock_grams !== undefined) ? p.stock_grams : (p.quantity * 1000)).toLocaleString()} غ ({p.quantity} كغ)
                      </span>
                    ) : (
                      <span>{p.quantity} قطعة</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-950 border-t border-slate-850 p-2.5 grid grid-cols-4 gap-2 shrink-0">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="bg-slate-900 hover:bg-slate-850 text-indigo-400 p-2 rounded-xl border border-slate-850 hover:border-slate-800 flex items-center justify-center transition cursor-pointer"
                  title="تعديل تفاصيل الصنف"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setRestockQty('10');
                    setShowRestockForm(p);
                  }}
                  className="bg-slate-900 hover:bg-slate-850 text-emerald-400 p-2 rounded-xl border border-slate-850 hover:border-slate-800 flex items-center justify-center transition cursor-pointer"
                  title="إعادة تعبئة مخزن الصنف"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setAdjustQty(p.quantity.toString());
                    setAdjustmentNotes('تسوية جرد يدوية للرفوف');
                    setShowAdjustmentForm(p);
                  }}
                  className="bg-slate-900 hover:bg-slate-850 text-amber-400 p-2 rounded-xl border border-slate-850 hover:border-slate-800 flex items-center justify-center transition cursor-pointer"
                  title="تسوية وتعديل يدوي للمخزن"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(p.id)}
                  className="bg-slate-900 hover:bg-slate-850 text-rose-500 p-2 rounded-xl border border-slate-850 hover:border-slate-800 flex items-center justify-center transition cursor-pointer"
                  title="حذف الصنف نهائياً"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Creation Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="modal-product-creation" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-right flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <button onClick={() => setShowProductForm(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-slate-100">
                {editingProductId ? '📝 تعديل بيانات الصنف والأسعار' : '📦 إضافة منتج جديد للمستودع'}
              </h3>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 overflow-y-auto my-4 pr-1 font-bold text-xs text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">اسم المنتج بالعربية</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">الباركود العالمي</label>
                  <input
                    type="text"
                    required
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-center font-mono text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-400">التصنيف</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryManager(true)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                      title="إدارة التصنيفات"
                    >
                      <Tags className="w-3.5 h-3.5" />
                      إدارة
                    </button>
                  </div>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-slate-300 cursor-pointer"
                  >
                    {productFormCategoryOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">طريقة البيع</label>
                  <div className="flex gap-4 p-2.5 bg-slate-850 rounded-xl border border-slate-750">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={saleType === 'piece'}
                        onChange={() => {
                          setSaleType('piece');
                          setSoldByWeightInput(false);
                        }}
                      />
                      <span>بالقطعة</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-amber-400 cursor-pointer">
                      <input
                        type="radio"
                        checked={saleType === 'weight'}
                        onChange={() => {
                          setSaleType('weight');
                          setSoldByWeightInput(true);
                        }}
                      />
                      <span>بالوزن</span>
                    </label>
                  </div>
                </div>
                {saleType === 'piece' && (
                  <div className="space-y-1">
                    <label className="text-slate-400">الرصيد الابتدائي</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!!editingProductId}
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none focus:border-indigo-500 text-center text-slate-100 disabled:opacity-40"
                    />
                  </div>
                )}
              </div>

              {saleType === 'weight' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="space-y-1">
                    <label className="text-amber-400 block font-bold text-xs mb-1">⚖️ سعر الكيلوغرام الواحد ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pricePerKgInput}
                      onChange={(e) => {
                        setPricePerKgInput(e.target.value);
                        setPriceUsdInput(e.target.value);
                        // Also update price tiers automatically for weight
                        const p = parseFloat(e.target.value) || 0;
                        setWholesaleUsdInput((p * 0.9).toFixed(2));
                        setVipUsdInput((p * 0.95).toFixed(2));
                      }}
                      placeholder="مثال: 2.50"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-black text-center text-amber-300 focus:outline-none focus:border-amber-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-amber-400 block font-bold text-xs mb-1">📦 المخزون الكلي بالغرام (غ)</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={stockGramsInput}
                      onChange={(e) => {
                        setStockGramsInput(e.target.value);
                        const kgs = (parseFloat(e.target.value) || 0) / 1000;
                        setQuantityInput(kgs.toString());
                      }}
                      placeholder="مثال: 5000"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-black text-center text-amber-300 focus:outline-none focus:border-amber-500 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Multiple pricing */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
                <h4 className="text-xs font-black text-slate-200 flex items-center gap-1">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>مستويات أسعار البيع والتكلفة</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500">سعر المفرق القياسي ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={priceUsdInput}
                      onChange={(e) => {
                        setPriceUsdInput(e.target.value);
                        const p = parseFloat(e.target.value) || 0;
                        setWholesaleUsdInput((p * 0.9).toFixed(2));
                        setVipUsdInput((p * 0.95).toFixed(2));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 font-black text-center text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">سعر الجملة المخفض ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={wholesaleUsdInput}
                      onChange={(e) => setWholesaleUsdInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 font-black text-center text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">سعر الـ VIP للعملاء ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={vipUsdInput}
                      onChange={(e) => setVipUsdInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 font-black text-center text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-850/40">
                  <div className="space-y-1">
                    <label className="text-slate-500">تكلفة الشراء الفعلية للوحدة ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={costUsdInput}
                      onChange={(e) => setCostUsdInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 font-black text-center text-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">حد تنبيه المخزون المنخفض</label>
                    <input
                      type="number"
                      required
                      value={warningLimitInput}
                      onChange={(e) => setWarningLimitInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 font-black text-center text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Image url */}
              <div className="space-y-1">
                <label className="text-slate-400">رابط صورة توضيحية للمنتج</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-mono text-left focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrlInput('https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80')}
                    className="bg-slate-850 hover:bg-slate-800 px-3 py-2 text-xs rounded-xl border border-slate-800 text-slate-400 cursor-pointer"
                  >
                    صورة افتراضية
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSavingProduct}
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 cursor-pointer mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isSavingProduct
                  ? '⏳ جاري الحفظ...'
                  : (editingProductId ? 'تحديث الصنف والأسعار' : 'إضافة الصنف الجديد والبدء بالبيع')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[60] p-4" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <button onClick={() => setShowCategoryManager(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <Tags className="w-4 h-4 text-indigo-400" />
                إدارة التصنيفات
              </h3>
            </div>

            <div className="flex gap-2 my-4 shrink-0">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                placeholder="اسم التصنيف الجديد"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold text-xs focus:outline-none focus:border-indigo-500 text-slate-100"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="bg-indigo-600 hover:bg-indigo-550 text-white font-black px-4 rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1 text-xs"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1">
              {productFormCategoryOptions.map(c => {
                const usedCount = products.filter(p => p.category === c).length;
                return (
                  <div
                    key={c}
                    className="flex items-center justify-between bg-slate-850 border border-slate-800 rounded-xl px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-200">{c}</span>
                      {usedCount > 0 && (
                        <span className="text-[10px] text-slate-500">مستخدم في {usedCount} صنف</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c)}
                      disabled={usedCount > 0}
                      title={usedCount > 0 ? 'لا يمكن الحذف لوجود أصناف مرتبطة بهذا التصنيف' : 'حذف التصنيف'}
                      className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {productFormCategoryOptions.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-4">لا توجد تصنيفات بعد</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restock form modal */}
      {showRestockForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="modal-restock-product" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right space-y-4">
            <h3 className="font-black text-sm text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
              <span>إعادة تعبئة مخزن الصنف</span>
            </h3>
            
            <form onSubmit={handleRestockSubmit} className="space-y-4 font-bold text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-slate-400 leading-relaxed">
                <div>السلعة: <strong className="text-slate-100">{showRestockForm.name}</strong></div>
                <div className="mt-1">الرصيد المتاح حالياً بالمخزن: <strong className="text-emerald-400">{showRestockForm.quantity}</strong></div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">الكمية/الوزن الجديد المضاف للوارد:</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full text-center text-4xl font-black text-emerald-400 bg-slate-950 border border-slate-850 rounded-xl p-3 focus:outline-none"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-550 text-white font-black py-3.5 rounded-xl shadow-lg transition cursor-pointer"
              >
                تحديث وزيادة المخزن المتاح
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Adjustment Form Modal */}
      {showAdjustmentForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="modal-adjustment-product" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right space-y-4">
            <h3 className="font-black text-sm text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Layers className="w-5 h-5 text-amber-500" />
              <span>تسوية جردية للمستودع</span>
            </h3>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-4 font-bold text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-slate-400 leading-relaxed">
                <div>السلعة: <strong className="text-slate-100">{showAdjustmentForm.name}</strong></div>
                <div className="mt-1">الكمية الحالية بالدفاتر: <strong className="text-amber-500">{showAdjustmentForm.quantity}</strong></div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">الكمية الفعلية المقاسة على الرف حالياً:</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full text-center text-4xl font-black text-amber-500 bg-slate-950 border border-slate-850 rounded-xl p-3 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">ملاحظات وسبب تسوية الجرد</label>
                <input
                  type="text"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3.5 rounded-xl shadow-lg transition cursor-pointer"
              >
                تثبيت جرد وتسوية الرفوف
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={productToDelete !== null}
        title="حذف المنتج نهائياً"
        message="هل أنت متأكد من رغبتك في حذف هذا الصنف بالكامل من السجلات؟ لا يمكن التراجع عن هذا القرار."
        confirmLabel="نعم، احذف الصنف"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />

    </div>
  );
};
