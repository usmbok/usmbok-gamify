import { createContext, useContext } from 'react';

const ADMIN_PROFILE_ID = '1aebe549-8724-418b-911c-d098b00b1ece';

interface BypassContextType {
  bypassMode: boolean;
  bypassUserId: string | null;
}

export const BypassContext = createContext<BypassContextType>({
  bypassMode: false,
  bypassUserId: null,
});

export function useBypass() {
  return useContext(BypassContext);
}

export { ADMIN_PROFILE_ID };
