import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresaContext';
import { useToast } from '@/hooks/use-toast';
import { MessageSquarePlus, Bug, Lightbulb, Settings } from 'lucide-react';

const feedbackSchema = z.object({
  tipo: z.string().min(1, "Selecciona un tipo"),
  titulo: z.string().min(1, "El título es requerido").max(100, "Máximo 100 caracteres"),
  descripcion: z.string().min(10, "Mínimo 10 caracteres").max(1000, "Máximo 1000 caracteres"),
  app_relacionada: z.string().optional(),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

const tipoOptions = [
  { value: 'bug', label: 'Bug/Error', icon: Bug, description: 'Reportar un error o problema' },
  { value: 'sugerencia', label: 'Nueva Funcionalidad', icon: Lightbulb, description: 'Sugerir nueva característica' },
  { value: 'mejora', label: 'Mejora', icon: Settings, description: 'Mejorar funcionalidad existente' },
  { value: 'otro', label: 'Otro', icon: MessageSquarePlus, description: 'Otro tipo de feedback' },
];

// Apps disponibles
const appsDisponibles = [
  { codigo: 'clientes', nombre: 'Gestión de Clientes' },
  { codigo: 'facturacion-basica', nombre: 'Facturación Básica' },
  { codigo: 'ordenes', nombre: 'Órdenes de Reparación' },
  { codigo: 'inventario', nombre: 'Inventario' },
  { codigo: 'abonos', nombre: 'Abonos y Devoluciones' },
  { codigo: 'pagos', nombre: 'Gestión de Pagos' },
  { codigo: 'reportes', nombre: 'Reportes Avanzados' },
  { codigo: 'alertas', nombre: 'Sistema de Alertas' },
];

interface FeedbackFormProps {
  onSuccess?: () => void;
  appInicial?: string;
}

export function FeedbackForm({ onSuccess, appInicial }: FeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useAuth();
  const { empresaActual } = useEmpresa();
  const { toast } = useToast();

  const form = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      tipo: '',
      titulo: '',
      descripcion: '',
      app_relacionada: appInicial || 'general',
    },
  });

  const onSubmit = async (values: FeedbackForm) => {
    if (!user || !empresaActual) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para enviar feedback",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('feedback_saas')
        .insert({
          empresa_id: empresaActual.id,
          user_id: profile?.user_id || '',
          tipo: values.tipo,
          titulo: values.titulo,
          descripcion: values.descripcion,
          app_relacionada: values.app_relacionada === 'general' ? null : values.app_relacionada,
        });

      if (error) throw error;

      toast({
        title: "¡Feedback enviado!",
        description: "Gracias por tu comentario. Lo revisaremos pronto.",
      });

      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5" />
          Enviar Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Feedback</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tipoOptions.map((tipo) => {
                        const Icon = tipo.icon;
                        return (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{tipo.label}</div>
                                <div className="text-xs text-muted-foreground">{tipo.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="app_relacionada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Relacionada (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una app" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General / No específica</SelectItem>
                      {appsDisponibles.map((app) => (
                        <SelectItem key={app.codigo} value={app.codigo}>
                          {app.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Resumen breve del feedback" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe en detalle tu feedback, sugerencia o problema..."
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Enviando..." : "Enviar Feedback"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}