import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { useSales } from '../../hooks/useSales';
import { useSettings } from '../../hooks/useSettings';
import { useExpenses } from '../../hooks/useExpenses';
import { PageSkeleton } from '../shared/PageSkeleton';
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
import {
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  DollarSign,
  ShoppingCart,
  Coins,
  Inbox,
  Award,
  Percent,
  Archive,
  Eye,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { products, isLoading: loadingProducts } = useProducts();
  const { customers, isLoading: loadingCustomers } = useCustomers();
  const { invoices, isLoading: loadingSales } = useSales();
  const { settings, isLoading: loadingSettings } = useSettings();
  const { expenses, isLoading: loadingExpenses } = useExpenses();

  // Advanced filters state
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [targetProduct, setTargetProduct] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [targetPayment, setTargetPayment] = useState('');

  // Active analytics tab
  const [activeTab, setActiveTab] = useState<'trends' | 'bestsellers' | 'customers' | 'margins' | 'daily_archive'>('trends');

  // Daily Closings Archive state
  const [dailyClosings, setDailyClosings] = useState<any[]>(() => {
    const saved = localStorage.getItem('store_daily_closings');
    return saved ? JSON.parse(saved) : [];
  });
  const [expandedClosingId, setExpandedClosingId] = useState<string | null>(null);

  // Extract list values for select inputs
  const categoriesList = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category)));
  }, [products]);

  // 1. FILTERED DATASETS
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = inv.sale_date.split('T')[0];
      const matchesDate = invDate >= dateFrom && invDate <= dateTo;
      const matchesCustomer = targetCustomer === '' || inv.customer_id === targetCustomer;
      const matchesPayment = targetPayment === '' || inv.payment_method === targetPayment;

      // Check if any product matches in invoices items
      const matchesProduct = targetProduct === '' || inv.items.some((i: any) => i.product_id === targetProduct);

      return matchesDate && matchesCustomer && matchesPayment && matchesProduct;
    });
  }, [invoices, dateFrom, dateTo, targetCustomer, targetPayment, targetProduct]);

  // 2. FINANCIAL CALCULATIONS
  const financeKPIs = useMemo(() => {
    const totalRevenueUsd = filteredInvoices.reduce((acc, inv) => acc + Number(inv.total_usd), 0);
    
    // Dynamic precise profit tracking
    const totalProfitUsd = filteredInvoices.reduce((acc, inv) => {
      if (inv.profit_usd !== undefined && inv.profit_usd !== null) {
        return acc + Number(inv.profit_usd);
      }
      const itemsProfit = inv.items?.reduce((sum: number, item: any) => {
        const cost = item.cost_usd || 0;
        return sum + (item.price_usd - cost) * item.quantity;
      }, 0);
      if (itemsProfit && itemsProfit > 0) return acc + itemsProfit;
      return acc + Number(inv.total_usd) * 0.28;
    }, 0);

    const totalProfitSyp = filteredInvoices.reduce((acc, inv) => {
      if (inv.profit_syp !== undefined && inv.profit_syp !== null) {
        return acc + Number(inv.profit_syp);
      }
      const profitUsd = inv.profit_usd || inv.items?.reduce((sum: number, item: any) => {
        const cost = item.cost_usd || 0;
        return sum + (item.price_usd - cost) * item.quantity;
      }, 0) || (Number(inv.total_usd) * 0.28);
      return acc + Math.round(profitUsd * settings.usd_to_syp_rate);
    }, 0);

    // Dynamic precise discount tracking
    const totalDiscountSyp = filteredInvoices.reduce((acc, inv) => acc + Number(inv.discount_syp || 0), 0);
    const totalDiscountUsd = filteredInvoices.reduce((acc, inv) => acc + Number(inv.discount_usd || 0), 0);

    const totalQtySold = filteredInvoices.reduce((acc, inv) => {
      return acc + inv.items.reduce((sum: number, it: any) => sum + Number(it.quantity), 0);
    }, 0);
    const averageTicketUsd = filteredInvoices.length > 0 ? totalRevenueUsd / filteredInvoices.length : 0;

    return {
      revenueUsd: totalRevenueUsd,
      revenueSyp: Math.round(totalRevenueUsd * settings.usd_to_syp_rate),
      profitUsd: totalProfitUsd,
      profitSyp: totalProfitSyp,
      totalDiscountSyp,
      totalDiscountUsd,
      totalQtySold,
      averageTicketUsd,
      averageTicketSyp: Math.round(averageTicketUsd * settings.usd_to_syp_rate)
    };
  }, [filteredInvoices, settings]);

  // 3. ANALYTICAL CHARTS AND LISTS PREPARATION
  // A. Trends line charting data grouped by Date
  const trendsChartData = useMemo(() => {
    const grouped: { [key: string]: { date: string, sales: number, profit: number } } = {};
    
    // Seed dates range to ensure sorting
    let current = new Date(dateFrom);
    const end = new Date(dateTo);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      grouped[dateKey] = { date: dateKey.slice(5), sales: 0, profit: 0 };
      current.setDate(current.getDate() + 1);
    }

    filteredInvoices.forEach(inv => {
      const d = inv.sale_date.split('T')[0];
      if (grouped[d]) {
        grouped[d].sales += Number(inv.total_usd);
        
        let invProfitUsd = 0;
        if (inv.profit_usd !== undefined && inv.profit_usd !== null) {
          invProfitUsd = Number(inv.profit_usd);
        } else {
          const itemsProfit = inv.items?.reduce((sum: number, item: any) => {
            const cost = item.cost_usd || 0;
            return sum + (item.price_usd - cost) * item.quantity;
          }, 0);
          invProfitUsd = (itemsProfit && itemsProfit > 0) ? itemsProfit : Number(inv.total_usd) * 0.28;
        }
        grouped[d].profit += invProfitUsd;
      }
    });

    return Object.values(grouped).map(g => ({
      name: g.date,
      "المبيعات ($)": parseFloat(g.sales.toFixed(1)),
      "الأرباح ($)": parseFloat(g.profit.toFixed(1))
    }));
  }, [filteredInvoices, dateFrom, dateTo]);

  // B. Best sellers bar charting data
  const bestSellersData = useMemo(() => {
    const dict: { [key: string]: { name: string, qty: number, salesUsd: number } } = {};
    
    filteredInvoices.forEach(inv => {
      inv.items.forEach((item: any) => {
        if (!dict[item.product_id]) {
          dict[item.product_id] = { name: item.product_name, qty: 0, salesUsd: 0 };
        }
        dict[item.product_id].qty += Number(item.quantity);
        dict[item.product_id].salesUsd += Number(item.quantity) * Number(item.price_usd);
      });
    });

    return Object.values(dict)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
      .map(item => ({
        name: item.name.length > 15 ? item.name.slice(0, 15) + '..' : item.name,
        "الكمية المبيعة": parseFloat(item.qty.toFixed(1)),
        "إجمالي المبيعات ($)": parseFloat(item.salesUsd.toFixed(1))
      }));
  }, [filteredInvoices]);

  // C. CRM loyalty tiers analysis
  const customerLoyaltyTiers = useMemo(() => {
    const tiers: { [key: string]: { name: string, count: number, purchases: number } } = {
      platinum: { name: 'بلاتيني (نقاط +1000)', count: 0, purchases: 0 },
      gold: { name: 'ذهبي (نقاط +500)', count: 0, purchases: 0 },
      silver: { name: 'فضي (نقاط +200)', count: 0, purchases: 0 },
      bronze: { name: 'برونزي (نقاط أقل)', count: 0, purchases: 0 }
    };

    customers.forEach(c => {
      const tierKey = c.loyalty_tier || 'bronze';
      if (tierKey in tiers) {
        tiers[tierKey].count += 1;
        tiers[tierKey].purchases += Number(c.total_purchases_usd || 0);
      }
    });

    return Object.values(tiers);
  }, [customers]);

  // D. Profit margins list per product category
  const categoryMargins = useMemo(() => {
    const dict: { [key: string]: { sales: number, cost: number } } = {};
    
    filteredInvoices.forEach(inv => {
      inv.items.forEach((item: any) => {
        const prod = products.find(p => p.id === item.product_id);
        const category = prod ? prod.category : 'غذائيات';
        if (!dict[category]) {
          dict[category] = { sales: 0, cost: 0 };
        }
        const salesVal = Number(item.quantity) * Number(item.price_usd);
        const costVal = Number(item.quantity) * (prod ? Number(prod.cost_usd) : Number(item.price_usd) * 0.72);
        dict[category].sales += salesVal;
        dict[category].cost += costVal;
      });
    });

    return Object.entries(dict).map(([category, vals]) => {
      const profit = vals.sales - vals.cost;
      const margin = vals.sales > 0 ? Math.round((profit / vals.sales) * 100) : 0;
      return {
        category,
        salesUsd: vals.sales,
        profitUsd: profit,
        marginPercent: margin
      };
    });
  }, [filteredInvoices, products]);

  // E. Current month daily sales and profit trend
  const currentMonthSalesData = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    
    // Total days in the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dailyData: { [day: number]: { dayStr: string, sales: number, profit: number } } = {};
    
    // Seed days 1 to daysInMonth
    for (let day = 1; day <= daysInMonth; day++) {
      dailyData[day] = {
        dayStr: `${day}`,
        sales: 0,
        profit: 0
      };
    }
    
    // Filter invoices belonging to current month & year
    invoices.forEach(inv => {
      const invDate = new Date(inv.sale_date);
      if (invDate.getFullYear() === year && invDate.getMonth() === month) {
        const day = invDate.getDate();
        if (dailyData[day]) {
          dailyData[day].sales += Number(inv.total_usd);
          
          let invProfitUsd = 0;
          if (inv.profit_usd !== undefined && inv.profit_usd !== null) {
            invProfitUsd = Number(inv.profit_usd);
          } else {
            const itemsProfit = inv.items?.reduce((sum: number, item: any) => {
              const cost = item.cost_usd || 0;
              return sum + (item.price_usd - cost) * item.quantity;
            }, 0);
            invProfitUsd = (itemsProfit && itemsProfit > 0) ? itemsProfit : Number(inv.total_usd) * 0.28;
          }
          dailyData[day].profit += invProfitUsd;
        }
      }
    });
    
    return Object.keys(dailyData).map(day => {
      const d = Number(day);
      return {
        dayLabel: `${d}`,
        "المبيعات ($)": parseFloat(dailyData[d].sales.toFixed(1)),
        "الأرباح ($)": parseFloat(dailyData[d].profit.toFixed(1)),
        "المبيعات (ل.س)": Math.round(dailyData[d].sales * settings.usd_to_syp_rate),
        "الأرباح (ل.س)": Math.round(dailyData[d].profit * settings.usd_to_syp_rate),
      };
    });
  }, [invoices, settings]);

  // 3.5. DAILY CLOSE & ARCHIVE CALCULATIONS
  const todayDateStr = new Date().toISOString().split('T')[0];

  const todayInvoices = useMemo(() => {
    return invoices.filter(inv => inv.sale_date.startsWith(todayDateStr));
  }, [invoices, todayDateStr]);

  const todayExpenses = useMemo(() => {
    return expenses.filter(exp => exp.expense_date.startsWith(todayDateStr));
  }, [expenses, todayDateStr]);

  const todaySummary = useMemo(() => {
    const salesUsd = todayInvoices.reduce((acc, inv) => acc + Number(inv.total_usd), 0);
    const salesSyp = todayInvoices.reduce((acc, inv) => acc + Number(inv.total_syp), 0);
    
    const profitUsd = todayInvoices.reduce((acc, inv) => {
      if (inv.profit_usd !== undefined && inv.profit_usd !== null) {
        return acc + Number(inv.profit_usd);
      }
      const itemsProfit = inv.items?.reduce((sum: number, item: any) => {
        const cost = item.cost_usd || 0;
        return sum + (item.price_usd - cost) * item.quantity;
      }, 0);
      if (itemsProfit && itemsProfit > 0) return acc + itemsProfit;
      return acc + Number(inv.total_usd) * 0.28;
    }, 0);

    const profitSyp = todayInvoices.reduce((acc, inv) => {
      if (inv.profit_syp !== undefined && inv.profit_syp !== null) {
        return acc + Number(inv.profit_syp);
      }
      const pUsd = inv.profit_usd || inv.items?.reduce((sum: number, item: any) => {
        const cost = item.cost_usd || 0;
        return sum + (item.price_usd - cost) * item.quantity;
      }, 0) || (Number(inv.total_usd) * 0.28);
      return acc + Math.round(pUsd * settings.usd_to_syp_rate);
    }, 0);

    const expensesUsd = todayExpenses.reduce((acc, exp) => acc + Number(exp.amount_usd), 0);
    const expensesSyp = todayExpenses.reduce((acc, exp) => acc + Number(exp.amount_syp), 0);

    const netProfitUsd = profitUsd - expensesUsd;
    const netProfitSyp = profitSyp - expensesSyp;

    // Aggregate sold items
    const itemsMap: Record<string, { name: string, quantity: number, totalUsd: number, totalSyp: number, profitUsd: number }> = {};
    todayInvoices.forEach(inv => {
      inv.items.forEach((item: any) => {
        const key = item.product_id || item.product_name;
        const prod = products.find(p => p.id === item.product_id);
        const cost = prod ? prod.cost_usd : (item.cost_usd || 0);
        const itemProfitUsd = (item.price_usd - cost) * item.quantity;

        if (itemsMap[key]) {
          itemsMap[key].quantity += item.quantity;
          itemsMap[key].totalUsd += item.quantity * item.price_usd;
          itemsMap[key].totalSyp += item.quantity * (item.price_syp || item.price_usd * settings.usd_to_syp_rate);
          itemsMap[key].profitUsd += itemProfitUsd;
        } else {
          itemsMap[key] = {
            name: item.product_name,
            quantity: item.quantity,
            totalUsd: item.quantity * item.price_usd,
            totalSyp: item.quantity * (item.price_syp || item.price_usd * settings.usd_to_syp_rate),
            profitUsd: itemProfitUsd
          };
        }
      });
    });

    return {
      salesUsd,
      salesSyp,
      profitUsd,
      profitSyp,
      expensesUsd,
      expensesSyp,
      netProfitUsd,
      netProfitSyp,
      invoicesCount: todayInvoices.length,
      soldItems: Object.values(itemsMap)
    };
  }, [todayInvoices, todayExpenses, products, settings]);

  const handleArchiveToday = () => {
    if (dailyClosings.some(c => c.date === todayDateStr)) {
      toast.warning('تمت أرشفة يومية اليوم مسبقاً! يمكنك حذف الأرشفة السابقة لإعادتها.');
      return;
    }

    const newClosing = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      date: todayDateStr,
      salesUsd: todaySummary.salesUsd,
      salesSyp: todaySummary.salesSyp,
      profitUsd: todaySummary.profitUsd,
      profitSyp: todaySummary.profitSyp,
      expensesUsd: todaySummary.expensesUsd,
      expensesSyp: todaySummary.expensesSyp,
      netProfitUsd: todaySummary.netProfitUsd,
      netProfitSyp: todaySummary.netProfitSyp,
      invoicesCount: todaySummary.invoicesCount,
      exchangeRate: settings.usd_to_syp_rate,
      soldItems: todaySummary.soldItems,
      archivedAt: new Date().toISOString()
    };

    const updated = [newClosing, ...dailyClosings];
    setDailyClosings(updated);
    localStorage.setItem('store_daily_closings', JSON.stringify(updated));
    toast.success('تم إغلاق وحفظ يومية اليوم بنجاح وأرشفتها بالتفاصيل الكاملة!');
  };

  const handleDeleteClosing = (id: string) => {
    const updated = dailyClosings.filter(c => c.id !== id);
    setDailyClosings(updated);
    localStorage.setItem('store_daily_closings', JSON.stringify(updated));
    toast.success('تم حذف سجل اليومية المؤرشفة بنجاح.');
  };

  // 4. EXPORT HANDLERS
  const exportCSV = (dataType: 'sales' | 'invoices') => {
    let headers = '';
    let rows = '';

    if (dataType === 'sales') {
      headers = 'InvoiceID,ProductID,ProductName,Quantity,UnitPriceUSD,TotalSalesUSD,Date\n';
      const itemsList: any[] = [];
      filteredInvoices.forEach(inv => {
        inv.items.forEach((it: any) => {
          itemsList.push({
            invId: inv.id,
            prodId: it.product_id,
            prodName: it.product_name,
            qty: it.quantity,
            price: it.price_usd,
            total: Number(it.quantity) * Number(it.price_usd),
            date: inv.sale_date
          });
        });
      });

      rows = itemsList.map(s => 
        `"${s.invId}","${s.prodId}","${s.prodName}",${s.qty},${s.price},${s.total},"${s.date}"`
      ).join('\n');
    } else {
      headers = 'InvoiceID,InvoiceNumber,CustomerName,TotalUSD,TotalSYP,PaymentMethod,PaidUSD,Date\n';
      rows = filteredInvoices.map(inv => 
        `"${inv.id}","${inv.invoice_number}","${inv.customer_name}",${inv.total_usd},${inv.total_syp},"${inv.payment_method}",${inv.paid_usd},"${inv.sale_date}"`
      ).join('\n');
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `تقرير_مبيعات_${dataType}_${dateFrom}_إلى_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingProducts || loadingCustomers || loadingSales || loadingSettings || loadingExpenses) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 text-right" dir="rtl" id="reports-workspace">
      
      {/* Top Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-2xl">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-400 animate-pulse" />
            <span>التقارير التحليلية والذكاء المالي</span>
          </h2>
          <p className="text-slate-400 text-xs font-semibold mt-1">تحليلات المبيعات، الأرباح التراكمية، أداء تصنيفات المستودع، وبرامج ولاء العملاء</p>
        </div>
        
        {/* Export triggers */}
        <div className="flex gap-2 shrink-0 w-full sm:w-auto font-black text-xs">
          <button
            onClick={() => exportCSV('sales')}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-slate-750 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            تصدير الأصناف CSV
          </button>
          <button
            onClick={() => exportCSV('invoices')}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-slate-750 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            تصدير الفواتير CSV
          </button>
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-505 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            طباعة كشف PDF
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-2 md:grid-cols-6 gap-4 text-right font-bold text-slate-300" id="reports-advanced-filters">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">من تاريخ</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-800 border border-slate-750 rounded-xl p-2.5 font-bold text-xs text-slate-100"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-800 border border-slate-750 rounded-xl p-2.5 font-bold text-xs text-slate-100"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">حسب صنف مستهدف</label>
          <select
            value={targetProduct}
            onChange={(e) => setTargetProduct(e.target.value)}
            className="w-full bg-slate-800 border border-slate-750 rounded-xl p-2.5 font-bold text-xs text-slate-300 text-right cursor-pointer"
          >
            <option value="">جميع الأصناف</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">زبون مستهدف</label>
          <select
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
            className="w-full bg-slate-800 border border-slate-750 rounded-xl p-2.5 font-bold text-xs text-slate-300 text-right cursor-pointer"
          >
            <option value="">جميع الزبائن</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">تصنيف البضاعة</label>
          <select
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value)}
            className="w-full bg-slate-800 border border-slate-750 rounded-xl p-2.5 font-bold text-xs text-slate-300 text-right cursor-pointer"
          >
            <option value="">جميع التصنيفات</option>
            {categoriesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">طريقة السداد</label>
          <select
            value={targetPayment}
            onChange={(e) => setTargetPayment(e.target.value)}
            className="w-full bg-slate-800 border border-slate-750 rounded-xl p-2.5 font-bold text-xs text-slate-300 text-right cursor-pointer"
          >
            <option value="">كل الطرق</option>
            <option value="cash">نقداً</option>
            <option value="debt">ذمم ديون</option>
            <option value="partial">دفع جزئي</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="reports-kpis-grid">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl"><DollarSign className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">إجمالي الإيرادات للفترة</span>
            <span className="text-base font-black text-slate-100 block font-mono">${financeKPIs.revenueUsd.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-indigo-400 font-mono">≈ {financeKPIs.revenueSyp.toLocaleString()} ل.س</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl"><Coins className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">صافي أرباح الفترة</span>
            <span className="text-base font-black text-emerald-400 block font-mono">${financeKPIs.profitUsd.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-emerald-400 font-mono">≈ {financeKPIs.profitSyp.toLocaleString()} ل.س</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl"><Percent className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">الخصومات الممنوحة</span>
            <span className="text-base font-black text-rose-400 block font-mono">{financeKPIs.totalDiscountSyp.toLocaleString()} ل.س</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">≈ ${financeKPIs.totalDiscountUsd.toFixed(1)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl"><ShoppingCart className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">الكمية الإجمالية المبيعة</span>
            <span className="text-base font-black text-slate-100 block font-mono">{financeKPIs.totalQtySold.toFixed(1)} وحدة</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl"><Users className="w-5 h-5" /></div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">متوسط الفاتورة الصادرة</span>
            <span className="text-base font-black text-slate-100 block font-mono">${financeKPIs.averageTicketUsd.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-indigo-400 font-mono">≈ {financeKPIs.averageTicketSyp.toLocaleString()} ل.س</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full bg-slate-950 p-1 rounded-xl font-bold text-xs">
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-2.5 rounded-lg transition cursor-pointer ${activeTab === 'trends' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            📊 المبيعات والنمو
          </button>
          <button
            onClick={() => setActiveTab('bestsellers')}
            className={`py-2.5 rounded-lg transition cursor-pointer ${activeTab === 'bestsellers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            🏆 الأصناف الأكثر مبيعاً
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`py-2.5 rounded-lg transition cursor-pointer ${activeTab === 'customers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            👥 مستويات ولاء العملاء
          </button>
          <button
            onClick={() => setActiveTab('margins')}
            className={`py-2.5 rounded-lg transition cursor-pointer ${activeTab === 'margins' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            💰 أرباح الأقسام
          </button>
          <button
            onClick={() => setActiveTab('daily_archive')}
            className={`py-2.5 rounded-lg transition cursor-pointer ${activeTab === 'daily_archive' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-900'}`}
          >
            🗄️ الأرشيف واليومية اليومية
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="reports-active-tab-panel">
        
        {/* Trends */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850/60 space-y-4">
              <h3 className="text-sm font-black text-slate-100">📈 تحليل الإيرادات التراكمية وصافي الأرباح بالفترة المحددة بالدولار ($)</h3>
              <div className="h-80 w-full">
                {filteredInvoices.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-slate-500 font-bold">
                    <Inbox className="w-12 h-12 opacity-30 mb-2" />
                    لا توجد بيانات كافية بالفترة المختارة
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ direction: 'rtl', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="المبيعات ($)" stroke="#6366f1" strokeWidth={3} name="إجمالي الإيرادات ($)" />
                      <Line type="monotone" dataKey="الأرباح ($)" stroke="#10b981" strokeWidth={3} name="صافي الأرباح المقدرة ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* New Line Chart: Daily Sales Trend during Current Month */}
            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850/60 space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="text-right">
                  <h3 className="text-sm font-black text-slate-100">📅 اتجاه المبيعات اليومية والأرباح خلال الشهر الحالي</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">يعرض تطور المبيعات والأرباح يوماً بيوم طيلة أيام الشهر الجاري</p>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-[10px] px-3 py-1 rounded-full font-mono">
                  {new Date().toLocaleString('ar-SY', { month: 'long', year: 'numeric' })}
                </div>
              </div>
              
              <div className="h-80 w-full">
                {invoices.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-slate-500 font-bold">
                    <Inbox className="w-12 h-12 opacity-30 mb-2" />
                    لا توجد فواتير مبيعات مسجلة حتى الآن
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentMonthSalesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={9} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ direction: 'rtl', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }}
                        formatter={(value, name) => {
                          if (typeof value === 'number') {
                            if (name.toString().includes('ل.س')) {
                              return [`${value.toLocaleString()} ل.س`, name];
                            }
                            return [`$${value.toFixed(1)}`, name];
                          }
                          return [value, name];
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="المبيعات ($)" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} name="المبيعات ($)" />
                      <Line type="monotone" dataKey="الأرباح ($)" stroke="#059669" strokeWidth={3} name="الأرباح ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bestsellers */}
        {activeTab === 'bestsellers' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-100">الأصناف الـ 10 الأكثر طلباً وتحقيقاً للمبيعات</h3>
            <div className="h-80 w-full">
              {bestSellersData.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-slate-500 font-bold">
                  <Inbox className="w-12 h-12 opacity-30 mb-2" />
                  لا توجد مبيعات في الفترة المختارة
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bestSellersData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ direction: 'rtl', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="الكمية المبيعة" fill="#f59e0b" radius={[4, 4, 0, 0]} name="الكمية الإجمالية المبيعة" />
                    <Bar dataKey="إجمالي المبيعات ($)" fill="#6366f1" radius={[4, 4, 0, 0]} name="قيمة المبيعات الإجمالية ($)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Loyalty */}
        {activeTab === 'customers' && (
          <div className="space-y-4 font-bold text-xs">
            <h3 className="text-sm font-black text-slate-100">توزيع الزبائن المسجلين حسب كشف الولاء</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                {customerLoyaltyTiers.map((tier, idx) => (
                  <div key={idx} className="bg-slate-950 rounded-xl p-4 border border-slate-850 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500/10 text-amber-400 p-2 rounded-xl">
                        <Award className="w-5 h-5 animate-bounce" />
                      </div>
                      <div>
                        <span className="text-slate-100 block text-xs">{tier.name}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{tier.count} زبائن</span>
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-slate-500 text-[10px] block">المشتريات الإجمالية</span>
                      <span className="text-emerald-400 text-sm block mt-0.5">${tier.purchases.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-5 text-indigo-200 leading-relaxed space-y-3">
                <h4 className="font-black text-xs text-indigo-400">💡 نظام مستويات النقاط</h4>
                <p className="text-[11px] text-slate-400">
                  يمنح كاشير دمشق نقاط ولاء تلقائية لكل عميل عند الفواتير المنجزة بمعدل 10 نقاط لكل دولار. الترقية آلية تضمن تطبيق خصومات فورية ونسب مرنة عبر نقاط البيع المباشرة والخصومات الإضافية.
                </p>
                <div className="text-[11px] bg-slate-950/60 p-3 rounded-lg space-y-1 text-indigo-400/80 font-mono">
                  <div>- البرونزي: 0 - 199 نقطة</div>
                  <div>- الفضي: 200 - 499 نقطة</div>
                  <div>- الذهبي: 500 - 999 نقطة</div>
                  <div>- البلاتيني: 1000+ نقطة</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Margins */}
        {activeTab === 'margins' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-100">هوامش أرباح السلع مقسمة حسب التصنيفات</h3>
            {categoryMargins.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-bold">لا يوجد مبيعات كافية في الفترة الحالية</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {categoryMargins.map((item, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col justify-between h-36 font-bold">
                    <div className="flex justify-between items-center">
                      <span className="bg-purple-500/10 text-purple-400 text-xs px-2.5 py-0.5 rounded-full border border-purple-500/15">{item.category}</span>
                      <span className="text-emerald-400 text-xs font-black">هامش {item.marginPercent}%</span>
                    </div>
                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">إجمالي مبيعات القسم</span>
                        <span className="text-sm font-extrabold text-slate-100 block mt-1 font-mono">${item.salesUsd.toFixed(1)}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-slate-500 block">صافي ربح المقسم</span>
                        <span className="text-xs font-extrabold text-indigo-400 block mt-1 font-mono">${item.profitUsd.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Daily Archive */}
        {activeTab === 'daily_archive' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-400" />
                <span>أرشفة ومطابقة الحسابات اليومية (كليوم بيومه)</span>
              </h3>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-extrabold px-3 py-1 rounded-full border border-indigo-500/15">تاريخ اليوم الحقيقي: {todayDateStr}</span>
            </div>

            {/* Current Day Status Card */}
            <div className="bg-gradient-to-br from-slate-950 to-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-4">
                <div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 font-black px-2.5 py-1 rounded-full border border-amber-500/15">مفتوحة حالياً (قيد التشغيل)</span>
                  <h4 className="text-sm font-black text-slate-100 mt-2">بيان يومية اليوم المالي المجمّع بالوقت الحقيقي</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">يتضمن كامل فواتير البيع ومصاريف المحل المسجلة بتاريخ اليوم</p>
                </div>

                <button
                  type="button"
                  onClick={handleArchiveToday}
                  disabled={todaySummary.invoicesCount === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg cursor-pointer ${
                    todaySummary.invoicesCount === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white animate-pulse border border-indigo-400/20'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد إغلاق وأرشفة يومية اليوم</span>
                </button>
              </div>

              {/* Today stats summary boxes */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-3">
                  <span className="text-[10px] text-slate-500 font-extrabold block">إجمالي مبيعات اليوم</span>
                  <span className="text-sm font-black text-slate-100 block mt-1 font-mono">${todaySummary.salesUsd.toFixed(2)}</span>
                  <span className="text-[9px] text-indigo-400 font-bold font-mono">≈ {todaySummary.salesSyp.toLocaleString()} ل.س</span>
                </div>

                <div className="bg-slate-900 border border-slate-850 rounded-xl p-3">
                  <span className="text-[10px] text-slate-500 font-extrabold block">صافي أرباح المنتجات</span>
                  <span className="text-sm font-black text-emerald-400 block mt-1 font-mono">${todaySummary.profitUsd.toFixed(2)}</span>
                  <span className="text-[9px] text-emerald-400 font-bold font-mono">≈ {todaySummary.profitSyp.toLocaleString()} ل.س</span>
                </div>

                <div className="bg-slate-900 border border-slate-850 rounded-xl p-3">
                  <span className="text-[10px] text-slate-500 font-extrabold block">مصروف المحل اليوم</span>
                  <span className="text-sm font-black text-rose-400 block mt-1 font-mono">${todaySummary.expensesUsd.toFixed(2)}</span>
                  <span className="text-[9px] text-rose-400 font-bold font-mono">≈ {todaySummary.expensesSyp.toLocaleString()} ل.س</span>
                </div>

                <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-3 bg-indigo-500/5">
                  <span className="text-[10px] text-indigo-300 font-extrabold block">صافي الربح الفعلي بعد المصاريف</span>
                  <span className={`text-sm font-black block mt-1 font-mono ${todaySummary.netProfitUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${todaySummary.netProfitUsd.toFixed(2)}
                  </span>
                  <span className={`text-[9px] font-bold font-mono ${todaySummary.netProfitUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ≈ {todaySummary.netProfitSyp.toLocaleString()} ل.س
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 font-extrabold block">فواتير اليوم</span>
                  <span className="text-sm font-black text-indigo-400 block mt-1 font-mono">{todaySummary.invoicesCount} فواتير</span>
                </div>
              </div>

              {/* Today's sold items list */}
              <div className="space-y-2.5">
                <span className="text-xs font-black text-slate-300 block">قائمة البضائع والأصناف المباعة اليوم بالتفصيل:</span>
                {todaySummary.soldItems.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-bold bg-slate-900/60 rounded-xl border border-slate-850">
                    لا توجد بضاعة مبيعة مسجلة حتى اللحظة لليوم
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/40">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-850 font-bold">
                          <th className="p-2.5">اسم الصنف المنتج</th>
                          <th className="p-2.5 text-center">الكمية المباعة</th>
                          <th className="p-2.5 text-center">قيمة المبيعات ($)</th>
                          <th className="p-2.5 text-center">قيمة المبيعات (ل.س)</th>
                          <th className="p-2.5 text-center">صافي الربح المقدر ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 font-medium text-slate-200">
                        {todaySummary.soldItems.map((it: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="p-2.5 font-bold text-slate-200">{it.name}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-amber-400">{it.quantity}</td>
                            <td className="p-2.5 text-center font-mono">${it.totalUsd.toFixed(2)}</td>
                            <td className="p-2.5 text-center font-mono text-slate-400">{Math.round(it.totalSyp).toLocaleString()} ل.س</td>
                            <td className="p-2.5 text-center font-mono text-emerald-400 font-bold">${it.profitUsd.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Saved Archived Days Table */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-200 flex items-center gap-1.5 mt-4">
                <span>سجلات اليوميات والبيانات المؤرشفة سابقاً</span>
                <span className="text-xs bg-slate-850 text-slate-400 font-bold px-2.5 py-0.5 rounded-full font-mono">{dailyClosings.length} أيام محفوظة</span>
              </h4>

              {dailyClosings.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-bold bg-slate-950 border border-slate-850 rounded-2xl">
                  <Archive className="w-12 h-12 opacity-20 mx-auto mb-2" />
                  لم يتم أرشفة أي يومية بعد. اضغط على زر الأرشفة بالأعلى لحفظ حسابات اليوم.
                </div>
              ) : (
                <div className="border border-slate-850 rounded-2xl bg-slate-950 overflow-hidden shadow-xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-850 font-bold">
                        <th className="p-3">تاريخ اليومية</th>
                        <th className="p-3 text-center">الفواتير</th>
                        <th className="p-3 text-center">المبيعات ($)</th>
                        <th className="p-3 text-center">المبيعات (ل.س)</th>
                        <th className="p-3 text-center">أرباح المنتجات</th>
                        <th className="p-3 text-center">المصاريف</th>
                        <th className="p-3 text-center">صافي الأرباح الفعلي</th>
                        <th className="p-3 text-center">سعر الصرف</th>
                        <th className="p-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60 font-semibold text-slate-300">
                      {dailyClosings.map((c: any) => {
                        const isExpanded = expandedClosingId === c.id;
                        return (
                          <React.Fragment key={c.id}>
                            <tr className="hover:bg-slate-900/30">
                              <td className="p-3 font-bold text-slate-200">{c.date}</td>
                              <td className="p-3 text-center font-mono">{c.invoicesCount}</td>
                              <td className="p-3 text-center font-mono text-slate-100">${c.salesUsd.toFixed(2)}</td>
                              <td className="p-3 text-center font-mono text-slate-400">{Math.round(c.salesSyp).toLocaleString()} ل.س</td>
                              <td className="p-3 text-center font-mono text-emerald-400">${c.profitUsd.toFixed(2)}</td>
                              <td className="p-3 text-center font-mono text-rose-400">${c.expensesUsd.toFixed(2)}</td>
                              <td className="p-3 text-center font-mono">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-black ${c.netProfitUsd >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-rose-500/10 text-rose-400 border border-rose-500/15'}`}>
                                  ${c.netProfitUsd.toFixed(2)}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono text-amber-500 font-bold">{c.exchangeRate.toLocaleString()} ل.س</td>
                              <td className="p-3 text-center">
                                <div className="flex gap-1.5 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedClosingId(isExpanded ? null : c.id)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg border border-slate-700/60 transition cursor-pointer"
                                    title="عرض التفاصيل والأصناف المباعة"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClosing(c.id)}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/15 transition cursor-pointer"
                                    title="حذف الأرشيف"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Expanded sub-table showing sold items for archived day */}
                            {isExpanded && (
                              <tr className="bg-slate-900/60 border-l-4 border-indigo-500">
                                <td colSpan={9} className="p-4 bg-slate-950/40">
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                                      <span className="text-[11px] font-black text-indigo-400">تفاصيل المبيعات والأصناف المباعة ليوم {c.date}</span>
                                      <span className="text-[10px] text-slate-500 font-bold">تاريخ وموقت الحفظ: {new Date(c.archivedAt).toLocaleString('ar-SY')}</span>
                                    </div>
                                    
                                    {(!c.soldItems || c.soldItems.length === 0) ? (
                                      <div className="text-center py-2 text-slate-500 text-xs">لا توجد بيانات أصناف محفوظة لهذا اليوم</div>
                                    ) : (
                                      <div className="overflow-x-auto border border-slate-850/60 rounded-xl bg-slate-950">
                                        <table className="w-full text-right text-xs">
                                          <thead>
                                            <tr className="bg-slate-900 text-slate-400 border-b border-slate-850 font-bold">
                                              <th className="p-2">اسم الصنف</th>
                                              <th className="p-2 text-center">الكمية المباعة</th>
                                              <th className="p-2 text-center">المبيعات ($)</th>
                                              <th className="p-2 text-center">المبيعات (ل.س)</th>
                                              <th className="p-2 text-center">الأرباح المقدرة ($)</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-850/60 text-slate-300">
                                            {c.soldItems.map((sit: any, sIdx: number) => (
                                              <tr key={sIdx} className="hover:bg-slate-900/20 font-medium">
                                                <td className="p-2 font-bold text-slate-200">{sit.name}</td>
                                                <td className="p-2 text-center font-mono text-amber-400 font-black">{sit.quantity}</td>
                                                <td className="p-2 text-center font-mono">${sit.totalUsd.toFixed(2)}</td>
                                                <td className="p-2 text-center font-mono text-slate-400">{Math.round(sit.totalSyp).toLocaleString()} ل.س</td>
                                                <td className="p-2 text-center font-mono text-emerald-400 font-bold">${sit.profitUsd.toFixed(2)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
