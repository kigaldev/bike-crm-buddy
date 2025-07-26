import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, Users, FileText } from "lucide-react";

interface Log {
  id: string;
  usuario_email: string;
  tipo_accion: string;
  entidad_afectada: string;
  descripcion: string;
  fecha_hora: string;
}

interface ClienteHistorialProps {
  clienteId: string;
  clienteNombre: string;
}

export function ClienteHistorial({ clienteId, clienteNombre }: ClienteHistorialProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClienteLogs = async () => {
    try {
      setLoading(true);
      
      // Get logs related to this client
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .or(`id_entidad.eq.${clienteId},descripcion.ilike.%${clienteNombre}%`)
        .order("fecha_hora", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching client logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clienteId) {
      fetchClienteLogs();
    }
  }, [clienteId, clienteNombre]);

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Historial de Actividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Historial de Actividades ({logs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              No hay actividades registradas para este cliente.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0">
                <div className="flex-shrink-0 mt-1">
                  {getEntityIcon(log.entidad_afectada)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Badge className={getActionBadgeColor(log.tipo_accion)}>
                      {formatActionText(log.tipo_accion)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {format(new Date(log.fecha_hora), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mt-1">{log.descripcion}</p>
                  <p className="text-xs text-gray-500">Por: {log.usuario_email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}