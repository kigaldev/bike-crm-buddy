import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { EmpresaProvider } from "@/hooks/useEmpresaContext";
import { AppUsageMiddleware } from "@/components/AppUsageMiddleware";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Bicicletas from "./pages/Bicicletas";
import Inventario from "./pages/Inventario";
import AlertasStock from "./pages/AlertasStock";
import Facturas from "./pages/Facturas";
import Pagos from "./pages/Pagos";
import Abonos from "./pages/Abonos";
import OrdenesReparacion from "./pages/OrdenesReparacion";
import Dashboard from "./pages/Dashboard";
import Alertas from "./pages/Alertas";
import Reportes from "./pages/Reportes";
import Logs from "./pages/Logs";
import Analytics from "./pages/Analytics";
import FinancialDashboard from "./pages/FinancialDashboard";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Usuarios from "./pages/Usuarios";
import FacturasSaas from "./pages/FacturasSaas";
import UsoApps from "./pages/UsoApps";
import Feedback from "./pages/Feedback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected app routes - require empresa_actual
function ProtectedApp() {
  const { profile, loading: authLoading } = useAuth();
  
  // TEMPORAL: Flag para desactivar requerimiento de onboarding
  const DISABLE_ONBOARDING_TEMP = true;
  
  // If still loading auth, show loading
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }
  
  // If no empresa_actual in profile, redirect to onboarding (unless disabled temporarily)
  if (!DISABLE_ONBOARDING_TEMP && !profile?.empresa_actual) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <EmpresaProvider>
      <AppUsageMiddleware />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bicicletas" element={<Bicicletas />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/alertas-stock" element={<AlertasStock />} />
        <Route path="/ordenes" element={<OrdenesReparacion />} />
        <Route path="/facturas" element={<Facturas />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/abonos" element={<Abonos />} />
        <Route path="/alertas" element={<Alertas />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/financial-dashboard" element={<FinancialDashboard />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/facturas-saas" element={<FacturasSaas />} />
        <Route path="/uso-apps" element={<UsoApps />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </EmpresaProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
