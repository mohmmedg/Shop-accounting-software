import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { useSales } from '../../hooks/useSales';
import { useSettings } from '../../hooks/useSettings';
import { PageSkeleton } from '../shared/PageSkeleton';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { BarcodeScanner } from '../shared/BarcodeScanner';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Scan,
  AlertCircle,
  TrendingUp,
  X,
  CreditCard,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  product: any;
  quantity: number;
  price_usd: number;
  is_weight: boolean;
}

export const POSView: React.FC = () => {
  const { products, isLoading: loadingProducts } = useProducts();
  const { customers, isLoading: loadingCustomers } = useCustomers();
  const { createInvoice, isLoading: submittingSale } = useSales();
  const { settings, isLoading: loadingSettings } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  
  // Modals / Overlays
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showWeightPrompt, setShowWeightPrompt] = useState<any | null>(null);

  // Simulation helpers
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [weightGrams, setWeightGrams] = useState<string>('1000');
  const [totalPriceSyp, setTotalPriceSyp] = useState<string>('');
  const [activeField, setActiveField] = useState<'weight' | 'price'>('weight');
  const [amountPaidUsdInput, setAmountPaidUsdInput] = useState('');
  const [amountPaidSypInput, setAmountPaidSypInput] = useState('');
  const [discountSyp, setDiscountSyp] = useState<string>('0');

  // Finished Invoice ref for printing
  const [finishedInvoice, setFinishedInvoice] = useState<any | null>(null);

  // Input refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto focus search query on load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleClearCart();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowScanner(prev => !prev);
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          handleOpenPayment();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowScanner(false);
        setShowPayment(false);
        setShowReceipt(false);
        setShowWeightPrompt(null);
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filter available products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(p => {
      const barcodeClean = p.barcode ? p.barcode.toLowerCase() : '';
      const categoryClean = p.category ? p.category.toLowerCase() : '';
      const matchesSearch = p.name.toLowerCase().includes(q) || barcodeClean.includes(q) || categoryClean.includes(q);
      return matchesSearch && p.quantity > 0;
    });
  }, [products, searchQuery]);

  // Helper to clear cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    setShowClearCartConfirm(true);
  };

  const confirmClearCart = () => {
    setCart([]);
    setDiscountSyp('0');
    setSelectedCustomerId('');
    setShowClearCartConfirm(false);
    searchInputRef.current?.focus();
  };

  // Helper to determine product price for active customer type
  const getProductPriceForCustomer = (product: any, customer: any | null) => {
    if (!customer) return product.price_usd;
    if (customer.customer_type === 'wholesale') return Number(product.price_tiers?.wholesale_usd || product.price_usd * 0.9);
    if (customer.customer_type === 'vip') return Number(product.price_tiers?.vip_usd || product.price_usd * 0.95);
    return product.price_usd;
  };

  // Quick price updates in cart when customer type changes
  useEffect(() => {
    setCart(prev =>
      prev.map(item => ({
        ...item,
        price_usd: getProductPriceForCustomer(item.product, selectedCustomer)
      }))
    );
  }, [selectedCustomerId, selectedCustomer]);

  // Add product to cart
  const handleAddProduct = (product: any, customQty: number = 1) => {
    if (product.sold_by_weight && customQty === 1) {
      const priceUsd = getProductPriceForCustomer(product, selectedCustomer);
      const priceSyp = Math.round(priceUsd * (settings?.usd_to_syp_rate || 15000));
      setWeightGrams('1000');
      setTotalPriceSyp(priceSyp.toString());
      setActiveField('weight');
      setShowWeightPrompt(product);
      return;
    }

    const price = getProductPriceForCustomer(product, selectedCustomer);
    
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id);
      if (existingIdx > -1) {
        const item = prev[existingIdx];
        const newQty = item.quantity + customQty;
        if (newQty > product.quantity) {
          toast.error(`الكمية المطلوبة تتجاوز المتوفر بالمخزن! المتوفر حالياً: ${product.quantity}`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = { ...item, quantity: newQty };
        return updated;
      } else {
        if (customQty > product.quantity) {
          toast.error(`الكمية المطلوبة تتجاوز المتوفر بالمخزن! المتوفر حالياً: ${product.quantity}`);
          return prev;
        }
        return [...prev, { product, quantity: customQty, price_usd: price, is_weight: product.sold_by_weight }];
      }
    });

    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  // Handle Weight Submit
  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showWeightPrompt) return;
    
    const grams = parseFloat(weightGrams);
    if (isNaN(grams) || grams <= 0) {
      toast.error('الرجاء إدخال وزن صحيح أكبر من الصفر');
      return;
    }

    // Validation: Check sufficient stock in grams before confirming
    const stockGramsAvailable = showWeightPrompt.stock_grams !== undefined 
      ? showWeightPrompt.stock_grams 
      : (showWeightPrompt.quantity * 1000);

    if (grams > stockGramsAvailable) {
      toast.error(`الكمية المطلوبة (${grams.toLocaleString()} غ) تتجاوز المخزون المتوفر بالغرام! المتوفر: ${stockGramsAvailable.toLocaleString()} غ`);
      return;
    }

    const kgQty = grams / 1000;
    handleAddProduct(showWeightPrompt, kgQty);
    setShowWeightPrompt(null);
  };

  const handleWeightGramsChange = (val: string, product: any) => {
    setWeightGrams(val);
    setActiveField('weight');
    const grams = parseFloat(val);
    if (!isNaN(grams) && grams > 0) {
      const priceUsdPerKg = getProductPriceForCustomer(product, selectedCustomer);
      const priceSypPerKg = priceUsdPerKg * (settings?.usd_to_syp_rate || 15000);
      const priceVal = (grams * (priceSypPerKg / 1000));
      setTotalPriceSyp(Math.round(priceVal).toString());
    } else {
      setTotalPriceSyp('');
    }
  };

  const handleTotalPriceSypChange = (val: string, product: any) => {
    setTotalPriceSyp(val);
    setActiveField('price');
    const sypPrice = parseFloat(val);
    if (!isNaN(sypPrice) && sypPrice > 0) {
      const priceUsdPerKg = getProductPriceForCustomer(product, selectedCustomer);
      const priceSypPerKg = priceUsdPerKg * (settings?.usd_to_syp_rate || 15000);
      if (priceSypPerKg > 0) {
        const gramsVal = (sypPrice / (priceSypPerKg / 1000));
        setWeightGrams(Math.round(gramsVal).toString());
      }
    } else {
      setWeightGrams('');
    }
  };

  const handlePresetClick = (grams: number, product: any) => {
    setWeightGrams(grams.toString());
    setActiveField('weight');
    const priceUsdPerKg = getProductPriceForCustomer(product, selectedCustomer);
    const priceSypPerKg = priceUsdPerKg * (settings?.usd_to_syp_rate || 15000);
    const priceVal = (grams * (priceSypPerKg / 1000));
    setTotalPriceSyp(Math.round(priceVal).toString());
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const step = item.is_weight ? 0.250 : 1;
          const newQty = Math.max(0, item.quantity + (delta * step));
          if (newQty > item.product.quantity) {
            toast.error(`الكمية المطلوبة تتجاوز المتوفر بالمخزن! المتاح هو ${item.product.quantity}`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // CART MATHEMATICS
  const totals = useMemo(() => {
    const rawTotalUsd = cart.reduce((acc, item) => acc + item.quantity * item.price_usd, 0);
    const rawTotalSyp = Math.round(rawTotalUsd * (settings?.usd_to_syp_rate || 15000));
    
    const discSyp = parseFloat(discountSyp) || 0;
    const totalSyp = Math.max(0, rawTotalSyp - discSyp);
    
    const discUsd = discSyp / (settings?.usd_to_syp_rate || 15000);
    const totalUsd = Math.max(0, rawTotalUsd - discUsd);

    const totalCostUsd = cart.reduce((acc, item) => acc + item.quantity * (item.product.cost_usd || 0), 0);
    const totalCostSyp = Math.round(totalCostUsd * (settings?.usd_to_syp_rate || 15000));
    
    // Net profit = final price - cost
    const expectedProfitUsd = Math.max(0, totalUsd - totalCostUsd);
    const expectedProfitSyp = Math.max(0, totalSyp - totalCostSyp);

    return {
      totalUsd,
      totalSyp,
      rawTotalUsd,
      rawTotalSyp,
      discountSyp: discSyp,
      discountUsd: discUsd,
      expectedProfitUsd,
      expectedProfitSyp,
      totalCostUsd,
      totalCostSyp
    };
  }, [cart, settings, discountSyp]);

  // SCANNER SIMULATOR SUBMISSION
  const handleScanResult = (barcode: string) => {
    const cleanBarcode = barcode.trim();
    const found = products.find(p => p.barcode === cleanBarcode);
    if (found) {
      if (found.quantity === 0) {
        toast.error('هذا المنتج نفذ من المخزن!');
      } else {
        handleAddProduct(found);
      }
    } else {
      toast.error('لم يتم العثور على أي صنف يطابق هذا الباركود');
    }
  };

  const handleOpenPayment = () => {
    setAmountPaidUsdInput(totals.totalUsd.toFixed(2));
    setAmountPaidSypInput(totals.totalSyp.toString());
    setShowPayment(true);
  };

  // COMMIT SALE INVOICE
  const handleCommitSale = async (paymentMethod: 'cash' | 'debt') => {
    const paidUsd = paymentMethod === 'cash' ? parseFloat(amountPaidUsdInput) || totals.totalUsd : 0;
    const paidSyp = Math.round(paidUsd * (settings?.usd_to_syp_rate || 15000));
    const remainingUsd = Math.max(0, totals.totalUsd - paidUsd);
    const remainingSyp = Math.max(0, totals.totalSyp - paidSyp);

    if (paymentMethod === 'debt' && !selectedCustomerId) {
      toast.error('عذراً! لا يمكن إجراء بيع آجل دون تحديد اسم العميل أولاً');
      return;
    }

    const items = cart.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      price_usd: item.price_usd,
      price_syp: Math.round(item.price_usd * (settings?.usd_to_syp_rate || 15000)),
      cost_usd: item.product.cost_usd || 0,
      is_weight: item.is_weight
    }));

    const invoicePayload = {
      customer_id: selectedCustomerId || null,
      customer_name: selectedCustomer ? selectedCustomer.name : 'عميل نقدي سريع',
      items,
      total_usd: totals.totalUsd,
      total_syp: totals.totalSyp,
      payment_method: (paymentMethod === 'debt' ? 'debt' : (remainingUsd > 0 ? 'partial' : 'cash')) as any,
      paid_usd: paidUsd,
      paid_syp: paidSyp,
      remaining_debt_usd: remainingUsd,
      remaining_debt_syp: remainingSyp,
      sale_date: new Date().toISOString(),
      discount_syp: totals.discountSyp,
      discount_usd: totals.discountUsd,
      profit_syp: totals.expectedProfitSyp,
      profit_usd: totals.expectedProfitUsd
    };

    try {
      const response = await createInvoice(invoicePayload);
      setFinishedInvoice({
        invoice_number: response?.invoice_number || `INV-${String(Date.now()).slice(-6)}`,
        customer_name: invoicePayload.customer_name,
        items: invoicePayload.items,
        total_usd: invoicePayload.total_usd,
        total_syp: invoicePayload.total_syp,
        payment_method: invoicePayload.payment_method,
        paid_usd: invoicePayload.paid_usd,
        paid_syp: invoicePayload.paid_syp,
        remaining_debt_usd: invoicePayload.remaining_debt_usd,
        remaining_debt_syp: invoicePayload.remaining_debt_syp,
        sale_date: new Date().toLocaleString('ar-SY'),
        discount_syp: invoicePayload.discount_syp,
        discount_usd: invoicePayload.discount_usd,
        profit_syp: invoicePayload.profit_syp,
        profit_usd: invoicePayload.profit_usd
      });

      toast.success('تم تسجيل وحفظ الفاتورة بنجاح وتحديث كميات المستودع');
      setCart([]);
      setDiscountSyp('0');
      setSelectedCustomerId('');
      setShowPayment(false);
      setShowReceipt(true);
    } catch (err) {}
  };

  if (loadingProducts || loadingCustomers || loadingSettings) {
    return <PageSkeleton />;
  }

  return (
    <div className="h-auto lg:h-[calc(100vh-130px)] flex flex-col lg:flex-row gap-5 text-right" dir="rtl" id="pos-layout">
      
      {/* 1. Main Left Screen: Products Shelf Grid */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 h-[500px] lg:h-full overflow-hidden">
        
        {/* Search Header Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const trimmedQuery = searchQuery.trim();
                  if (!trimmedQuery) return;
                  
                  // Try to find exact match by barcode first
                  const barcodeMatch = products.find(p => p.barcode === trimmedQuery);
                  if (barcodeMatch) {
                    if (barcodeMatch.quantity === 0) {
                      toast.error('هذا المنتج نفذ من المخزن!');
                    } else {
                      handleAddProduct(barcodeMatch);
                      toast.success(`تمت إضافة المنتج للفاتورة: ${barcodeMatch.name}`);
                    }
                    return;
                  }
                  
                  // If not, if there is exactly one product filtered, add it
                  if (filteredProducts.length === 1) {
                    const singleProd = filteredProducts[0];
                    if (singleProd.quantity === 0) {
                      toast.error('هذا المنتج نفذ من المخزن!');
                    } else {
                      handleAddProduct(singleProd);
                      toast.success(`تمت إضافة المنتج للفاتورة: ${singleProd.name}`);
                    }
                  } else if (filteredProducts.length > 1) {
                    toast.info('تم العثور على عدة منتجات مطابقة، يرجى تصفية البحث أو الاختيار اليدوي');
                  } else {
                    toast.error('لم يتم العثور على أي منتج يطابق هذا البحث أو الباركود');
                  }
                }
              }}
              placeholder="ابحث بالاسم أو الباركود... اضغط Enter للإضافة (F2 للمسح بالكاميرا)"
              className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-505 font-bold text-right font-sans"
              id="pos-search-input"
            />
          </div>

          <button
            onClick={() => {
              setScannedBarcode('');
              setShowScanner(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-550 text-white font-black px-4 rounded-xl flex items-center gap-2 shadow-lg transition transform hover:scale-[1.02] shrink-0 cursor-pointer text-xs"
            id="pos-barcode-scanner-btn"
          >
            <Scan className="w-4 h-4 animate-pulse" />
            <span>مسح باركود بالكاميرا (F2)</span>
          </button>
        </div>

        {/* Shelf Grid */}
        <div className="flex-1 overflow-y-auto pr-1" id="products-shelf">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-slate-500">
              <AlertCircle className="w-12 h-12 opacity-30 mb-2 text-indigo-400 animate-pulse" />
              <p className="text-sm font-black">لا توجد سلع متوفرة تطابق خيارات البحث</p>
              <p className="text-[10px] mt-1">الكميات قد تكون فارغة في المستودع</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
              {filteredProducts.map(p => {
                const isLow = p.quantity <= p.warning_limit;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleAddProduct(p)}
                    className="bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-2xl p-3 text-right flex flex-col justify-between shadow-sm transition-all duration-200 transform active:scale-95 group h-36 relative overflow-hidden cursor-pointer"
                  >
                    <div className="flex justify-between items-center w-full text-[9px] font-black">
                      <span className="bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                        {p.category}
                      </span>
                      {p.sold_by_weight && (
                        <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/10">
                          ⚖️ كغ
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-slate-100 group-hover:text-indigo-400 text-xs md:text-sm line-clamp-2 mt-1.5 w-full text-right leading-relaxed">
                      {p.name}
                    </h4>

                    <div className="w-full mt-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-[8px] text-slate-500 block font-bold">مفرق</span>
                          <span className="font-black text-sm text-indigo-400 font-mono">
                            ${getProductPriceForCustomer(p, selectedCustomer).toFixed(2)}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isLow ? 'bg-rose-500/10 text-rose-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          متوفر: {p.quantity}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Right sidebar: Shopping Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 h-[500px] lg:h-full overflow-hidden shrink-0" id="pos-sidebar-cart">
        
        {/* Customer Select */}
        <div className="mb-4 bg-slate-950 p-3 border border-slate-850 rounded-xl shrink-0 space-y-2">
          <label className="text-[10px] font-black text-slate-500 block">تحديد العميل وبرنامج ولاء التسعير</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 font-extrabold text-xs text-slate-300 text-right cursor-pointer focus:outline-none"
          >
            <option value="">عميل نقدي سريع (مفرق)</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.customer_type === 'wholesale' ? '(📦 جملة)' : c.customer_type === 'vip' ? '(💎 VIP)' : '(مفرق)'}
              </option>
            ))}
          </select>
          
          {selectedCustomer && (
            <div className="bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 text-[10px] font-black p-2 rounded-lg flex justify-between items-center">
              <span>تطبيق تسعيرة {selectedCustomer.customer_type === 'wholesale' ? 'الجملة' : '💎 VIP'} التفضيلية</span>
              <span className="font-mono">نقاطه: {selectedCustomer.loyalty_points || 0}</span>
            </div>
          )}
        </div>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-850 pr-1" id="cart-list">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-slate-500 py-10">
              <ShoppingCart className="w-12 h-12 opacity-20 mb-2 text-indigo-400" />
              <p className="font-black text-xs">سلة المشتريات فارغة</p>
              <p className="text-[10px] mt-1 text-slate-600">انقر على الأصناف لملء السلة</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="py-2.5 flex justify-between gap-3 items-center group">
                <div className="flex-1 text-right">
                  <h5 className="font-black text-slate-200 text-xs leading-snug">{item.product.name}</h5>
                  <div className="flex items-center gap-2 mt-1 font-mono text-[10px]">
                    <span className="text-indigo-400">${item.price_usd.toFixed(2)}</span>
                    <span className="text-slate-500">≈ {Math.round(item.price_usd * (settings?.usd_to_syp_rate || 15000)).toLocaleString()} ل.س</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUpdateQty(item.product.id, -1)}
                    className="w-6 h-6 bg-slate-950 hover:bg-slate-850 text-slate-400 rounded-full flex items-center justify-center font-bold cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-black text-xs font-mono w-12 text-center text-slate-100 bg-slate-950 rounded py-1 border border-slate-850">
                    {item.quantity.toFixed(item.is_weight ? 3 : 0)}
                  </span>
                  <button
                    onClick={() => handleUpdateQty(item.product.id, 1)}
                    className="w-6 h-6 bg-slate-950 hover:bg-slate-850 text-slate-400 rounded-full flex items-center justify-center font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleRemoveFromCart(item.product.id)}
                    className="text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Section */}
        <div className="mt-4 border-t border-slate-850 pt-3 shrink-0 bg-slate-950 p-3 rounded-xl space-y-3" id="pos-math-section">
          {/* Discount SYP Input */}
          <div className="space-y-1 bg-slate-900/40 p-2 rounded-xl border border-slate-850/60">
            <div className="flex justify-between items-center text-[10px] font-black">
              <span className="text-slate-400">الخصم من الفاتورة (ل.س):</span>
              {totals.discountSyp > 0 && (
                <span className="text-indigo-400 font-mono">≈ ${totals.discountUsd.toFixed(2)}</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                value={discountSyp === '0' ? '' : discountSyp}
                onChange={(e) => {
                  const val = e.target.value;
                  setDiscountSyp(val ? val : '0');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-slate-100 font-mono text-xs font-black focus:outline-none focus:border-indigo-500/50"
              />
              <span className="absolute left-2 top-2 text-slate-500 text-[9px] font-bold">ل.س</span>
            </div>
          </div>

          {totals.discountSyp > 0 && (
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold px-1">
              <span>المجموع الأصلي قبل الخصم:</span>
              <span className="line-through font-mono">{totals.rawTotalSyp.toLocaleString()} ل.س</span>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-slate-850 pt-2 text-xs">
            <span className="text-slate-400 font-bold">المجموع بالدولار:</span>
            <span className="text-sm font-black text-slate-100 font-mono">${totals.totalUsd.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">المجموع النهائي بالليرة:</span>
            <span className="text-base font-black text-emerald-400 font-mono">{totals.totalSyp.toLocaleString()} ل.س</span>
          </div>

          <div className="flex justify-between items-center bg-indigo-950/20 border border-indigo-900/30 p-2 rounded-xl text-xs font-black text-slate-300">
            <span>صافي ربح الفاتورة للتاجر:</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              {totals.expectedProfitSyp.toLocaleString()} ل.س
              <span className="text-[10px] text-slate-500 font-normal">(${totals.expectedProfitUsd.toFixed(2)})</span>
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 pt-1">
            <button
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="bg-slate-900 hover:bg-rose-500/10 text-rose-500 border border-slate-800 hover:border-rose-500/20 rounded-xl flex items-center justify-center disabled:opacity-30 transition p-2.5 cursor-pointer"
              title="تفريغ السلة (F1)"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleOpenPayment}
              disabled={cart.length === 0 || submittingSale}
              className="col-span-4 h-12 bg-indigo-600 hover:bg-indigo-550 text-white font-black text-sm rounded-xl shadow-lg transition transform hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-30 cursor-pointer"
              id="pos-pay-btn"
            >
              <CreditCard className="w-5 h-5 animate-pulse" />
              <span>إتمام ودفع الفاتورة (F4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Weight Modal */}
      {showWeightPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="weight-prompt-modal" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <button onClick={() => setShowWeightPrompt(null)} className="text-slate-400 hover:text-slate-250">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100">⚖️ حوسبة البيع بالوزن والتقدير</h3>
            </div>
            
            <form onSubmit={handleWeightSubmit} className="space-y-4 font-bold text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1.5">
                <div className="text-slate-400">الصنف: <strong className="text-slate-100 text-sm">{showWeightPrompt.name}</strong></div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-amber-400">سعر الكيلو: {(getProductPriceForCustomer(showWeightPrompt, selectedCustomer) * (settings?.usd_to_syp_rate || 15000)).toLocaleString()} ل.س</span>
                  <span className="text-emerald-400">المتوفر: {((showWeightPrompt.stock_grams !== undefined) ? showWeightPrompt.stock_grams : (showWeightPrompt.quantity * 1000)).toLocaleString()} غ</span>
                </div>
              </div>
              
              {/* Weight Input (Grams) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-400">الوزن الكلي (بالغرام):</label>
                  {activeField === 'weight' && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">مدخل يدويّاً ✍️</span>}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={weightGrams}
                    onChange={(e) => handleWeightGramsChange(e.target.value, showWeightPrompt)}
                    onFocus={() => setActiveField('weight')}
                    placeholder="أدخل الوزن بالغرام"
                    className={`w-full text-center text-2xl font-black rounded-xl p-3 focus:outline-none transition-all duration-200 ${
                      activeField === 'weight'
                        ? 'text-emerald-300 bg-emerald-950/20 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'text-slate-300 bg-slate-950 border border-slate-850'
                    }`}
                    autoFocus
                  />
                  <span className="absolute left-3 top-3.5 text-slate-500 text-xs font-bold">غرام</span>
                </div>
              </div>

              {/* Price Input (SYP) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <label className="text-slate-400">السعر الإجمالي (ل.س):</label>
                    {activeField === 'price' && weightGrams && (
                      <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[11px] font-black animate-pulse">
                        ⚖️ {parseFloat(weightGrams) ? parseFloat(weightGrams).toLocaleString() : '0'} غ
                      </span>
                    )}
                  </div>
                  {activeField === 'price' && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">مدخل يدويّاً ✍️</span>}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={totalPriceSyp}
                    onChange={(e) => handleTotalPriceSypChange(e.target.value, showWeightPrompt)}
                    onFocus={() => setActiveField('price')}
                    placeholder="أدخل السعر المطلوب"
                    className={`w-full text-center text-2xl font-black rounded-xl p-3 focus:outline-none transition-all duration-200 ${
                      activeField === 'price'
                        ? 'text-amber-300 bg-amber-950/20 border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'text-slate-300 bg-slate-950 border border-slate-850'
                    }`}
                  />
                  <span className="absolute left-3 top-3.5 text-slate-500 text-xs font-bold">ل.س</span>
                </div>
                {activeField === 'price' && weightGrams && (
                  <div className="text-right text-[11px] text-emerald-400 font-bold pt-1 flex justify-between items-center">
                    <span>الوزن المقدر الناتج:</span>
                    <span className="font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs font-black">
                      {parseFloat(weightGrams) ? (parseFloat(weightGrams) / 1000).toFixed(3) : '0.000'} كغ ({(parseFloat(weightGrams) || 0).toLocaleString()} غ)
                    </span>
                  </div>
                )}
              </div>

              {/* Quick weight presets */}
              <div className="grid grid-cols-4 gap-2 font-black">
                <button type="button" onClick={() => handlePresetClick(250, showWeightPrompt)} className="bg-slate-950 hover:bg-slate-850 text-slate-400 p-2 text-[10px] rounded-lg cursor-pointer transition">250 غ</button>
                <button type="button" onClick={() => handlePresetClick(500, showWeightPrompt)} className="bg-slate-950 hover:bg-slate-850 text-slate-400 p-2 text-[10px] rounded-lg cursor-pointer transition">500 غ</button>
                <button type="button" onClick={() => handlePresetClick(1000, showWeightPrompt)} className="bg-slate-950 hover:bg-slate-850 text-slate-400 p-2 text-[10px] rounded-lg cursor-pointer transition">1 كغ</button>
                <button type="button" onClick={() => handlePresetClick(2000, showWeightPrompt)} className="bg-slate-950 hover:bg-slate-850 text-slate-400 p-2 text-[10px] rounded-lg cursor-pointer transition">2 كغ</button>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg cursor-pointer transition"
              >
                إضافة لسلّة المبيعات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanResult}
        products={products}
      />

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="payment-modal" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-205">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100">🧾 إتمام دفع الفاتورة وقيدها</h3>
            </div>

            <div className="space-y-4 font-bold text-xs text-slate-300">
              <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-4 flex justify-between items-center font-black">
                <div>
                  <span className="text-[9px] text-slate-500 block">المبلغ النهائي المطلوب بالليرة</span>
                  <span className="text-xl text-emerald-400 font-mono mt-1 block">{totals.totalSyp.toLocaleString()} ل.س</span>
                </div>
                <div className="text-left">
                  <span className="text-[9px] text-slate-500 block">المجموع النهائي بالدولار</span>
                  <span className="text-lg text-slate-100 font-mono mt-1 block">${totals.totalUsd.toFixed(2)}</span>
                </div>
              </div>

              {totals.discountSyp > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/15 rounded-xl p-3 flex justify-between items-center text-[11px] text-indigo-400">
                  <span>إجمالي الخصم المطبق:</span>
                  <span className="font-mono text-xs font-black">{totals.discountSyp.toLocaleString()} ل.س</span>
                </div>
              )}

              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex justify-between items-center text-[11px] text-slate-400">
                <span>الربح الصافي الفعلي من هذه الفاتورة:</span>
                <span className="font-mono text-xs font-black text-emerald-400">{totals.expectedProfitSyp.toLocaleString()} ل.س ({`$${totals.expectedProfitUsd.toFixed(2)}`})</span>
              </div>

              {/* Quick Cash Payment Shortcuts */}
              <div className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-xl border border-slate-850/60">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">أزرار القبض النقدي السريع (فئات الليرة السورية):</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAmountPaidSypInput(totals.totalSyp.toString());
                      setAmountPaidUsdInput(totals.totalUsd.toFixed(2));
                    }}
                    className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 py-1.5 px-2 rounded-lg text-[10px] font-black border border-indigo-500/15 transition cursor-pointer text-center"
                  >
                    كامل المبلغ المطلوب
                  </button>
                  {[50000, 100000, 200000, 500000].map(bill => {
                    if (bill < totals.totalSyp) return null; // only show relevant bill amounts
                    return (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => {
                          setAmountPaidSypInput(bill.toString());
                          setAmountPaidUsdInput((bill / (settings?.usd_to_syp_rate || 15000)).toFixed(2));
                        }}
                        className="bg-slate-950 hover:bg-slate-850 text-slate-300 py-1.5 px-2.5 rounded-lg text-[10px] font-mono font-bold border border-slate-800 transition cursor-pointer"
                      >
                        {bill.toLocaleString()} ل.س
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">المبلغ المدفوع ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaidUsdInput}
                    onChange={(e) => {
                      setAmountPaidUsdInput(e.target.value);
                      const usd = parseFloat(e.target.value) || 0;
                      setAmountPaidSypInput(Math.round(usd * (settings?.usd_to_syp_rate || 15000)).toString());
                    }}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-center text-slate-100 font-mono text-lg font-black focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">المبلغ المدفوع (ل.س)</label>
                  <input
                    type="number"
                    value={amountPaidSypInput}
                    onChange={(e) => {
                      setAmountPaidSypInput(e.target.value);
                      const syp = parseInt(e.target.value) || 0;
                      setAmountPaidUsdInput((syp / (settings?.usd_to_syp_rate || 15000)).toFixed(2));
                    }}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-center text-slate-100 font-mono text-lg font-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Currency return change */}
              {parseFloat(amountPaidUsdInput) > totals.totalUsd && (
                <div className="bg-amber-500/10 border border-amber-500/15 text-amber-400 rounded-xl p-3 flex justify-between items-center text-[11px]">
                  <span>مبلغ المتبقي صرفه للزبون:</span>
                  <span className="text-sm font-black text-rose-400 font-mono text-left">
                    {Math.round((parseFloat(amountPaidUsdInput) - totals.totalUsd) * (settings?.usd_to_syp_rate || 15000)).toLocaleString()} ل.س
                    <span className="block text-[9px] text-slate-400 mt-0.5 font-normal">≈ ${(parseFloat(amountPaidUsdInput) - totals.totalUsd).toFixed(2)}</span>
                  </span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleCommitSale('cash')}
                  className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3.5 rounded-xl shadow-lg transition cursor-pointer"
                >
                  تأكيد سداد الفاتورة نقداً
                </button>
                
                <button
                  onClick={() => handleCommitSale('debt')}
                  disabled={!selectedCustomerId}
                  className="w-full bg-slate-950 hover:bg-slate-900 text-rose-500 border border-slate-850 hover:border-rose-500/20 py-3 rounded-xl transition disabled:opacity-30 cursor-pointer"
                >
                  تسجيل الفاتورة على الحساب (ذمم ديون)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && finishedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="receipt-print-modal" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right flex flex-col h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 shrink-0">
              <button onClick={() => setShowReceipt(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm text-slate-100">🧾 فاتورة الزبون المطبوعة</h3>
            </div>

            <div className="flex-1 overflow-y-auto my-3 p-4 border border-dashed border-slate-700 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 space-y-4" id="printable-receipt-canvas">
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-800">
                <h2 className="text-xs font-black text-slate-100">{settings?.store_name || 'كاشير دمشق'}</h2>
                <p>هاتف: {settings?.store_phone || '---'}</p>
                <p className="text-[9px] text-slate-500">{finishedInvoice.sale_date}</p>
                <p className="font-bold text-indigo-400 text-[11px] mt-1.5 bg-indigo-500/5 py-1 rounded">فاتورة: {finishedInvoice.invoice_number}</p>
                <p className="text-[10px] text-slate-400 mt-1">العميل: {finishedInvoice.customer_name}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-800 space-y-2">
                <div className="flex justify-between font-black text-slate-100">
                  <span className="w-16 text-left">المجموع</span>
                  <span className="w-12 text-center">السعر</span>
                  <span className="w-12 text-center">الكمية</span>
                  <span className="flex-1 text-right">الصنف</span>
                </div>
                <div className="space-y-1 text-slate-400">
                  {finishedInvoice.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="w-16 text-left font-mono">${(item.quantity * item.price_usd).toFixed(1)}</span>
                      <span className="w-12 text-center font-mono">${item.price_usd.toFixed(1)}</span>
                      <span className="w-12 text-center font-mono">{item.quantity.toFixed(item.is_weight ? 3 : 0)}</span>
                      <span className="flex-1 text-right truncate font-sans font-semibold">{item.product_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="py-2 space-y-1.5 text-right font-sans font-bold">
                <div className="flex justify-between text-slate-200">
                  <span>المجموع الإجمالي ($):</span>
                  <span className="font-mono">${finishedInvoice.total_usd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 text-xs font-black border-t border-dashed border-slate-800 pt-1.5">
                  <span>القيمة بالليرة السورية:</span>
                  <span className="font-mono">{finishedInvoice.total_syp.toLocaleString()} ل.س</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[10px] pt-1">
                  <span>المسدد المقبوض:</span>
                  <span className="font-mono">${finishedInvoice.paid_usd.toFixed(2)} ({finishedInvoice.paid_syp.toLocaleString()} ل.س)</span>
                </div>
                {finishedInvoice.remaining_debt_usd > 0 && (
                  <div className="flex justify-between text-rose-400 text-[11px] font-black">
                    <span>ذمم الديون المتبقية:</span>
                    <span className="font-mono">${finishedInvoice.remaining_debt_usd.toFixed(2)} ({finishedInvoice.remaining_debt_syp.toLocaleString()} ل.س)</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-800 space-y-1 text-slate-500 text-[9px]">
                <p>شكراً لزيارتكم مخازننا!</p>
                <p>دمشق - الجمهورية العربية السورية</p>
                <p>نظام كاشير دمشق المطور</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-550 text-white font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة</span>
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 font-black py-3 rounded-xl border border-slate-850 cursor-pointer text-xs"
              >
                إنهاء وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cart Confirm Dialog */}
      <ConfirmDialog
        isOpen={showClearCartConfirm}
        title="تفريغ سلة المشتريات"
        message="هل أنت متأكد من تفريغ سلة المشتريات بالكامل؟ لا يمكن التراجع عن هذا القرار."
        confirmLabel="نعم، فرّغ السلة"
        cancelLabel="إلغاء"
        variant="warning"
        onConfirm={confirmClearCart}
        onCancel={() => setShowClearCartConfirm(false)}
      />
    </div>
  );
};
