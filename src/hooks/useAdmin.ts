import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBypass } from '../contexts/BypassContext';
import { useImpersonation, ROLE_RANK } from '../contexts/ImpersonationContext';

export function useAdmin() {
  const { bypassMode } = useBypass();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isImpersonating && impersonatedUser) {
      setIsAdmin((ROLE_RANK[impersonatedUser.role] ?? 1) >= ROLE_RANK['admin']);
      setLoading(false);
      return;
    }

    if (bypassMode) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [bypassMode, isImpersonating, impersonatedUser]);

  return { isAdmin, loading };
}
