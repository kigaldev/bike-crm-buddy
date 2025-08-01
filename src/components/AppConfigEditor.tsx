import { useState, useEffect } from 'react';
import { useAppConfig, AppConfig } from '@/hooks/useAppConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, Zap, Shield, Settings } from 'lucide-react';

interface AppConfigEditorProps {
  appCodigo: string;
  appNombre: string;
  appDescripcion?: string;
  onConfigChange?: (config: AppConfig) => void;
}

export function AppConfigEditor({ 
  appCodigo, 
  appNombre, 
  appDescripcion,
  onConfigChange 
}: AppConfigEditorProps) {
  const { config, loading, updating, updateConfig } = useAppConfig(appCodigo);
  const [formData, setFormData] = useState<Partial<AppConfig>>({});
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Sincronizar formData con config cuando cambie
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (jsonError) {
      return;
    }

    const success = await updateConfig(formData);
    if (success && onConfigChange && config) {
      onConfigChange({ ...config, ...formData });
    }
  };

  const handleJsonChange = (field: 'restricciones' | 'configuracion_personalizada', value: string) => {
    try {
      const parsedValue = value.trim() ? JSON.parse(value) : {};
      setFormData(prev => ({ ...prev, [field]: parsedValue }));
      setJsonError(null);
    } catch (error) {
      setJsonError('JSON inválido');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando configuración...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No se pudo cargar la configuración de la app.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <div>
            <CardTitle>{appNombre}</CardTitle>
            {appDescripcion && (
              <CardDescription>{appDescripcion}</CardDescription>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            {formData.modo_demo && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Zap className="h-3 w-3 mr-1" />
                Demo
              </Badge>
            )}
            <Badge variant={formData.activa ? "default" : "secondary"}>
              {formData.activa ? "Activa" : "Inactiva"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Estado básico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id={`activa-${appCodigo}`}
                checked={formData.activa}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, activa: checked }))
                }
              />
              <Label htmlFor={`activa-${appCodigo}`}>App activa</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id={`demo-${appCodigo}`}
                checked={formData.modo_demo}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, modo_demo: checked }))
                }
              />
              <Label htmlFor={`demo-${appCodigo}`}>Modo demo</Label>
            </div>
          </div>

          <Separator />

          {/* Límites de uso */}
          <div className="space-y-2">
            <Label htmlFor={`limite-${appCodigo}`}>Límite de uso mensual</Label>
            <Input
              id={`limite-${appCodigo}`}
              type="number"
              placeholder="Sin límite"
              value={formData.limite_uso_mensual || ''}
              onChange={(e) => 
                setFormData(prev => ({ 
                  ...prev, 
                  limite_uso_mensual: e.target.value ? parseInt(e.target.value) : undefined 
                }))
              }
            />
            <p className="text-sm text-muted-foreground">
              Deja vacío para uso ilimitado
            </p>
          </div>

          <Separator />

          {/* Restricciones */}
          <div className="space-y-2">
            <Label htmlFor={`restricciones-${appCodigo}`}>
              <Shield className="h-4 w-4 inline mr-1" />
              Restricciones (JSON)
            </Label>
            <Textarea
              id={`restricciones-${appCodigo}`}
              placeholder='{"max_users": 10, "features": ["basic"]}'
              value={JSON.stringify(formData.restricciones || {}, null, 2)}
              onChange={(e) => handleJsonChange('restricciones', e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Configuración específica de límites y restricciones para esta app
            </p>
          </div>

          {/* Configuración personalizada */}
          <div className="space-y-2">
            <Label htmlFor={`config-${appCodigo}`}>
              <Settings className="h-4 w-4 inline mr-1" />
              Configuración personalizada (JSON)
            </Label>
            <Textarea
              id={`config-${appCodigo}`}
              placeholder='{"theme": "dark", "notifications": true}'
              value={JSON.stringify(formData.configuracion_personalizada || {}, null, 2)}
              onChange={(e) => handleJsonChange('configuracion_personalizada', e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Configuración adicional específica para esta app
            </p>
          </div>

          {jsonError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{jsonError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updating || !!jsonError}
              className="flex items-center gap-2"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {updating ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}