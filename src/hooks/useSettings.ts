import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Settings } from '../types';
import { toast } from 'sonner';

export const initialSettings: Settings = {
  store_name: 'ALkhal',
  store_phone: '+963 11 2233445',
  store_address: 'دمشق - الحريقة - شارع التجارة',
  usd_to_syp_rate: 15000,
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
        return initialSettings as Settings & { id: string };
      }

      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .limit(1);

        if (error) {
          console.warn('Supabase settings query error:', error.message);
          return initialSettings as Settings & { id: string };
        }

        if (!data || data.length === 0) {
          try {
            // Table is empty, seed initial settings
            const { data: inserted, error: insertError } = await supabase
              .from('settings')
              .insert([initialSettings])
              .select()
              .single();

            if (insertError) throw insertError;
            return inserted as Settings & { id: string };
          } catch (seedErr) {
            console.warn('Failed to seed settings, returning mock', seedErr);
            return initialSettings as Settings & { id: string };
          }
        }

        return data[0] as Settings & { id: string };
      } catch (err) {
        console.warn('useSettings exception:', err);
        return initialSettings as Settings & { id: string };
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour stale time
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Settings) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        toast.success('تم التحديث مؤقتاً (وضع تجريبي)');
        return newSettings;
      }

      // Get current row ID
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .limit(1);

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
        // No row — insert
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

      // Log action
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
    settings: settingsQuery.data ?? initialSettings,
    isLoading: settingsQuery.isLoading,
    updateSettings: updateSettings.mutateAsync,
    isUpdating: updateSettings.isPending,
  };
}
