import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { UsuariosList } from "@/components/UsuariosList";
import { useUsuariosEmpresa } from "@/hooks/useUsuariosEmpresa";
import { useEmpresa } from "@/hooks/useEmpresaContext";
import { Users, Shield, Eye, Ban } from "lucide-react";

export default function Usuarios() {
  const { empresaActual } = useEmpresa();
  const {
    usuarios,
    loading,
    currentUserRole,
    canManageUsers,
    canViewUsers,
    inviteUser,
    updateUserRole,
    deactivateUser,
  } = useUsuariosEmpresa();

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canViewUsers) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-md mx-auto">
          <Ban className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para ver la gestión de usuarios. 
            Contacta con un administrador de tu empresa.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios de {empresaActual?.nombre_comercial}
          </p>
        </div>
        {canManageUsers && (
          <InviteUserDialog onInviteUser={inviteUser} />
        )}
      </div>

      {/* Información del usuario actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Tu Acceso</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Rol actual:</span>
              <span className="font-medium">{currentUserRole}</span>
            </div>
            <div className="flex items-center space-x-2">
              {canManageUsers ? (
                <>
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Puede gestionar usuarios</span>
                </>
              ) : canViewUsers ? (
                <>
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600">Solo lectura</span>
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">Sin acceso</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <UsuariosList
        usuarios={usuarios}
        canManageUsers={canManageUsers}
        onUpdateRole={updateUserRole}
        onDeactivateUser={deactivateUser}
      />

      {/* Información de roles */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Administrador</h4>
              <p className="text-sm text-muted-foreground">
                Acceso completo al sistema, puede gestionar usuarios y configuración
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Manager</h4>
              <p className="text-sm text-muted-foreground">
                Acceso de lectura a todas las funcionalidades, puede ver reportes
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Técnico</h4>
              <p className="text-sm text-muted-foreground">
                Acceso a órdenes de reparación, inventario y gestión de bicicletas
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Usuario</h4>
              <p className="text-sm text-muted-foreground">
                Acceso básico al sistema, funcionalidades limitadas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}