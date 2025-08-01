import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePermission(recurso: string, accion: string): boolean {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('verificar_permiso_usuario', {
          p_recurso: recurso,
          p_accion: accion
        });

        if (error) {
          console.error('Error checking permission:', error);
          setHasPermission(false);
        } else {
          setHasPermission(data || false);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [recurso, accion, user]);

  return hasPermission;
}

export function usePermissions(permissions: Array<{ recurso: string; accion: string }>) {
  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setPermissionsMap({});
        setLoading(false);
        return;
      }

      try {
        const results = await Promise.all(
          permissions.map(async ({ recurso, accion }) => {
            const { data, error } = await supabase.rpc('verificar_permiso_usuario', {
              p_recurso: recurso,
              p_accion: accion
            });
            
            if (error) {
              console.error(`Error checking permission ${recurso}:${accion}:`, error);
              return { key: `${recurso}:${accion}`, hasPermission: false };
            }
            
            return { key: `${recurso}:${accion}`, hasPermission: data || false };
          })
        );

        const newPermissionsMap = results.reduce((acc, { key, hasPermission }) => {
          acc[key] = hasPermission;
          return acc;
        }, {} as Record<string, boolean>);

        setPermissionsMap(newPermissionsMap);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissionsMap({});
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [permissions, user]);

  const hasPermission = (recurso: string, accion: string) => {
    return permissionsMap[`${recurso}:${accion}`] || false;
  };

  return { hasPermission, loading };
}