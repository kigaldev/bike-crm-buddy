import React, { useState, useEffect } from 'react';
import { Bell, Check, MessageSquare, Settings, CreditCard, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
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
}

const tipoIconos = {
  sistema: Settings,
  feedback: MessageSquare,
  suscripcion: CreditCard,
  seguridad: Shield,
  otro: AlertCircle,
};

const tipoColores = {
  sistema: 'text-blue-500',
  feedback: 'text-green-500',
  suscripcion: 'text-purple-500',
  seguridad: 'text-red-500',
  otro: 'text-gray-500',
};

export const NotificationBell: React.FC = () => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noVistas, setNoVistas] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const cargarNotificaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('notificaciones_saas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotificaciones((data as Notificacion[]) || []);
      setNoVistas(data?.filter(n => !n.visto).length || 0);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
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
      setNoVistas(prev => Math.max(0, prev - 1));

      if (url_redireccion) {
        navigate(url_redireccion);
      }
    } catch (error) {
      console.error('Error marcando como vista:', error);
      toast.error('Error al marcar notificación como vista');
    }
  };

  const marcarTodasComoVistas = async () => {
    setLoading(true);
    try {
      const notificacionesNoVistas = notificaciones.filter(n => !n.visto);
      
      for (const notif of notificacionesNoVistas) {
        await supabase.rpc('marcar_notificacion_vista', {
          p_notificacion_id: notif.id
        });
      }

      setNotificaciones(prev => prev.map(n => ({ ...n, visto: true })));
      setNoVistas(0);
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marcando todas como vistas:', error);
      toast.error('Error al marcar todas las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();

    // Suscribirse a nuevas notificaciones en tiempo real
    const subscription = supabase
      .channel('notificaciones_saas_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones_saas'
        },
        () => {
          cargarNotificaciones();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {noVistas > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {noVistas > 9 ? '9+' : noVistas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          {noVistas > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={marcarTodasComoVistas}
              disabled={loading}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {notificaciones.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            notificaciones.map((notificacion) => {
              const IconComponent = tipoIconos[notificacion.tipo];
              return (
                <DropdownMenuItem
                  key={notificacion.id}
                  className={`p-3 cursor-pointer ${!notificacion.visto ? 'bg-muted/50' : ''}`}
                  onClick={() => marcarComoVista(notificacion.id, notificacion.url_redireccion)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <IconComponent className={`h-4 w-4 mt-1 flex-shrink-0 ${tipoColores[notificacion.tipo]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {notificacion.titulo}
                        </p>
                        {!notificacion.visto && (
                          <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {truncateText(notificacion.mensaje)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notificacion.created_at), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>

        {notificaciones.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center p-3 cursor-pointer"
              onClick={() => navigate('/notificaciones')}
            >
              Ver todas las notificaciones
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};