import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  AlertTriangle,
  Download,
  CalendarDays,
  CreditCard,
  Receipt,
  Banknote
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, differenceInDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface FinancialKPIs {
  totalFacturado: number;
  totalCobrado: number;
  totalAbonos: number;
  saldoPorCobrar: number;
  anticiposPendientes: number;
  facturasVencidas: number;
  margenBeneficio: number;
}

interface FlujoCajaData {
  mes: string;
  ingresos: number;
  egresos: number;
  neto: number;
}

interface TopCliente {
  id: string;
  nombre: string;
  apellidos: string;
  totalFacturado: number;
  totalPagado: number;
  totalAbonos: number;
  facturasPendientes: number;
  ultimaFactura: string;
}

interface VencimientoData {
  facturaId: string;
  numeroFactura: string;
  cliente: string;
  total: number;
  fechaEmision: string;
  diasVencido: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function FinancialDashboard() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Query principal para KPIs financieros
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['financial-kpis', dateRange],
    queryFn: async (): Promise<FinancialKPIs> => {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      // Facturas en el período
      const { data: facturas, error: facturasError } = await supabase
        .from('facturas')
        .select('*')
        .gte('fecha_emision', dateRange.start)
        .lte('fecha_emision', dateRange.end);

      if (facturasError) throw facturasError;

      // Pagos en el período
      const { data: pagos, error: pagosError } = await supabase
        .from('pagos')
        .select('*')
        .gte('fecha_pago', dateRange.start)
        .lte('fecha_pago', dateRange.end);

      if (pagosError) throw pagosError;

      // Abonos en el período
      const { data: abonos, error: abonosError } = await supabase
        .from('abonos')
        .select('*')
        .gte('fecha_abono', dateRange.start)
        .lte('fecha_abono', dateRange.end);

      if (abonosError) throw abonosError;

      const totalFacturado = facturas?.reduce((sum, f) => sum + Number(f.total), 0) || 0;
      const totalCobrado = pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0;
      const totalAbonos = abonos?.reduce((sum, a) => sum + Number(a.monto), 0) || 0;
      
      // Facturas pendientes
      const facturasPendientes = facturas?.filter(f => 
        f.estado_pago === 'pendiente' || f.estado_pago === 'parcial'
      ) || [];
      const saldoPorCobrar = facturasPendientes.reduce((sum, f) => sum + Number(f.total), 0);

      // Anticipos pendientes
      const anticiposPendientes = pagos?.filter(p => p.es_anticipo && !p.factura_id)
        .reduce((sum, p) => sum + Number(p.monto), 0) || 0;

      // Facturas vencidas (más de 30 días)
      const hoy = new Date();
      const facturasVencidas = facturasPendientes.filter(f => {
        const diasVencido = differenceInDays(hoy, parseISO(f.fecha_emision));
        return diasVencido > 30;
      }).length;

      const margenBeneficio = ((totalCobrado - totalAbonos) / totalFacturado) * 100 || 0;

      return {
        totalFacturado,
        totalCobrado,
        totalAbonos,
        saldoPorCobrar,
        anticiposPendientes,
        facturasVencidas,
        margenBeneficio
      };
    }
  });

  // Query para flujo de caja mensual
  const { data: flujoCaja, isLoading: flujoLoading } = useQuery({
    queryKey: ['flujo-caja', dateRange],
    queryFn: async (): Promise<FlujoCajaData[]> => {
      const { data: facturas } = await supabase
        .from('facturas')
        .select('total, fecha_emision, estado_pago')
        .gte('fecha_emision', dateRange.start)
        .lte('fecha_emision', dateRange.end);

      const { data: abonos } = await supabase
        .from('abonos')
        .select('monto, fecha_abono')
        .gte('fecha_abono', dateRange.start)
        .lte('fecha_abono', dateRange.end);

      const monthlyMap = new Map<string, { ingresos: number; egresos: number }>();

      // Procesar facturas como ingresos
      facturas?.forEach(factura => {
        if (factura.estado_pago === 'pagado') {
          const month = format(parseISO(factura.fecha_emision), 'yyyy-MM');
          const current = monthlyMap.get(month) || { ingresos: 0, egresos: 0 };
          monthlyMap.set(month, {
            ...current,
            ingresos: current.ingresos + Number(factura.total)
          });
        }
      });

      // Procesar abonos como egresos
      abonos?.forEach(abono => {
        const month = format(parseISO(abono.fecha_abono), 'yyyy-MM');
        const current = monthlyMap.get(month) || { ingresos: 0, egresos: 0 };
        monthlyMap.set(month, {
          ...current,
          egresos: current.egresos + Number(abono.monto)
        });
      });

      return Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          mes: format(parseISO(month + '-01'), 'MMM yyyy', { locale: es }),
          ingresos: data.ingresos,
          egresos: data.egresos,
          neto: data.ingresos - data.egresos
        }))
        .sort((a, b) => a.mes.localeCompare(b.mes));
    }
  });

  // Query para top clientes
  const { data: topClientes, isLoading: clientesLoading } = useQuery({
    queryKey: ['top-clientes', dateRange],
    queryFn: async (): Promise<TopCliente[]> => {
      // Obtener clientes con sus facturas
      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select(`
          id,
          nombre,
          apellidos,
          facturas (
            id,
            numero_factura,
            total,
            estado_pago,
            fecha_emision
          )
        `);

      if (clientesError) throw clientesError;

      // Obtener pagos por cliente
      const { data: pagos, error: pagosError } = await supabase
        .from('pagos')
        .select('cliente_id, monto, fecha_pago');

      if (pagosError) throw pagosError;

      // Obtener abonos por factura
      const { data: abonos, error: abonosError } = await supabase
        .from('abonos')
        .select('factura_original_id, monto, fecha_abono');

      if (abonosError) throw abonosError;

      return clientes?.map(cliente => {
        const facturasCliente = cliente.facturas || [];
        const pagosCliente = pagos?.filter(p => p.cliente_id === cliente.id) || [];
        
        // Obtener abonos para las facturas de este cliente
        const facturaIds = facturasCliente.map(f => f.id);
        const abonosCliente = abonos?.filter(a => 
          a.factura_original_id && facturaIds.includes(a.factura_original_id)
        ) || [];

        const totalFacturado = facturasCliente.reduce((sum, f) => sum + Number(f.total), 0);
        const totalPagado = pagosCliente.reduce((sum, p) => sum + Number(p.monto), 0);
        const totalAbonos = abonosCliente.reduce((sum, a) => sum + Number(a.monto), 0);
        const facturasPendientes = facturasCliente.filter(f => 
          f.estado_pago === 'pendiente' || f.estado_pago === 'parcial'
        ).length;

        const ultimaFactura = facturasCliente.length > 0 
          ? facturasCliente.sort((a, b) => 
              new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime()
            )[0].fecha_emision
          : '';

        return {
          id: cliente.id,
          nombre: cliente.nombre,
          apellidos: cliente.apellidos,
          totalFacturado,
          totalPagado,
          totalAbonos,
          facturasPendientes,
          ultimaFactura
        };
      }).sort((a, b) => b.totalFacturado - a.totalFacturado).slice(0, 10) || [];
    }
  });

  // Query para facturas vencidas
  const { data: facturasVencidas, isLoading: vencidoLoading } = useQuery({
    queryKey: ['facturas-vencidas'],
    queryFn: async (): Promise<VencimientoData[]> => {
      const { data: facturas, error } = await supabase
        .from('facturas')
        .select(`
          id,
          numero_factura,
          total,
          fecha_emision,
          estado_pago,
          clientes (
            nombre,
            apellidos
          )
        `)
        .in('estado_pago', ['pendiente', 'parcial']);

      if (error) throw error;

      const hoy = new Date();
      return facturas?.filter(factura => {
        const diasVencido = differenceInDays(hoy, parseISO(factura.fecha_emision));
        return diasVencido > 30;
      }).map(factura => {
        const diasVencido = differenceInDays(hoy, parseISO(factura.fecha_emision));
        return {
          facturaId: factura.id,
          numeroFactura: factura.numero_factura || 'Sin número',
          cliente: `${factura.clientes?.nombre} ${factura.clientes?.apellidos}`,
          total: Number(factura.total),
          fechaEmision: factura.fecha_emision,
          diasVencido
        };
      }).sort((a, b) => b.diasVencido - a.diasVencido) || [];
    }
  });

  const exportarReporte = async (tipo: 'csv' | 'pdf') => {
    try {
      setExportLoading(true);
      
      // Generar datos para exportación
      const reportData = {
        periodo: `${format(parseISO(dateRange.start), 'dd/MM/yyyy')} - ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`,
        kpis,
        flujoCaja,
        topClientes,
        facturasVencidas
      };

      if (tipo === 'csv') {
        const csvContent = generateCSVReport(reportData);
        downloadCSV(csvContent, `reporte-financiero-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      }

      toast({
        title: "Reporte exportado",
        description: `Reporte ${tipo.toUpperCase()} generado exitosamente`
      });
    } catch (error) {
      console.error('Error exportando reporte:', error);
      toast({
        title: "Error",
        description: "Error al exportar el reporte",
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };

  const generateCSVReport = (data: any) => {
    const headers = [
      'Período',
      'Total Facturado',
      'Total Cobrado',
      'Total Abonos',
      'Saldo por Cobrar',
      'Anticipos Pendientes',
      'Facturas Vencidas',
      'Margen Beneficio %'
    ];

    const rows = [
      [
        data.periodo,
        data.kpis?.totalFacturado?.toFixed(2) || '0',
        data.kpis?.totalCobrado?.toFixed(2) || '0',
        data.kpis?.totalAbonos?.toFixed(2) || '0',
        data.kpis?.saldoPorCobrar?.toFixed(2) || '0',
        data.kpis?.anticiposPendientes?.toFixed(2) || '0',
        data.kpis?.facturasVencidas || '0',
        data.kpis?.margenBeneficio?.toFixed(2) || '0'
      ]
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const [exportLoading, setExportLoading] = useState(false);

  const isLoading = kpisLoading || flujoLoading || clientesLoading || vencidoLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Financiero</h1>
          <p className="text-muted-foreground">
            Análisis completo del estado financiero de la empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportarReporte('csv')}
            disabled={exportLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros de fecha */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Fecha inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha fin</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
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
              {isLoading ? '...' : `€${kpis?.totalFacturado?.toFixed(2) || '0.00'}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : `€${kpis?.totalCobrado?.toFixed(2) || '0.00'}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Abonos</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? '...' : `€${kpis?.totalAbonos?.toFixed(2) || '0.00'}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo por Cobrar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isLoading ? '...' : `€${kpis?.saldoPorCobrar?.toFixed(2) || '0.00'}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anticipos Pendientes</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? '...' : `€${kpis?.anticiposPendientes?.toFixed(2) || '0.00'}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? '...' : kpis?.facturasVencidas || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Beneficio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${kpis?.margenBeneficio?.toFixed(1) || '0.0'}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flujo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flujo">Flujo de Caja</TabsTrigger>
          <TabsTrigger value="clientes">Top Clientes</TabsTrigger>
          <TabsTrigger value="vencidas">Facturas Vencidas</TabsTrigger>
        </TabsList>

        <TabsContent value="flujo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flujo de Caja Mensual</CardTitle>
              <CardDescription>
                Evolución de ingresos, egresos y flujo neto por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {flujoCaja && flujoCaja.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={flujoCaja}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, '']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="ingresos" 
                      stroke="hsl(var(--primary))" 
                      name="Ingresos"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="egresos" 
                      stroke="hsl(var(--destructive))" 
                      name="Egresos"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="neto" 
                      stroke="hsl(var(--secondary))" 
                      name="Flujo Neto"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  No hay datos para mostrar en el período seleccionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Clientes</CardTitle>
              <CardDescription>
                Ranking de clientes por facturación total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total Facturado</TableHead>
                    <TableHead>Total Pagado</TableHead>
                    <TableHead>Abonos</TableHead>
                    <TableHead>Pendientes</TableHead>
                    <TableHead>Última Factura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClientes?.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">
                        {cliente.nombre} {cliente.apellidos}
                      </TableCell>
                      <TableCell>€{cliente.totalFacturado.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600">
                        €{cliente.totalPagado.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        €{cliente.totalAbonos.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cliente.facturasPendientes > 0 ? "destructive" : "secondary"}>
                          {cliente.facturasPendientes}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cliente.ultimaFactura ? 
                          format(parseISO(cliente.ultimaFactura), 'dd/MM/yyyy') : 
                          'Sin facturas'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencidas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Facturas Vencidas</CardTitle>
              <CardDescription>
                Facturas con más de 30 días de vencimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Días Vencido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasVencidas?.map((factura) => (
                    <TableRow key={factura.facturaId}>
                      <TableCell className="font-medium">
                        {factura.numeroFactura}
                      </TableCell>
                      <TableCell>{factura.cliente}</TableCell>
                      <TableCell>€{factura.total.toFixed(2)}</TableCell>
                      <TableCell>
                        {format(parseISO(factura.fechaEmision), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            factura.diasVencido > 90 ? "destructive" :
                            factura.diasVencido > 60 ? "default" : "secondary"
                          }
                        >
                          {factura.diasVencido} días
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}