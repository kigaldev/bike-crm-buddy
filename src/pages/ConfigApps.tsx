import { useState, useEffect } from 'react';
import { useAllAppsConfig } from '@/hooks/useAppConfig';
import { AppConfigEditor } from '@/components/AppConfigEditor';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Settings, 
  Shield, 
  RefreshCw, 
  Zap, 
  CheckCircle, 
  XCircle,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

export default function ConfigApps() {
  const { configs, loading, refreshConfigs } = useAllAppsConfig();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  useEffect(() => {
    if (configs.length > 0 && !selectedApp) {
      setSelectedApp(configs[0].app_codigo);
    }
  }, [configs, selectedApp]);

  const getAppStatusBadge = (config: any) => {
    if (!config.activa) {
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Inactiva
        </Badge>
      );
    }
    
    if (config.modo_demo) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Zap className="h-3 w-3 mr-1" />
          Demo
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Activa
      </Badge>
    );
  };

  const getAppStats = (config: any) => {
    const stats = [];
    
    if (config.limite_uso_mensual) {
      stats.push(`Límite: ${config.limite_uso_mensual}/mes`);
    }
    
    const restrictionsCount = Object.keys(config.restricciones || {}).length;
    if (restrictionsCount > 0) {
      stats.push(`${restrictionsCount} restricciones`);
    }
    
    const configCount = Object.keys(config.configuracion_personalizada || {}).length;
    if (configCount > 0) {
      stats.push(`${configCount} configuraciones`);
    }

    return stats;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando configuración de apps...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PermissionGuard 
        recurso="apps" 
        accion="editar"
        fallback={
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para gestionar la configuración de apps.
            </AlertDescription>
          </Alert>
        }
        hideWhenNoPermission={false}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              <div>
                <h1 className="text-2xl font-bold">Configuración de Apps</h1>
                <p className="text-muted-foreground">
                  Gestiona la configuración y restricciones de cada app
                </p>
              </div>
            </div>
            <Button 
              onClick={refreshConfigs}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>

          {configs.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No hay apps disponibles para configurar.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Lista de apps */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Apps disponibles</CardTitle>
                    <CardDescription>
                      {configs.length} app{configs.length !== 1 ? 's' : ''} configurables
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {configs.map((config) => {
                      const stats = getAppStats(config);
                      
                      return (
                        <div
                          key={config.app_codigo}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedApp === config.app_codigo
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedApp(config.app_codigo)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{config.app_nombre}</h4>
                            {getAppStatusBadge(config)}
                          </div>
                          
                          {stats.length > 0 && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              {stats.map((stat, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <BarChart3 className="h-3 w-3" />
                                  <span>{stat}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {config.updated_at && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Actualizada: {new Date(config.updated_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Editor de configuración */}
              <div className="lg:col-span-3">
                {selectedApp ? (
                  (() => {
                    const selectedConfig = configs.find(c => c.app_codigo === selectedApp);
                    return selectedConfig ? (
                      <AppConfigEditor
                        appCodigo={selectedConfig.app_codigo}
                        appNombre={selectedConfig.app_nombre}
                        appDescripcion={selectedConfig.app_descripcion}
                        onConfigChange={() => refreshConfigs()}
                      />
                    ) : null;
                  })()
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center text-muted-foreground">
                        <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Selecciona una app para configurar</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </PermissionGuard>
    </div>
  );
}