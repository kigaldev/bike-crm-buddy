import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresaContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Shield, Users, Settings } from 'lucide-react';

interface Permission {
  id: string;
  rol: string;
  recurso: string;
  accion: string;
  permitido: boolean;
}

const RECURSOS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'usuarios', label: 'Usuarios', icon: '👥' },
  { key: 'clientes', label: 'Clientes', icon: '👤' },
  { key: 'bicicletas', label: 'Bicicletas', icon: '🚴' },
  { key: 'ordenes', label: 'Órdenes', icon: '🔧' },
  { key: 'facturas', label: 'Facturas', icon: '📄' },
  { key: 'pagos', label: 'Pagos', icon: '💰' },
  { key: 'abonos', label: 'Abonos', icon: '💳' },
  { key: 'inventario', label: 'Inventario', icon: '📦' },
  { key: 'alertas', label: 'Alertas', icon: '🔔' },
  { key: 'feedback', label: 'Feedback', icon: '💬' },
  { key: 'notificaciones', label: 'Notificaciones', icon: '📢' },
  { key: 'branding', label: 'Branding', icon: '🎨' },
  { key: 'suscripciones', label: 'Suscripciones', icon: '💎' },
  { key: 'apps', label: 'Apps', icon: '📱' }
];

const ACCIONES = [
  { key: 'ver', label: 'Ver', color: 'bg-blue-500' },
  { key: 'crear', label: 'Crear', color: 'bg-green-500' },
  { key: 'editar', label: 'Editar', color: 'bg-yellow-500' },
  { key: 'eliminar', label: 'Eliminar', color: 'bg-red-500' }
];

const ROLES = [
  { key: 'admin', label: 'Administrador', icon: '👑' },
  { key: 'manager', label: 'Manager', icon: '👔' },
  { key: 'usuario', label: 'Usuario', icon: '👤' }
];

export function PermissionsManager() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { empresaActual } = useEmpresa();

  useEffect(() => {
    if (empresaActual) {
      fetchPermissions();
    }
  }, [empresaActual]);

  const fetchPermissions = async () => {
    if (!empresaActual) return;

    try {
      const { data, error } = await supabase
        .from('permisos_roles_empresa')
        .select('*')
        .eq('empresa_id', empresaActual.id)
        .order('rol')
        .order('recurso')
        .order('accion');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (id: string, permitido: boolean) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('permisos_roles_empresa')
        .update({ permitido })
        .eq('id', id);

      if (error) throw error;

      setPermissions(prev => 
        prev.map(p => p.id === id ? { ...p, permitido } : p)
      );

      toast.success('Permiso actualizado correctamente');
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Error al actualizar permiso');
    } finally {
      setUpdating(null);
    }
  };

  const getPermission = (rol: string, recurso: string, accion: string) => {
    return permissions.find(p => 
      p.rol === rol && p.recurso === recurso && p.accion === accion
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <div>
          <h2 className="text-2xl font-bold">Gestión de Permisos</h2>
          <p className="text-muted-foreground">
            Configura qué puede hacer cada rol en tu empresa
          </p>
        </div>
      </div>

      <Tabs defaultValue="admin" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          {ROLES.map(rol => (
            <TabsTrigger key={rol.key} value={rol.key} className="flex items-center gap-2">
              <span>{rol.icon}</span>
              {rol.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ROLES.map(rol => (
          <TabsContent key={rol.key} value={rol.key}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{rol.icon}</span>
                  Permisos para {rol.label}
                </CardTitle>
                <CardDescription>
                  Configura qué recursos y acciones están disponibles para este rol
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {RECURSOS.map(recurso => (
                    <div key={recurso.key}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{recurso.icon}</span>
                        <h4 className="font-medium">{recurso.label}</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 ml-8">
                        {ACCIONES.map(accion => {
                          const permission = getPermission(rol.key, recurso.key, accion.key);
                          const permissionId = permission?.id;
                          const isAllowed = permission?.permitido || false;
                          const isUpdating = updating === permissionId;

                          return (
                            <div 
                              key={accion.key}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="secondary" 
                                  className={`${accion.color} text-white`}
                                >
                                  {accion.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Switch
                                    checked={isAllowed}
                                    onCheckedChange={(checked) => {
                                      if (permissionId) {
                                        updatePermission(permissionId, checked);
                                      }
                                    }}
                                    disabled={!permissionId}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}