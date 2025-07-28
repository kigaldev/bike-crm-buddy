import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresaContext';

interface RegistrarUsoOptions {
  app: string;
  accion: string;
  metadata?: Record<string, any>;
}

export function useAppUsageTracker() {
  const { empresaActual } = useEmpresa();

  const registrarUsoApp = useCallback(async ({ app, accion, metadata = {} }: RegistrarUsoOptions) => {
    // No registrar si no hay empresa actual
    if (!empresaActual?.id) {
      console.warn('No se puede registrar uso: empresa no definida');
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('registrar_uso_app', {
        p_app_codigo: app,
        p_tipo_accion: accion,
        p_metadata: metadata
      });

      if (error) {
        console.error('Error registrando uso de app:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error en useAppUsageTracker:', error);
      return null;
    }
  }, [empresaActual?.id]);

  return {
    registrarUsoApp
  };
}

// Hook específico para registro automático de accesos a páginas
export function usePageAccessTracker() {
  const { registrarUsoApp } = useAppUsageTracker();

  const registrarAcceso = useCallback((pagina: string, rutaCompleta?: string) => {
    const appCode = getAppCodeFromPage(pagina);
    if (appCode) {
      registrarUsoApp({
        app: appCode,
        accion: 'acceso',
        metadata: {
          pagina,
          ruta: rutaCompleta || window.location.pathname,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [registrarUsoApp]);

  return {
    registrarAcceso
  };
}

// Mapeo de páginas a códigos de app
function getAppCodeFromPage(pagina: string): string | null {
  const pageToAppMap: Record<string, string> = {
    // Clientes
    '/': 'clientes',
    '/clientes': 'clientes',
    
    // Inventario
    '/inventario': 'inventario',
    '/alertas-stock': 'inventario',
    
    // Facturación
    '/facturas': 'facturacion-basica',
    '/facturas-saas': 'facturacion-basica',
    '/pagos': 'facturacion-basica',
    '/abonos': 'facturacion-basica',
    
    // Órdenes
    '/ordenes-reparacion': 'ordenes',
    '/ordenes': 'ordenes',
    
    // Bicicletas
    '/bicicletas': 'clientes', // Las bicicletas están ligadas al módulo clientes
    
    // Reportes y Analytics
    '/reportes': 'reportes-avanzados',
    '/analytics': 'reportes-avanzados',
    '/financial-dashboard': 'reportes-avanzados',
    
    // Alertas
    '/alertas': 'alertas',
    
    // Gestión de usuarios
    '/usuarios': 'gestion-usuarios',
    
    // Dashboard
    '/dashboard': 'dashboard'
  };

  return pageToAppMap[pagina] || null;
}

// Hook para acciones específicas (crear, editar, eliminar)
export function useActionTracker() {
  const { registrarUsoApp } = useAppUsageTracker();

  const registrarAccion = useCallback((appCode: string, accion: string, entidad?: string, entidadId?: string, metadata?: Record<string, any>) => {
    registrarUsoApp({
      app: appCode,
      accion,
      metadata: {
        entidad,
        entidad_id: entidadId,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }, [registrarUsoApp]);

  // Funciones específicas para acciones comunes
  const registrarCreacion = useCallback((appCode: string, entidad: string, entidadId: string, metadata?: Record<string, any>) => {
    registrarAccion(appCode, 'crear', entidad, entidadId, metadata);
  }, [registrarAccion]);

  const registrarEdicion = useCallback((appCode: string, entidad: string, entidadId: string, metadata?: Record<string, any>) => {
    registrarAccion(appCode, 'editar', entidad, entidadId, metadata);
  }, [registrarAccion]);

  const registrarEliminacion = useCallback((appCode: string, entidad: string, entidadId: string, metadata?: Record<string, any>) => {
    registrarAccion(appCode, 'eliminar', entidad, entidadId, metadata);
  }, [registrarAccion]);

  const registrarVisualizacion = useCallback((appCode: string, entidad: string, entidadId: string, metadata?: Record<string, any>) => {
    registrarAccion(appCode, 'ver', entidad, entidadId, metadata);
  }, [registrarAccion]);

  return {
    registrarAccion,
    registrarCreacion,
    registrarEdicion,
    registrarEliminacion,
    registrarVisualizacion
  };
}