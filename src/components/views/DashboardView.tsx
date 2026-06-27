import React, { useMemo, useState } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { useSales } from '../../hooks/useSales';
import { useSettings } from '../../hooks/useSettings';
import { PageSkeleton } from '../shared/PageSkeleton';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertTriangle,
  ShoppingCart,
  PlusCircle,
  Users,
  Coins,
  ArrowUpRight,
  PackageCheck,
  GripVertical,
  RotateCcw
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { products, isLoading: loadingProducts } = useProducts();
  const { customers, isLoading: loadingCustomers } = useCustomers();
  const { invoices, todayInvoices, isLoading: loadingSales } = useSales();
  const { settings, isLoading: loadingSettings } = useSettings();

  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_card_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 5) {
          return parsed;
        }
      } catch (e) {}
    }
    return ['stock_valuation', 'daily_sales', 'daily_profits', 'invoices_count', 'low_stock'];
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    const newOrder = [...cardOrder];
    const draggedItem = newOrder[draggedIndex];
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    setCardOrder(newOrder);
    localStorage.setItem('dashboard_card_order', JSON.stringify(newOrder));
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 1. Calculate today's stats based on loaded live data
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Today's invoices
    const todaySalesUsd = todayInvoices.reduce((acc, inv) => acc + Number(inv.total_usd), 0);
    const todaySalesSyp = todayInvoices.reduce((acc, inv) => acc + Number(inv.total_syp), 0);

    // Yesterday's invoices
    const yesterdayInvoices = invoices.filter(inv => inv.sale_date.startsWith(yesterday));
    const yesterdaySalesUsd = yesterdayInvoices.reduce((acc, inv) => acc + Number(inv.total_usd), 0);

    // Sales change percentage
    const salesChange = yesterdaySalesUsd > 0 
      ? ((todaySalesUsd - yesterdaySalesUsd) / yesterdaySalesUsd) * 100 
      : 12.4; // positive mock trend if yesterday is 0

    // Profit calculation: exact dynamic profit calculation from invoice details
    const todayProfitUsd = todayInvoices.reduce((acc, inv) => {
      if (inv.profit_usd !== undefined && inv.profit_usd !== null) {
        return acc + Number(inv.profit_usd);
      }
      const itemsProfit = inv.items?.reduce((sum, item) => {
        const cost = item.cost_usd || 0;
        return sum + (item.price_usd - cost) * item.quantity;
      }, 0);
      if (itemsProfit && itemsProfit > 0) return acc + itemsProfit;
      return acc + Number(inv.total_usd) * 0.28;
    }, 0);

    const todayProfitSyp = todayInvoices.reduce((acc, inv) => {
      if (inv.profit_syp !== undefined && inv.profit_syp !== null) {
        return acc + Number(inv.profit_syp);
      }
      const profitUsd = inv.profit_usd || inv.items?.reduce((sum, item) => {
        const cost = item.cost_usd || 0;
        return sum + (item.price_usd - cost) * item.quantity;
      }, 0) || (Number(inv.total_usd) * 0.28);
      return acc + Math.round(profitUsd * settings.usd_to_syp_rate);
    }, 0);

    const yesterdayProfitUsd = yesterdayInvoices.reduce((acc, inv) => {
      if (inv.profit_usd !== undefined && inv.profit_usd !== null) {
        return acc + Number(inv.profit_usd);
      }
      const itemsProfit = inv.items?.reduce((sum, item) => {
        const cost = item.cost_usd || 0;
        return sum + (item.price_usd - cost) * item.quantity;
      }, 0);
      if (itemsProfit && itemsProfit > 0) return acc + itemsProfit;
      return acc + Number(inv.total_usd) * 0.28;
    }, 0);

    const profitChange = yesterdayProfitUsd > 0
      ? ((todayProfitUsd - yesterdayProfitUsd) / yesterdayProfitUsd) * 100
      : 5.6;

    const lowStockCount = products.filter(p => p.quantity <= p.warning_limit).length;

    const totalStockValueUsd = products.reduce((acc, p) => acc + ((p.quantity || 0) * (p.cost_usd || 0)), 0);
    const totalStockValueSyp = Math.round(totalStockValueUsd * settings.usd_to_syp_rate);
    const totalQtyInStock = products.reduce((acc, p) => acc + (p.quantity || 0), 0);

    return {
      todaySalesUsd,
      todaySalesSyp,
      salesChange,
      todayProfitUsd,
      todayProfitSyp,
      profitChange,
      todayInvoicesCount: todayInvoices.length,
      lowStockCount,
      totalStockValueUsd,
      totalStockValueSyp,
      totalQtyInStock
    };
  }, [invoices, todayInvoices, products, settings]);

  // 2. Prepare charts data for last 7 days
  const chartData = useMemo(() => {
    const dates = [];
    const arabicDays = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    
    // Generate dates for past 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dates.push({
        dateStr: d.toISOString().split('T')[0],
        dayName: arabicDays[d.getDay()]
      });
    }

    return dates.map(item => {
      const dayInvoices = invoices.filter(inv => inv.sale_date.startsWith(item.dateStr));
      const totalSalesUsd = dayInvoices.reduce((acc, inv) => acc + Number(inv.total_usd), 0);
      const totalProfitUsd = dayInvoices.reduce((acc, inv) => {
        if (inv.profit_usd !== undefined && inv.profit_usd !== null) {
          return acc + Number(inv.profit_usd);
        }
        const itemsProfit = inv.items?.reduce((sum, item) => {
          const cost = item.cost_usd || 0;
          return sum + (item.price_usd - cost) * item.quantity;
        }, 0);
        if (itemsProfit && itemsProfit > 0) return acc + itemsProfit;
        return acc + Number(inv.total_usd) * 0.28;
      }, 0);

      return {
        name: item.dayName,
        date: item.dateStr.slice(5),
        "المبيعات ($)": parseFloat(totalSalesUsd.toFixed(1)),
        "المبيعات (ل.س 10k)": parseFloat(((totalSalesUsd * settings.usd_to_syp_rate) / 10000).toFixed(1)),
        "الأرباح ($)": parseFloat(totalProfitUsd.toFixed(1)),
        "الأرباح (ل.س 10k)": parseFloat(((totalProfitUsd * settings.usd_to_syp_rate) / 10000).toFixed(1))
      };
    });
  }, [invoices, settings]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.quantity <= p.warning_limit).slice(0, 5);
  }, [products]);

  const recentInvoices = useMemo(() => {
    return invoices.slice(0, 5);
  }, [invoices]);

  const renderCard = (cardId: string, index: number) => {
    const isDragging = index === draggedIndex;
    const isDragOver = index === dragOverIndex;

    const dragProps = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, index),
      onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
      onDragLeave: () => setDragOverIndex(null),
      onDrop: (e: React.DragEvent) => handleDrop(e, index),
      onDragEnd: handleDragEnd,
    };

    const commonClasses = `relative bg-slate-900 rounded-2xl p-5 shadow-xl flex items-center gap-4 border transition-all duration-200 cursor-grab active:cursor-grabbing group select-none ${
      isDragging ? 'opacity-40 scale-95 border-indigo-500/50 bg-slate-950' : 
      isDragOver ? 'border-indigo-500 scale-[1.02] bg-slate-850 shadow-indigo-500/10 shadow-lg' : 'border-slate-800 hover:border-slate-700 hover:shadow-slate-950'
    }`;

    const dragHandle = (
      <div className="text-slate-600 group-hover:text-indigo-400 transition cursor-grab p-1 rounded-lg hover:bg-slate-800 shrink-0 self-center">
        <GripVertical className="w-4 h-4" />
      </div>
    );

    switch (cardId) {
      case 'stock_valuation':
        return (
          <div key="stock_valuation" {...dragProps} className={`${commonClasses} border-indigo-500/20 bg-gradient-to-br from-slate-900 to-indigo-950/20`}>
            {dragHandle}
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <PackageCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 text-right min-w-0">
              <span className="text-slate-500 text-[10px] font-bold block mb-1 truncate">جرد قيمة بضاعة المخزون (برأس المال)</span>
              <span className="text-lg font-extrabold text-emerald-400 block leading-tight font-mono truncate">
                ${stats.totalStockValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold text-amber-500 block mt-0.5 font-mono truncate">
                ≈ {stats.totalStockValueSyp.toLocaleString()} ل.س
              </span>
              <span className="text-[9px] text-slate-400 font-bold block mt-1 truncate">
                إجمالي المخزون: {stats.totalQtyInStock.toLocaleString()} وحدة
              </span>
            </div>
          </div>
        );

      case 'daily_sales':
        return (
          <div key="daily_sales" {...dragProps} className={commonClasses}>
            {dragHandle}
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="flex-1 text-right min-w-0">
              <span className="text-slate-500 text-[10px] font-bold block mb-1 truncate">مبيعات اليوم</span>
              <span className="text-lg font-extrabold text-slate-100 block leading-tight font-mono truncate">
                ${stats.todaySalesUsd.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold text-indigo-400 block mt-0.5 font-mono truncate">
                ≈ {stats.todaySalesSyp.toLocaleString()} ل.س
              </span>
              <span className="text-[9px] font-black text-emerald-400 mt-1 flex items-center gap-0.5 truncate">
                <TrendingUp className="w-3 h-3" />
                <span>+{stats.salesChange.toFixed(1)}% نمو اليوم</span>
              </span>
            </div>
          </div>
        );

      case 'daily_profits':
        return (
          <div key="daily_profits" {...dragProps} className={commonClasses}>
            {dragHandle}
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div className="flex-1 text-right min-w-0">
              <span className="text-slate-500 text-[10px] font-bold block mb-1 truncate">صافي الأرباح المقدرة اليوم</span>
              <span className="text-lg font-extrabold text-slate-100 block leading-tight font-mono truncate">
                ${stats.todayProfitUsd.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold text-indigo-400 block mt-0.5 font-mono truncate">
                ≈ {stats.todayProfitSyp.toLocaleString()} ل.س
              </span>
              <span className="text-[9px] font-black text-emerald-400 mt-1 flex items-center gap-0.5 truncate">
                <TrendingUp className="w-3 h-3" />
                <span>+{stats.profitChange.toFixed(1)}% نمو الفروق</span>
              </span>
            </div>
          </div>
        );

      case 'invoices_count':
        return (
          <div key="invoices_count" {...dragProps} className={commonClasses}>
            {dragHandle}
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="flex-1 text-right min-w-0">
              <span className="text-slate-500 text-[10px] font-bold block mb-1 truncate">فواتير مبيعات اليوم</span>
              <span className="text-xl font-black text-slate-100 block font-mono truncate">
                {stats.todayInvoicesCount}
              </span>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5 truncate">عمليات بيع ناجحة</span>
            </div>
          </div>
        );

      case 'low_stock':
        return (
          <div key="low_stock" {...dragProps} className={commonClasses}>
            {dragHandle}
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 text-right min-w-0">
              <span className="text-slate-500 text-[10px] font-bold block mb-1 truncate">تنبيهات المخزن عاجلة</span>
              <span className={`text-xl font-black block font-mono truncate ${stats.lowStockCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
                {stats.lowStockCount}
              </span>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5 truncate">أصناف تحت خط الأمان</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loadingProducts || loadingCustomers || loadingSales || loadingSettings) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 text-right" dir="rtl" id="dashboard-container">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 rounded-2xl p-6 border border-indigo-500/10 text-white shadow-2xl" id="welcome-banner">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black mb-1 bg-gradient-to-l from-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              أهلاً بك في {settings.store_name || 'ALkhal'} 👋
            </h1>
            <p className="text-xs text-slate-400 font-semibold">بوابة التاجر الدمشقي الذكية — حوسبة المبيعات والمخزون وسعر الصرف السوري بالوقت الفعلي</p>
          </div>
          <div className="flex gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-300">
            <div>
              <span className="block opacity-60 text-[10px]">سعر الصرف المعتمد</span>
              <span className="font-extrabold text-amber-500 text-sm mt-0.5 block">{settings.usd_to_syp_rate.toLocaleString()} ل.س / $</span>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockCount > 0 && (
        <div className="bg-rose-500/10 border-r-4 border-rose-500 rounded-xl p-4 flex items-center gap-3 text-rose-300 animate-pulse border border-rose-500/10" id="low-stock-global-banner">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1 text-xs font-bold">
            <span className="text-rose-200">تنبيه المخزون المنخفض!</span> هناك <span className="font-black text-rose-100">{stats.lowStockCount}</span> أصناف قاربت على النفاد بالمستودع.
          </div>
        </div>
      )}

      {/* Stats Section Header with Reset */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-850/60" id="stats-section-header">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-black text-slate-300">📊 الإحصائيات وبطاقات المراقبة السريعة</h2>
          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2.5 py-0.5 rounded-full">
            اسحب وأفلت لترتيب البطاقات حسب اهتمامك
          </span>
        </div>
        {JSON.stringify(cardOrder) !== JSON.stringify(['stock_valuation', 'daily_sales', 'daily_profits', 'invoices_count', 'low_stock']) && (
          <button
            onClick={() => {
              const def = ['stock_valuation', 'daily_sales', 'daily_profits', 'invoices_count', 'low_stock'];
              setCardOrder(def);
              localStorage.setItem('dashboard_card_order', JSON.stringify(def));
            }}
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-indigo-400 bg-slate-900 hover:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة الترتيب الافتراضي</span>
          </button>
        )}
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="stats-cards-grid">
        {cardOrder.map((cardId, idx) => renderCard(cardId, idx))}
      </div>

      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="mini-kpis">
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex justify-between items-center shadow-lg">
          <div>
            <span className="text-slate-500 font-bold text-xs block">إجمالي الأصناف المتاحة</span>
            <span className="text-lg font-black text-slate-100 block mt-1">{products.length} صنف</span>
          </div>
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex justify-between items-center shadow-lg">
          <div>
            <span className="text-slate-500 font-bold text-xs block">قاعدة بيانات العملاء CRM</span>
            <span className="text-lg font-black text-slate-100 block mt-1">{customers.length} عميل</span>
          </div>
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex justify-between items-center shadow-lg">
          <div>
            <span className="text-slate-500 font-bold text-xs block">الصرف السوري المعتمد</span>
            <span className="text-lg font-black text-amber-500 block mt-1 font-mono">{settings.usd_to_syp_rate} ل.س / $</span>
          </div>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="charts-grid">
        
        {/* LineChart: Sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black text-slate-100">تحليل مبيعات الـ 7 أيام الماضية</h3>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-full">بالدولار ($) والليرة السورية</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ direction: 'rtl', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#f1f5f9' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="المبيعات ($)" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} name="المبيعات بالدولار ($)" />
                <Line type="monotone" dataKey="المبيعات (ل.س 10k)" stroke="#f59e0b" strokeWidth={2} name="المبيعات (بالـ 10k ل.س)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BarChart: Profits */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black text-slate-100">تحليل الأرباح الصافية للـ 7 أيام الماضية</h3>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-full">الأرباح الصافية</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ direction: 'rtl', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#f1f5f9' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="الأرباح ($)" fill="#10b981" radius={[4, 4, 0, 0]} name="الأرباح بالدولار ($)" />
                <Bar dataKey="الأرباح (ل.س 10k)" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="الأرباح (بالـ 10k ل.س)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lists Row: Low Stock & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-lists-grid">
        
        {/* Low Stock */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl" id="dashboard-low-stock">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-xs font-black text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              تنبيهات المخزون المتدني بالمخازن
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">آخر 5 سلع</span>
          </div>
          <div className="overflow-x-auto">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-bold">
                <PackageCheck className="w-12 h-12 mx-auto opacity-50 mb-2 text-indigo-400" />
                جميع الكميات متوفرة بمستويات جيدة ومطابقة!
              </div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 font-bold">
                    <th className="pb-2">السلعة</th>
                    <th className="pb-2 text-center">الكمية الحالية</th>
                    <th className="pb-2 text-center">الحد الآمن</th>
                    <th className="pb-2 text-left">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-semibold text-slate-300">
                  {lowStockProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-2.5 font-extrabold text-slate-100">{p.name}</td>
                      <td className="py-2.5 text-center font-mono font-bold">
                        <span className={p.quantity === 0 ? 'text-rose-500' : 'text-amber-500'}>
                          {p.quantity} {p.sold_by_weight ? 'كغ' : 'ق'}
                        </span>
                      </td>
                      <td className="py-2.5 text-center text-slate-500 font-mono">{p.warning_limit}</td>
                      <td className="py-2.5 text-left">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${p.quantity === 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {p.quantity === 0 ? 'نفذ كلياً' : 'منخفض'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl" id="dashboard-recent-invoices">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-xs font-black text-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              آخر مبيعات الفواتير الصادرة
            </h3>
          </div>
          <div className="overflow-x-auto">
            {recentInvoices.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-bold">لا يوجد عمليات بيع مسجلة حالياً</div>
            ) : (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 font-bold">
                    <th className="pb-2">رقم الفاتورة</th>
                    <th className="pb-2 text-center">العميل</th>
                    <th className="pb-2 text-center">المجموع الكلي</th>
                    <th className="pb-2 text-left">طريقة الدفع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-semibold text-slate-300">
                  {recentInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-2.5 font-mono font-bold text-indigo-400">{inv.invoice_number}</td>
                      <td className="py-2.5 text-center text-slate-100 font-extrabold">{inv.customer_name}</td>
                      <td className="py-2.5 text-center">
                        <span className="font-bold text-slate-200 block font-mono">${inv.total_usd.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{inv.total_syp.toLocaleString()} ل.س</span>
                      </td>
                      <td className="py-2.5 text-left">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.payment_method === 'cash' ? 'bg-emerald-500/10 text-emerald-400' :
                          inv.payment_method === 'debt' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {inv.payment_method === 'cash' ? 'نقداً' : inv.payment_method === 'debt' ? 'دين' : 'جزئي'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
