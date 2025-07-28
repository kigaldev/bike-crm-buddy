import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, UserX, Edit, CheckCircle, XCircle } from "lucide-react";
import { RolEmpresa, UsuarioEmpresa } from '@/hooks/useUsuariosEmpresa';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from "sonner";

interface UsuariosListProps {
  usuarios: UsuarioEmpresa[];
  canManageUsers: boolean;
  onUpdateRole: (usuarioEmpresaId: string, newRol: RolEmpresa) => Promise<{ error: any }>;
  onDeactivateUser: (usuarioEmpresaId: string) => Promise<{ error: any }>;
}

export function UsuariosList({ usuarios, canManageUsers, onUpdateRole, onDeactivateUser }: UsuariosListProps) {
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  const getRoleBadgeVariant = (rol: RolEmpresa) => {
    switch (rol) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'tecnico':
        return 'secondary';
      case 'usuario':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (rol: RolEmpresa) => {
    switch (rol) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Manager';
      case 'tecnico':
        return 'Técnico';
      case 'usuario':
        return 'Usuario';
      default:
        return rol;
    }
  };

  const handleRoleChange = async (usuarioEmpresaId: string, newRol: RolEmpresa) => {
    setLoadingUsers(prev => new Set(prev).add(usuarioEmpresaId));
    
    try {
      const { error } = await onUpdateRole(usuarioEmpresaId, newRol);
      
      if (error) {
        throw error;
      }

      toast.success('Rol actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Error al actualizar el rol');
    } finally {
      setLoadingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(usuarioEmpresaId);
        return newSet;
      });
    }
  };

  const handleDeactivateUser = async (usuarioEmpresaId: string) => {
    setLoadingUsers(prev => new Set(prev).add(usuarioEmpresaId));
    
    try {
      const { error } = await onDeactivateUser(usuarioEmpresaId);
      
      if (error) {
        throw error;
      }

      toast.success('Usuario desactivado correctamente');
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      toast.error(error.message || 'Error al desactivar el usuario');
    } finally {
      setLoadingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(usuarioEmpresaId);
        return newSet;
      });
    }
  };

  if (usuarios.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay usuarios en esta empresa</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Usuarios de la Empresa ({usuarios.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de Invitación</TableHead>
              {canManageUsers && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {usuario.usuario?.full_name || 'Nombre no disponible'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {usuario.usuario?.email || 'Email no disponible'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {canManageUsers ? (
                    <Select
                      value={usuario.rol}
                      onValueChange={(newRol) => handleRoleChange(usuario.id, newRol as RolEmpresa)}
                      disabled={loadingUsers.has(usuario.id)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="usuario">Usuario</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(usuario.rol)}>
                      {getRoleLabel(usuario.rol)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {usuario.activo ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Activo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600">Inactivo</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(usuario.fecha_invitacion), {
                    addSuffix: true,
                    locale: es
                  })}
                </TableCell>
                {canManageUsers && (
                  <TableCell>
                    {usuario.activo && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={loadingUsers.has(usuario.id)}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Desactivar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción desactivará el acceso del usuario a la empresa. 
                              El usuario no podrá acceder a los datos hasta ser reactivado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeactivateUser(usuario.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Desactivar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}