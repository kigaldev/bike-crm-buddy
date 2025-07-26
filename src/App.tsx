import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Bicicletas from "./pages/Bicicletas";
import Inventario from "./pages/Inventario";
import Facturas from "./pages/Facturas";
import OrdenesReparacion from "./pages/OrdenesReparacion";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'mecanico', 'recepcion']}>
            <Index />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'auditor']}>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bicicletas" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'mecanico']}>
            <Bicicletas />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/inventario" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'recepcion']}>
            <Inventario />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ordenes" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'mecanico', 'recepcion']}>
            <OrdenesReparacion />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/facturas" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'recepcion']}>
            <Facturas />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/logs" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'auditor']}>
            <Logs />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
