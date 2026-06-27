import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { AuditLog, AuditActionType, EntityType, ExchangeRateHistory } from '../types';
import { useAuth } from './useAuth';

interface LogActionInput {
  action_type: AuditActionType;
  entity_type?: EntityType;
  entity_id?: string;
  entity_name?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  description: string;
}

export function useAuditLog() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  // Fetch audit logs (last 200, most recent first)
  const auditLogsQuery = useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditLog[];
    },
    staleTime: 1000 * 60 * 2, // refresh every 2 minutes
  });

  // Exchange rate history
  const exchangeRateHistoryQuery = useQuery({
    queryKey: ['exchange_rate_history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_rate_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ExchangeRateHistory[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Log a new action
  const logAction = async (input: LogActionInput): Promise<void> => {
    if (!currentUser) return;
    try {
      await supabase.from('audit_logs').insert({
        employee_id: currentUser.id,
        employee_name: currentUser.name,
        action_type: input.action_type,
        entity_type: input.entity_type || null,
        entity_id: input.entity_id || null,
        entity_name: input.entity_name || null,
        old_value: input.old_value || null,
        new_value: input.new_value || null,
        description: input.description,
      });
      // Refresh audit log cache
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
    } catch (err) {
      console.warn('Audit log failed:', err);
      // Never throw — audit log failure should never block main operations
    }
  };

  return {
    auditLogs: auditLogsQuery.data ?? [],
    isLoadingLogs: auditLogsQuery.isLoading,
    exchangeRateHistory: exchangeRateHistoryQuery.data ?? [],
    logAction,
  };
}
