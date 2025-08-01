import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface AppConfig {
  activa: boolean;
  limite_uso_mensual?: number;
  restricciones: Record<string, any>;
  modo_demo: boolean;
  configuracion_personalizada: Record<string, any>;
  app_codigo: string;
  empresa_id: string;
}

export function useAppConfig(appCodigo: string) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && appCodigo) {
      fetchConfig();
    }
  }, [user, appCodigo]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_config_app_empresa', {
        p_app_codigo: appCodigo
      });

      if (error) {
        console.error('Error fetching app config:', error);
        toast.error('Error al cargar configuración de la app');
        return;
      }

      if (typeof data === 'object' && data !== null && 'error' in data) {
        console.error('App config error:', (data as any).error);
        setConfig(null);
        return;
      }

      setConfig(data as unknown as AppConfig);
    } catch (error) {
      console.error('Error fetching app config:', error);
      toast.error('Error al cargar configuración de la app');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    setUpdating(true);
    try {
      const configToUpdate = {
        ...config,
        ...newConfig
      };

      const { data, error } = await supabase.rpc('actualizar_config_app_empresa', {
        p_app_codigo: appCodigo,
        p_configuracion: configToUpdate
      });

      if (error) {
        console.error('Error updating app config:', error);
        toast.error('Error al actualizar configuración');
        return false;
      }

      if (typeof data === 'object' && data !== null && 'error' in data) {
        console.error('App config update error:', (data as any).error);
        toast.error((data as any).error);
        return false;
      }

      setConfig(data as unknown as AppConfig);
      toast.success('Configuración actualizada correctamente');
      return true;
    } catch (error) {
      console.error('Error updating app config:', error);
      toast.error('Error al actualizar configuración');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const refreshConfig = () => {
    setLoading(true);
    fetchConfig();
  };

  return {
    config,
    loading,
    updating,
    updateConfig,
    refreshConfig
  };
}

export function useAllAppsConfig() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAllConfigs();
    }
  }, [user]);

  const fetchAllConfigs = async () => {
    try {
      const { data, error } = await supabase.rpc('obtener_todas_config_apps_empresa');

      if (error) {
        console.error('Error fetching apps configs:', error);
        toast.error('Error al cargar configuraciones');
        return;
      }

      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching apps configs:', error);
      toast.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const refreshConfigs = () => {
    setLoading(true);
    fetchAllConfigs();
  };

  return {
    configs,
    loading,
    refreshConfigs
  };
}