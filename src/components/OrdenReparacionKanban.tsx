import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OrdenReparacionDetail } from "./OrdenReparacionDetail";
import { OrdenReparacionForm } from "./OrdenReparacionForm";
import { Plus, User, Bike, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrdenReparacion {
  id: string;
  cliente_id: string;
  bicicleta_id: string;
  estado: string;
  descripcion_trabajo?: string;
  fecha_entrada: string;
  fecha_estim_entrega?: string;
  costo_estimado?: number;
  fotos_antes?: string[];
  fotos_despues?: string[];
  created_at: string;
  updated_at: string;
  clientes?: {
    nombre: string;
    apellidos: string;
    telefono: string;
  };
  bicicletas?: {
    alias: string;
    marca: string;
    modelo: string;
  };
}

const estadosKanban = [
  { value: "Recibido", label: "📥 Recibido", color: "bg-blue-100 border-blue-300" },
  { value: "Diagnóstico", label: "🔍 Diagnóstico", color: "bg-yellow-100 border-yellow-300" },
  { value: "En reparación", label: "⚙️ En reparación", color: "bg-orange-100 border-orange-300" },
  { value: "Esperando repuestos", label: "⏳ Esperando repuestos", color: "bg-red-100 border-red-300" },
  { value: "Finalizado", label: "✅ Finalizado", color: "bg-green-100 border-green-300" },
  { value: "Avisar cliente", label: "📞 Avisar cliente", color: "bg-purple-100 border-purple-300" },
  { value: "Entregado", label: "🚚 Entregado", color: "bg-gray-100 border-gray-300" }
];

export const OrdenReparacionKanban = () => {
  const { toast } = useToast();
  const [ordenes, setOrdenes] = useState<OrdenReparacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrden, setSelectedOrden] = useState<OrdenReparacion | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [draggedOrden, setDraggedOrden] = useState<OrdenReparacion | null>(null);

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const fetchOrdenes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ordenes_reparacion')
        .select(`
          *,
          clientes!inner(nombre, apellidos, telefono),
          bicicletas!inner(alias, marca, modelo)
        `)
        .order('fecha_entrada', { ascending: false });

      if (error) throw error;

      setOrdenes(data || []);
    } catch (error) {
      console.error('Error fetching ordenes:', error);
      toast({
        title: "Error",
        description: "Error al cargar las órdenes de reparación",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrdenEstado = async (ordenId: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('ordenes_reparacion')
        .update({ estado: nuevoEstado })
        .eq('id', ordenId);

      if (error) throw error;

      // Actualizar el estado local
      setOrdenes(prev => 
        prev.map(orden => 
          orden.id === ordenId 
            ? { ...orden, estado: nuevoEstado }
            : orden
        )
      );

      toast({
        title: "Estado actualizado",
        description: "El estado de la orden se ha actualizado correctamente"
      });
    } catch (error) {
      console.error('Error updating orden estado:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el estado de la orden",
        variant: "destructive"
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, orden: OrdenReparacion) => {
    setDraggedOrden(orden);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, nuevoEstado: string) => {
    e.preventDefault();
    if (draggedOrden && draggedOrden.estado !== nuevoEstado) {
      updateOrdenEstado(draggedOrden.id, nuevoEstado);
    }
    setDraggedOrden(null);
  };

  const handleOrdenClick = (orden: OrdenReparacion) => {
    setSelectedOrden(orden);
    setShowDetail(true);
  };

  const handleOrdenCreated = () => {
    fetchOrdenes();
    setShowForm(false);
  };

  const handleOrdenUpdated = () => {
    fetchOrdenes();
    setShowDetail(false);
  };

  const getOrdenesByEstado = (estado: string) => {
    return ordenes.filter(orden => orden.estado === estado);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Cargando órdenes de reparación...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Kanban - Órdenes de Reparación</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto">
        {estadosKanban.map((estado) => {
          const ordenesEnEstado = getOrdenesByEstado(estado.value);
          
          return (
            <div
              key={estado.value}
              className={`min-h-[500px] rounded-lg border-2 border-dashed p-3 ${estado.color}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, estado.value)}
            >
              <div className="mb-4">
                <h3 className="font-semibold text-sm">{estado.label}</h3>
                <Badge variant="secondary" className="mt-1">
                  {ordenesEnEstado.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {ordenesEnEstado.map((orden) => (
                  <Card
                    key={orden.id}
                    className="cursor-move hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={(e) => handleDragStart(e, orden)}
                    onClick={() => handleOrdenClick(orden)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs">
                          <User className="w-3 h-3" />
                          <span className="font-medium truncate">
                            {orden.clientes?.nombre} {orden.clientes?.apellidos}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Bike className="w-3 h-3" />
                          <span className="truncate">
                            {orden.bicicletas?.alias}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(new Date(orden.fecha_entrada), "dd/MM", { locale: es })}
                          </span>
                        </div>
                        
                        {orden.costo_estimado && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="w-3 h-3" />
                            <span>${orden.costo_estimado.toFixed(0)}</span>
                          </div>
                        )}
                        
                        {orden.descripcion_trabajo && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {orden.descripcion_trabajo}
                          </p>
                        )}
                        
                        {orden.fecha_estim_entrega && (
                          <div className="text-xs text-red-600">
                            Entrega: {format(new Date(orden.fecha_estim_entrega), "dd/MM", { locale: es })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog para crear orden */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <OrdenReparacionForm
            onOrdenCreated={handleOrdenCreated}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalle */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOrden && (
            <OrdenReparacionDetail
              orden={selectedOrden}
              onOrdenUpdated={handleOrdenUpdated}
              onClose={() => setShowDetail(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};