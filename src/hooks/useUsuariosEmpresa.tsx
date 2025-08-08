import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEmpresa } from './useEmpresaContext';

export type RolEmpresa = 'admin' | 'manager' | 'tecnico' | 'usuario' | 'qa';

export interface UsuarioEmpresa {
  id: string;
  user_id: string;
  empresa_id: string;
  rol: RolEmpresa;
  activo: boolean;
  fecha_invitacion: string;
  invitado_por: string | null;
  usuario: {
    email: string;
    full_name: string | null;
  } | null;
}

export interface UsuarioRolContextType {
  usuarios: UsuarioEmpresa[];
  loading: boolean;
  currentUserRole: RolEmpresa | null;
  canManageUsers: boolean;
  canViewUsers: boolean;
  refreshUsuarios: () => Promise<void>;
  inviteUser: (email: string, rol: RolEmpresa) => Promise<{ error: any }>;
  updateUserRole: (usuarioEmpresaId: string, newRol: RolEmpresa) => Promise<{ error: any }>;
  deactivateUser: (usuarioEmpresaId: string) => Promise<{ error: any }>;
}

export function useUsuariosEmpresa(): UsuarioRolContextType {
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<RolEmpresa | null>(null);
  const { profile } = useAuth();
  const { empresaActual } = useEmpresa();

  // Función para obtener el rol del usuario actual en la empresa
  const fetchCurrentUserRole = async () => {
    if (!profile?.user_id || !empresaActual?.id) return;

    try {
      const { data, error } = await (supabase as any)
        .from('usuarios_empresas')
        .select('rol')
        .eq('user_id', profile.user_id)
        .eq('empresa_id', empresaActual.id)
        .eq('activo', true)
        .single();

      if (error) throw error;
      setCurrentUserRole(data.rol as RolEmpresa);
    } catch (error) {
      console.error('Error fetching current user role:', error);
      setCurrentUserRole(null);
    }
  };

  // Función para obtener todos los usuarios de la empresa
  const fetchUsuarios = async () => {
    if (!empresaActual?.id) {
      setUsuarios([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('usuarios_empresas')
        .select(`
          id,
          user_id,
          empresa_id,
          rol,
          activo,
          fecha_invitacion,
          invitado_por,
          profiles!usuarios_empresas_user_id_fkey (
            email,
            full_name
          )
        `)
        .eq('empresa_id', empresaActual.id)
        .order('fecha_invitacion', { ascending: false });

      if (error) throw error;

      const usuariosFormatted = data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        empresa_id: item.empresa_id,
        rol: item.rol as RolEmpresa,
        activo: item.activo,
        fecha_invitacion: item.fecha_invitacion,
        invitado_por: item.invitado_por,
        usuario: item.profiles ? {
          email: item.profiles.email,
          full_name: item.profiles.full_name
        } : null
      }));

      setUsuarios(usuariosFormatted);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsuarios = async () => {
    setLoading(true);
    await Promise.all([fetchUsuarios(), fetchCurrentUserRole()]);
  };

  // Función para invitar usuario
  const inviteUser = async (email: string, rol: RolEmpresa) => {
    if (!empresaActual?.id || !profile?.user_id) {
      return { error: { message: 'No se encontró empresa o usuario actual' } };
    }

    try {
      const { data, error } = await supabase.functions.invoke('invite-user-to-empresa', {
        body: {
          email,
          rol,
          empresa_id: empresaActual.id,
          invitado_por: profile.user_id
        }
      });

      if (error) throw error;

      // Refrescar la lista de usuarios
      await refreshUsuarios();
      return { error: null };
    } catch (error: any) {
      console.error('Error inviting user:', error);
      return { error };
    }
  };

  // Función para actualizar rol de usuario
  const updateUserRole = async (usuarioEmpresaId: string, newRol: RolEmpresa) => {
    try {
      const { error } = await (supabase as any)
        .from('usuarios_empresas')
        .update({ rol: newRol })
        .eq('id', usuarioEmpresaId);

      if (error) throw error;

      // Refrescar la lista de usuarios
      await refreshUsuarios();
      return { error: null };
    } catch (error: any) {
      console.error('Error updating user role:', error);
      return { error };
    }
  };

  // Función para desactivar usuario
  const deactivateUser = async (usuarioEmpresaId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('usuarios_empresas')
        .update({ activo: false })
        .eq('id', usuarioEmpresaId);

      if (error) throw error;

      // Refrescar la lista de usuarios
      await refreshUsuarios();
      return { error: null };
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      return { error };
    }
  };

  useEffect(() => {
    if (empresaActual?.id) {
      refreshUsuarios();
    } else {
      setUsuarios([]);
      setCurrentUserRole(null);
      setLoading(false);
    }
  }, [empresaActual?.id, profile?.user_id]);

  // Permisos basados en rol
  const canManageUsers = currentUserRole === 'admin';
  const canViewUsers = currentUserRole === 'admin' || currentUserRole === 'manager';

  return {
    usuarios,
    loading,
    currentUserRole,
    canManageUsers,
    canViewUsers,
    refreshUsuarios,
    inviteUser,
    updateUserRole,
    deactivateUser,
  };
}