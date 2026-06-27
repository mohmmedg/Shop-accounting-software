import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Employee } from '../types';
import { toast } from 'sonner';
import { initialEmployees } from '../data/mockData';

export function useEmployees() {
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const hasSupabaseCreds = import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY;
      if (!hasSupabaseCreds) {
        return initialEmployees;
      }
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('name');
        if (error) {
          console.warn('Supabase employees query error:', error.message);
          return initialEmployees;
        }
        if (!data || data.length === 0) {
          return initialEmployees;
        }
        return data as Employee[];
      } catch (err) {
        console.warn('useEmployees fetch exception:', err);
        return initialEmployees;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const addEmployee = useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'total_sales_usd'>) => {
      const payload = {
        name: employee.name,
        phone: employee.phone,
        position: employee.position,
        salary: Number(employee.salary),
        commission_rate: Number(employee.commission_rate),
        total_sales_usd: 0,
        hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
        is_active: employee.is_active !== undefined ? employee.is_active : true,
        pin_code: employee.pin_code || '1234',
        barcode: employee.barcode || null,
      };

      const { data, error } = await supabase
        .from('employees')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم إضافة الموظف بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل إضافة الموظف');
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async (employee: Employee) => {
      const payload = {
        name: employee.name,
        phone: employee.phone,
        position: employee.position,
        salary: Number(employee.salary),
        commission_rate: Number(employee.commission_rate),
        total_sales_usd: Number(employee.total_sales_usd),
        hire_date: employee.hire_date,
        is_active: employee.is_active,
        pin_code: employee.pin_code,
        barcode: employee.barcode || null,
      };

      const { data, error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', employee.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم تحديث بيانات الموظف بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل تحديث بيانات الموظف');
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم حذف الموظف بنجاح');
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل حذف الموظف');
    },
  });

  return {
    employees: employeesQuery.data ?? [],
    isLoading: employeesQuery.isLoading,
    addEmployee: addEmployee.mutateAsync,
    updateEmployee: updateEmployee.mutateAsync,
    deleteEmployee: deleteEmployee.mutateAsync,
    isAdding: addEmployee.isPending,
    isUpdating: updateEmployee.isPending,
    isDeleting: deleteEmployee.isPending,
  };
}
