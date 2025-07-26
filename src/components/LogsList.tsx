import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Users, Activity } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Log {
  id: string;
  usuario_email: string;
  tipo_accion: string;
  entidad_afectada: string;
  id_entidad: string;
  descripcion: string;
  detalles_adicionales: any;
  fecha_hora: string;
}

export function LogsList() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [usuarioFilter, setUsuarioFilter] = useState("all");
  const [tipoAccionFilter, setTipoAccionFilter] = useState("all");
  const [entidadFilter, setEntidadFilter] = useState("all");
  const [usuarios, setUsuarios] = useState<string[]>([]);

  const tiposAccion = [
    'CREAR_CLIENTE', 'ACTUALIZAR_CLIENTE', 'ELIMINAR_CLIENTE',
    'CREAR_BICICLETA', 'ACTUALIZAR_BICICLETA', 'ELIMINAR_BICICLETA',
    'CREAR_ORDEN', 'ACTUALIZAR_ORDEN', 'ELIMINAR_ORDEN',
    'CREAR_FACTURA', 'ACTUALIZAR_FACTURA', 'ELIMINAR_FACTURA',
    'CREAR_PRODUCTO', 'ACTUALIZAR_PRODUCTO', 'ELIMINAR_PRODUCTO',
    'LOGIN', 'LOGOUT'
  ];

  const entidades = ['cliente', 'bicicleta', 'orden', 'factura', 'producto', 'sistema'];

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("fecha_hora", { ascending: false })
        .limit(500);

      if (error) throw error;
      
      setLogs(data || []);
      
      // Extract unique users
      const uniqueUsers = [...new Set(data?.map(log => log.usuario_email) || [])];
      setUsuarios(uniqueUsers);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.usuario_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tipo_accion.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUsuario = usuarioFilter === "all" || log.usuario_email === usuarioFilter;
    const matchesTipoAccion = tipoAccionFilter === "all" || log.tipo_accion === tipoAccionFilter;
    const matchesEntidad = entidadFilter === "all" || log.entidad_afectada === entidadFilter;

    return matchesSearch && matchesUsuario && matchesTipoAccion && matchesEntidad;
  });

  const getActionBadgeColor = (tipoAccion: string) => {
    if (tipoAccion.includes('CREAR')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (tipoAccion.includes('ACTUALIZAR')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (tipoAccion.includes('ELIMINAR')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getEntityIcon = (entidad: string) => {
    switch (entidad) {
      case 'cliente': return <Users className="w-4 h-4" />;
      case 'factura': return <FileText className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatActionText = (tipoAccion: string) => {
    return tipoAccion.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Actividades</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
                <p className="text-2xl font-bold">{usuarios.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resultados Filtrados</p>
              <p className="text-2xl font-bold">{filteredLogs.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Últimas 24h</p>
              <p className="text-2xl font-bold">
                {logs.filter(log => 
                  new Date(log.fecha_hora) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                ).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar en descripción, usuario o acción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={usuarioFilter} onValueChange={setUsuarioFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los usuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {usuarios.map((usuario) => (
                  <SelectItem key={usuario} value={usuario}>
                    {usuario}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tipoAccionFilter} onValueChange={setTipoAccionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {tiposAccion.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {formatActionText(tipo)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entidadFilter} onValueChange={setEntidadFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Entidad afectada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las entidades</SelectItem>
                {entidades.map((entidad) => (
                  <SelectItem key={entidad} value={entidad}>
                    {entidad.charAt(0).toUpperCase() + entidad.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={() => {
                setSearchTerm("");
                setUsuarioFilter("all");
                setTipoAccionFilter("all");
                setEntidadFilter("all");
              }}
              variant="outline"
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Historial de Actividades ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-lg font-medium text-gray-900">No hay actividades registradas</p>
              <p className="text-sm text-gray-500">
                {logs.length === 0 
                  ? "No se han registrado actividades aún." 
                  : "Intenta cambiar los filtros de búsqueda."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(log.fecha_hora), "dd/MM/yyyy", { locale: es })}
                          </div>
                          <div className="text-muted-foreground">
                            {format(new Date(log.fecha_hora), "HH:mm:ss", { locale: es })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.usuario_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeColor(log.tipo_accion)}>
                          {formatActionText(log.tipo_accion)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEntityIcon(log.entidad_afectada)}
                          <span className="capitalize">{log.entidad_afectada}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm">{log.descripcion}</p>
                          {log.detalles_adicionales && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Detalles adicionales disponibles
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}