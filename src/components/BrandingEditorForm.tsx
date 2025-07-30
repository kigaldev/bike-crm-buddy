import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBranding } from '@/hooks/useBranding';
import { Palette, Upload, Type, Moon } from 'lucide-react';

const brandingSchema = z.object({
  logo_url: z.string().url().optional().or(z.literal('')),
  color_primario: z.string().regex(/^#[0-9A-F]{6}$/i, 'Debe ser un color hexadecimal válido'),
  color_secundario: z.string().regex(/^#[0-9A-F]{6}$/i, 'Debe ser un color hexadecimal válido'),
  tipografia_base: z.string().optional(),
  modo_oscuro: z.boolean(),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

const tipografias = [
  { value: '', label: 'Sistema por defecto' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Source Sans Pro, sans-serif', label: 'Source Sans Pro' },
];

export function BrandingEditorForm() {
  const { branding, updateBranding, loading } = useBranding();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logo_url: branding?.logo_url || '',
      color_primario: branding?.color_primario || '#3b82f6',
      color_secundario: branding?.color_secundario || '#64748b',
      tipografia_base: branding?.tipografia_base || '',
      modo_oscuro: branding?.modo_oscuro || false,
    },
  });

  // Actualizar valores cuando cambie el branding
  useEffect(() => {
    if (branding) {
      form.reset({
        logo_url: branding.logo_url || '',
        color_primario: branding.color_primario,
        color_secundario: branding.color_secundario,
        tipografia_base: branding.tipografia_base || '',
        modo_oscuro: branding.modo_oscuro,
      });
    }
  }, [branding, form]);

  const onSubmit = async (values: BrandingFormValues) => {
    setIsSubmitting(true);
    try {
      await updateBranding({
        logo_url: values.logo_url || null,
        color_primario: values.color_primario,
        color_secundario: values.color_secundario,
        tipografia_base: values.tipografia_base || null,
        modo_oscuro: values.modo_oscuro,
      });
      
      toast.success('Branding actualizado correctamente');
    } catch (error) {
      console.error('Error updating branding:', error);
      toast.error('Error al actualizar el branding');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personalización Visual</CardTitle>
          <CardDescription>Cargando configuración...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personalización Visual
        </CardTitle>
        <CardDescription>
          Personaliza el logo, colores y tipografía de tu empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Logo */}
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Logo de la empresa
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://ejemplo.com/logo.png" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    URL de la imagen del logo. Se recomienda formato PNG con fondo transparente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Color Primario */}
              <FormField
                control={form.control}
                name="color_primario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Primario</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="w-16 h-10 p-1 rounded cursor-pointer"
                          {...field}
                        />
                        <Input
                          placeholder="#3b82f6"
                          className="flex-1"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Color principal de la interfaz (botones, enlaces, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color Secundario */}
              <FormField
                control={form.control}
                name="color_secundario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Secundario</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="w-16 h-10 p-1 rounded cursor-pointer"
                          {...field}
                        />
                        <Input
                          placeholder="#64748b"
                          className="flex-1"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Color secundario para elementos de apoyo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tipografía */}
            <FormField
              control={form.control}
              name="tipografia_base"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Tipografía
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una tipografía" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tipografias.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value || 'inherit' }}>
                            {font.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Tipografía base para toda la interfaz
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Modo Oscuro */}
            <FormField
              control={form.control}
              name="modo_oscuro"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Modo Oscuro
                    </FormLabel>
                    <FormDescription>
                      Activar el tema oscuro por defecto
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Vista previa de colores */}
            <div className="space-y-3">
              <FormLabel>Vista Previa</FormLabel>
              <div className="flex gap-4 p-4 border rounded-lg">
                <div 
                  className="w-16 h-16 rounded-lg border shadow-sm"
                  style={{ backgroundColor: form.watch('color_primario') }}
                  title="Color Primario"
                />
                <div 
                  className="w-16 h-16 rounded-lg border shadow-sm"
                  style={{ backgroundColor: form.watch('color_secundario') }}
                  title="Color Secundario"
                />
                <div className="flex-1 space-y-2">
                  <div 
                    className="text-sm font-medium"
                    style={{ 
                      color: form.watch('color_primario'),
                      fontFamily: form.watch('tipografia_base') || 'inherit'
                    }}
                  >
                    Texto con color primario
                  </div>
                  <div 
                    className="text-sm"
                    style={{ 
                      color: form.watch('color_secundario'),
                      fontFamily: form.watch('tipografia_base') || 'inherit'
                    }}
                  >
                    Texto con color secundario
                  </div>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}