import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { OrdenReparacionForm } from "./OrdenReparacionForm";
import { OrdenReparacionDetail } from "./OrdenReparacionDetail";
import { Plus, Search, Filter, Calendar, User, Bike } from "lucide-react";
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

const estadosOrden = [
  { value: "todos", label: "Todos los estados" },
  { value: "Recibido", label: "📥 Recibido" },
  { value: "Diagnóstico", label: "🔍 Diagnóstico" },
  { value: "En reparación", label: "⚙️ En reparación" },
  { value: "Esperando repuestos", label: "⏳ Esperando repuestos" },
  { value: "Finalizado", label: "✅ Finalizado" },
  { value: "Avisar cliente", label: "📞 Avisar cliente" },
  { value: "Entregado", label: "🚚 Entregado" }
];

const getEstadoBadgeVariant = (estado: string) => {
  switch (estado) {
    case "Recibido":
      return "secondary";
    case "Diagnóstico":
      return "outline";
    case "En reparación":
      return "default";
    case "Esperando repuestos":
      return "destructive";
    case "Finalizado":
      return "default";
    case "Avisar cliente":
      return "outline";
    case "Entregado":
      return "default";
    default:
      return "secondary";
  }
};

const getEstadoLabel = (estado: string) => {
  const estadosMap = {
    "Recibido": "📥 Recibido",
    "Diagnóstico": "🔍 Diagnóstico",
    "En reparación": "⚙️ En reparación",
    "Esperando repuestos": "⏳ Esperando repuestos",
    "Finalizado": "✅ Finalizado",
    "Avisar cliente": "📞 Avisar cliente",
    "Entregado": "🚚 Entregado"
  };
  return estadosMap[estado as keyof typeof estadosMap] || estado;
};

export const OrdenReparacionsList = () => {
  const { toast } = useToast();
  const [ordenes, setOrdenes] = useState<OrdenReparacion[]>([]);
  const [filteredOrdenes, setFilteredOrdenes] = useState<OrdenReparacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrden, setSelectedOrden] = useState<OrdenReparacion | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    fetchOrdenes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [ordenes, searchTerm, estadoFilter, fechaDesde, fechaHasta]);

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

  const applyFilters = () => {
    let filtered = [...ordenes];

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(orden => 
        orden.clientes?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orden.clientes?.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orden.bicicletas?.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orden.bicicletas?.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orden.bicicletas?.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orden.descripcion_trabajo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (estadoFilter && estadoFilter !== "todos") {
      filtered = filtered.filter(orden => orden.estado === estadoFilter);
    }

    // Filtro por fecha desde
    if (fechaDesde) {
      filtered = filtered.filter(orden => orden.fecha_entrada >= fechaDesde);
    }

    // Filtro por fecha hasta
    if (fechaHasta) {
      filtered = filtered.filter(orden => orden.fecha_entrada <= fechaHasta);
    }

    setFilteredOrdenes(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setEstadoFilter("");
    setFechaDesde("");
    setFechaHasta("");
  };

  const handleOrdenClick = (orden: OrdenReparacion) => {
    setSelectedOrden(orden);
    setShowDetail(true);
  };

  const handleOrdenCreated = (newOrden: OrdenReparacion) => {
    fetchOrdenes();
    setShowForm(false);
    toast({
      title: "Orden creada",
      description: "La orden de reparación se ha creado correctamente"
    });
  };

  const handleOrdenUpdated = (updatedOrden: OrdenReparacion) => {
    fetchOrdenes();
    setShowDetail(false);
    toast({
      title: "Orden actualizada",
      description: "La orden de reparación se ha actualizado correctamente"
    });
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
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Órdenes de Reparación
            </CardTitle>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Orden
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o bicicleta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {estadosOrden.map((estado) => (
                  <SelectItem key={estado.value} value={estado.value}>
                    {estado.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              placeholder="Fecha desde"
            />
            
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              placeholder="Fecha hasta"
            />
            
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          </div>

          {/* Resumen */}
          <div className="mb-4 text-sm text-muted-foreground">
            Mostrando {filteredOrdenes.length} de {ordenes.length} órdenes
          </div>

          {/* Tabla */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Bicicleta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Entrada</TableHead>
                  <TableHead>Fecha Est. Entrega</TableHead>
                  <TableHead>Costo Estimado</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdenes.map((orden) => (
                  <TableRow 
                    key={orden.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOrdenClick(orden)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {orden.clientes?.nombre} {orden.clientes?.apellidos}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{orden.bicicletas?.alias}</p>
                          <p className="text-xs text-muted-foreground">
                            {orden.bicicletas?.marca} {orden.bicicletas?.modelo}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEstadoBadgeVariant(orden.estado)}>
                        {getEstadoLabel(orden.estado)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(orden.fecha_entrada), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      {orden.fecha_estim_entrega 
                        ? format(new Date(orden.fecha_estim_entrega), "dd/MM/yyyy", { locale: es })
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {orden.costo_estimado ? `$${orden.costo_estimado.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      <p className="truncate max-w-xs" title={orden.descripcion_trabajo}>
                        {orden.descripcion_trabajo || "-"}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredOrdenes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron órdenes de reparación que coincidan con los filtros.
            </div>
          )}
        </CardContent>
      </Card>

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