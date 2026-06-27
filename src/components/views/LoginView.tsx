import { useState, useEffect } from 'react';
import { Employee } from '../types';
import { toast } from 'sonner';

const AUTH_KEY = 'store_current_user';

// Listeners set to share auth state across all instances of useAuth hook
const authListeners = new Set<(user: Employee | null) => void>();

function updateGlobalUser(user: Employee | null) {
  for (const listener of authListeners) {
    listener(user);
  }
}

export function useAuth() {
  const [currentUser, setCurrentUserState] = useState<Employee | null>(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    authListeners.add(setCurrentUserState);
    return () => {
      authListeners.delete(setCurrentUserState);
    };
  }, []);

  const setCurrentUser = (user: Employee | null) => {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
    updateGlobalUser(user);
  };

  const login = async (pinCode: string, employeeBarcode?: string, employeeId?: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Development fallback when Supabase not configured
    if (!supabaseUrl || !supabaseAnonKey) {
      const found = initialEmployees.find(emp =>
        emp.pin_code === pinCode &&
        (employeeId ? emp.id === employeeId : true) &&
        (employeeBarcode ? emp.barcode === employeeBarcode : true) &&
        emp.is_active
      );
      if (found) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(found));
        updateGlobalUser(found);
        toast.success(`مرحباً بك ${found.name} (وضع تجريبي)`);
        return found;
      }
      toast.error('رمز المرور غير صحيح');
      throw new Error('Invalid credentials');
    }

    try {
      // Production: query employee directly by ID and verify PIN
      if (employeeId) {
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeId)
          .eq('is_active', true)
          .single();

        if (empError || !empData) {
          toast.error('الموظف غير موجود أو غير نشط');
          throw new Error('Invalid credentials');
        }

        const employee = empData as Employee;

        // Verify PIN directly against the stored pin_code
        // Since pin_code may be masked, use RPC for verification
        const { data: creds, error: rpcError } = await supabase.rpc('get_employee_auth_credentials', {
          p_pin: pinCode || '',
          p_barcode: employeeBarcode || ''
        });

        if (rpcError) throw rpcError;

        if (!creds || creds.length === 0) {
          toast.error('رمز PIN غير صحيح');
          throw new Error('Invalid credentials');
        }

        const response = creds[0];
        if (response.success === false) {
          toast.error(response.error_message || 'فشل تسجيل الدخول');
          throw new Error('Invalid credentials');
        }

        // التحقق أن الموظف الذي يملك هذا PIN هو نفس الموظف المختار
        const { email, password, employee_id: rpcEmployeeId } = response;

        if (rpcEmployeeId && rpcEmployeeId !== employeeId) {
          toast.error('رمز PIN غير صحيح لهذا الموظف');
          throw new Error('Invalid credentials');
        }

        // Standard Supabase Auth Login
        const { data: authResult, error: authError } = await supabase.auth.signInWithPassword({
          email: email || '',
          password: password || ''
        });

        if (authError) throw authError;

        const authUser = authResult.user;
        if (!authUser) throw new Error('لم يتم إنشاء جلسة مصادقة صحيحة');

        // التحقق النهائي: الـ auth user يجب أن يطابق الموظف المختار
        if (authUser.id !== employeeId) {
          await supabase.auth.signOut();
          toast.error('رمز PIN غير صحيح لهذا الموظف');
          throw new Error('Invalid credentials');
        }

        // Query the logged-in employee profile
        const { data: finalEmpData, error: finalEmpError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (finalEmpError || !finalEmpData) {
          throw finalEmpError || new Error('فشل تحميل الملف الشخصي للموظف');
        }

        const finalEmployee = finalEmpData as Employee;
        localStorage.setItem(AUTH_KEY, JSON.stringify(finalEmployee));
        updateGlobalUser(finalEmployee);

        // Log login action
        try {
          await supabase.from('audit_logs').insert({
            employee_id: finalEmployee.id,
            employee_name: finalEmployee.name,
            action_type: 'login',
            entity_type: 'employee',
            entity_id: finalEmployee.id,
            entity_name: finalEmployee.name,
            description: `تسجيل دخول ناجح للموظف: ${finalEmployee.name} بمنصب (${finalEmployee.position === 'admin' ? 'مدير عام' : finalEmployee.position === 'cashier' ? 'كاشير' : 'أمين مستودع'})`,
          });
        } catch (err) {
          console.warn('Login audit log failed:', err);
        }

        toast.success(`مرحباً بك ${finalEmployee.name}`);
        return finalEmployee;
      }

      // Fallback: barcode login (no employeeId provided)
      const { data: creds, error: rpcError } = await supabase.rpc('get_employee_auth_credentials', {
        p_pin: pinCode || '',
        p_barcode: employeeBarcode || ''
      });

      if (rpcError) throw rpcError;

      if (!creds || creds.length === 0) {
        toast.error('تعذر تسجيل الدخول');
        throw new Error('Invalid credentials');
      }

      const response = creds[0];
      if (response.success === false) {
        toast.error(response.error_message || 'فشل تسجيل الدخول');
        throw new Error('Invalid credentials');
      }

      const { email, password } = response;

      const { data: authResult, error: authError } = await supabase.auth.signInWithPassword({
        email: email || '',
        password: password || ''
      });

      if (authError) throw authError;

      const authUser = authResult.user;
      if (!authUser) throw new Error('لم يتم إنشاء جلسة مصادقة صحيحة');

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (empError || !empData) {
        throw empError || new Error('فشل تحميل الملف الشخصي للموظف');
      }

      const employee = empData as Employee;
      localStorage.setItem(AUTH_KEY, JSON.stringify(employee));
      updateGlobalUser(employee);

      try {
        await supabase.from('audit_logs').insert({
          employee_id: employee.id,
          employee_name: employee.name,
          action_type: 'login',
          entity_type: 'employee',
          entity_id: employee.id,
          entity_name: employee.name,
          description: `تسجيل دخول ناجح للموظف: ${employee.name} بمنصب (${employee.position === 'admin' ? 'مدير عام' : employee.position === 'cashier' ? 'كاشير' : 'أمين مستودع'})`,
        });
      } catch (err) {
        console.warn('Login audit log failed:', err);
      }

      toast.success(`مرحباً بك ${employee.name}`);
      return employee;
    } catch (err: any) {
      if (err.message !== 'Invalid credentials') {
        toast.error(`خطأ أثناء تسجيل الدخول: ${err.message}`);
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signout warning:', err);
    }
    localStorage.removeItem(AUTH_KEY);
    updateGlobalUser(null);
    toast.success('تم تسجيل الخروج بنجاح');
  };

  const isAuthenticated = currentUser !== null;
  const isAdmin = currentUser?.position === 'admin';

  return { currentUser, login, logout, isAuthenticated, isAdmin, setCurrentUser };
}
