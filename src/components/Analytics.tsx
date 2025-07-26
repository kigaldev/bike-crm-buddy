import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CalendarDays, DollarSign, Users, TrendingUp, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthlyData {
  month: string;
  ingresos: number;
  costos: number;
  margen: number;
}

interface ClientMetrics {
  nombre: string;
  apellidos: string;
  total_gastado: number;
  numero_ordenes: number;
  ultimo_servicio: string;
  ticket_promedio: number;
}

interface ServiceData {
  descripcion: string;
  count: number;
}

interface DayActivity {
  day: string;
  orders: number;
}

export function Analytics() {
  const [exportLoading, setExportLoading] = useState(false);

  // Query para datos de rentabilidad mensual
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['analytics-monthly'],
    queryFn: async () => {
      // Obtener facturas pagadas con sus órdenes
      const { data: facturas, error: facturasError } = await supabase
        .from('facturas')
        .select(`
          total,
          fecha_emision,
          estado_pago,
          id_orden,
          ordenes_reparacion (
            costo_estimado
          )
        `)
        .eq('estado_pago', 'pagado');

      if (facturasError) throw facturasError;

      const monthlyMap = new Map<string, { ingresos: number; costos: number }>();

      facturas?.forEach(factura => {
        const month = format(parseISO(factura.fecha_emision), 'yyyy-MM');
        const current = monthlyMap.get(month) || { ingresos: 0, costos: 0 };
        
        monthlyMap.set(month, {
          ingresos: current.ingresos + Number(factura.total),
          costos: current.costos + Number(factura.ordenes_reparacion?.costo_estimado || 0)
        });
      });

      const result: MonthlyData[] = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month: format(parseISO(month + '-01'), 'MMM yyyy', { locale: es }),
          ingresos: data.ingresos,
          costos: data.costos,
          margen: data.ingresos - data.costos
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return result;
    }
  });

  // Query para análisis de clientes
  const { data: clientMetrics, isLoading: clientLoading } = useQuery({
    queryKey: ['analytics-clients'],
    queryFn: async () => {
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select(`
          id,
          nombre,
          apellidos,
          facturas (
            total,
            estado_pago,
            fecha_emision
          ),
          ordenes_reparacion (
            fecha_entrada,
            descripcion_trabajo
          )
        `);

      if (error) throw error;

      const metrics: ClientMetrics[] = clientes?.map(cliente => {
        const facturasPagadas = cliente.facturas.filter(f => f.estado_pago === 'pagado');
        const total_gastado = facturasPagadas.reduce((sum, f) => sum + Number(f.total), 0);
        const numero_ordenes = cliente.ordenes_reparacion.length;
        const ultimaOrden = cliente.ordenes_reparacion
          .sort((a, b) => new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime())[0];

        return {
          nombre: cliente.nombre,
          apellidos: cliente.apellidos,
          total_gastado,
          numero_ordenes,
          ultimo_servicio: ultimaOrden ? format(parseISO(ultimaOrden.fecha_entrada), 'dd/MM/yyyy') : 'N/A',
          ticket_promedio: numero_ordenes > 0 ? total_gastado / numero_ordenes : 0
        };
      }).filter(m => m.total_gastado > 0) || [];

      return metrics.sort((a, b) => b.total_gastado - a.total_gastado);
    }
  });

  // Query para servicios y productividad
  const { data: serviceData, isLoading: serviceLoading } = useQuery({
    queryKey: ['analytics-services'],
    queryFn: async () => {
      const { data: ordenes, error } = await supabase
        .from('ordenes_reparacion')
        .select('descripcion_trabajo, fecha_entrada, fecha_estim_entrega, estado');

      if (error) throw error;

      // Servicios más realizados
      const serviceMap = new Map<string, number>();
      const dayActivityMap = new Map<string, number>();

      ordenes?.forEach(orden => {
        // Contar servicios
        if (orden.descripcion_trabajo) {
          const description = orden.descripcion_trabajo.toLowerCase().trim();
          serviceMap.set(description, (serviceMap.get(description) || 0) + 1);
        }

        // Actividad por día de la semana
        const dayOfWeek = format(parseISO(orden.fecha_entrada), 'EEEE', { locale: es });
        dayActivityMap.set(dayOfWeek, (dayActivityMap.get(dayOfWeek) || 0) + 1);
      });

      const services: ServiceData[] = Array.from(serviceMap.entries())
        .map(([desc, count]) => ({ descripcion: desc, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const dayActivity: DayActivity[] = Array.from(dayActivityMap.entries())
        .map(([day, orders]) => ({ day, orders }))
        .sort((a, b) => b.orders - a.orders);

      // Tiempo promedio de órdenes completadas
      const completedOrders = ordenes?.filter(o => 
        o.estado === 'Entregado' && o.fecha_estim_entrega
      ) || [];

      const avgTime = completedOrders.length > 0 
        ? completedOrders.reduce((sum, orden) => {
            const days = differenceInDays(
              parseISO(orden.fecha_estim_entrega!),
              parseISO(orden.fecha_entrada)
            );
            return sum + days;
          }, 0) / completedOrders.length
        : 0;

      return { services, dayActivity, avgTime };
    }
  });

  const exportToCSV = async () => {
    setExportLoading(true);
    try {
      if (!clientMetrics) return;

      const csvContent = [
        ['Cliente', 'Total Gastado', 'Número de Órdenes', 'Último Servicio', 'Ticket Promedio'],
        ...clientMetrics.map(client => [
          `${client.nombre} ${client.apellidos}`,
          client.total_gastado.toString(),
          client.numero_ordenes.toString(),
          client.ultimo_servicio,
          client.ticket_promedio.toFixed(2)
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-clientes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  if (monthlyLoading || clientLoading || serviceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalIngresos = monthlyData?.reduce((sum, m) => sum + m.ingresos, 0) || 0;
  const totalCostos = monthlyData?.reduce((sum, m) => sum + m.costos, 0) || 0;
  const totalMargen = totalIngresos - totalCostos;
  const topClient = clientMetrics?.[0];
  const avgTicket = clientMetrics?.length ? 
    clientMetrics.reduce((sum, c) => sum + c.ticket_promedio, 0) / clientMetrics.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Pro</h1>
          <p className="text-muted-foreground">
            Análisis de rentabilidad y desempeño del negocio
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={exportLoading}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalIngresos.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Neto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMargen.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalIngresos > 0 ? ((totalMargen / totalIngresos) * 100).toFixed(1) : 0}% margen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Cliente</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {topClient ? `${topClient.nombre} ${topClient.apellidos}` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              ${topClient?.total_gastado.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgTicket.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Tiempo prom: {serviceData?.avgTime.toFixed(1) || 0} días
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rentabilidad" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
        </TabsList>

        <TabsContent value="rentabilidad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Rentabilidad Mensual</CardTitle>
              <CardDescription>
                Comparativo de ingresos, costos y margen neto por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData?.length ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="ingresos" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Ingresos"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="costos" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      name="Costos"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="margen" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Margen Neto"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos suficientes para mostrar el análisis de rentabilidad
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Clientes</CardTitle>
              <CardDescription>
                Métricas de comportamiento y valor de clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientMetrics?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Total Gastado</TableHead>
                      <TableHead>Órdenes</TableHead>
                      <TableHead>Ticket Promedio</TableHead>
                      <TableHead>Último Servicio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientMetrics.slice(0, 10).map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {client.nombre} {client.apellidos}
                          {index === 0 && <Badge variant="secondary" className="ml-2">Top</Badge>}
                        </TableCell>
                        <TableCell>${client.total_gastado.toLocaleString()}</TableCell>
                        <TableCell>{client.numero_ordenes}</TableCell>
                        <TableCell>${client.ticket_promedio.toFixed(0)}</TableCell>
                        <TableCell>{client.ultimo_servicio}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos suficientes para mostrar el análisis de clientes
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicios" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Servicios Más Realizados</CardTitle>
                <CardDescription>Top 10 de servicios por frecuencia</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceData?.services.length ? (
                  <div className="space-y-2">
                    {serviceData.services.map((service, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm truncate mr-2" title={service.descripcion}>
                          {service.descripcion.charAt(0).toUpperCase() + service.descripcion.slice(1)}
                        </span>
                        <Badge variant="outline">{service.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay datos de servicios disponibles
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actividad por Día de la Semana</CardTitle>
                <CardDescription>Distribución de órdenes por día</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceData?.dayActivity.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={serviceData.dayActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay datos de actividad disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}