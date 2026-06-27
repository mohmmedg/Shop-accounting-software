import { supabase } from './supabase';
import { toast } from 'sonner';
import { initialProducts, initialCustomers, initialEmployees, initialSettings } from '../data/mockData';

const SETUP_KEY = 'db_setup_v3';

export async function setupDatabase(): Promise<void> {
  // Skip if already done in this session
  if (sessionStorage.getItem(SETUP_KEY) === 'done') return;

  const hasSupabaseCreds = import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY;
  if (!hasSupabaseCreds) {
    sessionStorage.setItem(SETUP_KEY, 'done');
    return;
  }

  try {
    // 1. Verify if tables exist by querying settings
    const { error } = await supabase.from('settings').select('id').limit(1);
    
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        // Table settings doesn't exist - database is not set up
        toast.error('لم يتم تهيئة قاعدة البيانات بعد. يرجى تشغيل سكربت SQL في لوحة تحكم Supabase أولاً لتفعيل الحماية والجداول والمصادقة الآمنة.', {
          duration: 15000,
        });
        console.error('POS system: Database schema not found in Supabase. Please execute the provided SQL script in the Supabase SQL Editor.');
        return;
      }
      throw error;
    }

    // 2. Seed initial tables if they are empty
    await seedInitialData();

    sessionStorage.setItem(SETUP_KEY, 'done');
    console.log('✅ Database check complete');
  } catch (err: any) {
    console.warn('Database check failed:', err.message);
    sessionStorage.setItem(SETUP_KEY, 'done');
  }
}

async function createTablesViaFallback() {
  // Check if settings table exists by trying to select from it
  // If it fails, we know tables don't exist and need to be created via Supabase dashboard
  const { error } = await supabase.from('settings').select('id').limit(1);
  if (error && error.code === '42P01') {
    // Table doesn't exist — show user-friendly message
    toast.error('يرجى إنشاء جداول قاعدة البيانات أولاً. راجع ملف README.md للتعليمات.', {
      duration: 10000,
    });
    console.error('Tables not found. Please run the SQL schema in Supabase SQL Editor.');
  }
}

async function seedInitialData() {
  try {
    // Seed settings if empty
    const { data: settingsData } = await supabase.from('settings').select('id').limit(1);
    if (!settingsData || settingsData.length === 0) {
      await supabase.from('settings').insert([{
        store_name: initialSettings.store_name || 'مخازن الشام الاستهلاكية',
        store_phone: initialSettings.store_phone || '0933123456',
        store_address: initialSettings.store_address || 'سوريا - الشام',
        usd_to_syp_rate: initialSettings.usd_to_syp_rate || 15000,
        default_warning_limit: initialSettings.default_warning_limit || 10,
        tax_rate_percent: initialSettings.tax_rate_percent || 0,
      }]);
    }

    // Seed employees if empty
    const { data: empData } = await supabase.from('employees').select('id').limit(1);
    if (!empData || empData.length === 0) {
      const employeeSeeds = initialEmployees.map(e => ({
        name: e.name,
        phone: e.phone || '',
        position: e.position,
        salary: e.salary || 0,
        commission_rate: e.commission_rate || 0,
        total_sales_usd: 0,
        hire_date: e.hire_date || new Date().toISOString().split('T')[0],
        is_active: e.is_active !== false,
        pin_code: e.pin_code || '1234',
        barcode: e.barcode || null,
      }));
      await supabase.from('employees').insert(employeeSeeds);
    }

    // Seed products if empty
    const { data: prodData } = await supabase.from('products').select('id').limit(1);
    if (!prodData || prodData.length === 0) {
      const productSeeds = initialProducts.map(p => ({
        name: p.name,
        barcode: p.barcode || null,
        category: p.category || 'عام',
        image_url: p.image_url || '',
        price_usd: Number(p.price_usd),
        price_syp: Number(p.price_syp),
        cost_usd: Number(p.cost_usd),
        quantity: Number(p.quantity),
        warning_limit: Number(p.warning_limit || 10),
        sold_by_weight: p.sold_by_weight || false,
        sale_type: p.sale_type || (p.sold_by_weight ? 'weight' : 'piece'),
        price_per_kg: p.price_per_kg ? Number(p.price_per_kg) : null,
        stock_grams: p.stock_grams ? Number(p.stock_grams) : null,
        wholesale_price_usd: Number(p.wholesale_price_usd || p.price_tiers?.wholesale_usd || 0),
        vip_price_usd: Number(p.vip_price_usd || p.price_tiers?.vip_usd || 0),
        expiry_date: p.expiry_date || null,
      }));
      await supabase.from('products').insert(productSeeds);
    }

    // Seed customers if empty
    const { data: custData } = await supabase.from('customers').select('id').limit(1);
    if (!custData || custData.length === 0 && initialCustomers.length > 0) {
      const customerSeeds = initialCustomers.map(c => ({
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        customer_type: c.customer_type || 'retail',
        total_purchases_usd: Number(c.total_purchases_usd || 0),
        loyalty_points: Number(c.loyalty_points || 0),
        loyalty_tier: c.loyalty_tier || 'bronze',
      }));
      await supabase.from('customers').insert(customerSeeds);
    }

  } catch (err: any) {
    console.warn('Seeding warning:', err.message);
  }
}
