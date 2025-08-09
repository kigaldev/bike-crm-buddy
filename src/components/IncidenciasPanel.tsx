import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IncidenciaFormModal } from './IncidenciaFormModal';
import { useIncidencias, IncidenciaItem } from '@/hooks/useIncidencias';

export function IncidenciasPanel() {
  const { items, loading, fetchIncidencias, actualizarEstado, crearIncidencia, counts } = useIncidencias();
  const [estado, setEstado] = useState<'todas' | 'Abierta' | 'En curso' | 'Resuelta'>('todas');
  const [severidad, setSeveridad] = useState<'todas' | 'critica' | 'alta' | 'media' | 'baja'>('todas');
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    fetchIncidencias({ estado, severidad });
  }, [estado, severidad, fetchIncidencias]);

  const onCrearManual = useCallback(async (data: { test_codigo: string; titulo: string; detalle?: string; severidad?: string }) => {
    await crearIncidencia(data);
  }, [crearIncidencia]);

  const filtered = useMemo(() => items, [items]);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Incidencias</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={estado} onValueChange={(v: any) => setEstado(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="Abierta">Abiertas</SelectItem>
                <SelectItem value="En curso">En curso</SelectItem>
                <SelectItem value="Resuelta">Resueltas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severidad} onValueChange={(v: any) => setSeveridad(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Severidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setOpenModal(true)}>Crear incidencia manual</Button>
          </div>
        </div>
        <CardDescription>Gestiona incidencias internas por empresa</CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary">Total: {counts.total}</Badge>
          {Object.entries(counts.bySeveridad).map(([sev, n]) => (
            <Badge key={sev} variant="outline">{sev}: {n}</Badge>
          ))}
          {Object.entries(counts.byEstado).map(([est, n]) => (
            <Badge key={est} variant="outline">{est}: {n}</Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay incidencias.</p>
        )}
        <div className="space-y-3">
          {filtered.map((i: IncidenciaItem) => (
            <div key={i.id} className="rounded-md border p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{i.severidad}</Badge>
                    <Badge variant={i.estado === 'Resuelta' ? 'secondary' : 'default'}>{i.estado}</Badge>
                  </div>
                  <div className="text-sm font-medium">{i.titulo}</div>
                  <div className="text-xs text-muted-foreground">Test: {i.test_codigo}</div>
                  {i.detalle && <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{i.detalle}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => actualizarEstado(i.id, 'En curso')}>En curso</Button>
                  <Button size="sm" onClick={() => actualizarEstado(i.id, 'Resuelta')}>Marcar resuelta</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <IncidenciaFormModal open={openModal} onClose={() => setOpenModal(false)} onSubmit={onCrearManual} />
    </Card>
  );
}
