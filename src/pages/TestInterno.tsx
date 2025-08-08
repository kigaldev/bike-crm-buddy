import { useEffect, useState } from 'react';
import { TestRunnerList } from '@/components/TestRunnerList';
import { TestLogViewer } from '@/components/TestLogViewer';
import { useUsuariosEmpresa } from '@/hooks/useUsuariosEmpresa';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

export default function TestInterno() {
  const { currentUserRole, loading } = useUsuariosEmpresa();
  const [selectedTestId, setSelectedTestId] = useState<string | undefined>();

  useEffect(() => {
    document.title = 'Testing interno | CRM Taller Bicicletas';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Testing interno por empresa: ejecuta y consulta logs de tests internos.');
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = 'Testing interno por empresa: ejecuta y consulta logs de tests internos.';
      document.head.appendChild(m);
    }
  }, []);

  if (loading) {
    return <div className="container mx-auto p-6">Cargando...</div>;
  }

  const allowed = currentUserRole === 'admin' || (currentUserRole as any) === 'qa';

  if (!allowed) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para acceder al Testing Interno. Solo administradores o QA.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Testing interno</h1>
      <p className="text-muted-foreground mb-6">Ejecuta tests y consulta los resultados por empresa.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TestRunnerList onSelect={(t) => setSelectedTestId(t.id)} />
        <TestLogViewer testId={selectedTestId} />
      </div>
    </main>
  );
}
