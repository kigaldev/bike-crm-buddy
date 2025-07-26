import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, MessageCircle, CheckCircle, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Factura {
  id: string;
  id_orden: string;
  id_cliente: string;
  fecha_emision: string;
  estado_pago: string;
  total: number;
  metodo_pago?: string;
  archivo_pdf?: string;
  created_at: string;
  updated_at: string;
  clientes?: {
    nombre: string;
    apellidos: string;
    telefono: string;
    email: string;
    direccion?: string;
  };
  ordenes_reparacion?: {
    descripcion_trabajo: string;
    fecha_entrada: string;
    fecha_estim_entrega?: string;
    bicicletas: {
      alias: string;
      marca: string;
      modelo: string;
      tipo: string;
    };
  };
}

interface FacturaDetailProps {
  factura: Factura;
  onFacturaUpdated: () => void;
  onClose: () => void;
}

const estadosPago = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "parcial", label: "Parcial" }
];

const metodosPago = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" }
];

const getEstadoBadgeVariant = (estado: string) => {
  switch (estado) {
    case "pagado":
      return "default";
    case "pendiente":
      return "destructive";
    case "parcial":
      return "secondary";
    default:
      return "outline";
  }
};

const getEstadoLabel = (estado: string) => {
  const estadosMap = {
    "pendiente": "💰 Pendiente",
    "pagado": "✅ Pagado",
    "parcial": "⚠️ Parcial"
  };
  return estadosMap[estado as keyof typeof estadosMap] || estado;
};

export const FacturaDetail = ({ factura, onFacturaUpdated, onClose }: FacturaDetailProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [estadoPago, setEstadoPago] = useState(factura.estado_pago);
  const [metodoPago, setMetodoPago] = useState(factura.metodo_pago || "");

  const handleUpdateFactura = async () => {
    // Validaciones
    if (!estadoPago) {
      toast({
        title: "Error de validación",
        description: "El estado de pago es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (estadoPago === "pagado" && !metodoPago) {
      toast({
        title: "Error de validación", 
        description: "Debe seleccionar un método de pago cuando el estado es 'Pagado'",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('facturas')
        .update({
          estado_pago: estadoPago,
          metodo_pago: metodoPago || null
        })
        .eq('id', factura.id);

      if (error) throw error;

      onFacturaUpdated();
      toast({
        title: "Éxito",
        description: "Factura actualizada correctamente"
      });
    } catch (error) {
      console.error('Error updating factura:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la factura",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const enviarPorWhatsApp = () => {
    const telefono = factura.clientes?.telefono?.replace(/[^\d]/g, '');
    const mensaje = `Hola ${factura.clientes?.nombre}, aquí tienes tu factura de reparación por $${factura.total.toFixed(2)}. ${factura.archivo_pdf ? `PDF: ${factura.archivo_pdf}` : ''}`;
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const descargarPDF = () => {
    if (factura.archivo_pdf) {
      window.open(factura.archivo_pdf, '_blank');
    } else {
      toast({
        title: "PDF no disponible",
        description: "El PDF de esta factura no está disponible",
        variant: "destructive"
      });
    }
  };

  const generarPDF = async () => {
    setLoading(true);
    try {
      // Aquí se implementaría la llamada al edge function para generar el PDF
      toast({
        title: "Generando PDF",
        description: "La generación del PDF está en desarrollo"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Error al generar el PDF",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Factura #{factura.id.slice(-8)}
        </h2>
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="font-medium">
                {factura.clientes?.nombre} {factura.clientes?.apellidos}
              </p>
              <p className="text-sm text-muted-foreground">{factura.clientes?.email}</p>
              <p className="text-sm text-muted-foreground">{factura.clientes?.telefono}</p>
              {factura.clientes?.direccion && (
                <p className="text-sm text-muted-foreground">{factura.clientes?.direccion}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Información de la Factura */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos de Factura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Fecha de Emisión:</span>
              <span className="font-medium">
                {format(new Date(factura.fecha_emision), "dd/MM/yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Estado:</span>
              <Badge variant={getEstadoBadgeVariant(factura.estado_pago)}>
                {getEstadoLabel(factura.estado_pago)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total:</span>
              <span className="font-bold text-lg">${factura.total.toFixed(2)}</span>
            </div>
            {factura.metodo_pago && (
              <div className="flex justify-between">
                <span className="text-sm">Método de Pago:</span>
                <span className="font-medium capitalize">{factura.metodo_pago}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información de la Orden */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Orden de Reparación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Bicicleta</p>
              <p className="font-medium">
                {factura.ordenes_reparacion?.bicicletas.alias} - {factura.ordenes_reparacion?.bicicletas.marca} {factura.ordenes_reparacion?.bicicletas.modelo}
              </p>
              <p className="text-sm text-muted-foreground">
                Tipo: {factura.ordenes_reparacion?.bicicletas.tipo}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Entrada</p>
              <p className="font-medium">
                {factura.ordenes_reparacion?.fecha_entrada && 
                  format(new Date(factura.ordenes_reparacion.fecha_entrada), "dd/MM/yyyy", { locale: es })
                }
              </p>
              {factura.ordenes_reparacion?.fecha_estim_entrega && (
                <>
                  <p className="text-sm text-muted-foreground mt-2">Fecha Estimada de Entrega</p>
                  <p className="font-medium">
                    {format(new Date(factura.ordenes_reparacion.fecha_estim_entrega), "dd/MM/yyyy", { locale: es })}
                  </p>
                </>
              )}
            </div>
          </div>
          
          {factura.ordenes_reparacion?.descripcion_trabajo && (
            <div>
              <p className="text-sm text-muted-foreground">Descripción del Trabajo</p>
              <p className="mt-1">{factura.ordenes_reparacion.descripcion_trabajo}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actualizar Estado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actualizar Factura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado de Pago</label>
              <Select value={estadoPago} onValueChange={setEstadoPago}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {estadosPago.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Método de Pago</label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  {metodosPago.map((metodo) => (
                    <SelectItem key={metodo.value} value={metodo.value}>
                      {metodo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleUpdateFactura} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar Factura"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Acciones */}
      <div className="flex flex-wrap gap-4">
        {factura.archivo_pdf ? (
          <Button onClick={descargarPDF} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Descargar PDF
          </Button>
        ) : (
        <Button onClick={generarPDF} disabled={loading} className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {loading ? "Generando..." : "Generar PDF"}
        </Button>
        )}

        <Button onClick={enviarPorWhatsApp} variant="outline" className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Enviar por WhatsApp
        </Button>
      </div>
    </div>
  );
};