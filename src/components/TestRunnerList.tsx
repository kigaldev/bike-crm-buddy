import { useEffect, useMemo, useState } from 'react';
import { useTestRunner, TestItem } from '@/hooks/useTestRunner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Rocket, RefreshCcw } from 'lucide-react';

interface TestRunnerListProps {
  onSelect?: (test: TestItem) => void;
}

export function TestRunnerList({ onSelect }: TestRunnerListProps) {
  const { tests, loadingTests, fetchTests, runTest } = useTestRunner();
  const [query, setQuery] = useState('');

  useEffect(() => {
    // Initial load performed by hook
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tests.filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      (t.descripcion || '').toLowerCase().includes(q) ||
      t.codigo.toLowerCase().includes(q)
    );
  }, [tests, query]);

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle>Tests disponibles</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchTests} disabled={loadingTests}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refrescar
          </Button>
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
                </div>
                <div className="flex items-center gap-2">
                  {onSelect && (
                    <Button variant="outline" size="sm" onClick={() => onSelect(t)}>Ver logs</Button>
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
