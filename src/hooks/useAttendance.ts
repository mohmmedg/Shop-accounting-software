import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Attendance } from '../types';
import { toast } from 'sonner';

export function useAttendance() {
  const queryClient = useQueryClient();

  const attendanceQuery = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false })
        .order('check_in', { ascending: false });
      if (error) {
        toast.error(`خطأ في تحميل سجلات الحضور: ${error.message}`);
        throw error;
      }
      return data as Attendance[];
    },
    staleTime: 1000 * 60,
  });

  const checkInEmployee = useMutation({
    mutationFn: async ({ employeeId, employeeName }: { employeeId: string; employeeName: string }) => {
      const todayDate = new Date().toISOString().split('T')[0];

      // Check if already checked in today
      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', todayDate)
        .is('check_out', null)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error('الموظف قام بتسجيل الحضور مسبقاً اليوم ولم يقم بتسجيل الانصراف بعد');
      }

      const now = new Date().toISOString();
      const payload = {
        employee_id: employeeId,
        employee_name: employeeName,
        check_in: now,
        check_out: null,
        work_hours: 0,
        status: 'present',
        date: todayDate,
      };

      const { data, error } = await supabase
        .from('attendance')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`تم تسجيل حضور ${data.employee_name} بنجاح`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل تسجيل الحضور');
    },
  });

  const checkOutEmployee = useMutation({
    mutationFn: async ({ employeeId }: { employeeId: string }) => {
      const todayDate = new Date().toISOString().split('T')[0];

      // Find active check-in
      const { data: activeRecords, error: findError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .is('check_out', null)
        .order('check_in', { ascending: false })
        .limit(1);

      if (findError || !activeRecords || activeRecords.length === 0) {
        throw new Error('لم يتم العثور على سجل حضور مفتوح لهذا الموظف اليوم');
      }

      const record = activeRecords[0];
      const checkInTime = new Date(record.check_in);
      const checkOutTime = new Date();
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      const diffHrs = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // round to 2 decimal places

      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out: checkOutTime.toISOString(),
          work_hours: diffHrs,
        })
        .eq('id', record.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`تم تسجيل انصراف ${data.employee_name} بنجاح. ساعات العمل: ${data.work_hours}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل تسجيل الانصراف');
    },
  });

  const addManualAttendance = useMutation({
    mutationFn: async (att: Omit<Attendance, 'id'>) => {
      const payload = {
        employee_id: att.employee_id,
        employee_name: att.employee_name,
        check_in: att.check_in,
        check_out: att.check_out,
        work_hours: Number(att.work_hours || 0),
        status: att.status || 'present',
        date: att.date || new Date().toISOString().split('T')[0],
      };

      const { data, error } = await supabase
        .from('attendance')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('تم إضافة سجل الحضور بنجاح');
    },
    onError: (err: any) => {
      toast.error(`فشل إضافة السجل: ${err.message}`);
    },
  });

  return {
    attendance: attendanceQuery.data ?? [],
    isLoading: attendanceQuery.isLoading,
    checkInEmployee: checkInEmployee.mutateAsync,
    checkOutEmployee: checkOutEmployee.mutateAsync,
    addManualAttendance: addManualAttendance.mutateAsync,
    isCheckingIn: checkInEmployee.isPending,
    isCheckingOut: checkOutEmployee.isPending,
  };
}
