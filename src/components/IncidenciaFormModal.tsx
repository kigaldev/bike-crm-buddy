import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';

interface IncidenciaFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { test_codigo: string; titulo: string; detalle?: string; severidad?: string }) => Promise<void> | void;
  defaultTestCodigo?: string;
  defaultDetalle?: string;
}

export function IncidenciaFormModal({ open, onClose, onSubmit, defaultTestCodigo, defaultDetalle }: IncidenciaFormModalProps) {
  const [testCodigo, setTestCodigo] = useState(defaultTestCodigo || '');
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState(defaultDetalle || '');
  const [severidad, setSeveridad] = useState<string>('alta');

  useEffect(() => {
    setTestCodigo(defaultTestCodigo || '');
    setDetalle(defaultDetalle || '');
  }, [defaultTestCodigo, defaultDetalle]);

  const handleSubmit = async () => {
    if (!testCodigo || !titulo) return;
    await onSubmit({ test_codigo: testCodigo, titulo, detalle, severidad });
    onClose();
    setTitulo('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar incidencia</DialogTitle>
          <DialogDescription>Captura rápida de una incidencia detectada durante pruebas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="testCodigo">Test código</Label>
            <Input id="testCodigo" value={testCodigo} onChange={(e) => setTestCodigo(e.target.value)} placeholder="p.ej. ping_api" />
          </div>
          <div>
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Descripción breve del problema" />
          </div>
          <div>
            <Label htmlFor="detalle">Detalle</Label>
            <Textarea id="detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Pasos, error mostrado, contexto..." />
          </div>
          <div>
            <Label>Severidad</Label>
            <Select value={severidad} onValueChange={setSeveridad}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
