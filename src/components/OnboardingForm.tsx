import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building, Package, Upload, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingFormData {
  nombre_comercial: string;
  razon_social?: string;
  cif: string;
  email: string;
  logo?: string;
  selected_apps: string[];
}

interface App {
  id: string;
  nombre: string;
  descripcion: string;
  es_core: boolean;
  es_gratuita: boolean;
  icono?: string;
  badge?: string;
  precio_mensual: number;
  trial_dias: number;
}

interface OnboardingFormProps {
  onSuccess: () => void;
}

export function OnboardingForm({ onSuccess }: OnboardingFormProps) {
  const [loading, setLoading] = useState(false);
  const [availableApps, setAvailableApps] = useState<App[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<OnboardingFormData>();

  // Fetch available apps on component mount
  useState(() => {
    const fetchApps = async () => {
      try {
        const { data: apps, error } = await (supabase as any)
          .from('apps')
          .select('*')
          .eq('activa', true)
          .order('orden_display');

        if (!error && apps) {
          setAvailableApps(apps as App[]);
        }
      } catch (error) {
        console.error('Error fetching apps:', error);
        // Set default apps for demo
        setAvailableApps([
          {
            id: '1',
            nombre: 'Gestión de Clientes',
            descripcion: 'Administra tu base de clientes y bicicletas',
            es_core: true,
            es_gratuita: true,
            precio_mensual: 0,
            trial_dias: 0,
            badge: 'Core'
          },
          {
            id: '2', 
            nombre: 'Facturación Básica',
            descripcion: 'Genera facturas y controla pagos',
            es_core: true,
            es_gratuita: true,
            precio_mensual: 0,
            trial_dias: 0,
            badge: 'Core'
          },
          {
            id: '3',
            nombre: 'Facturación Verifactu',
            descripcion: 'Facturación avanzada con validación fiscal',
            es_core: false,
            es_gratuita: false,
            precio_mensual: 29,
            trial_dias: 30,
            badge: 'Premium'
          }
        ]);
      }
    };
    fetchApps();
  });

  const handleAppToggle = (appId: string, checked: boolean) => {
    if (checked) {
      setSelectedApps(prev => [...prev, appId]);
    } else {
      setSelectedApps(prev => prev.filter(id => id !== appId));
    }
    setValue('selected_apps', selectedApps);
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setLoading(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('create-empresa', {
        body: {
          ...data,
          selected_apps: selectedApps
        }
      });

      if (error) throw error;

      if (result.success) {
        toast({
          title: "¡Empresa creada exitosamente!",
          description: "Tu cuenta empresarial está lista. Redirigiendo al dashboard...",
        });
        
        // Wait a moment for the profile to update
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error en onboarding:', error);
      toast({
        title: "Error al crear la empresa",
        description: error.message || "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderAppCard = (app: App) => {
    const isSelected = selectedApps.includes(app.id);
    const isCoreOrFree = app.es_core || app.es_gratuita;
    
    return (
      <div key={app.id} className="relative">
        <Card className={`cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
        } ${isCoreOrFree ? 'border-green-200 bg-green-50/50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {app.icono && <Package className="w-4 h-4" />}
                  <h4 className="font-medium">{app.nombre}</h4>
                  {app.badge && (
                    <Badge variant={app.es_gratuita ? 'secondary' : 'default'} className="text-xs">
                      {app.badge}
                    </Badge>
                  )}
                  {isCoreOrFree && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                      {app.es_core ? 'Core' : 'Gratuito'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{app.descripcion}</p>
                <div className="flex items-center justify-between">
                  {!isCoreOrFree && (
                    <div className="text-sm">
                      <span className="font-medium">€{app.precio_mensual}/mes</span>
                      {app.trial_dias > 0 && (
                        <span className="text-green-600 ml-2">
                          Prueba {app.trial_dias} días gratis
                        </span>
                      )}
                    </div>
                  )}
                  {isCoreOrFree && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Incluido siempre</span>
                    </div>
                  )}
                </div>
              </div>
              {!isCoreOrFree && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleAppToggle(app.id, checked as boolean)}
                  className="ml-3"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Building className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenido a Biciflix
          </h1>
          <p className="text-muted-foreground">
            Configura tu empresa para comenzar a gestionar tu taller de bicicletas
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Información de la Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre_comercial">Nombre Comercial *</Label>
                  <Input
                    id="nombre_comercial"
                    {...register('nombre_comercial', { required: 'Este campo es obligatorio' })}
                    placeholder="Taller Bicicletas S.L."
                  />
                  {errors.nombre_comercial && (
                    <p className="text-sm text-destructive mt-1">{errors.nombre_comercial.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="razon_social">Razón Social</Label>
                  <Input
                    id="razon_social"
                    {...register('razon_social')}
                    placeholder="Taller de Bicicletas S.L."
                  />
                </div>

                <div>
                  <Label htmlFor="cif">CIF/NIF *</Label>
                  <Input
                    id="cif"
                    {...register('cif', { required: 'Este campo es obligatorio' })}
                    placeholder="B12345678"
                  />
                  {errors.cif && (
                    <p className="text-sm text-destructive mt-1">{errors.cif.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email de la Empresa *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email', { 
                      required: 'Este campo es obligatorio',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Email inválido'
                      }
                    })}
                    placeholder="contacto@taller.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="logo">URL del Logo (opcional)</Label>
                <Input
                  id="logo"
                  {...register('logo')}
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Selecciona tus Aplicaciones
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Las aplicaciones marcadas como "Core" o "Gratuito" se incluyen automáticamente. 
                Puedes probar las aplicaciones premium durante el periodo de prueba.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableApps.map(renderAppCard)}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={loading}
              size="lg"
              className="min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando empresa...
                </>
              ) : (
                'Crear Empresa'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}