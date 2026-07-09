import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface LoginEmployee {
  id: string;
  name: string;
  position: string;
  barcode: string | null;
  is_active: boolean;
}

export function useLoginEmployees() {
  const query = useQuery({
    queryKey: ['login-employees'],
    queryFn: async (): Promise<LoginEmployee[]> => {
      const hasSupabaseCreds = import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY;

      if (!hasSupabaseCreds) {
        return [] as LoginEmployee[];
      }

      const { data, error } = await supabase.rpc('get_login_employees');

      if (error) {
        throw new Error(`تعذر تحميل قائمة الموظفين: ${error.message}`);
      }

      return (data ?? []) as LoginEmployee[];
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  return {
    employees: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
