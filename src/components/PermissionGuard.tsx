import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGuardProps {
  recurso: string;
  accion: string;
  children: ReactNode;
  fallback?: ReactNode;
  hideWhenNoPermission?: boolean;
}

export function PermissionGuard({ 
  recurso, 
  accion, 
  children, 
  fallback,
  hideWhenNoPermission = true 
}: PermissionGuardProps) {
  const hasPermission = usePermission(recurso, accion);

  if (!hasPermission) {
    if (hideWhenNoPermission) {
      return null;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}