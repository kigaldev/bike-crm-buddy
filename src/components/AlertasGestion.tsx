import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Plus, 
  Search, 
  Bell,
  BellOff,
  RotateCcw,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Alerta {
  id: string;
  tipo: string;
  id_entidad?: string;
  tipo_entidad?: string;
  descripcion: string;
  fecha_recordatorio: string;
  es_recurrente: boolean;
  frecuencia?: string;
  prioridad: string;
  estado: string;
  enviar_email: boolean;
  enviar_whatsapp: boolean;
  fecha_resolucion?: string;
  notas?: string;
  created_at: string;
}

const TIPOS_ALERTA = {
  'mantenimiento_recurrente': 'Mantenimiento Recurrente',
  'factura_vencida': 'Factura Vencida',
  'pago_parcial': 'Pago Parcial',
  'anticipo_sin_conciliar': 'Anticipo Sin Conciliar',
  'abono_sin_usar': 'Abono Sin Usar',
  'tarea_interna': 'Tarea Interna',
  'cumpleanos_cliente': 'Cumpleaños Cliente',
  'revision_preventiva': 'Revisión Preventiva'
};

const PRIORIDADES = {
  'baja': { label: 'Baja', color: 'bg-gray-100 text-gray-800' },
  'media': { label: 'Media', color: 'bg-blue-100 text-blue-800' },
  'alta': { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  'critica': { label: 'Crítica', color: 'bg-red-100 text-red-800' }
};

const ESTADOS = {
  'pendiente': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  'enviada': { label: 'Enviada', color: 'bg-blue-100 text-blue-800', icon: Bell },
  'resuelta': { label: 'Resuelta', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  'fallida': { label: 'Fallida', color: 'bg-red-100 text-red-800', icon: X },
  'pospuesta': { label: 'Pospuesta', color: 'bg-gray-100 text-gray-800', icon: RotateCcw }
};

export function AlertasGestion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState({
    tipo: 'all',
    prioridad: 'all',
    estado: 'all',
    busqueda: ''
  });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevaAlerta, setNuevaAlerta] = useState({
    tipo: 'tarea_interna',
    descripcion: '',
    fecha_recordatorio: '',
    prioridad: 'media',
    es_recurrente: false,
    frecuencia: '',
    enviar_email: false,
    enviar_whatsapp: false,
    notas: ''
  });

  // Query para obtener alertas
  const { data: alertas, isLoading } = useQuery({
    queryKey: ['alertas', filtros],
    queryFn: async () => {
      let query = supabase.from('alertas').select('*');
      
      if (filtros.tipo !== 'all') {
        query = query.eq('tipo', filtros.tipo);
      }
      if (filtros.prioridad !== 'all') {
        query = query.eq('prioridad', filtros.prioridad);
      }
      if (filtros.estado !== 'all') {
        query = query.eq('estado', filtros.estado);
      }
      if (filtros.busqueda) {
        query = query.ilike('descripcion', `%${filtros.busqueda}%`);
      }
      
      const { data, error } = await query.order('fecha_recordatorio', { ascending: true });
      
      if (error) throw error;
      return data as Alerta[];
    }
  });

  // Mutation para crear alerta
  const crearAlertaMutation = useMutation({
    mutationFn: async (alerta: any) => {
      const { data, error } = await supabase
        .from('alertas')
        .insert([alerta])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      setMostrarFormulario(false);
      setNuevaAlerta({
        tipo: 'tarea_interna',
        descripcion: '',
        fecha_recordatorio: '',
        prioridad: 'media',
        es_recurrente: false,
        frecuencia: '',
        enviar_email: false,
        enviar_whatsapp: false,
        notas: ''
      });
      toast({
        title: "Alerta creada",
        description: "La alerta se ha creado exitosamente"
      });
    },
    onError: (error) => {
      console.error('Error creando alerta:', error);
      toast({
        title: "Error",
        description: "Error al crear la alerta",
        variant: "destructive"
      });
    }
  });

  // Mutation para actualizar estado de alerta
  const actualizarEstadoMutation = useMutation({
    mutationFn: async ({ id, estado, fecha_resolucion }: { id: string; estado: string; fecha_resolucion?: string }) => {
      const { data, error } = await supabase
        .from('alertas')
        .update({ 
          estado, 
          fecha_resolucion,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la alerta se ha actualizado"
      });
    }
  });

  const handleCrearAlerta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAlerta.descripcion || !nuevaAlerta.fecha_recordatorio) {
      toast({
        title: "Error",
        description: "Descripción y fecha son obligatorios",
        variant: "destructive"
      });
      return;
    }
    crearAlertaMutation.mutate(nuevaAlerta);
  };

  const marcarComoResuelta = (id: string) => {
    actualizarEstadoMutation.mutate({
      id,
      estado: 'resuelta',
      fecha_resolucion: new Date().toISOString().split('T')[0]
    });
  };

  const posponer = (id: string) => {
    actualizarEstadoMutation.mutate({
      id,
      estado: 'pospuesta'
    });
  };

  const getDiasVencimiento = (fecha: string) => {
    const dias = differenceInDays(parseISO(fecha), new Date());
    return dias;
  };

  const alertasCriticas = alertas?.filter(a => a.prioridad === 'critica' && a.estado === 'pendiente') || [];
  const alertasVencidas = alertas?.filter(a => getDiasVencimiento(a.fecha_recordatorio) < 0 && a.estado === 'pendiente') || [];
  const alertasHoy = alertas?.filter(a => getDiasVencimiento(a.fecha_recordatorio) === 0 && a.estado === 'pendiente') || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Alertas</h1>
          <p className="text-muted-foreground">
            Sistema de recordatorios y notificaciones automáticas
          </p>
        </div>
        <Button onClick={() => setMostrarFormulario(!mostrarFormulario)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Alerta
        </Button>
      </div>

      {/* Resumen de alertas críticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Alertas Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertasCriticas.length}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{alertasVencidas.length}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{alertasHoy.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Formulario de nueva alerta */}
      {mostrarFormulario && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Alerta Manual</CardTitle>
            <CardDescription>
              Crear un recordatorio personalizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCrearAlerta} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo de Alerta</Label>
                  <Select
                    value={nuevaAlerta.tipo}
                    onValueChange={(value) => setNuevaAlerta(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_ALERTA).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <Select
                    value={nuevaAlerta.prioridad}
                    onValueChange={(value) => setNuevaAlerta(prev => ({ ...prev, prioridad: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORIDADES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fecha">Fecha Recordatorio</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={nuevaAlerta.fecha_recordatorio}
                    onChange={(e) => setNuevaAlerta(prev => ({ ...prev, fecha_recordatorio: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="frecuencia">Frecuencia (si es recurrente)</Label>
                  <Select
                    value={nuevaAlerta.frecuencia}
                    onValueChange={(value) => setNuevaAlerta(prev => ({ 
                      ...prev, 
                      frecuencia: value,
                      es_recurrente: value !== '' 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No recurrente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No recurrente</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="cada_6_meses">Cada 6 meses</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={nuevaAlerta.descripcion}
                  onChange={(e) => setNuevaAlerta(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe el recordatorio..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="notas">Notas adicionales</Label>
                <Textarea
                  id="notas"
                  value={nuevaAlerta.notas}
                  onChange={(e) => setNuevaAlerta(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas opcionales..."
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={nuevaAlerta.enviar_email}
                    onChange={(e) => setNuevaAlerta(prev => ({ ...prev, enviar_email: e.target.checked }))}
                  />
                  <span>Enviar por Email</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={nuevaAlerta.enviar_whatsapp}
                    onChange={(e) => setNuevaAlerta(prev => ({ ...prev, enviar_whatsapp: e.target.checked }))}
                  />
                  <span>Enviar por WhatsApp</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setMostrarFormulario(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={crearAlertaMutation.isPending}>
                  {crearAlertaMutation.isPending ? 'Creando...' : 'Crear Alerta'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar alertas..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label>Tipo</Label>
              <Select
                value={filtros.tipo}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {Object.entries(TIPOS_ALERTA).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridad</Label>
              <Select
                value={filtros.prioridad}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, prioridad: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  {Object.entries(PRIORIDADES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado</Label>
              <Select
                value={filtros.estado}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(ESTADOS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Activas</CardTitle>
          <CardDescription>
            {alertas?.length || 0} alertas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Cargando alertas...
                  </TableCell>
                </TableRow>
              ) : alertas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No se encontraron alertas
                  </TableCell>
                </TableRow>
              ) : (
                alertas?.map((alerta) => {
                  const diasVencimiento = getDiasVencimiento(alerta.fecha_recordatorio);
                  const EstatusIcon = ESTADOS[alerta.estado as keyof typeof ESTADOS]?.icon || Clock;
                  
                  return (
                    <TableRow key={alerta.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {TIPOS_ALERTA[alerta.tipo as keyof typeof TIPOS_ALERTA]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div>
                          <p className="font-medium">{alerta.descripcion}</p>
                          {alerta.es_recurrente && (
                            <p className="text-sm text-muted-foreground">
                              Recurrente ({alerta.frecuencia})
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(parseISO(alerta.fecha_recordatorio), 'dd/MM/yyyy', { locale: es })}</span>
                          {diasVencimiento < 0 && (
                            <Badge variant="destructive" className="w-fit mt-1">
                              Vencida ({Math.abs(diasVencimiento)} días)
                            </Badge>
                          )}
                          {diasVencimiento === 0 && (
                            <Badge variant="default" className="w-fit mt-1">
                              Hoy
                            </Badge>
                          )}
                          {diasVencimiento > 0 && diasVencimiento <= 7 && (
                            <Badge variant="secondary" className="w-fit mt-1">
                              En {diasVencimiento} días
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={PRIORIDADES[alerta.prioridad as keyof typeof PRIORIDADES]?.color}>
                          {PRIORIDADES[alerta.prioridad as keyof typeof PRIORIDADES]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <EstatusIcon className="h-4 w-4" />
                          <Badge className={ESTADOS[alerta.estado as keyof typeof ESTADOS]?.color}>
                            {ESTADOS[alerta.estado as keyof typeof ESTADOS]?.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {alerta.estado === 'pendiente' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => marcarComoResuelta(alerta.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => posponer(alerta.id)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}