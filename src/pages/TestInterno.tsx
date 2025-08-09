import { useEffect, useMemo, useState } from 'react';
import { TestRunnerList } from '@/components/TestRunnerList';
import { TestLogViewer } from '@/components/TestLogViewer';
import { useUsuariosEmpresa } from '@/hooks/useUsuariosEmpresa';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Sparkles, Rocket, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTestRunner } from '@/hooks/useTestRunner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { IncidenciaFormModal } from '@/components/IncidenciaFormModal';
import { IncidenciasPanel } from '@/components/IncidenciasPanel';
import { useIncidencias } from '@/hooks/useIncidencias';

interface RunResult { codigo: string; nombre: string; estado: 'exito' | 'error' | 'pendiente'; duracionMs: number; mensaje?: string; }

export default function TestInterno() {
  const { currentUserRole, loading } = useUsuariosEmpresa();
  const [selectedTestId, setSelectedTestId] = useState<string | undefined>();
  const { tests, runTest, getLogs, preloadDemoTests, fetchTests } = useTestRunner();
  const { crearIncidencia } = useIncidencias();

  const [lastResults, setLastResults] = useState<RunResult[]>([]);
  const [lastPassAt, setLastPassAt] = useState<string | null>(null);
  const [runningSuite, setRunningSuite] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [disableOnboarding, setDisableOnboarding] = useState(true); // DISABLE_ONBOARDING_TEMP = true

  const [openIncModal, setOpenIncModal] = useState(false);
  const [incTestCodigo, setIncTestCodigo] = useState<string | undefined>();
  const [incDetalle, setIncDetalle] = useState<string | undefined>();

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

  const allowed = currentUserRole === 'admin' || (currentUserRole as any) === 'qa';

  const kpis = useMemo(() => {
    const total = lastResults.length;
    const exito = lastResults.filter(r => r.estado === 'exito').length;
    const fallo = lastResults.filter(r => r.estado === 'error').length;
    const totalMs = lastResults.reduce((a, b) => a + b.duracionMs, 0);
    return { total, exito, fallo, totalMs };
  }, [lastResults]);

  const runCodesInOrder = async (codes: string[]) => {
    const results: RunResult[] = [];
    for (const code of codes) {
      const test = tests.find(t => t.codigo === code);
      if (!test || !test.activo) continue;
      const start = performance.now();
      const res = await runTest(code);
      const end = performance.now();
      const estado = (res?.estado || 'pendiente') as RunResult['estado'];
      const mensaje = res?.mensaje as string | undefined;
      results.push({ codigo: code, nombre: test.nombre, estado, duracionMs: Math.round(end - start), mensaje });
      if (estado !== 'exito' && !openIncModal) {
        setIncTestCodigo(code);
        setIncDetalle(mensaje || '');
        setOpenIncModal(true);
      }
    }
    setLastResults(results);
    setLastPassAt(new Date().toISOString());
  };

  const ensureDemoTests = async () => {
    if (!tests || tests.length === 0) {
      await preloadDemoTests();
      await fetchTests();
    }
  };

  const handleRunSuite = async () => {
    setRunningSuite(true);
    await ensureDemoTests();
    await runCodesInOrder(['ping_api', 'permisos_basicos', 'ui_smoke', 'flujo_factura']);
    setRunningSuite(false);
  };

  const getLastEstadosFromLogs = async () => {
    const estados: Record<string, 'exito' | 'error' | 'pendiente'> = {};
    for (const t of tests) {
      const l = await getLogs(t.id);
      if (l && l.length > 0) {
        estados[t.codigo] = (l[0].estado as any) || 'pendiente';
      }
    }
    return estados;
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    let failing: string[] = [];
    if (lastResults.length > 0) {
      failing = lastResults.filter(r => r.estado === 'error').map(r => r.codigo);
    } else {
      const map = await getLastEstadosFromLogs();
      failing = Object.keys(map).filter(k => map[k] === 'error');
    }
    if (failing.length > 0) {
      await runCodesInOrder(failing);
    }
    setRetrying(false);
  };

  if (loading) {
    return <div className="container mx-auto p-6">Cargando...</div>;
  }

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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Testing interno</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 pr-4 border-r">
            <span className="text-sm text-muted-foreground">Habilitar onboarding al finalizar QA</span>
            <Switch checked={!disableOnboarding} onCheckedChange={(v) => setDisableOnboarding(!v)} />
          </div>
          <Button size="sm" variant="secondary" onClick={preloadDemoTests}>
            <Sparkles className="w-4 h-4 mr-2" /> Precargar tests demo
          </Button>
          <Button size="sm" onClick={handleRunSuite} disabled={runningSuite}>
            <Rocket className="w-4 h-4 mr-2" /> Ejecutar suite demo
          </Button>
          <Button size="sm" variant="outline" onClick={handleRetryFailed} disabled={retrying}>
            <RotateCw className="w-4 h-4 mr-2" /> Reintentar fallados
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground mb-4">Ejecuta tests y consulta los resultados por empresa.</p>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Total: {kpis.total}</Badge>
            <Badge>Éxitos: {kpis.exito}</Badge>
            <Badge variant="destructive">Fallos: {kpis.fallo}</Badge>
            <Badge variant="outline">Duración total: {Math.round(kpis.totalMs)} ms</Badge>
            {lastPassAt && <span className="text-xs text-muted-foreground">Último pase: {new Date(lastPassAt).toLocaleString()}</span>}
          </div>
          {lastResults.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Duración</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lastResults.map(r => (
                    <TableRow key={r.codigo}>
                      <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                      <TableCell>{r.nombre}</TableCell>
                      <TableCell>{r.estado === 'exito' ? <Badge>OK</Badge> : <Badge variant="destructive">Error</Badge>}</TableCell>
                      <TableCell>{r.duracionMs} ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="tests">
        <TabsList>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
        </TabsList>
        <TabsContent value="tests" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TestRunnerList 
              onSelect={(t) => setSelectedTestId(t.id)}
              onFailure={(t, errorMsg) => { setIncTestCodigo(t.codigo); setIncDetalle(errorMsg); setOpenIncModal(true); }}
            />
            <TestLogViewer testId={selectedTestId} />
          </div>
        </TabsContent>
        <TabsContent value="incidencias" className="mt-4">
          <IncidenciasPanel />
        </TabsContent>
      </Tabs>

      <IncidenciaFormModal
        open={openIncModal}
        onClose={() => setOpenIncModal(false)}
        defaultTestCodigo={incTestCodigo}
        defaultDetalle={incDetalle}
        onSubmit={async ({ test_codigo, titulo, detalle, severidad }) => {
          await crearIncidencia({ test_codigo, titulo, detalle, severidad });
        }}
      />
    </main>
  );
}
