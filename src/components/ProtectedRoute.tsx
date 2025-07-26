import { ReactNode } from 'react';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export function ProtectedRoute({ children, allowedRoles, fallback }: ProtectedRouteProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <ShieldX className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold">Acceso Denegado</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  No tienes permisos para acceder a esta sección.
                  {profile && (
                    <span className="block mt-1">
                      Tu rol actual: <strong>{profile.role}</strong>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}