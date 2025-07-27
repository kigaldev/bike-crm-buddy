import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bike, Users, Calendar, DollarSign, BarChart3, LogOut, Package, Shield, TrendingUp, CreditCard, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const Navigation = () => {
  const { profile, signOut } = useAuth();

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
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">CRM Taller Bicicletas</h1>
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
            
            {(profile?.role === 'admin' || profile?.role === 'auditor') && (
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
                 <Link to="/financial-dashboard">
                   <Button variant="ghost" className="flex items-center space-x-2">
                     <BarChart3 className="w-4 h-4" />
                     <span>Dashboard Financiero</span>
                   </Button>
                 </Link>
              </>
            )}
            
            {profile && (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{profile.full_name || profile.email}</span>
                  <Badge className={getRoleColor(profile.role)}>
                    {profile.role}
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