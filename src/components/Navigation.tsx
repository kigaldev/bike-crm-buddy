import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bike, Users, Calendar, DollarSign, BarChart3, LogOut, Package, Shield, TrendingUp, CreditCard, RotateCcw, Bell, FileBarChart, UserCog, MessageSquarePlus, Palette, Settings } from "lucide-react";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUsuariosEmpresa } from "@/hooks/useUsuariosEmpresa";
import { useBranding } from "@/hooks/useBranding";
import { NotificationBell } from "@/components/NotificationBell";

export const Navigation = () => {
  const { profile, signOut } = useAuth();
  const { canViewUsers } = useUsuariosEmpresa();
  const { branding } = useBranding();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'tecnico': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'recepcion': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'auditor': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            {branding?.logo_url ? (
              <img 
                src={branding.logo_url} 
                alt="Logo" 
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Bike className="h-8 w-8 text-primary" />
            )}
            <h1 
              className="text-2xl font-bold"
              style={{ 
                color: branding?.color_primario || undefined,
                fontFamily: branding?.tipografia_base || undefined 
              }}
            >
              CRM Taller Bicicletas
            </h1>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link to="/dashboard">
              <Button variant="ghost" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
            </Link>
            
            <Link to="/">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Clientes</span>
              </Button>
            </Link>
            
            <Link to="/bicicletas">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Bike className="w-4 h-4" />
                <span>Bicicletas</span>
              </Button>
            </Link>
            
            <Link to="/inventario">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Inventario</span>
              </Button>
            </Link>
            
            <Link to="/ordenes">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Órdenes</span>
              </Button>
            </Link>
            
            <Link to="/facturas">
              <Button variant="ghost" className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Facturas</span>
              </Button>
            </Link>
            
            <Link to="/facturas-saas">
              <Button variant="ghost" className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span>SaaS</span>
              </Button>
            </Link>
            
            <Link to="/pagos">
              <Button variant="ghost" className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span>Pagos</span>
              </Button>
            </Link>
            
            <Link to="/abonos">
              <Button variant="ghost" className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4" />
                <span>Abonos</span>
              </Button>
            </Link>
            
            <Link to="/alertas">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Alertas</span>
              </Button>
            </Link>
            
            <Link to="/reportes">
              <Button variant="ghost" className="flex items-center space-x-2">
                <FileBarChart className="w-4 h-4" />
                <span>Reportes</span>
              </Button>
            </Link>
            
            <Link to="/feedback">
              <Button variant="ghost" className="flex items-center space-x-2">
                <MessageSquarePlus className="w-4 h-4" />
                <span>Feedback</span>
              </Button>
            </Link>
            
            <PermissionGuard recurso="usuarios" accion="ver">
              <Link to="/usuarios">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <UserCog className="w-4 h-4" />
                  <span>Usuarios</span>
                </Button>
              </Link>
            </PermissionGuard>
            
            {(profile?.rol === 'admin' || profile?.rol === 'auditor') && (
              <>
                <Link to="/logs">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Auditoría</span>
                  </Button>
                </Link>
                 <Link to="/analytics">
                   <Button variant="ghost" className="flex items-center space-x-2">
                     <TrendingUp className="w-4 h-4" />
                     <span>Analytics</span>
                   </Button>
                 </Link>
                 <Link to="/uso-apps">
                   <Button variant="ghost" className="flex items-center space-x-2">
                     <BarChart3 className="w-4 h-4" />
                     <span>Uso Apps</span>
                   </Button>
                 </Link>
                  <Link to="/financial-dashboard">
                   <Button variant="ghost" className="flex items-center space-x-2">
                     <BarChart3 className="w-4 h-4" />
                     <span>Dashboard Financiero</span>
                   </Button>
                 </Link>
            <PermissionGuard recurso="branding" accion="ver">
              <Link to="/branding">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Palette className="w-4 h-4" />
                  <span>Branding</span>
                </Button>
              </Link>
            </PermissionGuard>
            <PermissionGuard recurso="apps" accion="editar">
              <Link to="/config-apps">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Config Apps</span>
                </Button>
              </Link>
            </PermissionGuard>
            <PermissionGuard recurso="usuarios" accion="editar">
              <Link to="/permisos">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                       <span>Permisos</span>
                     </Button>
                   </Link>
                 </PermissionGuard>
              </>
            )}
            
            <NotificationBell />
            
            {profile && (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{profile.full_name || profile.email}</span>
                   <Badge className={getRoleColor(profile.rol)}>
                     {profile.rol}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};