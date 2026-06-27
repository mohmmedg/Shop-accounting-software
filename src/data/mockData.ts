/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Product,
  Customer,
  Supplier,
  Employee,
  Expense,
  Discount,
  Settings,
  Invoice,
  Sale,
  Attendance,
  CashRegister,
  InventoryMovement
} from '../types';

export const initialSettings: Settings = {
  usd_to_syp_rate: 15000,
  store_name: "ALkhal",
  store_phone: "0933123456",
  default_warning_limit: 10
};

export const initialProducts: Product[] = [
  {
    id: "prod-1",
    name: "رز مصري نخب أول (كيلو)",
    barcode: "6211234560012",
    category: "غذائيات",
    image_url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150&q=80",
    price_usd: 1.2,
    price_syp: 18000,
    cost_usd: 0.9,
    quantity: 45,
    warning_limit: 15,
    sold_by_weight: false,
    sale_type: 'piece',
    price_tiers: { wholesale_usd: 1.1, vip_usd: 1.15 }
  },
  {
    id: "prod-2",
    name: "سكر أبيض ميزان (كيلو)",
    barcode: "6211234560029",
    category: "غذائيات",
    image_url: "https://images.unsplash.com/photo-1622484211148-717e0741cfb1?w=150&q=80",
    price_usd: 0.8,
    price_syp: 12000,
    cost_usd: 0.6,
    quantity: 120,
    warning_limit: 20,
    sold_by_weight: true,
    sale_type: 'weight',
    price_per_kg: 0.8,
    stock_grams: 120000,
    price_tiers: { wholesale_usd: 0.72, vip_usd: 0.75 }
  },
  {
    id: "prod-3",
    name: "زيت دوار الشمس ليزا (1 لتر)",
    barcode: "6211234560036",
    category: "زيوت وسمنة",
    image_url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&q=80",
    price_usd: 2.5,
    price_syp: 37500,
    cost_usd: 2.0,
    quantity: 8, // Low Stock!
    warning_limit: 10,
    sold_by_weight: false,
    price_tiers: { wholesale_usd: 2.3, vip_usd: 2.4 }
  },
  {
    id: "prod-4",
    name: "قهوة حموي بالهيل (200غ)",
    barcode: "6211234560043",
    category: "مشروبات",
    image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&q=80",
    price_usd: 3.2,
    price_syp: 48000,
    cost_usd: 2.4,
    quantity: 35,
    warning_limit: 8,
    sold_by_weight: false,
    price_tiers: { wholesale_usd: 2.9, vip_usd: 3.0 }
  },
  {
    id: "prod-5",
    name: "شاي سيلاني غزال فرط (400غ)",
    barcode: "6211234560050",
    category: "مشروبات",
    image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=150&q=80",
    price_usd: 4.5,
    price_syp: 67500,
    cost_usd: 3.5,
    quantity: 18,
    warning_limit: 5,
    sold_by_weight: false,
    price_tiers: { wholesale_usd: 4.1, vip_usd: 4.3 }
  },
  {
    id: "prod-6",
    name: "سائل جلي نورا بالليمون (1 لتر)",
    barcode: "6211234560067",
    category: "منظفات",
    image_url: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=150&q=80",
    price_usd: 1.5,
    price_syp: 22500,
    cost_usd: 1.1,
    quantity: 4, // Low Stock!
    warning_limit: 8,
    sold_by_weight: false,
    price_tiers: { wholesale_usd: 1.35, vip_usd: 1.4 }
  },
  {
    id: "prod-7",
    name: "جبنة قشقوان حماة (بالوزن)",
    barcode: "6211234560074",
    category: "أجبان وألبان",
    image_url: "https://images.unsplash.com/photo-1486887396153-fa416525c308?w=150&q=80",
    price_usd: 7.5,
    price_syp: 112500,
    cost_usd: 5.8,
    quantity: 25.5, // 25.5 kilograms
    warning_limit: 10,
    sold_by_weight: true,
    sale_type: 'weight',
    price_per_kg: 7.5,
    stock_grams: 25500,
    price_tiers: { wholesale_usd: 6.9, vip_usd: 7.2 }
  },
  {
    id: "prod-8",
    name: "تمر خضري ممتاز (1 كغ)",
    barcode: "6211234560081",
    category: "غذائيات",
    image_url: "https://images.unsplash.com/photo-1569870499705-504209102bd6?w=150&q=80",
    price_usd: 5.0,
    price_syp: 75000,
    cost_usd: 3.8,
    quantity: 0, // Out of stock!
    warning_limit: 5,
    sold_by_weight: false,
    price_tiers: { wholesale_usd: 4.5, vip_usd: 4.7 }
  }
];

