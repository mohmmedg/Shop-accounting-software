import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Settings } from '../types';
import { toast } from 'sonner';

// قيمة افتراضية للعرض فقط عند عدم وجود اتصال Supabase (تطوير محلي) — لا تُكتب في DB أبداً تلقائياً
const emptySettings: Settings = {
  store_name: '',
  store_phone: '',
  store_address: '',
  usd_to_syp_rate: 0,
  default_warning_limit: 10,
  tax_rate_percent: 0,
};

export function useSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return emptySettings as Settings & { id: string };
      }

      const { data, error } = await supabase.from('settings').select('*').limit(1);

      if (error) {
        throw new Error(`فشل تحميل الإعدادات: ${error.message}`);
      }

      if (!data || data.length === 0) {
        // لا إدراج تلقائي — نُرجع قيماً فارغة، والمستخدم يحفظها يدوياً من شاشة الإعدادات
        return emptySettings as Settings & { id: string };
      }

      return data[0] as Settings & { id: string };
    },
    staleTime: 1000 * 60 * 60,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Settings) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        toast.success('تم التحديث مؤقتاً (وضع تجريبي)');
        return newSettings;
      }

      const { data: existing } = await supabase.from('settings').select('id').limit(1);
      const existingId = existing?.[0]?.id;

      if (existingId) {
        const { data, error } = await supabase
          .from('settings')
          .update({
            store_name: newSettings.store_name,
            store_phone: newSettings.store_phone || '',
            store_address: newSettings.store_address || '',
            usd_to_syp_rate: Number(newSettings.usd_to_syp_rate),
            default_warning_limit: Number(newSettings.default_warning_limit),
            tax_rate_percent: Number(newSettings.tax_rate_percent || 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingId)
          .select()
          .single();
        if (error) throw error;
        return data as Settings;
      } else {
        const { data, error } = await supabase
          .from('settings')
          .insert([{
            store_name: newSettings.store_name,
            store_phone: newSettings.store_phone || '',
            store_address: newSettings.store_address || '',
            usd_to_syp_rate: Number(newSettings.usd_to_syp_rate),
            default_warning_limit: Number(newSettings.default_warning_limit),
            tax_rate_percent: Number(newSettings.tax_rate_percent || 0),
          }])
          .select()
          .single();
        if (error) throw error;
        return data as Settings;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      try {
        const savedUserStr = localStorage.getItem('store_current_user');
        const currentUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        supabase.from('audit_logs').insert({
          employee_id: currentUser?.id || null,
          employee_name: currentUser?.name || 'مجهول',
          action_type: 'change_settings',
          entity_type: 'settings',
          description: 'تم تحديث إعدادات المتجر العامة وتعديل بيانات الصالة',
        }).then(({ error }) => {
          if (error) console.warn('Settings audit log warning:', error.message);
        });
      } catch (err) {
        console.warn('Settings audit log failed:', err);
      }
      toast.success('تم حفظ الإعدادات بنجاح');
    },
    onError: (err: any) => {
      toast.error(`فشل حفظ الإعدادات: ${err.message}`);
    },
  });

  return {
    settings: settingsQuery.data ?? emptySettings,
    isLoading: settingsQuery.isLoading,
    updateSettings: updateSettings.mutateAsync,
    isUpdating: updateSettings.isPending,
  };
}
