import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  Users, 
  Plus, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Package,
  AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { StockAlerts } from "@/components/StockAlerts";
import { AppUsageAlerts } from "@/components/AppUsageAlerts";

interface DashboardMetrics {
  ordenesActivas: number;
  ordenesFinalizadasHoy: number;
  ordenesDiagnostico: number;
  facturadoHoy: number;
  facturadoMes: number;
  facturasPendientes: number;
  totalClientes: number;
  totalOrdenes: number;
  // Nuevos KPIs de inventario
  productosStockBajo: number;
  valorTotalInventario: number;
  totalProductos: number;
}

interface RevenueData {
  fecha: string;
  ingresos: number;
  ordenes: number;
}

export const Dashboard = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    ordenesActivas: 0,
    ordenesFinalizadasHoy: 0,
    ordenesDiagnostico: 0,
    facturadoHoy: 0,
    facturadoMes: 0,
    facturasPendientes: 0,
    totalClientes: 0,
    totalOrdenes: 0,
    // Nuevos KPIs de inventario
    productosStockBajo: 0,
    valorTotalInventario: 0,
    totalProductos: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOrderMetrics(),
        fetchInvoiceMetrics(),
        fetchGeneralMetrics(),
        fetchInventoryMetrics(), // Nueva función para inventario
        fetchRevenueChart()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos del dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderMetrics = async () => {
    const today = new Date();
    
    // Órdenes activas (no entregadas)
    const { count: ordenesActivas } = await supabase
      .from('ordenes_reparacion')
      .select('*', { count: 'exact', head: true })
      .neq('estado', 'Entregado');

    // Órdenes finalizadas hoy
    const { count: ordenesFinalizadasHoy } = await supabase
      .from('ordenes_reparacion')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'Finalizado')
      .gte('updated_at', startOfDay(today).toISOString())
      .lte('updated_at', endOfDay(today).toISOString());

    // Órdenes en diagnóstico
    const { count: ordenesDiagnostico } = await supabase
      .from('ordenes_reparacion')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'Diagnóstico');

    setMetrics(prev => ({
      ...prev,
      ordenesActivas: ordenesActivas || 0,
      ordenesFinalizadasHoy: ordenesFinalizadasHoy || 0,
      ordenesDiagnostico: ordenesDiagnostico || 0,
    }));
  };

  const fetchInvoiceMetrics = async () => {
    const today = new Date();
    const startMonth = startOfMonth(today);
    const endMonth = endOfMonth(today);

    // Facturado hoy
    const { data: facturasHoy } = await supabase
      .from('facturas')
      .select('total')
      .eq('estado_pago', 'pagado')
      .gte('fecha_emision', format(today, 'yyyy-MM-dd'))
      .lte('fecha_emision', format(today, 'yyyy-MM-dd'));

    const facturadoHoy = facturasHoy?.reduce((sum, f) => sum + f.total, 0) || 0;

    // Facturado este mes
    const { data: facturasMes } = await supabase
      .from('facturas')
      .select('total')
      .eq('estado_pago', 'pagado')
      .gte('fecha_emision', format(startMonth, 'yyyy-MM-dd'))
      .lte('fecha_emision', format(endMonth, 'yyyy-MM-dd'));

    const facturadoMes = facturasMes?.reduce((sum, f) => sum + f.total, 0) || 0;

    // Facturas pendientes
    const { count: facturasPendientes } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true })
      .eq('estado_pago', 'pendiente');

    setMetrics(prev => ({
      ...prev,
      facturadoHoy,
      facturadoMes,
      facturasPendientes: facturasPendientes || 0,
    }));
  };

  const fetchGeneralMetrics = async () => {
    // Total clientes
    const { count: totalClientes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true });

    // Total órdenes
    const { count: totalOrdenes } = await supabase
      .from('ordenes_reparacion')
      .select('*', { count: 'exact', head: true });

    setMetrics(prev => ({
      ...prev,
      totalClientes: totalClientes || 0,
      totalOrdenes: totalOrdenes || 0,
    }));
  };

  // Nueva función para métricas de inventario
  const fetchInventoryMetrics = async () => {
    // Obtener todos los productos
    const { data: productos } = await supabase
      .from('productos_inventario')
      .select('cantidad_actual, cantidad_minima, costo_unitario');

    if (productos) {
      // Productos con stock bajo
      const productosStockBajo = productos.filter(p => 
        p.cantidad_actual <= p.cantidad_minima
      ).length;

      // Valor total del inventario
      const valorTotalInventario = productos.reduce((total, producto) => 
        total + (producto.cantidad_actual * producto.costo_unitario), 0
      );

      setMetrics(prev => ({
        ...prev,
        productosStockBajo,
        valorTotalInventario,
        totalProductos: productos.length,
      }));
    }
  };

  const fetchRevenueChart = async () => {
    // Obtener datos de los últimos 7 días para el gráfico
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    const chartData = await Promise.all(
      last7Days.map(async (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Ingresos del día
        const { data: facturas } = await supabase
          .from('facturas')
          .select('total')
          .eq('estado_pago', 'pagado')
          .eq('fecha_emision', dateStr);

        const ingresos = facturas?.reduce((sum, f) => sum + f.total, 0) || 0;

        // Órdenes creadas el día
        const { count: ordenes } = await supabase
          .from('ordenes_reparacion')
          .select('*', { count: 'exact', head: true })
          .eq('fecha_entrada', dateStr);

        return {
          fecha: format(date, 'dd/MM', { locale: es }),
          ingresos,
          ordenes: ordenes || 0,
        };
      })
    );

    setRevenueData(chartData);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Cargando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard del Taller</h1>
          <p className="text-muted-foreground">
            Resumen del día - {format(new Date(), "EEEE, dd 'de' MMMM", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/ordenes">
              <Calendar className="w-4 h-4 mr-2" />
              Ver Órdenes
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/ordenes">
                <Plus className="w-6 h-6" />
                Nueva Orden
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/">
                <Users className="w-6 h-6" />
                Nuevo Cliente
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/facturas?estado=pendiente">
                <AlertCircle className="w-6 h-6" />
                Facturas Pendientes
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col gap-2">
              <Link to="/inventario">
                <Package className="w-6 h-6" />
                Gestionar Inventario
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Órdenes Activas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Activas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.ordenesActivas}</div>
            <p className="text-xs text-muted-foreground">
              En proceso (no entregadas)
            </p>
          </CardContent>
        </Card>

        {/* Órdenes Finalizadas Hoy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalizadas Hoy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.ordenesFinalizadasHoy}</div>
            <p className="text-xs text-muted-foreground">
              Trabajos completados
            </p>
          </CardContent>
        </Card>

        {/* Órdenes en Diagnóstico */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Diagnóstico</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.ordenesDiagnostico}</div>
            <p className="text-xs text-muted-foreground">
              Pendientes de evaluación
            </p>
          </CardContent>
        </Card>

        {/* Facturas Pendientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.facturasPendientes}</div>
            <p className="text-xs text-muted-foreground">
              Por cobrar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturado Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${metrics.facturadoHoy.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresos confirmados hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturado Este Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${metrics.facturadoMes.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total del mes actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resumen General</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">Clientes:</span>
                <span className="font-semibold">{metrics.totalClientes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Órdenes totales:</span>
                <span className="font-semibold">{metrics.totalOrdenes}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory KPIs - Nueva sección */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos con Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.productosStockBajo}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren reposición
            </p>
            {metrics.productosStockBajo > 0 && (
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link to="/inventario?stock=bajo">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Ver productos
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Inventario</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              €{metrics.valorTotalInventario.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Inversión total en stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.totalProductos}
            </div>
            <p className="text-xs text-muted-foreground">
              Artículos en catálogo
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link to="/inventario">
                <Package className="w-3 h-3 mr-1" />
                Gestionar inventario
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts Section - Nueva sección */}
      {metrics.productosStockBajo > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertas de Stock Bajo
          </h2>
          <StockAlerts showActions={true} maxItems={5} />
        </div>
      )}

      {/* App Usage Alerts Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Uso de Aplicaciones
        </h2>
        <AppUsageAlerts />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Ingresos Últimos 7 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Ingresos']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Órdenes Creadas Últimos 7 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'Órdenes']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Bar 
                    dataKey="ordenes" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Estado Actual del Taller</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant="secondary" className="w-full py-2">
                {metrics.ordenesActivas} Órdenes Activas
              </Badge>
            </div>
            <div className="text-center">
              <Badge 
                variant={metrics.facturasPendientes > 0 ? "destructive" : "default"} 
                className="w-full py-2"
              >
                {metrics.facturasPendientes} Pendientes de Pago
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="default" className="w-full py-2">
                {metrics.ordenesDiagnostico} En Diagnóstico
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="w-full py-2">
                ${metrics.facturadoMes.toFixed(0)} Este Mes
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};