export const initialCustomers: Customer[] = [
  {
    id: "cust-1",
    name: "أبو أحمد الكرز",
    phone: "0944111222",
    email: "abou.ahmad@example.com",
    address: "دمشق - الميدان",
    customer_type: "wholesale",
    total_purchases_usd: 450.50,
    loyalty_points: 450,
    loyalty_tier: "gold"
  },
  {
    id: "cust-2",
    name: "د. رانيا الحلبي",
    phone: "0955333444",
    email: "rania.halabi@example.com",
    address: "دمشق - أبو رمانة",
    customer_type: "vip",
    total_purchases_usd: 980.00,
    loyalty_points: 980,
    loyalty_tier: "platinum"
  },
  {
    id: "cust-3",
    name: "محمد المصري",
    phone: "0966555666",
    email: "m.masri@example.com",
    address: "دمشق - الشعلان",
    customer_type: "retail",
    total_purchases_usd: 85.00,
    loyalty_points: 85,
    loyalty_tier: "bronze"
  },
  {
    id: "cust-4",
    name: "محلات الورد التجاري",
    phone: "0988777888",
    email: "alward.store@example.com",
    address: "ريف دمشق - جرمانا",
    customer_type: "wholesale",
    total_purchases_usd: 120.00,
    loyalty_points: 120,
    loyalty_tier: "silver"
  }
];

export const initialSuppliers: Supplier[] = [
  {
    id: "supp-1",
    name: "شركة ديركي للزيوت والمنظفات",
    phone: "011-881122",
    email: "info@derki-co.com",
    address: "المنطقة الصناعية - عدرا",
    rating: 5,
    total_purchases_usd: 1500.00,
    notes: "المورد الرئيسي لزيت دوار الشمس وسوائل التنظيف. تسليم سريع وملتزم."
  },
  {
    id: "supp-2",
    name: "مستودعات الغزال للمواد الغذائية",
    phone: "011-443322",
    email: "ghazal.food@example.com",
    address: "دمشق - البزورية",
    rating: 4,
    total_purchases_usd: 3400.00,
    notes: "شاي، سكر، رز، وبقوليات بجودة ممتازة."
  }
];

export const initialEmployees: Employee[] = [
  {
    id: "emp-1",
    name: "جمال المالح",
    phone: "0991122334",
    position: "admin",
    salary: 400, // in USD
    commission_rate: 0,
    total_sales_usd: 1200,
    hire_date: "2025-01-15",
    is_active: true,
    pin_code: "1234"
  },
  {
    id: "emp-2",
    name: "سحر الورد",
    phone: "0994455667",
    position: "cashier",
    salary: 250,
    commission_rate: 1.5, // 1.5% commission
    total_sales_usd: 3500,
    hire_date: "2025-03-01",
    is_active: true,
    pin_code: "1234"
  },
  {
    id: "emp-3",
    name: "سامر حارس",
    phone: "0993344556",
    position: "storekeeper",
    salary: 220,
    commission_rate: 0,
    total_sales_usd: 0,
    hire_date: "2025-02-10",
    is_active: true,
    pin_code: "1234"
  }
];

