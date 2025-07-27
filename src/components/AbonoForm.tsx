import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const abonoSchema = z.object({
  factura_original_id: z.string().optional(),
  monto: z.number().min(0.01, "El monto debe ser mayor a 0"),
  tipo: z.enum(['reembolso', 'nota_credito']),
  fecha_abono: z.string().min(1, "Fecha requerida"),
  motivo: z.string().min(1, "Motivo requerido"),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'bizum', 'cheque', 'otro']).optional(),
  referencia: z.string().optional(),
  observaciones: z.string().optional(),
});

type AbonoFormData = z.infer<typeof abonoSchema>;

interface AbonoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facturaId?: string;
  clienteId?: string;
  montoMaximo?: number;
  onSuccess?: () => void;
}

export const AbonoForm = ({ 
  open, 
  onOpenChange, 
  facturaId, 
  clienteId,
  montoMaximo,
  onSuccess 
}: AbonoFormProps) => {
  const [loading, setLoading] = useState(false);
  const [facturas, setFacturas] = useState<any[]>([]);

  const form = useForm<AbonoFormData>({
    resolver: zodResolver(abonoSchema),
    defaultValues: {
      factura_original_id: facturaId || "",
      monto: 0,
      tipo: 'nota_credito',
      fecha_abono: new Date().toISOString().split('T')[0],
      motivo: "",
      metodo_pago: 'transferencia',
      referencia: "",
      observaciones: "",
    },
  });

  const tipoSelected = form.watch("tipo");
  const facturaSelected = form.watch("factura_original_id");

  useEffect(() => {
    const fetchFacturas = async () => {
      if (!clienteId) return;

      const { data, error } = await supabase
        .from('facturas')
        .select('id, numero_factura, total, estado_pago')
        .eq('id_cliente', clienteId)
        .in('estado_pago', ['pagado', 'parcial'])
        .order('fecha_emision', { ascending: false });
      
      if (error) {
        console.error('Error cargando facturas:', error);
        return;
      }
      
      setFacturas(data || []);
    };

    if (open && clienteId) {
      fetchFacturas();
    }
  }, [open, clienteId]);

  useEffect(() => {
    if (facturaId) {
      form.setValue("factura_original_id", facturaId);
    }
    if (montoMaximo) {
      form.setValue("monto", montoMaximo);
    }
  }, [facturaId, montoMaximo, form]);

  const onSubmit = async (data: AbonoFormData) => {
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('abonos')
        .insert({
          factura_original_id: data.factura_original_id || null,
          monto: data.monto,
          tipo: data.tipo,
          fecha_abono: data.fecha_abono,
          motivo: data.motivo,
          metodo_pago: data.metodo_pago || null,
          referencia: data.referencia || null,
          observaciones: data.observaciones || null,
        });

      if (error) throw error;

      toast.success(`${data.tipo === 'nota_credito' ? 'Nota de crédito' : 'Abono'} registrado correctamente`);
      
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error registrando abono:', error);
      toast.error("Error al registrar el abono: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Abono/Nota de Crédito</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nota_credito">Nota de Crédito</SelectItem>
                        <SelectItem value="reembolso">Reembolso Directo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {tipoSelected === 'nota_credito' 
                        ? 'Documento fiscal que reduce el importe de una factura'
                        : 'Devolución directa de dinero al cliente'
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fecha_abono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha del Abono</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="factura_original_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Factura Original (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar factura" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sin factura asociada</SelectItem>
                      {facturas.map((factura) => (
                        <SelectItem key={factura.id} value={factura.id}>
                          {factura.numero_factura} - €{factura.total} ({factura.estado_pago})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importe del Abono (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    {montoMaximo && (
                      <FormDescription>
                        Máximo: €{montoMaximo.toFixed(2)}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {tipoSelected === 'reembolso' && (
                <FormField
                  control={form.control}
                  name="metodo_pago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Devolución</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="tarjeta">Devolución a Tarjeta</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="bizum">Bizum</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo del Abono</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describa el motivo del abono (defecto en producto, cancelación, etc.)"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="referencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de operación, ticket, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Input placeholder="Notas adicionales..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : `Crear ${tipoSelected === 'nota_credito' ? 'Nota de Crédito' : 'Abono'}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};