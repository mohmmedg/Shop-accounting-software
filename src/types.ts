/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  image_url: string;
  price_usd: number;
  price_syp: number; // Derived or custom
  cost_usd: number;
  quantity: number;
  warning_limit: number;
  sold_by_weight: boolean;
  sale_type?: 'piece' | 'weight';
  price_per_kg?: number;
  stock_grams?: number;
  wholesale_price_usd?: number;
  vip_price_usd?: number;
  price_tiers?: {
    wholesale_usd: number;
    vip_usd: number;
  };
  expiry_date?: string; // Optional batch expiry
  created_at?: string;
  updated_at?: string;
}

export type CustomerType = 'retail' | 'wholesale' | 'vip';
export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  customer_type: CustomerType; // تجزئة / جملة / VIP
  total_purchases_usd: number;
  loyalty_points: number;
  loyalty_tier: LoyaltyTier;
  created_at?: string;
}

export interface InvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price_usd: number;
  price_syp: number;
  cost_usd?: number;
  is_weight: boolean;
}

export type PaymentMethod = 'cash' | 'debt' | 'partial';

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string;
  items: InvoiceItem[];
  total_usd: number;
  total_syp: number;
  payment_method: PaymentMethod;
  paid_usd: number;
  paid_syp: number;
  remaining_debt_usd: number;
  remaining_debt_syp: number;
  employee_id?: string | null;
  sale_date: string;
  created_at?: string;
  discount_syp?: number;
  discount_usd?: number;
  profit_syp?: number;
  profit_usd?: number;
}

// سجل تسديد دين — يحمل تاريخ القبض الفعلي، منفصل عن تاريخ البيع الأصلي
export interface DebtPayment {
  id: string;
  invoice_id: string;
  customer_name: string;
  amount_usd: number;
  amount_syp: number;
  created_at: string;
  invoice?: {
    total_usd: number;
    profit_usd?: number;
    items?: InvoiceItem[];
  };
}

export interface Sale {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  customer_id: string | null;
  customer_name: string;
  quantity: number;
  price_per_unit_usd: number;
  total_usd: number;
  profit_usd: number;
  sale_date: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  rating: number; // 1 to 5
  total_purchases_usd: number;
  notes: string;
  created_at?: string;
}

export type EmployeePosition = 'admin' | 'cashier' | 'storekeeper';

export interface Employee {
  id: string;
  name: string;
  phone: string;
  position: EmployeePosition;
  salary: number;
  commission_rate: number; // percentage, e.g. 2 for 2%
  total_sales_usd: number;
  hire_date: string;
  is_active: boolean;
  pin_code: string;
  barcode?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  description: string;
  category: 'rent' | 'electricity' | 'salaries' | 'supplies' | 'maintenance' | 'transport' | 'other';
  amount_usd: number;
  amount_syp: number;
  expense_date: string;
  payment_method: 'cash' | 'bank';
  approved_by?: string;
  created_at?: string;
}

export interface Return {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  customer_id: string | null;
  customer_name: string;
  quantity: number;
  refund_amount_usd: number;
  refund_amount_syp: number;
  reason: string;
  action_taken: 'refund' | 'exchange';
  return_date: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'return'; // إضافة، بيع، تعديل، مرتجع
  quantity_before: number;
  quantity_after: number;
  change_amount: number;
  reference_id: string; // ID of invoice, return, adjustment, check
  date: string;
}

export interface InventoryCheck {
  id: string;
  product_id: string;
  product_name: string;
  expected_quantity: number;
  actual_quantity: number;
  difference: number;
  conducted_by: string;
  notes: string;
  date: string;
}

export interface CashRegister {
  id: string;
  employee_id: string;
  employee_name: string;
  opening_balance_usd: number;
  opening_balance_syp: number;
  closing_balance_usd: number | null;
  closing_balance_syp: number | null;
  actual_closing_usd: number | null;
  actual_closing_syp: number | null;
  status: 'open' | 'closed';
  open_date: string;
  close_date: string | null;
}

export interface Attendance {
  id: string;
  employee_id: string;
  employee_name: string;
  check_in: string;
  check_out: string | null;
  work_hours: number;
  status: 'present' | 'absent' | 'late' | 'half_day';
  date: string;
}

export interface Discount {
  id: string;
  name: string;
  code: string;
  type: 'percent' | 'fixed' | 'buy_x_get_y';
  value: number;
  product_id: string | null; // Targets specific product, or null for all
  min_purchase_usd: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  usages: number;
  created_at?: string;
}

export interface Settings {
  usd_to_syp_rate: number;
  store_name: string;
  store_phone: string;
  default_warning_limit: number;
  store_address?: string;
  tax_rate_percent?: number;
}

export type AuditActionType =
  | 'delete_product' | 'delete_customer' | 'delete_supplier' | 'delete_employee'
  | 'edit_price' | 'edit_stock' | 'cancel_invoice' | 'edit_invoice'
  | 'open_shift' | 'close_shift' | 'change_exchange_rate'
  | 'add_discount' | 'delete_discount' | 'add_return'
  | 'login' | 'logout' | 'change_settings';

export type EntityType = 'product' | 'customer' | 'invoice' | 'employee' | 'settings' | 'shift' | 'discount' | 'return';

export interface AuditLog {
  id: string;
  employee_id: string | null;
  employee_name: string;
  action_type: AuditActionType;
  entity_type: EntityType | null;
  entity_id: string | null;
  entity_name: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  description: string;
  created_at: string;
}

export interface ExchangeRateHistory {
  id: string;
  old_rate: number;
  new_rate: number;
  changed_by: string;
  changed_at: string;
  note: string;
}

export interface PermissionMatrix {
  [role: string]: {
    can_view_dashboard: boolean;
    can_view_reports: boolean;
    can_view_admin: boolean;
    can_delete_products: boolean;
    can_edit_prices: boolean;
    can_manage_employees: boolean;
    can_open_close_shift: boolean;
    can_apply_discounts: boolean;
    can_view_costs: boolean; // Can see cost_usd and profit data
  };
}

// Built-in permission matrix — hardcoded per role
export const ROLE_PERMISSIONS: PermissionMatrix = {
  admin: {
    can_view_dashboard: true,
    can_view_reports: true,
    can_view_admin: true,
    can_delete_products: true,
    can_edit_prices: true,
    can_manage_employees: true,
    can_open_close_shift: true,
    can_apply_discounts: true,
    can_view_costs: true,
  },
  cashier: {
    can_view_dashboard: true,
    can_view_reports: false,
    can_view_admin: false,
    can_delete_products: false,
    can_edit_prices: false,
    can_manage_employees: false,
    can_open_close_shift: true,
    can_apply_discounts: true,
    can_view_costs: false,
  },
  storekeeper: {
    can_view_dashboard: true,
    can_view_reports: false,
    can_view_admin: false,
    can_delete_products: true,
    can_edit_prices: false,
    can_manage_employees: false,
    can_open_close_shift: false,
    can_apply_discounts: false,
    can_view_costs: true,
  },
};
