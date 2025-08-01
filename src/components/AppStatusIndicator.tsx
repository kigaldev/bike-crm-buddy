import { useAppConfig } from '@/hooks/useAppConfig';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, Zap, AlertTriangle } from 'lucide-react';

interface AppStatusIndicatorProps {
  appCodigo: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AppStatusIndicator({ 
  appCodigo, 
  showLabel = true, 
  size = 'md' 
}: AppStatusIndicatorProps) {
  const { config, loading } = useAppConfig(appCodigo);

  if (loading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        <div className="h-3 w-3 bg-muted rounded-full mr-1" />
        {showLabel && "Cargando..."}
      </Badge>
    );
  }

  if (!config) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {showLabel && "Error"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>No se pudo cargar la configuración</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const getStatusInfo = () => {
    if (!config.activa) {
      return {
        icon: XCircle,
        label: "Inactiva",
        variant: "secondary" as const,
        className: "bg-red-100 text-red-800",
        tooltip: "Esta app está desactivada"
      };
    }
    
    if (config.modo_demo) {
      return {
        icon: Zap,
        label: "Demo",
        variant: "secondary" as const,
        className: "bg-yellow-100 text-yellow-800",
        tooltip: "App en modo demostración"
      };
    }
    
    return {
      icon: CheckCircle,
      label: "Activa",
      variant: "default" as const,
      className: "bg-green-100 text-green-800",
      tooltip: "App completamente activa"
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  const badgeContent = (
    <Badge variant={status.variant} className={status.className}>
      <Icon className="h-3 w-3 mr-1" />
      {showLabel && status.label}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p>{status.tooltip}</p>
            {config.limite_uso_mensual && (
              <p className="text-xs">Límite: {config.limite_uso_mensual}/mes</p>
            )}
            {Object.keys(config.restricciones || {}).length > 0 && (
              <p className="text-xs">
                {Object.keys(config.restricciones).length} restricciones activas
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}