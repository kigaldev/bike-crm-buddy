import { Navigation } from "@/components/Navigation";
import { LogsList } from "@/components/LogsList";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Logs() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'auditor']}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 px-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Auditoría y Logs</h1>
            <p className="text-muted-foreground">
              Historial completo de actividades del sistema para auditoría y seguimiento.
            </p>
          </div>
          <LogsList />
        </main>
      </div>
    </ProtectedRoute>
  );
}