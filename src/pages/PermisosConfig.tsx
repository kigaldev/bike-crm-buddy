import { PermissionsManager } from '@/components/PermissionsManager';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

export default function PermisosConfig() {
  return (
    <div className="container mx-auto py-6">
      <PermissionGuard 
        recurso="usuarios" 
        accion="editar"
        fallback={
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para gestionar los permisos de usuario.
            </AlertDescription>
          </Alert>
        }
        hideWhenNoPermission={false}
      >
        <PermissionsManager />
      </PermissionGuard>
    </div>
  );
}