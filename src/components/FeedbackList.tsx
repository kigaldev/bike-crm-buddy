import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Bug, Lightbulb, Settings, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Feedback {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  app_relacionada: string | null;
  estado: string;
  prioridad: string;
  respuesta_admin: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const tipoIcons = {
  bug: Bug,
  sugerencia: Lightbulb,
  mejora: Settings,
  otro: MessageSquare,
};

const estadoColors = {
  pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
  en_revision: 'bg-blue-100 text-blue-800 border-blue-200',
  aceptado: 'bg-green-100 text-green-800 border-green-200',
  rechazado: 'bg-red-100 text-red-800 border-red-200',
  implementado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const estadoIcons = {
  pendiente: Clock,
  en_revision: AlertCircle,
  aceptado: CheckCircle,
  rechazado: XCircle,
  implementado: CheckCircle,
};

const prioridadColors = {
  baja: 'bg-gray-100 text-gray-800',
  media: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-red-100 text-red-800',
};

interface FeedbackListProps {
  showAdminActions?: boolean;
  filtroEstado?: string;
  filtroTipo?: string;
}

export function FeedbackList({ showAdminActions = false, filtroEstado, filtroTipo }: FeedbackListProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoRespuesta, setEditandoRespuesta] = useState<string | null>(null);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState('');
  const { user, profile } = useAuth();
  const { empresaActual } = useEmpresa();
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedbacks();
  }, [empresaActual, filtroEstado, filtroTipo]);

  const fetchFeedbacks = async () => {
    if (!empresaActual) return;

    setLoading(true);
    try {
      let query = supabase
        .from('feedback_saas')
        .select('*')
        .eq('empresa_id', empresaActual.id)
        .order('created_at', { ascending: false });

      if (filtroEstado && filtroEstado !== 'todos') {
        query = query.eq('estado', filtroEstado);
      }

      if (filtroTipo && filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }

      if (!showAdminActions && profile) {
        query = query.eq('user_id', profile.user_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el feedback",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const actualizarFeedback = async (id: string, updates: Partial<Feedback>) => {
    try {
      const { error } = await supabase
        .from('feedback_saas')
        .update({
          ...updates,
          resuelto_por: profile?.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Actualizado",
        description: "Feedback actualizado correctamente",
      });

      fetchFeedbacks();
      setEditandoRespuesta(null);
      setRespuestaTexto('');
      setNuevoEstado('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar",
        variant: "destructive",
      });
    }
  };

  const iniciarEdicion = (feedback: Feedback) => {
    setEditandoRespuesta(feedback.id);
    setRespuestaTexto(feedback.respuesta_admin || '');
    setNuevoEstado(feedback.estado);
  };

  if (loading) {
    return <div className="text-center p-4">Cargando feedback...</div>;
  }

  if (feedbacks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No hay feedback disponible
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {feedbacks.map((feedback) => {
        const TipoIcon = tipoIcons[feedback.tipo as keyof typeof tipoIcons] || MessageSquare;
        const EstadoIcon = estadoIcons[feedback.estado as keyof typeof estadoIcons] || Clock;
        const isEditing = editandoRespuesta === feedback.id;

        return (
          <Card key={feedback.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <TipoIcon className="h-5 w-5 mt-1 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{feedback.titulo}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={estadoColors[feedback.estado as keyof typeof estadoColors]}>
                        <EstadoIcon className="h-3 w-3 mr-1" />
                        {feedback.estado.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary" className={prioridadColors[feedback.prioridad as keyof typeof prioridadColors]}>
                        {feedback.prioridad}
                      </Badge>
                      <Badge variant="outline">
                        {feedback.tipo}
                      </Badge>
                      {feedback.app_relacionada && (
                        <Badge variant="outline">
                          {feedback.app_relacionada}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(feedback.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">{feedback.descripcion}</p>

                {feedback.respuesta_admin && !isEditing && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-sm font-medium mb-1">Respuesta del equipo:</div>
                    <p className="text-sm">{feedback.respuesta_admin}</p>
                  </div>
                )}

                {showAdminActions && (
                  <div className="border-t pt-4">
                    {!isEditing ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => iniciarEdicion(feedback)}
                      >
                        {feedback.respuesta_admin ? 'Editar Respuesta' : 'Responder'}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Estado</label>
                            <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="en_revision">En Revisión</SelectItem>
                                <SelectItem value="aceptado">Aceptado</SelectItem>
                                <SelectItem value="rechazado">Rechazado</SelectItem>
                                <SelectItem value="implementado">Implementado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Respuesta</label>
                          <Textarea
                            value={respuestaTexto}
                            onChange={(e) => setRespuestaTexto(e.target.value)}
                            placeholder="Escribe una respuesta para el usuario..."
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => actualizarFeedback(feedback.id, {
                              estado: nuevoEstado,
                              respuesta_admin: respuestaTexto,
                            })}
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditandoRespuesta(null);
                              setRespuestaTexto('');
                              setNuevoEstado('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}