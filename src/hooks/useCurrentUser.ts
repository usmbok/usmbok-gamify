import { useBypass } from '../contexts/BypassContext';
import { supabase } from '../lib/supabase';

export async function getCurrentUserId(bypassUserId: string | null): Promise<string | null> {
  if (bypassUserId) return bypassUserId;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function useCurrentUser() {
  const { bypassMode, bypassUserId } = useBypass();
  return { bypassMode, bypassUserId };
}