// Seed 7 days of sales for realistic charts
// Today is 2026-06-24
export const initialInvoices: Invoice[] = [
  {
    id: "inv-1",
    invoice_number: "INV-2026-0001",
    customer_id: "cust-1",
    customer_name: "أبو أحمد الكرز",
    items: [
      { product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", quantity: 20, price_usd: 1.1, price_syp: 16500, is_weight: false },
      { product_id: "prod-2", product_name: "سكر أبيض ميزان (كيلو)", quantity: 30, price_usd: 0.72, price_syp: 10800, is_weight: true }
    ],
    total_usd: 43.6,
    total_syp: 654000,
    payment_method: "cash",
    paid_usd: 43.6,
    paid_syp: 654000,
    remaining_debt_usd: 0,
    remaining_debt_syp: 0,
    sale_date: "2026-06-18T14:30:00"
  },
  {
    id: "inv-2",
    invoice_number: "INV-2026-0002",
    customer_id: "cust-2",
    customer_name: "د. رانيا الحلبي",
    items: [
      { product_id: "prod-4", product_name: "قهوة حموي بالهيل (200غ)", quantity: 5, price_usd: 3.0, price_syp: 45000, is_weight: false },
      { product_id: "prod-5", product_name: "شاي سيلاني غزال فرط (400غ)", quantity: 3, price_usd: 4.3, price_syp: 64500, is_weight: false },
      { product_id: "prod-7", product_name: "جبنة قشقوان حماة (بالوزن)", quantity: 1.5, price_usd: 7.2, price_syp: 108000, is_weight: true }
    ],
    total_usd: 38.7,
    total_syp: 580500,
    payment_method: "cash",
    paid_usd: 38.7,
    paid_syp: 580500,
    remaining_debt_usd: 0,
    remaining_debt_syp: 0,
    sale_date: "2026-06-19T11:15:00"
  },
  {
    id: "inv-3",
    invoice_number: "INV-2026-0003",
    customer_id: "cust-3",
    customer_name: "محمد المصري",
    items: [
      { product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", quantity: 5, price_usd: 1.2, price_syp: 18000, is_weight: false },
      { product_id: "prod-3", product_name: "زيت دوار الشمس ليزا (1 لتر)", quantity: 4, price_usd: 2.5, price_syp: 37500, is_weight: false }
    ],
    total_usd: 16.0,
    total_syp: 240000,
    payment_method: "debt",
    paid_usd: 0,
    paid_syp: 0,
    remaining_debt_usd: 16.0,
    remaining_debt_syp: 240000,
    sale_date: "2026-06-20T17:45:00"
  },
  {
    id: "inv-4",
    invoice_number: "INV-2026-0004",
    customer_id: "cust-1",
    customer_name: "أبو أحمد الكرز",
    items: [
      { product_id: "prod-2", product_name: "سكر أبيض ميزان (كيلو)", quantity: 50, price_usd: 0.72, price_syp: 10800, is_weight: true },
      { product_id: "prod-7", product_name: "جبنة قشقوان حماة (بالوزن)", quantity: 4.0, price_usd: 6.9, price_syp: 103500, is_weight: true }
    ],
    total_usd: 63.6,
    total_syp: 954000,
    payment_method: "partial",
    paid_usd: 30.0,
    paid_syp: 450000,
    remaining_debt_usd: 33.6,
    remaining_debt_syp: 504000,
    sale_date: "2026-06-21T10:00:00"
  },
  {
    id: "inv-5",
    invoice_number: "INV-2026-0005",
    customer_id: "cust-2",
    customer_name: "د. رانيا الحلبي",
    items: [
      { product_id: "prod-4", product_name: "قهوة حموي بالهيل (200غ)", quantity: 10, price_usd: 3.0, price_syp: 45000, is_weight: false },
      { product_id: "prod-5", product_name: "شاي سيلاني غزال فرط (400غ)", quantity: 5, price_usd: 4.3, price_syp: 64500, is_weight: false }
    ],
    total_usd: 51.5,
    total_syp: 772500,
    payment_method: "cash",
    paid_usd: 51.5,
    paid_syp: 772500,
    remaining_debt_usd: 0,
    remaining_debt_syp: 0,
    sale_date: "2026-06-22T12:20:00"
  },
  {
    id: "inv-6",
    invoice_number: "INV-2026-0006",
    customer_id: null,
    customer_name: "عميل نقدي",
    items: [
      { product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", quantity: 3, price_usd: 1.2, price_syp: 18000, is_weight: false },
      { product_id: "prod-6", product_name: "سائل جلي نورا بالليمون (1 لتر)", quantity: 2, price_usd: 1.5, price_syp: 22500, is_weight: false }
    ],
    total_usd: 6.6,
    total_syp: 99000,
    payment_method: "cash",
    paid_usd: 6.6,
    paid_syp: 99000,
    remaining_debt_usd: 0,
    remaining_debt_syp: 0,
    sale_date: "2026-06-23T18:10:00"
  },
  // Today's early sales (2026-06-24)
  {
    id: "inv-7",
    invoice_number: "INV-2026-0007",
    customer_id: "cust-3",
    customer_name: "محمد المصري",
    items: [
      { product_id: "prod-4", product_name: "قهوة حموي بالهيل (200غ)", quantity: 2, price_usd: 3.2, price_syp: 48000, is_weight: false },
      { product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", quantity: 10, price_usd: 1.2, price_syp: 18000, is_weight: false }
    ],
    total_usd: 18.4,
    total_syp: 276000,
    payment_method: "cash",
    paid_usd: 18.4,
    paid_syp: 276000,
    remaining_debt_usd: 0,
    remaining_debt_syp: 0,
    sale_date: "2026-06-24T08:30:00"
  }
];

export const initialSales: Sale[] = [
  // Derived flat sales list for quick reports
  { id: "sale-1", invoice_id: "inv-1", product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", customer_id: "cust-1", customer_name: "أبو أحمد الكرز", quantity: 20, price_per_unit_usd: 1.1, total_usd: 22.0, profit_usd: 4.0, sale_date: "2026-06-18T14:30:00" },
  { id: "sale-2", invoice_id: "inv-1", product_id: "prod-2", product_name: "سكر أبيض ميزان (كيلو)", customer_id: "cust-1", customer_name: "أبو أحمد الكرز", quantity: 30, price_per_unit_usd: 0.72, total_usd: 21.6, profit_usd: 3.6, sale_date: "2026-06-18T14:30:00" },
  { id: "sale-3", invoice_id: "inv-2", product_id: "prod-4", product_name: "قهوة حموي بالهيل (200غ)", customer_id: "cust-2", customer_name: "د. رانيا الحلبي", quantity: 5, price_per_unit_usd: 3.0, total_usd: 15.0, profit_usd: 3.0, sale_date: "2026-06-19T11:15:00" },
  { id: "sale-4", invoice_id: "inv-2", product_id: "prod-5", product_name: "شاي سيلاني غزال فرط (400غ)", customer_id: "cust-2", customer_name: "د. رانيا الحلبي", quantity: 3, price_per_unit_usd: 4.3, total_usd: 12.9, profit_usd: 2.4, sale_date: "2026-06-19T11:15:00" },
  { id: "sale-5", invoice_id: "inv-2", product_id: "prod-7", product_name: "جبنة قشقوان حماة (بالوزن)", customer_id: "cust-2", customer_name: "د. رانيا الحلبي", quantity: 1.5, price_per_unit_usd: 7.2, total_usd: 10.8, profit_usd: 2.1, sale_date: "2026-06-19T11:15:00" },
  { id: "sale-6", invoice_id: "inv-3", product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", customer_id: "cust-3", customer_name: "محمد المصري", quantity: 5, price_per_unit_usd: 1.2, total_usd: 6.0, profit_usd: 1.5, sale_date: "2026-06-20T17:45:00" },
  { id: "sale-7", invoice_id: "inv-3", product_id: "prod-3", product_name: "زيت دوار الشمس ليزا (1 لتر)", customer_id: "cust-3", customer_name: "محمد المصري", quantity: 4, price_per_unit_usd: 2.5, total_usd: 10.0, profit_usd: 2.0, sale_date: "2026-06-20T17:45:00" },
  { id: "sale-8", invoice_id: "inv-4", product_id: "prod-2", product_name: "سكر أبيض ميزان (كيلو)", customer_id: "cust-1", customer_name: "أبو أحمد الكرز", quantity: 50, price_per_unit_usd: 0.72, total_usd: 36.0, profit_usd: 6.0, sale_date: "2026-06-21T10:00:00" },
  { id: "sale-9", invoice_id: "inv-4", product_id: "prod-7", product_name: "جبنة قشقوان حماة (بالوزن)", customer_id: "cust-1", customer_name: "أبو أحمد الكرز", quantity: 4.0, price_per_unit_usd: 6.9, total_usd: 27.6, profit_usd: 4.4, sale_date: "2026-06-21T10:00:00" },
  { id: "sale-10", invoice_id: "inv-5", product_id: "prod-4", product_name: "قهوة حموي بالهيل (200غ)", customer_id: "cust-2", customer_name: "د. رانيا الحلبي", quantity: 10, price_per_unit_usd: 3.0, total_usd: 30.0, profit_usd: 6.0, sale_date: "2026-06-22T12:20:00" },
  { id: "sale-11", invoice_id: "inv-5", product_id: "prod-5", product_name: "شاي سيلاني غزال فرط (400غ)", customer_id: "cust-2", customer_name: "د. رانيا الحلبي", quantity: 5, price_per_unit_usd: 4.3, total_usd: 21.5, profit_usd: 4.0, sale_date: "2026-06-22T12:20:00" },
  { id: "sale-12", invoice_id: "inv-6", product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", customer_id: null, customer_name: "عميل نقدي", quantity: 3, price_per_unit_usd: 1.2, total_usd: 3.6, profit_usd: 0.9, sale_date: "2026-06-23T18:10:00" },
  { id: "sale-13", invoice_id: "inv-6", product_id: "prod-6", product_name: "سائل جلي نورا بالليمون (1 لتر)", customer_id: null, customer_name: "عميل نقدي", quantity: 2, price_per_unit_usd: 1.5, total_usd: 3.0, profit_usd: 0.8, sale_date: "2026-06-23T18:10:00" },
  // Today
  { id: "sale-14", invoice_id: "inv-7", product_id: "prod-4", product_name: "قهوة حموي بالهيل (200غ)", customer_id: "cust-3", customer_name: "محمد المصري", quantity: 2, price_per_unit_usd: 3.2, total_usd: 6.4, profit_usd: 1.6, sale_date: "2026-06-24T08:30:00" },
  { id: "sale-15", invoice_id: "inv-7", product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", customer_id: "cust-3", customer_name: "محمد المصري", quantity: 10, price_per_unit_usd: 1.2, total_usd: 12.0, profit_usd: 3.0, sale_date: "2026-06-24T08:30:00" }
];

export const initialExpenses: Expense[] = [
  { id: "exp-1", description: "فاتورة كهرباء المحل - شهر أيار", category: "electricity", amount_usd: 15.0, amount_syp: 225000, expense_date: "2026-06-10", payment_method: "cash" },
  { id: "exp-2", description: "إيجار صالة البيع - شهر حزيران", category: "rent", amount_usd: 120.0, amount_syp: 1800000, expense_date: "2026-06-01", payment_method: "bank" },
  { id: "exp-3", description: "أكياس ومواد تغليف وتعبئة", category: "supplies", amount_usd: 8.0, amount_syp: 120000, expense_date: "2026-06-20", payment_method: "cash" }
];

export const initialDiscounts: Discount[] = [
  {
    id: "disc-1",
    name: "عرض الصيف على الشاي",
    code: "TEA10",
    type: "percent",
    value: 10,
    product_id: "prod-5",
    min_purchase_usd: 0,
    is_active: true,
    start_date: "2026-06-01",
    end_date: "2026-07-31",
    usages: 12
  },
  {
    id: "disc-2",
    name: "توفير الزيت",
    code: "OILSAVE",
    type: "fixed",
    value: 0.5, // 0.5 USD off per unit
    product_id: "prod-3",
    min_purchase_usd: 5,
    is_active: true,
    start_date: "2026-06-15",
    end_date: "2026-06-30",
    usages: 4
  }
];

export const initialAttendance: Attendance[] = [
  { id: "att-1", employee_id: "emp-2", employee_name: "سحر الورد", check_in: "08:00", check_out: "16:00", work_hours: 8, status: "present", date: "2026-06-23" },
  { id: "att-2", employee_id: "emp-3", employee_name: "سامر حارس", check_in: "07:55", check_out: "16:05", work_hours: 8.1, status: "present", date: "2026-06-23" },
  { id: "att-3", employee_id: "emp-2", employee_name: "سحر الورد", check_in: "08:15", check_out: null, work_hours: 0, status: "late", date: "2026-06-24" },
  { id: "att-4", employee_id: "emp-3", employee_name: "سامر حارس", check_in: "08:00", check_out: null, work_hours: 0, status: "present", date: "2026-06-24" }
];

export const initialCashRegisters: CashRegister[] = [
  {
    id: "shift-1",
    employee_id: "emp-2",
    employee_name: "سحر الورد",
    opening_balance_usd: 50,
    opening_balance_syp: 750000,
    closing_balance_usd: 125.0,
    closing_balance_syp: 1875000,
    actual_closing_usd: 125.0,
    actual_closing_syp: 1875000,
    status: "closed",
    open_date: "2026-06-23T08:00:00",
    close_date: "2026-06-23T16:00:00"
  },
  {
    id: "shift-2",
    employee_id: "emp-2",
    employee_name: "سحر الورد",
    opening_balance_usd: 100,
    opening_balance_syp: 1500000,
    closing_balance_usd: null,
    closing_balance_syp: null,
    actual_closing_usd: null,
    actual_closing_syp: null,
    status: "open",
    open_date: "2026-06-24T08:00:00",
    close_date: null
  }
];

export const initialMovements: InventoryMovement[] = [
  { id: "mov-1", product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", movement_type: "in", quantity_before: 0, quantity_after: 100, change_amount: 100, reference_id: "batch-101", date: "2026-06-01T09:00:00" },
  { id: "mov-2", product_id: "prod-2", product_name: "سكر أبيض ميزان (كيلو)", movement_type: "in", quantity_before: 0, quantity_after: 200, change_amount: 200, reference_id: "batch-102", date: "2026-06-01T09:15:00" },
  { id: "mov-3", product_id: "prod-1", product_name: "رز مصري نخب أول (كيلو)", movement_type: "out", quantity_before: 65, quantity_after: 45, change_amount: -20, reference_id: "inv-1", date: "2026-06-18T14:30:00" },
  { id: "mov-4", product_id: "prod-2", product_name: "سكر أبيض ميزان (كيلو)", movement_type: "out", quantity_before: 150, quantity_after: 120, change_amount: -30, reference_id: "inv-1", date: "2026-06-18T14:30:00" }
];
