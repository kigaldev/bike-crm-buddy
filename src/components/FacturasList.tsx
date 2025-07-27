import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FacturaDetail } from "./FacturaDetail";
import { Search, Filter, DollarSign, Download, CheckCircle, MessageCircle, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "./ui/alert-dialog-confirm";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Factura {
  id: string;
  id_orden: string;
  id_cliente: string;
  fecha_emision: string;
  estado_pago: string;
  total: number;
  metodo_pago?: string;
  archivo_pdf?: string;
  numero_factura?: string;
  serie_factura?: string;
  ejercicio_fiscal?: number;
  base_imponible?: number;
  tipo_iva?: number;
  cuota_iva?: number;
  hash_anterior?: string;
  hash_actual?: string;
  emisor_nombre?: string;
  emisor_cif?: string;
  emisor_direccion?: string;
  cliente_nif?: string;
  fecha_pago?: string;
  es_rectificativa?: boolean;
  observaciones?: string;
  email_enviado?: boolean;
  email_fecha_envio?: string;
  whatsapp_enviado?: boolean;
  whatsapp_fecha_envio?: string;
  estado_notificacion?: string;
  created_at: string;
  updated_at: string;
  clientes?: {
    nombre: string;
    apellidos: string;
    telefono: string;
    email: string;
    direccion?: string;
  };
  ordenes_reparacion?: {
    descripcion_trabajo: string;
    fecha_entrada: string;
    fecha_estim_entrega?: string;
    bicicletas: {
      alias: string;
      marca: string;
      modelo: string;
      tipo: string;
    };
  };
}

const estadosPago = [
  { value: "todos", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "parcial", label: "Parcial" },
  { value: "cancelado", label: "Cancelado" }
];

const getEstadoBadgeVariant = (estado: string) => {
  switch (estado) {
    case "pagado":
      return "default";
    case "pendiente":
      return "destructive";
    case "parcial":
      return "secondary";
    case "cancelado":
      return "outline";
    default:
      return "outline";
  }
};

const getEstadoLabel = (estado: string) => {
  const estadosMap = {
    "pendiente": "💰 Pendiente",
    "pagado": "✅ Pagado",
    "parcial": "⚠️ Parcial",
    "cancelado": "❌ Cancelado"
  };
  return estadosMap[estado as keyof typeof estadosMap] || estado;
};

export const FacturasList = () => {
  const { toast } = useToast();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [filteredFacturas, setFilteredFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    fetchFacturas();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [facturas, searchTerm, estadoFilter, fechaDesde, fechaHasta]);

  const fetchFacturas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select(`
          *,
          clientes!inner(nombre, apellidos, telefono, email, direccion),
          ordenes_reparacion!inner(
            descripcion_trabajo,
            fecha_entrada,
            fecha_estim_entrega,
            bicicletas!inner(alias, marca, modelo, tipo)
          )
        `)
        .order('fecha_emision', { ascending: false });

      if (error) throw error;

      setFacturas(data || []);
    } catch (error) {
      console.error('Error fetching facturas:', error);
      toast({
        title: "Error",
        description: "Error al cargar las facturas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...facturas];

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(factura => 
        factura.clientes?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        factura.clientes?.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        factura.ordenes_reparacion?.bicicletas.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
        factura.ordenes_reparacion?.descripcion_trabajo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (estadoFilter && estadoFilter !== "todos") {
      filtered = filtered.filter(factura => factura.estado_pago === estadoFilter);
    }

    // Filtro por fecha desde
    if (fechaDesde) {
      filtered = filtered.filter(factura => factura.fecha_emision >= fechaDesde);
    }

    // Filtro por fecha hasta
    if (fechaHasta) {
      filtered = filtered.filter(factura => factura.fecha_emision <= fechaHasta);
    }

    setFilteredFacturas(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setEstadoFilter("");
    setFechaDesde("");
    setFechaHasta("");
  };

  const handleFacturaClick = (factura: Factura) => {
    setSelectedFactura(factura);
    setShowDetail(true);
  };

  const marcarComoPagada = async (facturaId: string) => {
    try {
      const { error } = await supabase
        .from('facturas')
        .update({ estado_pago: 'pagado' })
        .eq('id', facturaId);

      if (error) throw error;

      fetchFacturas();
      toast({
        title: "Factura actualizada",
        description: "La factura se ha marcado como pagada"
      });
    } catch (error) {
      console.error('Error updating factura:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la factura",
        variant: "destructive"
      });
    }
  };

  const enviarNotificaciones = async (facturaId: string, tipo: 'email' | 'whatsapp' | 'both') => {
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-notifications', {
        body: { facturaId, tipo }
      });

      if (error) throw error;

      toast({
        title: "Notificación enviada",
        description: `Notificación enviada correctamente por ${tipo}`
      });
      
      fetchFacturas(); // Refresh to show updated status
    } catch (error: any) {
      console.error('Error enviando notificación:', error);
      toast({
        title: "Error",
        description: `Error enviando notificación: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const enviarPorWhatsApp = (factura: Factura) => {
    const telefono = factura.clientes?.telefono?.replace(/[^\d]/g, '');
    const mensaje = `Hola ${factura.clientes?.nombre}, aquí tienes tu factura de reparación por $${factura.total.toFixed(2)}. ${factura.archivo_pdf ? `PDF: ${factura.archivo_pdf}` : ''}`;
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const descargarPDF = (factura: Factura) => {
    if (factura.archivo_pdf) {
      window.open(factura.archivo_pdf, '_blank');
    } else {
      toast({
        title: "PDF no disponible",
        description: "El PDF de esta factura no está disponible",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Cargando facturas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Facturas
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado de pago" />
              </SelectTrigger>
              <SelectContent>
                {estadosPago.map((estado) => (
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
            Mostrando {filteredFacturas.length} de {facturas.length} facturas
          </div>

          {/* Tabla */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Bicicleta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notificaciones</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFacturas.map((factura) => (
                  <TableRow 
                    key={factura.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleFacturaClick(factura)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {factura.numero_factura || factura.id.slice(-8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Serie: {factura.serie_factura || '001'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {factura.clientes?.nombre} {factura.clientes?.apellidos}
                        </p>
                        <p className="text-xs text-muted-foreground">{factura.clientes?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{factura.ordenes_reparacion?.bicicletas.alias}</p>
                        <p className="text-xs text-muted-foreground">
                          {factura.ordenes_reparacion?.bicicletas.marca} {factura.ordenes_reparacion?.bicicletas.modelo}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(factura.fecha_emision), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">${factura.total.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEstadoBadgeVariant(factura.estado_pago)}>
                        {getEstadoLabel(factura.estado_pago)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">📧</span>
                          {factura.email_enviado ? (
                            <Badge variant="default" className="text-xs">Enviado</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Pendiente</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">📱</span>
                          {factura.whatsapp_enviado ? (
                            <Badge variant="default" className="text-xs">Enviado</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Pendiente</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {factura.archivo_pdf && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => descargarPDF(factura)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {factura.estado_pago === 'pendiente' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => marcarComoPagada(factura.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => enviarNotificaciones(factura.id, 'both')}
                          title="Enviar por Email y WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredFacturas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron facturas que coincidan con los filtros.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para ver detalle */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedFactura && (
            <FacturaDetail
              factura={selectedFactura}
              onFacturaUpdated={fetchFacturas}
              onClose={() => setShowDetail(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};