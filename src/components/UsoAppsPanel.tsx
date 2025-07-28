import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useEstadisticasUso } from "@/hooks/useEstadisticasUso";
import { Activity, AlertTriangle, TrendingUp, Users, Calendar, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function UsoAppsPanel() {
  const { estadisticas, actividadDiaria, appsSinUso, isLoading, refetch } = useEstadisticasUso();

  const formatearFecha = (fecha: string) => {
    return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
  };

  const getDiasLabel = (dias: number) => {
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `${dias} días`;
    if (dias < 30) return `${Math.floor(dias / 7)} semanas`;
    return `${Math.floor(dias / 30)} meses`;
  };

  const getUsoColor = (diasSinUso: number) => {
    if (diasSinUso <= 7) return 'bg-green-500';
    if (diasSinUso <= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 animate-pulse" />
            <p>Cargando estadísticas de uso...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calcular métricas generales
  const totalAcciones = estadisticas.reduce((sum, stat) => sum + stat.total_acciones, 0);
  const appsActivas = estadisticas.filter(stat => stat.acciones_semana_actual > 0).length;
  const appMasUsada = estadisticas[0];

  return (
    <div className="space-y-6">
      {/* Métricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Acciones</p>
                <p className="text-2xl font-bold">{totalAcciones.toLocaleString()}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Apps Activas</p>
                <p className="text-2xl font-bold">{appsActivas}</p>
                <p className="text-xs text-muted-foreground">esta semana</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">App Más Usada</p>
                <p className="text-lg font-bold">{appMasUsada?.app_nombre || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{appMasUsada?.total_acciones || 0} acciones</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Apps Sin Usar</p>
                <p className="text-2xl font-bold">{appsSinUso.length}</p>
                <p className="text-xs text-muted-foreground">últimos 30 días</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="estadisticas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="estadisticas">Estadísticas por App</TabsTrigger>
          <TabsTrigger value="actividad">Actividad Diaria</TabsTrigger>
          <TabsTrigger value="sin-uso">Apps Sin Uso</TabsTrigger>
          <TabsTrigger value="detalles">Detalles</TabsTrigger>
        </TabsList>

        <TabsContent value="estadisticas">
          <Card>
            <CardHeader>
              <CardTitle>Uso por Aplicación</CardTitle>
            </CardHeader>
            <CardContent>
              {estadisticas.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aplicación</TableHead>
                      <TableHead>Total Acciones</TableHead>
                      <TableHead>Este Mes</TableHead>
                      <TableHead>Esta Semana</TableHead>
                      <TableHead>Último Uso</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estadisticas.map((stat) => {
                      const diasSinUso = Math.floor((new Date().getTime() - new Date(stat.ultimo_uso).getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow key={stat.app_codigo}>
                          <TableCell className="font-medium">{stat.app_nombre}</TableCell>
                          <TableCell>{stat.total_acciones.toLocaleString()}</TableCell>
                          <TableCell>{stat.acciones_mes_actual}</TableCell>
                          <TableCell>{stat.acciones_semana_actual}</TableCell>
                          <TableCell>{formatearFecha(stat.ultimo_uso)}</TableCell>
                          <TableCell>
                            <Badge className={getUsoColor(diasSinUso)}>
                              {getDiasLabel(diasSinUso)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No hay datos de uso</h3>
                  <p className="text-sm text-muted-foreground">
                    Comience a usar las aplicaciones para ver las estadísticas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actividad">
          <Card>
            <CardHeader>
              <CardTitle>Actividad de los Últimos 30 Días</CardTitle>
            </CardHeader>
            <CardContent>
              {actividadDiaria.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={actividadDiaria.reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="fecha" 
                        tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: es })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => formatearFecha(value)}
                        formatter={(value, name) => [
                          value,
                          name === 'total_acciones' ? 'Acciones' :
                          name === 'apps_usadas' ? 'Apps Usadas' : 'Usuarios Activos'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total_acciones" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="total_acciones"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="apps_usadas" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="apps_usadas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No hay actividad registrada</h3>
                  <p className="text-sm text-muted-foreground">
                    La actividad aparecerá aquí cuando se utilicen las aplicaciones
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sin-uso">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Aplicaciones Sin Uso Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appsSinUso.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aplicación</TableHead>
                      <TableHead>Último Uso</TableHead>
                      <TableHead>Días Sin Uso</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appsSinUso.map((app) => (
                      <TableRow key={app.app_codigo}>
                        <TableCell className="font-medium">{app.app_nombre}</TableCell>
                        <TableCell>
                          {app.ultimo_uso === '1970-01-01T00:00:00+00:00' ? 'Nunca' : formatearFecha(app.ultimo_uso)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-orange-600">
                            {app.dias_sin_uso > 365 ? 'Nunca usado' : `${app.dias_sin_uso} días`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Desactivar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <h3 className="font-medium mb-2">¡Excelente!</h3>
                  <p className="text-sm text-muted-foreground">
                    Todas las aplicaciones han sido utilizadas recientemente
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detalles">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Acciones por App</CardTitle>
            </CardHeader>
            <CardContent>
              {estadisticas.length > 0 ? (
                <div className="space-y-4">
                  {estadisticas.map((stat) => (
                    <div key={stat.app_codigo} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{stat.app_nombre}</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(stat.tipos_acciones).map(([accion, cantidad]) => (
                          <Badge key={accion} variant="outline">
                            {accion}: {cantidad}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No hay datos detallados</h3>
                  <p className="text-sm text-muted-foreground">
                    Los detalles de uso aparecerán cuando se registre actividad
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}