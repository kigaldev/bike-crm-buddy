import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generarFacturaAutomatica } from "@/utils/factura";

interface FinalizarOrdenDialogProps {
  ordenId: string;
  onFinalize?: () => void;
  children: React.ReactNode;
}

export const FinalizarOrdenDialog = ({ ordenId, onFinalize, children }: FinalizarOrdenDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productosInventariados, setProductosInventariados] = useState<any[]>([]);

  const checkProductosInventariados = async () => {
    try {
      const { data, error } = await supabase
        .from('orden_productos')
        .select(`
          *,
          productos_inventario:producto_inventario_id(
            nombre,
            cantidad_actual
          )
        `)
        .eq('orden_id', ordenId)
        .eq('es_inventariado', true)
        .not('producto_inventario_id', 'is', null);

      if (error) throw error;

      setProductosInventariados(data || []);
      setOpen(true);
    } catch (error) {
      console.error('Error checking productos:', error);
      toast({
        title: "Error",
        description: "Error al verificar productos",
        variant: "destructive"
      });
    }
  };

  const finalizarOrden = async () => {
    setLoading(true);
    
    try {
      // Primero descontar stock
      const { error: stockError } = await supabase
        .rpc('descontar_stock_orden', { orden_id_param: ordenId });

      if (stockError) {
        throw new Error(stockError.message);
      }

      // Luego actualizar el estado de la orden
      const { error: updateError } = await supabase
        .from('ordenes_reparacion')
        .update({ estado: 'Finalizado' })
        .eq('id', ordenId);

      if (updateError) throw updateError;

      // Generar factura automáticamente
      await generarFacturaAutomatica(ordenId);

      toast({
        title: "Orden Finalizada",
        description: "La orden se ha finalizado y el stock se ha actualizado correctamente"
      });

      setOpen(false);
      onFinalize?.();
    } catch (error: any) {
      console.error('Error finalizing orden:', error);
      toast({
        title: "Error",
        description: error.message || "Error al finalizar la orden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const productosConProblemas = productosInventariados.filter(
    producto => producto.productos_inventario?.cantidad_actual < producto.cantidad
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={checkProductosInventariados}>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Finalizar Orden
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Al finalizar esta orden se realizarán las siguientes acciones:
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Cambiar estado a "Finalizado"
            </div>
            
            {productosInventariados.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-blue-500" />
                Descontar stock de {productosInventariados.length} producto(s) del inventario
              </div>
            )}
          </div>

          {productosConProblemas.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Stock insuficiente:</p>
                  {productosConProblemas.map((producto, index) => (
                    <p key={index} className="text-xs">
                      • {producto.nombre}: Necesario {producto.cantidad}, Disponible {producto.productos_inventario?.cantidad_actual || 0}
                    </p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {productosInventariados.length > 0 && productosConProblemas.length === 0 && (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Se descontará del inventario:</p>
                  {productosInventariados.map((producto, index) => (
                    <p key={index} className="text-xs">
                      • {producto.nombre}: -{producto.cantidad} unidades
                    </p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={finalizarOrden} 
              disabled={loading || productosConProblemas.length > 0}
            >
              {loading ? "Finalizando..." : "Finalizar Orden"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};