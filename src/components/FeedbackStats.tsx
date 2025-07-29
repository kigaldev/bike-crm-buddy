import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/hooks/useEmpresaContext';
import { MessageSquare, TrendingUp, Clock, CheckCircle, Bug, Lightbulb } from 'lucide-react';

interface FeedbackStats {
  total_feedback: number;
  por_estado: any;
  por_tipo: any;
  por_app: any;
  feedback_reciente: number;
}

export function FeedbackStats() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { empresaActual } = useEmpresa();

  useEffect(() => {
    fetchStats();
  }, [empresaActual]);

  const fetchStats = async () => {
    if (!empresaActual) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('obtener_estadisticas_feedback_empresa', {
          p_empresa_id: empresaActual.id
        });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return <div className="text-center p-4">Cargando estadísticas...</div>;
  }

  const estadoLabels = {
    pendiente: 'Pendientes',
    en_revision: 'En Revisión',
    aceptado: 'Aceptados',
    rechazado: 'Rechazados',
    implementado: 'Implementados',
  };

  const tipoLabels = {
    bug: 'Bugs',
    sugerencia: 'Sugerencias',
    mejora: 'Mejoras',
    otro: 'Otros',
  };

  const tipoIcons = {
    bug: Bug,
    sugerencia: Lightbulb,
    mejora: TrendingUp,
    otro: MessageSquare,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_feedback}</div>
          <p className="text-xs text-muted-foreground">
            {stats.feedback_reciente} en los últimos 30 días
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Por Estado</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(stats.por_estado || {}).map(([estado, count]) => (
              <div key={estado} className="flex justify-between items-center text-sm">
                <span>{estadoLabels[estado as keyof typeof estadoLabels] || estado}</span>
                <Badge variant="outline">{String(count)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Por Tipo</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(stats.por_tipo || {}).map(([tipo, count]) => {
              const Icon = tipoIcons[tipo as keyof typeof tipoIcons] || MessageSquare;
              return (
                <div key={tipo} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    <span>{tipoLabels[tipo as keyof typeof tipoLabels] || tipo}</span>
                  </div>
                  <Badge variant="outline">{String(count)}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Por App</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {Object.entries(stats.por_app || {})
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([app, count]) => (
                <div key={app} className="flex justify-between items-center text-sm">
                  <span className="truncate">{app}</span>
                  <Badge variant="outline">{String(count)}</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}