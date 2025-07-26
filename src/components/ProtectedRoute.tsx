import { ReactNode } from 'react';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

// AUTH DISABLED - TEMPORAL: Allow access to all routes
export function ProtectedRoute({ children, allowedRoles, fallback }: ProtectedRouteProps) {
  // Always render children without auth checks
  return <>{children}</>;
}