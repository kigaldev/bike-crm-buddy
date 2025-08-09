import { useEffect, useMemo, useState } from 'react';
import { useTestRunner, TestItem } from '@/hooks/useTestRunner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Rocket, RefreshCcw, ListOrdered } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestRunnerListProps {
  onSelect?: (test: TestItem) => void;
}

export function TestRunnerList({ onSelect }: TestRunnerListProps) {
  const { tests, loadingTests, fetchTests, runTest, getLogs } = useTestRunner();
  const [query, setQuery] = useState('');
  const [runningAll, setRunningAll] = useState(false);
  const [logsCount, setLogsCount] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    // Initial load performed by hook
  }, []);

  useEffect(() => {
    async function loadCounts() {
      if (!tests.length) return;
      const entries = await Promise.all(
        tests.map(async (t) => {
          const l = await getLogs(t.id);
          return [t.id, l.length] as const;
        })
      );
      setLogsCount(Object.fromEntries(entries));
    }
    loadCounts();
  }, [tests, getLogs]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tests.filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      (t.descripcion || '').toLowerCase().includes(q) ||
      t.codigo.toLowerCase().includes(q)
    );
  }, [tests, query]);

  const handleRunAll = async () => {
    setRunningAll(true);
    let ok = 0, fail = 0;
    for (const t of filtered) {
      if (!t.activo) continue;
      const res = await runTest(t.codigo);
      if (res && res.estado === 'exito') ok++; else fail++;
    }
    toast({ title: 'Ejecución masiva completada', description: `${ok} OK, ${fail} con errores` });
    setRunningAll(false);
  };

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Tests disponibles</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleRunAll} disabled={loadingTests || runningAll || filtered.length === 0}>
              <Rocket className="w-4 h-4 mr-2" /> Ejecutar todos
            </Button>
            <Button variant="outline" size="sm" onClick={fetchTests} disabled={loadingTests}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refrescar
            </Button>
          </div>
        </div>
        <CardDescription>Ejecuta pruebas internas por empresa</CardDescription>
        <Input placeholder="Buscar por nombre o código" value={query} onChange={(e) => setQuery(e.target.value)} />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay tests disponibles.</p>
          )}
          {filtered.map((t) => (
            <div key={t.id} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{t.nombre}</CardTitle>
                    <Badge variant={t.activo ? 'default' : 'secondary'}>{t.tipo}</Badge>
                    {!t.activo && <Badge variant="secondary">inactivo</Badge>}
                  </div>
                  <CardDescription>{t.descripcion}</CardDescription>
                  <div className="text-xs text-muted-foreground">Código: {t.codigo}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ListOrdered className="w-3 h-3" /> Últimas ejecuciones: {logsCount[t.id] ?? 0}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onSelect && (
                    <Button variant="outline" size="sm" onClick={() => onSelect(t)}>Ver últimos logs</Button>
                  )}
                  <Button size="sm" onClick={() => runTest(t.codigo)} disabled={!t.activo}>
                    <Rocket className="w-4 h-4 mr-2" /> Ejecutar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
