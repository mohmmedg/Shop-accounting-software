import { supabase } from './supabase';
import { toast } from 'sonner';

const SETUP_KEY = 'db_setup_v3';

export async function setupDatabase(): Promise<void> {
  if (sessionStorage.getItem(SETUP_KEY) === 'done') return;

  const hasSupabaseCreds = import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY;
  if (!hasSupabaseCreds) {
    sessionStorage.setItem(SETUP_KEY, 'done');
    return;
  }

  try {
    // فقط التحقق من وجود الجداول — لا زرع بيانات تلقائياً بعد اليوم
    const { error } = await supabase.from('settings').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        toast.error('لم يتم تهيئة قاعدة البيانات بعد. يرجى تشغيل سكربت SQL في لوحة تحكم Supabase أولاً.', {
          duration: 15000,
        });
        console.error('POS system: Database schema not found in Supabase.');
        return;
      }
      throw error;
    }

    sessionStorage.setItem(SETUP_KEY, 'done');
    console.log('✅ Database check complete — no auto-seeding performed');
  } catch (err: any) {
    console.warn('Database check failed:', err.message);
    sessionStorage.setItem(SETUP_KEY, 'done');
  }
}
