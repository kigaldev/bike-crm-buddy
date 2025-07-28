import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Empresa {
  id: string;
  nombre_comercial: string;
  razon_social: string | null;
  cif: string | null;
  email: string | null;
  logo: string | null;
  plan_actual: string;
  estado_suscripcion: string;
}

interface EmpresaContextType {
  empresaActual: Empresa | null;
  loading: boolean;
  refreshEmpresa: () => Promise<void>;
  hasAccess: (appCode: string) => boolean;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresaActual, setEmpresaActual] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeApps, setActiveApps] = useState<string[]>([]);
  const { user, profile } = useAuth();

  const fetchEmpresa = async () => {
    if (!profile?.empresa_actual) {
      setEmpresaActual(null);
      setLoading(false);
      return;
    }

    try {
      const { data: empresa, error: empresaError } = await (supabase as any)
        .from('empresas')
        .select('*')
        .eq('id', profile.empresa_actual)
        .single();

      if (empresaError) throw empresaError;
      setEmpresaActual(empresa as Empresa);

      // Fetch active apps for this empresa (temporarily using mock data)
      try {
        const { data: apps, error: appsError } = await (supabase as any)
          .from('empresas_apps')
          .select(`
            app_id,
            activa,
            trial_activo,
            trial_vence,
            fecha_vencimiento,
            apps (codigo, es_core, es_gratuita)
          `)
          .eq('empresa_id', profile.empresa_actual)
          .eq('activa', true);

        if (!appsError && apps) {
          const activeCodes = apps
            .filter((ea: any) => {
              const app = ea.apps;
              if (!app) return false;
              
              // Core and free apps are always active
              if (app.es_core || app.es_gratuita) return true;
              
              // Check if trial is active and not expired
              if (ea.trial_activo && ea.trial_vence) {
                return new Date(ea.trial_vence) > new Date();
              }
              
              // Check if subscription is active and not expired
              if (ea.fecha_vencimiento) {
                return new Date(ea.fecha_vencimiento) > new Date();
              }
              
              return false;
            })
            .map((ea: any) => ea.apps?.codigo)
            .filter(Boolean);
          
          setActiveApps(activeCodes);
        }
      } catch (appsError) {
        // Set default active apps for demo
        setActiveApps(['clientes', 'facturacion-basica', 'ordenes', 'inventario']);
      }

    } catch (error) {
      console.error('Error fetching empresa:', error);
      setEmpresaActual(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshEmpresa = async () => {
    setLoading(true);
    await fetchEmpresa();
  };

  const hasAccess = (appCode: string) => {
    return activeApps.includes(appCode);
  };

  useEffect(() => {
    if (user && profile) {
      fetchEmpresa();
    } else {
      setEmpresaActual(null);
      setActiveApps([]);
      setLoading(false);
    }
  }, [user, profile]);

  const value = {
    empresaActual,
    loading,
    refreshEmpresa,
    hasAccess,
  };

  return (
    <EmpresaContext.Provider value={value}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (context === undefined) {
    throw new Error('useEmpresa must be used within an EmpresaProvider');
  }
  return context;
}