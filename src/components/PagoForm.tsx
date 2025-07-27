import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logCliente } from "@/lib/logs";

const pagoSchema = z.object({
  cliente_id: z.string().min(1, "Cliente requerido"),
  factura_id: z.string().optional(),
  monto: z.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha_pago: z.string().min(1, "Fecha requerida"),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'paypal', 'stripe', 'bizum', 'cheque', 'otro']),
  referencia: z.string().optional(),
  es_anticipo: z.boolean().default(false),
  observaciones: z.string().optional(),
});

type PagoFormData = z.infer<typeof pagoSchema>;

interface PagoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId?: string;
  facturaId?: string;
  montoSugerido?: number;
  onSuccess?: () => void;
}

export const PagoForm = ({ 
  open, 
  onOpenChange, 
  clienteId, 
  facturaId, 
  montoSugerido,
  onSuccess 
}: PagoFormProps) => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [facturasPendientes, setFacturasPendientes] = useState<any[]>([]);

  const form = useForm<PagoFormData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      cliente_id: clienteId || "",
      factura_id: facturaId || "",
      monto: montoSugerido || 0,
      fecha_pago: new Date().toISOString().split('T')[0],
      metodo_pago: 'efectivo',
      referencia: "",
      es_anticipo: false,
      observaciones: "",
    },
  });

  const selectedClienteId = form.watch("cliente_id");

  useEffect(() => {
    const fetchClientes = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, apellidos')
        .order('nombre');
      
      if (error) {
        console.error('Error cargando clientes:', error);
        return;
      }
      
      setClientes(data || []);
    };

    if (open) {
      fetchClientes();
    }
  }, [open]);

  useEffect(() => {
    const fetchFacturasPendientes = async () => {
      if (!selectedClienteId) {
        setFacturasPendientes([]);
        return;
      }

      const { data, error } = await supabase
        .from('facturas')
        .select('id, numero_factura, total, estado_pago')
        .eq('id_cliente', selectedClienteId)
        .in('estado_pago', ['pendiente', 'parcial'])
        .order('fecha_emision');
      
      if (error) {
        console.error('Error cargando facturas pendientes:', error);
        return;
      }
      
      setFacturasPendientes(data || []);
    };

    fetchFacturasPendientes();
  }, [selectedClienteId]);

  useEffect(() => {
    if (clienteId) form.setValue("cliente_id", clienteId);
    if (facturaId) form.setValue("factura_id", facturaId);
    if (montoSugerido) form.setValue("monto", montoSugerido);
  }, [clienteId, facturaId, montoSugerido, form]);

  const onSubmit = async (data: PagoFormData) => {
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('pagos')
        .insert({
          cliente_id: data.cliente_id,
          factura_id: data.factura_id === "none" ? null : data.factura_id || null,
          monto: data.monto,
          fecha_pago: data.fecha_pago,
          metodo_pago: data.metodo_pago,
          referencia: data.referencia || null,
          es_anticipo: data.es_anticipo,
          observaciones: data.observaciones || null,
        });

      if (error) throw error;

      toast.success("Pago registrado correctamente");
      
      // Log de la acción
      await logCliente.crear(data.cliente_id, `Pago registrado por ${data.monto}€ vía ${data.metodo_pago}`);
      
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error registrando pago:', error);
      toast.error("Error al registrar el pago: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Pago</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nombre} {cliente.apellidos}
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
                name="factura_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factura (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin factura asociada" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin factura asociada</SelectItem>
                        {facturasPendientes.map((factura) => (
                          <SelectItem key={factura.id} value={factura.id}>
                            {factura.numero_factura} - {factura.total}€ ({factura.estado_pago})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto (€)</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fecha_pago"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Pago</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="metodo_pago"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="bizum">Bizum</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia</FormLabel>
                    <FormControl>
                      <Input placeholder="ID transacción, número de operación..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="es_anticipo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Es anticipo</FormLabel>
                    <FormDescription>
                      Marcar si este pago es un anticipo que se aplicará a futuras facturas
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

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales sobre el pago..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Registrando..." : "Registrar Pago"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};