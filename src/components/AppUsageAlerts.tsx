import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X, TrendingDown } from "lucide-react";
import { useEstadisticasUso } from "@/hooks/useEstadisticasUso";
import { Link } from "react-router-dom";

export function AppUsageAlerts() {
  const { appsSinUso, isLoading } = useEstadisticasUso();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  useEffect(() => {
    // Cargar alertas descartadas del localStorage
    const dismissed = localStorage.getItem('dismissed-usage-alerts');
    if (dismissed) {
      setDismissedAlerts(JSON.parse(dismissed));
    }
  }, []);

  const dismissAlert = (appCode: string) => {
    const newDismissed = [...dismissedAlerts, appCode];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissed-usage-alerts', JSON.stringify(newDismissed));
  };

  if (isLoading || appsSinUso.length === 0) {
    return null;
  }

  // Filtrar apps que no han sido descartadas y que llevan más de 7 días sin uso
  const appsCriticas = appsSinUso.filter(app => 
    !dismissedAlerts.includes(app.app_codigo) && app.dias_sin_uso > 7
  );

  if (appsCriticas.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {appsCriticas.slice(0, 3).map((app) => (
        <Alert key={app.app_codigo} className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="flex items-center justify-between">
            <span>Módulo sin usar: {app.app_nombre}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-orange-600">
                {app.dias_sin_uso > 365 ? 'Nunca usado' : `${app.dias_sin_uso} días`}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissAlert(app.app_codigo)}
                className="h-auto p-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {app.ultimo_uso === '1970-01-01T00:00:00+00:00' 
                  ? 'Este módulo nunca ha sido utilizado.' 
                  : `Último uso: ${new Date(app.ultimo_uso).toLocaleDateString('es-ES')}`
                }
                {app.dias_sin_uso > 30 && ' Considera desactivarlo si no lo necesitas.'}
              </span>
              <Link to="/uso-apps">
                <Button variant="outline" size="sm" className="ml-2">
                  Ver detalles
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      ))}
      
      {appsCriticas.length > 3 && (
        <Alert className="border-blue-200 bg-blue-50">
          <TrendingDown className="h-4 w-4 text-blue-500" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Hay {appsCriticas.length - 3} módulos adicionales sin usar recientemente.
              </span>
              <Link to="/uso-apps">
                <Button variant="outline" size="sm">
                  Ver todos
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}