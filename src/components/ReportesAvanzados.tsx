import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Users, 
  Package, 
  Download, 
  Calendar,
  PieChart,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface ResumenFinanciero {
  total_facturado: number;
  total_cobrado: number;
  total_abonos: number;
  total_pendiente: number;
  numero_ordenes: number;
  numero_facturas: number;
  numero_clientes: number;
  ticket_promedio: number;
}

interface FacturacionMensual {
  mes: number;
  mes_nombre: string;
  total_facturado: number;
  total_cobrado: number;
  numero_facturas: number;
  numero_ordenes: number;
}

interface TopCliente {
  cliente_id: string;
  nombre_completo: string;
  total_facturado: number;
  total_pagado: number;
  numero_ordenes: number;
  numero_facturas: number;
  ultima_factura: string;
}

interface MetodoPago {
  metodo_pago: string;
  total_monto: number;
  numero_pagos: number;
  porcentaje: number;
}

interface AnalisisInventario {
  total_productos: number;
  valor_total_inventario: number;
  productos_stock_bajo: number;
  productos_sin_stock: number;
  categoria_mayor_valor: string;
  producto_mayor_rotacion: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export function ReportesAvanzados() {
  const { toast } = useToast();
  const [fechas, setFechas] = useState({
    inicio: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    fin: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [anoSeleccionado, setAnoSeleccionado] = useState(new Date().getFullYear());

  // Query para resumen financiero
  const { data: resumenFinanciero, isLoading: resumenLoading } = useQuery({
    queryKey: ['resumen-financiero', fechas],
    queryFn: async (): Promise<ResumenFinanciero> => {
      const { data, error } = await supabase.rpc('obtener_resumen_financiero', {
        p_fecha_inicio: fechas.inicio,
        p_fecha_fin: fechas.fin
      });
      
      if (error) throw error;
      return data[0];
    }
  });

  // Query para facturación mensual
  const { data: facturacionMensual, isLoading: facturacionLoading } = useQuery({
    queryKey: ['facturacion-mensual', anoSeleccionado],
    queryFn: async (): Promise<FacturacionMensual[]> => {
      const { data, error } = await supabase.rpc('obtener_facturacion_mensual', {
        p_ano: anoSeleccionado
      });
      
      if (error) throw error;
      return data;
    }
  });

  // Query para top clientes
  const { data: topClientes, isLoading: clientesLoading } = useQuery({
    queryKey: ['top-clientes', fechas],
    queryFn: async (): Promise<TopCliente[]> => {
      const { data, error } = await supabase.rpc('obtener_top_clientes', {
        p_fecha_inicio: fechas.inicio,
        p_fecha_fin: fechas.fin,
        p_limite: 10
      });
      
      if (error) throw error;
      return data;
    }
  });

  // Query para métodos de pago
  const { data: metodosPago, isLoading: metodosLoading } = useQuery({
    queryKey: ['metodos-pago', fechas],
    queryFn: async (): Promise<MetodoPago[]> => {
      const { data, error } = await supabase.rpc('obtener_analisis_metodos_pago', {
        p_fecha_inicio: fechas.inicio,
        p_fecha_fin: fechas.fin
      });
      
      if (error) throw error;
      return data;
    }
  });

  // Query para análisis de inventario
  const { data: analisisInventario, isLoading: inventarioLoading } = useQuery({
    queryKey: ['analisis-inventario'],
    queryFn: async (): Promise<AnalisisInventario> => {
      const { data, error } = await supabase.rpc('obtener_analisis_inventario');
      
      if (error) throw error;
      return data[0];
    }
  });

  // Mutation para generar reporte
  const generarReporteMutation = useMutation({
    mutationFn: async ({ tipo, formato }: { tipo: string; formato: string }) => {
      const { data, error } = await supabase.functions.invoke('generar-reporte', {
        body: {
          tipo,
          fecha_inicio: fechas.inicio,
          fecha_fin: fechas.fin,
          formato
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Reporte generado",
        description: `Reporte ${variables.tipo} en formato ${variables.formato} generado exitosamente`
      });
      
      // Crear enlace de descarga
      const blob = new Blob([data], { 
        type: variables.formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-${variables.tipo}-${fechas.inicio}-${fechas.fin}.${variables.formato === 'pdf' ? 'pdf' : 'xlsx'}`;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Error generando reporte:', error);
      toast({
        title: "Error",
        description: "Error al generar el reporte",
        variant: "destructive"
      });
    }
  });

  const datosGraficoMensual = useMemo(() => {
    return facturacionMensual?.map(item => ({
      mes: item.mes_nombre,
      facturado: Number(item.total_facturado),
      cobrado: Number(item.total_cobrado),
      ordenes: item.numero_ordenes
    })) || [];
  }, [facturacionMensual]);

  const datosGraficoMetodos = useMemo(() => {
    return metodosPago?.map((metodo, index) => ({
      name: metodo.metodo_pago,
      value: Number(metodo.total_monto),
      porcentaje: Number(metodo.porcentaje),
      color: COLORS[index % COLORS.length]
    })) || [];
  }, [metodosPago]);

  const handleDescargarReporte = (tipo: string, formato: 'pdf' | 'excel') => {
    generarReporteMutation.mutate({ tipo, formato });
  };

  const isLoading = resumenLoading || facturacionLoading || clientesLoading || metodosLoading || inventarioLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reportes Avanzados</h1>
          <p className="text-muted-foreground">
            Análisis financiero y operativo con métricas clave
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleDescargarReporte('financiero', 'pdf')}
            disabled={generarReporteMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF Financiero
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDescargarReporte('operativo', 'excel')}
            disabled={generarReporteMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Excel Operativo
          </Button>
        </div>
      </div>

      {/* Filtros de fecha */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fechaInicio">Fecha inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={fechas.inicio}
                onChange={(e) => setFechas(prev => ({ ...prev, inicio: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="fechaFin">Fecha fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={fechas.fin}
                onChange={(e) => setFechas(prev => ({ ...prev, fin: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="ano">Año para gráficos</Label>
              <Select
                value={anoSeleccionado.toString()}
                onValueChange={(value) => setAnoSeleccionado(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `€${resumenFinanciero?.total_facturado?.toFixed(2) || '0.00'}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {resumenFinanciero?.numero_facturas || 0} facturas emitidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : `€${resumenFinanciero?.total_cobrado?.toFixed(2) || '0.00'}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Ratio cobro: {resumenFinanciero?.total_facturado ? 
                ((resumenFinanciero.total_cobrado / resumenFinanciero.total_facturado) * 100).toFixed(1) : '0'}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `€${resumenFinanciero?.ticket_promedio?.toFixed(2) || '0.00'}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {resumenFinanciero?.numero_ordenes || 0} órdenes procesadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : resumenFinanciero?.numero_clientes || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              En el período seleccionado
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="financiero" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financiero">Financiero</TabsTrigger>
          <TabsTrigger value="operativo">Operativo</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="financiero" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de facturación mensual */}
            <Card>
              <CardHeader>
                <CardTitle>Facturación Mensual {anoSeleccionado}</CardTitle>
                <CardDescription>
                  Evolución de facturación y cobros por mes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {datosGraficoMensual.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosGraficoMensual}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, '']} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="facturado" 
                        stroke="hsl(var(--primary))" 
                        name="Facturado"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cobrado" 
                        stroke="hsl(var(--secondary))" 
                        name="Cobrado"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No hay datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de métodos de pago */}
            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pago</CardTitle>
                <CardDescription>
                  Distribución de pagos por método
                </CardDescription>
              </CardHeader>
              <CardContent>
                {datosGraficoMetodos.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={datosGraficoMetodos}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, porcentaje }) => `${name}: ${porcentaje.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {datosGraficoMetodos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Total']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    No hay datos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabla de métodos de pago */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Métodos de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>N° Pagos</TableHead>
                    <TableHead>Porcentaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metodosPago?.map((metodo) => (
                    <TableRow key={metodo.metodo_pago}>
                      <TableCell className="font-medium">{metodo.metodo_pago}</TableCell>
                      <TableCell>€{metodo.total_monto.toFixed(2)}</TableCell>
                      <TableCell>{metodo.numero_pagos}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {metodo.porcentaje.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operativo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Órdenes Totales</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {resumenFinanciero?.numero_ordenes || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventario</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{analisisInventario?.valor_total_inventario?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analisisInventario?.total_productos || 0} productos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {analisisInventario?.productos_stock_bajo || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Productos por reponer
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {analisisInventario?.productos_sin_stock || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Productos agotados
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Clientes</CardTitle>
              <CardDescription>
                Clientes con mayor facturación en el período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total Facturado</TableHead>
                    <TableHead>Total Pagado</TableHead>
                    <TableHead>N° Órdenes</TableHead>
                    <TableHead>Última Factura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClientes?.map((cliente) => (
                    <TableRow key={cliente.cliente_id}>
                      <TableCell className="font-medium">
                        {cliente.nombre_completo}
                      </TableCell>
                      <TableCell>€{cliente.total_facturado.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600">
                        €{cliente.total_pagado.toFixed(2)}
                      </TableCell>
                      <TableCell>{cliente.numero_ordenes}</TableCell>
                      <TableCell>
                        {format(new Date(cliente.ultima_factura), 'dd/MM/yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventario" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Inventario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Productos:</span>
                  <Badge>{analisisInventario?.total_productos || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Valor Total:</span>
                  <Badge variant="secondary">
                    €{analisisInventario?.valor_total_inventario?.toFixed(2) || '0.00'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Categoría Mayor Valor:</span>
                  <Badge variant="outline">
                    {analisisInventario?.categoria_mayor_valor || 'N/A'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Producto Más Usado:</span>
                  <Badge variant="outline">
                    {analisisInventario?.producto_mayor_rotacion || 'N/A'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas de Inventario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <span>Stock Bajo</span>
                  </div>
                  <Badge variant="destructive">
                    {analisisInventario?.productos_stock_bajo || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <X className="h-5 w-5 text-red-500" />
                    <span>Sin Stock</span>
                  </div>
                  <Badge variant="destructive">
                    {analisisInventario?.productos_sin_stock || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}