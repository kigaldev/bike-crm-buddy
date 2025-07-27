import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AbonoForm } from "./AbonoForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Plus, Search, Filter, CreditCard, Eye, Mail, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Abono {
  id: string;
  numero_abono: string;
  fecha_abono: string;
  monto: number;
  tipo: string;
  motivo: string;
  metodo_pago?: string;
  referencia?: string;
  estado: string;
  observaciones?: string;
  archivo_pdf?: string;
  archivo_xml?: string;
  facturas?: {
    id: string;
    numero_factura: string;
    total: number;
    clientes: {
      nombre: string;
      apellidos: string;
      email: string;
      telefono: string;
    };
  };
}

export const AbonosList = () => {
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [abonosFiltrados, setAbonosFiltrados] = useState<Abono[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    tipo: "all",
    estado: "all",
    fechaDesde: "",
    fechaHasta: "",
  });

  const fetchAbonos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('abonos')
        .select(`
          *,
          facturas(
            id, 
            numero_factura, 
            total,
            clientes(nombre, apellidos, email, telefono)
          )
        `)
        .order('fecha_abono', { ascending: false });

      if (error) throw error;
      setAbonos(data || []);
      setAbonosFiltrados(data || []);
    } catch (error: any) {
      console.error('Error cargando abonos:', error);
      toast.error("Error al cargar los abonos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbonos();
  }, []);

  useEffect(() => {
    let resultados = [...abonos];

    // Filtro por búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultados = resultados.filter(abono =>
        abono.numero_abono?.toLowerCase().includes(busqueda) ||
        abono.motivo?.toLowerCase().includes(busqueda) ||
        abono.facturas?.numero_factura?.toLowerCase().includes(busqueda) ||
        `${abono.facturas?.clientes.nombre} ${abono.facturas?.clientes.apellidos}`.toLowerCase().includes(busqueda)
      );
    }

    // Filtro por tipo
    if (filtros.tipo && filtros.tipo !== "all") {
      resultados = resultados.filter(abono => abono.tipo === filtros.tipo);
    }

    // Filtro por estado
    if (filtros.estado && filtros.estado !== "all") {
      resultados = resultados.filter(abono => abono.estado === filtros.estado);
    }

    // Filtro por fechas
    if (filtros.fechaDesde) {
      resultados = resultados.filter(abono => abono.fecha_abono >= filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      resultados = resultados.filter(abono => abono.fecha_abono <= filtros.fechaHasta);
    }

    setAbonosFiltrados(resultados);
  }, [abonos, filtros]);

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: "",
      tipo: "all",
      estado: "all",
      fechaDesde: "",
      fechaHasta: "",
    });
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'nota_credito': return 'default';
      case 'reembolso': return 'secondary';
      default: return 'outline';
    }
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'emitido': return 'default';
      case 'cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'nota_credito': return 'Nota Crédito';
      case 'reembolso': return 'Reembolso';
      default: return tipo;
    }
  };

  const generarPDF = async (abonoId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-abono-pdf', {
        body: { abonoId }
      });

      if (error) throw error;

      // Crear y descargar el PDF
      const element = document.createElement('a');
      const file = new Blob([data.htmlContent], { type: 'text/html' });
      element.href = URL.createObjectURL(file);
      element.download = `${data.fileName}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("PDF de abono generado correctamente");
      fetchAbonos(); // Refresh para mostrar el archivo actualizado
    } catch (error: any) {
      console.error('Error generando PDF:', error);
      toast.error("Error al generar el PDF");
    }
  };

  const enviarNotificacion = async (abonoId: string, tipo: 'email' | 'whatsapp' | 'both') => {
    try {
      const { data, error } = await supabase.functions.invoke('send-abono-notifications', {
        body: { abonoId, tipo }
      });

      if (error) throw error;

      toast.success(`Notificación de abono enviada correctamente por ${tipo}`);
    } catch (error: any) {
      console.error('Error enviando notificación:', error);
      toast.error(`Error enviando notificación: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando abonos...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Gestión de Abonos y Devoluciones
            </CardTitle>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Abono
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
                  placeholder="Buscar cliente, número, motivo..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                  className="pl-10"
                />
              </div>
              
              <Select value={filtros.tipo} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="nota_credito">Nota de Crédito</SelectItem>
                  <SelectItem value="reembolso">Reembolso</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtros.estado} onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="emitido">Emitido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
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
                Mostrando {abonosFiltrados.length} de {abonos.length} abonos
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Factura Orig.</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abonosFiltrados.map((abono) => (
                  <TableRow key={abono.id}>
                    <TableCell>
                      <div className="font-medium">{abono.numero_abono}</div>
                      {abono.referencia && (
                        <div className="text-sm text-gray-500">Ref: {abono.referencia}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {abono.facturas ? (
                        <div>
                          <div className="font-medium">
                            {abono.facturas.clientes.nombre} {abono.facturas.clientes.apellidos}
                          </div>
                          <div className="text-sm text-gray-500">{abono.facturas.clientes.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Sin cliente asociado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(abono.fecha_abono), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTipoBadgeVariant(abono.tipo)}>
                        {getTipoLabel(abono.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-red-600">-€{abono.monto.toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEstadoBadgeVariant(abono.estado)}>
                        {abono.estado === 'emitido' ? 'Emitido' : 'Cancelado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {abono.facturas ? (
                        <div>
                          <div className="font-medium">{abono.facturas.numero_factura}</div>
                          <div className="text-sm text-gray-500">€{abono.facturas.total.toFixed(2)}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Sin factura</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generarPDF(abono.id)}
                          title="Generar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {abono.facturas && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => enviarNotificacion(abono.id, 'email')}
                              title="Enviar por Email"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => enviarNotificacion(abono.id, 'whatsapp')}
                              title="Enviar por WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {abonosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron abonos con los filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>

      <AbonoForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={fetchAbonos}
      />
    </div>
  );
};