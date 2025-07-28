import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePageAccessTracker } from '@/hooks/useAppUsageTracker';
import { useAuth } from '@/hooks/useAuth';

export function AppUsageMiddleware() {
  const location = useLocation();
  const { registrarAcceso } = usePageAccessTracker();
  const { profile } = useAuth();

  useEffect(() => {
    // Solo registrar si el usuario está autenticado y tiene empresa
    if (profile?.empresa_actual) {
      // Registrar acceso a la página actual
      registrarAcceso(location.pathname, location.pathname + location.search);
    }
  }, [location.pathname, location.search, profile?.empresa_actual, registrarAcceso]);

  // Este componente no renderiza nada, solo ejecuta el tracking
  return null;
}