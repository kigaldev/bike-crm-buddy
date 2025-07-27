import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PagoForm } from "./PagoForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Plus, Search, Filter, Receipt, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Pago {
  id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  referencia?: string;
  es_anticipo: boolean;
  es_parcial: boolean;
  estado_conciliacion: string;
  observaciones?: string;
  archivo_justificante?: string;
  clientes: {
    id: string;
    nombre: string;
    apellidos: string;
  };
  facturas?: {
    id: string;
    numero_factura: string;
    total: number;
  };
}

export const PagosList = () => {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [pagosFiltrados, setPagosFiltrados] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    estado: "",
    metodo: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const fetchPagos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          clientes(id, nombre, apellidos),
          facturas(id, numero_factura, total)
        `)
        .order('fecha_pago', { ascending: false });

      if (error) throw error;
      setPagos(data || []);
      setPagosFiltrados(data || []);
    } catch (error: any) {
      console.error('Error cargando pagos:', error);
      toast.error("Error al cargar los pagos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPagos();
  }, []);

  useEffect(() => {
    let resultados = [...pagos];

    // Filtro por búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultados = resultados.filter(pago =>
        `${pago.clientes.nombre} ${pago.clientes.apellidos}`.toLowerCase().includes(busqueda) ||
        pago.facturas?.numero_factura?.toLowerCase().includes(busqueda) ||
        pago.referencia?.toLowerCase().includes(busqueda)
      );
    }

    // Filtro por estado
    if (filtros.estado) {
      resultados = resultados.filter(pago => pago.estado_conciliacion === filtros.estado);
    }

    // Filtro por método
    if (filtros.metodo) {
      resultados = resultados.filter(pago => pago.metodo_pago === filtros.metodo);
    }

    // Filtro por fechas
    if (filtros.fechaDesde) {
      resultados = resultados.filter(pago => pago.fecha_pago >= filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      resultados = resultados.filter(pago => pago.fecha_pago <= filtros.fechaHasta);
    }

    setPagosFiltrados(resultados);
  }, [pagos, filtros]);

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: "",
      estado: "",
      metodo: "",
      fechaDesde: "",
      fechaHasta: "",
    });
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'conciliado': return 'default';
      case 'parcial': return 'secondary';
      case 'pendiente': return 'outline';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'conciliado': return 'Conciliado';
      case 'parcial': return 'Parcial';
      case 'pendiente': return 'Pendiente';
      case 'error': return 'Error';
      default: return estado;
    }
  };

  const getMetodoPagoLabel = (metodo: string) => {
    switch (metodo) {
      case 'efectivo': return 'Efectivo';
      case 'tarjeta': return 'Tarjeta';
      case 'transferencia': return 'Transferencia';
      case 'paypal': return 'PayPal';
      case 'stripe': return 'Stripe';
      case 'bizum': return 'Bizum';
      case 'cheque': return 'Cheque';
      case 'otro': return 'Otro';
      default: return metodo;
    }
  };

  const generarJustificante = async (pagoId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { pagoId }
      });

      if (error) throw error;

      // Crear y descargar el PDF
      const element = document.createElement('a');
      const file = new Blob([data.htmlContent], { type: 'text/html' });
      element.href = URL.createObjectURL(file);
      element.download = `justificante-${data.numeroRecibo}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("Justificante generado correctamente");
    } catch (error: any) {
      console.error('Error generando justificante:', error);
      toast.error("Error al generar el justificante");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando pagos...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Gestión de Pagos
            </CardTitle>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar cliente, factura, referencia..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                  className="pl-10"
                />
              </div>
              
              <Select value={filtros.estado} onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="conciliado">Conciliado</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtros.metodo} onValueChange={(value) => setFiltros(prev => ({ ...prev, metodo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los métodos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="bizum">Bizum</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Desde"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaDesde: e.target.value }))}
              />

              <Input
                type="date"
                placeholder="Hasta"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaHasta: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={limpiarFiltros}>
                <Filter className="w-4 h-4 mr-2" />
                Limpiar Filtros
              </Button>
              <div className="text-sm text-gray-600">
                Mostrando {pagosFiltrados.length} de {pagos.length} pagos
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagosFiltrados.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {pago.clientes.nombre} {pago.clientes.apellidos}
                        </div>
                        {pago.referencia && (
                          <div className="text-sm text-gray-500">
                            Ref: {pago.referencia}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {pago.facturas ? (
                        <div>
                          <div className="font-medium">{pago.facturas.numero_factura}</div>
                          <div className="text-sm text-gray-500">{pago.facturas.total}€</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Sin factura</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(pago.fecha_pago), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{pago.monto}€</div>
                    </TableCell>
                    <TableCell>
                      {getMetodoPagoLabel(pago.metodo_pago)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEstadoBadgeVariant(pago.estado_conciliacion)}>
                        {getEstadoLabel(pago.estado_conciliacion)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {pago.es_anticipo && (
                          <Badge variant="outline" className="text-xs">Anticipo</Badge>
                        )}
                        {pago.es_parcial && (
                          <Badge variant="secondary" className="text-xs">Parcial</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generarJustificante(pago.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron pagos con los filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>

      <PagoForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={fetchPagos}
      />
    </div>
  );
};