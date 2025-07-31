import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Settings, CreditCard, Shield, AlertCircle, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'sistema' | 'feedback' | 'suscripcion' | 'seguridad' | 'otro';
  visto: boolean;
  url_redireccion: string | null;
  created_at: string;
  enviado_email: boolean;
}

const tipoIconos = {
  sistema: Settings,
  feedback: MessageSquare,
  suscripcion: CreditCard,
  seguridad: Shield,
  otro: AlertCircle,
};

const tipoColores = {
  sistema: 'bg-blue-500',
  feedback: 'bg-green-500',
  suscripcion: 'bg-purple-500',
  seguridad: 'bg-red-500',
  otro: 'bg-gray-500',
};

const tipoLabels = {
  sistema: 'Sistema',
  feedback: 'Feedback',
  suscripcion: 'Suscripción',
  seguridad: 'Seguridad',
  otro: 'Otro',
};

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('notificaciones_saas')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }

      if (filtroEstado === 'vistas') {
        query = query.eq('visto', true);
      } else if (filtroEstado === 'no_vistas') {
        query = query.eq('visto', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotificaciones((data as Notificacion[]) || []);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      toast.error('Error al cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoVista = async (id: string, url_redireccion?: string | null) => {
    try {
      const { error } = await supabase.rpc('marcar_notificacion_vista', {
        p_notificacion_id: id
      });

      if (error) throw error;

      // Actualizar estado local
      setNotificaciones(prev => 
        prev.map(n => n.id === id ? { ...n, visto: true } : n)
      );

      if (url_redireccion) {
        navigate(url_redireccion);
      }
    } catch (error) {
      console.error('Error marcando como vista:', error);
      toast.error('Error al marcar notificación como vista');
    }
  };

  const marcarTodasComoVistas = async () => {
    try {
      const notificacionesNoVistas = notificaciones.filter(n => !n.visto);
      
      for (const notif of notificacionesNoVistas) {
        await supabase.rpc('marcar_notificacion_vista', {
          p_notificacion_id: notif.id
        });
      }

      setNotificaciones(prev => prev.map(n => ({ ...n, visto: true })));
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marcando todas como vistas:', error);
      toast.error('Error al marcar todas las notificaciones');
    }
  };

  useEffect(() => {
    cargarNotificaciones();
  }, [filtroTipo, filtroEstado]);

  const notificacionesNoVistas = notificaciones.filter(n => !n.visto).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus notificaciones y mantente al día
          </p>
        </div>
        {notificacionesNoVistas > 0 && (
          <Button onClick={marcarTodasComoVistas}>
            Marcar todas como leídas ({notificacionesNoVistas})
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="sistema">Sistema</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="suscripcion">Suscripción</SelectItem>
                  <SelectItem value="seguridad">Seguridad</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="no_vistas">No leídas</SelectItem>
                  <SelectItem value="vistas">Leídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de notificaciones */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p>Cargando notificaciones...</p>
          </div>
        ) : notificaciones.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium">No hay notificaciones</p>
              <p className="text-muted-foreground">
                {filtroTipo !== 'todos' || filtroEstado !== 'todos' 
                  ? 'No se encontraron notificaciones con los filtros aplicados'
                  : 'Cuando recibas notificaciones aparecerán aquí'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          notificaciones.map((notificacion) => {
            const IconComponent = tipoIconos[notificacion.tipo];
            return (
              <Card 
                key={notificacion.id} 
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notificacion.visto ? 'border-l-4 border-l-primary' : ''
                }`}
                onClick={() => marcarComoVista(notificacion.id, notificacion.url_redireccion)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-full ${tipoColores[notificacion.tipo]} text-white`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{notificacion.titulo}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {tipoLabels[notificacion.tipo]}
                          </Badge>
                          {!notificacion.visto && (
                            <Badge variant="default">Nueva</Badge>
                          )}
                          {notificacion.enviado_email && (
                            <Badge variant="secondary">📧</Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-3 leading-relaxed">
                        {notificacion.mensaje}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(notificacion.created_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </span>
                        {notificacion.url_redireccion && (
                          <span className="text-primary">Click para ver detalles →</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}