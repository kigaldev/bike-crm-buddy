import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresaContext';

interface EstadisticaUso {
  app_codigo: string;
  app_nombre: string;
  total_acciones: number;
  ultimo_uso: string;
  acciones_mes_actual: number;
  acciones_semana_actual: number;
  tipos_acciones: Record<string, number>;
}

interface ActividadDiaria {
  fecha: string;
  total_acciones: number;
  apps_usadas: number;
  usuarios_activos: number;
}

interface AppSinUso {
  app_codigo: string;
  app_nombre: string;
  ultimo_uso: string;
  dias_sin_uso: number;
}

export function useEstadisticasUso() {
  const { empresaActual } = useEmpresa();

  const estadisticasQuery = useQuery({
    queryKey: ['estadisticas-uso', empresaActual?.id],
    queryFn: async () => {
      if (!empresaActual?.id) return [];

      const { data, error } = await supabase.rpc('obtener_estadisticas_uso_empresa', {
        p_empresa_id: empresaActual.id
      });

      if (error) throw error;
      return data as EstadisticaUso[];
    },
    enabled: !!empresaActual?.id,
  });

  const actividadDiariaQuery = useQuery({
    queryKey: ['actividad-diaria', empresaActual?.id],
    queryFn: async () => {
      if (!empresaActual?.id) return [];

      const { data, error } = await supabase.rpc('obtener_actividad_diaria_empresa', {
        p_empresa_id: empresaActual.id,
        p_dias: 30
      });

      if (error) throw error;
      return data as ActividadDiaria[];
    },
    enabled: !!empresaActual?.id,
  });

  const appsSinUsoQuery = useQuery({
    queryKey: ['apps-sin-uso', empresaActual?.id],
    queryFn: async () => {
      if (!empresaActual?.id) return [];

      const { data, error } = await supabase.rpc('obtener_apps_sin_uso_reciente', {
        p_empresa_id: empresaActual.id,
        p_dias: 30
      });

      if (error) throw error;
      return data as AppSinUso[];
    },
    enabled: !!empresaActual?.id,
  });

  return {
    estadisticas: estadisticasQuery.data || [],
    actividadDiaria: actividadDiariaQuery.data || [],
    appsSinUso: appsSinUsoQuery.data || [],
    isLoading: estadisticasQuery.isLoading || actividadDiariaQuery.isLoading || appsSinUsoQuery.isLoading,
    refetch: () => {
      estadisticasQuery.refetch();
      actividadDiariaQuery.refetch();
      appsSinUsoQuery.refetch();
    }
  };
}