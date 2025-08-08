import { useEffect, useMemo, useState } from 'react';
import { useTestRunner, TestLogItem } from '@/hooks/useTestRunner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCcw, Terminal } from 'lucide-react';

interface TestLogViewerProps {
  testId?: string;
}

export function TestLogViewer({ testId }: TestLogViewerProps) {
  const { getLogs } = useTestRunner();
  const [logs, setLogs] = useState<TestLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState<'todos' | 'exito' | 'error' | 'pendiente'>('todos');

  const load = async () => {
    if (!testId) {
      setLogs([]);
      return;
    }
    setLoading(true);
    const items = await getLogs(testId);
    setLogs(items);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const filtered = useMemo(() => {
    if (estado === 'todos') return logs;
    return logs.filter(l => l.estado === estado);
  }, [logs, estado]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Logs de ejecución</CardTitle>
          <CardDescription>Últimas ejecuciones del test seleccionado</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={estado} onValueChange={(v: any) => setEstado(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="exito">Éxito</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={!testId || loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refrescar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!testId ? (
          <p className="text-sm text-muted-foreground">Selecciona un test para ver sus logs.</p>
        ) : (
          <ScrollArea className="h-[520px] pr-2">
            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground">Sin registros.</div>
              )}
              {filtered.map((l) => (
                <div key={l.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      <span className="text-sm font-medium">{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                    <Badge variant={l.estado === 'exito' ? 'default' : l.estado === 'error' ? 'destructive' : 'secondary'}>
                      {l.estado}
                    </Badge>
                  </div>
                  {l.mensaje && (
                    <div className="mt-2 text-sm">{l.mensaje}</div>
                  )}
                  {l.error_stack && (
                    <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{l.error_stack}</pre>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
