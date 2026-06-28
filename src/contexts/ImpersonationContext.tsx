import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface ImpersonatedUser {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  realAdminId: string | null;
  realAdminRole: string;
  startImpersonation: (user: ImpersonatedUser, adminId: string, adminRole: string, reason?: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
}

export const ImpersonationContext = createContext<ImpersonationContextType>({
  isImpersonating: false,
  impersonatedUser: null,
  realAdminId: null,
  realAdminRole: 'admin',
  startImpersonation: async () => {},
  endImpersonation: async () => {},
});

export function useImpersonation() {
  return useContext(ImpersonationContext);
}

export const ROLE_RANK: Record<string, number> = {
  admin: 3,
  moderator: 2,
  user: 1,
};

interface ImpersonationProviderProps {
  children: ReactNode;
}

export function ImpersonationProvider({ children }: ImpersonationProviderProps) {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [realAdminId, setRealAdminId] = useState<string | null>(null);
  const [realAdminRole, setRealAdminRole] = useState('admin');
  const [logEntryId, setLogEntryId] = useState<string | null>(null);

  const startImpersonation = useCallback(async (
    user: ImpersonatedUser,
    adminId: string,
    adminRole: string,
    reason?: string,
  ) => {
    const adminRoleRank = ROLE_RANK[adminRole] ?? 1;
    const targetRoleRank = ROLE_RANK[user.role] ?? 1;
    if (adminRoleRank < targetRoleRank) return;

    const { data: logEntry } = await supabase
      .from('impersonation_log')
      .insert({
        admin_user_id: adminId,
        impersonated_user_id: user.id,
        reason: reason || 'Admin review',
        admin_role: adminRole,
        target_role: user.role,
      })
      .select('id')
      .maybeSingle();

    setLogEntryId(logEntry?.id ?? null);
    setRealAdminId(adminId);
    setRealAdminRole(adminRole);
    setImpersonatedUser(user);
    setIsImpersonating(true);
  }, []);

  const endImpersonation = useCallback(async () => {
    if (logEntryId) {
      await supabase
        .from('impersonation_log')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', logEntryId);
    }
    setIsImpersonating(false);
    setImpersonatedUser(null);
    setRealAdminId(null);
    setLogEntryId(null);
  }, [logEntryId]);

  return (
    <ImpersonationContext.Provider
      value={{ isImpersonating, impersonatedUser, realAdminId, realAdminRole, startImpersonation, endImpersonation }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}
