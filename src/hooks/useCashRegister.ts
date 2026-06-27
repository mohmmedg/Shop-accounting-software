import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { CashRegister } from '../types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useCashRegister() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const cashRegistersQuery = useQuery({
    queryKey: ['cash_registers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .order('open_date', { ascending: false });
      if (error) {
        toast.error(`خطأ في تحميل فترات الصندوق: ${error.message}`);
        throw error;
      }
      return data as CashRegister[];
    },
    staleTime: 1000 * 60,
  });

  const openShift = useMutation({
    mutationFn: async ({ openingUsd, openingSyp }: { openingUsd: number; openingSyp: number }) => {
      if (!currentUser) throw new Error('يجب تسجيل الدخول أولاً لفتح الصندوق');

      // Check if there is already an open shift
      const { data: openShifts, error: checkError } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .limit(1);

      if (checkError) throw checkError;

      if (openShifts && openShifts.length > 0) {
        throw new Error('هنالك وردية صندوق مفتوحة بالفعل في الصالة');
      }

      // Check if employee ID is a valid UUID, otherwise find a matching employee in Supabase or set to null
      let finalEmployeeId: string | null = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);
      
      if (isUUID) {
        finalEmployeeId = currentUser.id;
      } else {
        try {
          const { data: dbEmp } = await supabase
            .from('employees')
            .select('id')
            .eq('name', currentUser.name)
            .limit(1);
            
          if (dbEmp && dbEmp.length > 0) {
            finalEmployeeId = dbEmp[0].id;
          } else {
            const { data: anyEmp } = await supabase
              .from('employees')
              .select('id')
              .limit(1);
            if (anyEmp && anyEmp.length > 0) {
              finalEmployeeId = anyEmp[0].id;
            }
          }
        } catch (e) {
          console.error('Error resolving employee UUID:', e);
        }
      }

      const payload = {
        employee_id: finalEmployeeId,
        employee_name: currentUser.name,
        opening_balance_usd: Number(openingUsd),
        opening_balance_syp: Number(openingSyp),
        closing_balance_usd: Number(openingUsd),
        closing_balance_syp: Number(openingSyp),
        actual_closing_usd: null,
        actual_closing_syp: null,
        status: 'open',
        open_date: new Date().toISOString(),
        close_date: null,
      };

      const { data, error } = await supabase
        .from('cash_registers')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash_registers'] });
      toast.success('تم فتح الصندوق والوردية بنجاح');
    },
    onError: (err: any) => {
      toast.error(`فشل فتح الصندوق: ${err.message}`);
    },
  });

  const closeShift = useMutation({
    mutationFn: async ({ shiftId, actualUsd, actualSyp }: { shiftId: string; actualUsd: number; actualSyp: number }) => {
      // Find the current open shift first to get closing balance
      const { data: shift, error: fetchError } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (fetchError || !shift) throw new Error('لم يتم العثور على الفترة المحددة');

      const closingBalanceUsd = Number(shift.closing_balance_usd || shift.opening_balance_usd);
      const closingBalanceSyp = Number(shift.closing_balance_syp || shift.opening_balance_syp);

      const { data, error } = await supabase
        .from('cash_registers')
        .update({
          closing_balance_usd: closingBalanceUsd,
          closing_balance_syp: closingBalanceSyp,
          actual_closing_usd: Number(actualUsd),
          actual_closing_syp: Number(actualSyp),
          status: 'closed',
          close_date: new Date().toISOString(),
        })
        .eq('id', shiftId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash_registers'] });
    },
  });

  const activeShift = cashRegistersQuery.data?.find(c => c.status === 'open') || null;

  return {
    cashRegisters: cashRegistersQuery.data ?? [],
    activeShift,
    isLoading: cashRegistersQuery.isLoading,
    openShift: openShift.mutateAsync,
    closeShift: closeShift.mutateAsync,
    isOpening: openShift.isPending,
    isClosing: closeShift.isPending,
  };
}
