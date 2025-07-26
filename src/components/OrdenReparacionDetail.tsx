import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { OrdenReparacionForm } from "./OrdenReparacionForm";
import { OrdenProductos } from "./OrdenProductos";
import { FinalizarOrdenDialog } from "./FinalizarOrdenDialog";
import { MessageCircle, Edit, Calendar, DollarSign, User, Bike, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { es } from "date-fns/locale";

interface OrdenReparacion {
  id: string;
  cliente_id: string;
  bicicleta_id: string;
  estado: string;
  descripcion_trabajo?: string;
  fecha_entrada: string;
  fecha_estim_entrega?: string;
  costo_estimado?: number;
  total_productos?: number;
  fotos_antes?: string[];
  fotos_despues?: string[];
  created_at: string;
  updated_at: string;
  clientes?: {
    nombre: string;
    apellidos: string;
    telefono: string;
  };
  bicicletas?: {
    alias: string;
    marca: string;
    modelo: string;
  };
}

interface OrdenReparacionDetailProps {
  orden: OrdenReparacion;
  onOrdenUpdated?: (orden: OrdenReparacion) => void;
  onClose: () => void;
}

const getEstadoBadgeVariant = (estado: string) => {
  switch (estado) {
    case "Recibido":
      return "secondary";
    case "Diagnóstico":
      return "outline";
    case "En reparación":
      return "default";
    case "Esperando repuestos":
      return "destructive";
    case "Finalizado":
      return "default";
    case "Avisar cliente":
      return "outline";
    case "Entregado":
      return "default";
    default:
      return "secondary";
  }
};

const getEstadoLabel = (estado: string) => {
  const estadosMap = {
    "Recibido": "📥 Recibido",
    "Diagnóstico": "🔍 Diagnóstico",
    "En reparación": "⚙️ En reparación",
    "Esperando repuestos": "⏳ Esperando repuestos",
    "Finalizado": "✅ Finalizado",
    "Avisar cliente": "📞 Avisar cliente",
    "Entregado": "🚚 Entregado"
  };
  return estadosMap[estado as keyof typeof estadosMap] || estado;
};

export const OrdenReparacionDetail = ({
  orden,
  onOrdenUpdated,
  onClose
}: OrdenReparacionDetailProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [factura, setFactura] = useState<any>(null);

  useEffect(() => {
    if (orden.estado === 'Finalizado') {
      fetchFactura();
    }
  }, [orden.id, orden.estado]);

  const fetchFactura = async () => {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .eq('id_orden', orden.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching factura:', error);
      } else {
        setFactura(data);
      }
    } catch (error) {
      console.error('Error fetching factura:', error);
    }
  };

  const handleWhatsApp = () => {
    if (orden.clientes?.telefono) {
      let mensaje = `Hola ${orden.clientes.nombre}, te contactamos desde el taller.\n\n`;
      mensaje += `Referente a la reparación de tu ${orden.bicicletas?.marca} ${orden.bicicletas?.modelo} (${orden.bicicletas?.alias}).\n\n`;
      mensaje += `Estado actual: ${getEstadoLabel(orden.estado)}\n\n`;
      
      if (orden.descripcion_trabajo) {
        mensaje += `Trabajo: ${orden.descripcion_trabajo}\n\n`;
      }
      
      if (orden.costo_estimado) {
        mensaje += `Costo estimado: $${orden.costo_estimado}\n\n`;
      }
      
      if (orden.fecha_estim_entrega) {
        mensaje += `Fecha estimada de entrega: ${format(new Date(orden.fecha_estim_entrega), "dd/MM/yyyy", { locale: es })}\n\n`;
      }
      
      mensaje += `¡Saludos!`;
      
      const telefono = orden.clientes.telefono.replace(/\D/g, '');
      const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
    }
  };

  const handleOrdenUpdated = (updatedOrden: OrdenReparacion) => {
    onOrdenUpdated?.(updatedOrden);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <OrdenReparacionForm
        orden={orden}
        onOrdenUpdated={handleOrdenUpdated}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Orden de Reparación
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {orden.id.slice(0, 8)}...
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={getEstadoBadgeVariant(orden.estado)}>
              {getEstadoLabel(orden.estado)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Información principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Cliente</p>
                <p className="text-sm text-muted-foreground">
                  {orden.clientes?.nombre} {orden.clientes?.apellidos}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Bicicleta</p>
                <p className="text-sm text-muted-foreground">
                  {orden.bicicletas?.alias} - {orden.bicicletas?.marca} {orden.bicicletas?.modelo}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Fecha de Entrada</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(orden.fecha_entrada), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            </div>
            
            {orden.fecha_estim_entrega && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Fecha Estimada de Entrega</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(orden.fecha_estim_entrega), "dd 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            )}
            
            {orden.costo_estimado && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Costo Estimado</p>
                  <p className="text-sm text-muted-foreground">
                    ${orden.costo_estimado.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Productos y Servicios */}
        <OrdenProductos ordenId={orden.id} readonly />

        <Separator />

        {/* Descripción del trabajo */}
        {orden.descripcion_trabajo && (
          <div>
            <h3 className="font-medium mb-2">Descripción del Trabajo</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {orden.descripcion_trabajo}
            </p>
          </div>
        )}

        {/* Fotos Antes */}
        {orden.fotos_antes && orden.fotos_antes.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Fotos Antes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {orden.fotos_antes.map((foto, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <img
                      src={foto}
                      alt={`Antes ${index + 1}`}
                      className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <img src={foto} alt={`Antes ${index + 1}`} className="w-full h-auto" />
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        )}

        {/* Fotos Después */}
        {orden.fotos_despues && orden.fotos_despues.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Fotos Después</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {orden.fotos_despues.map((foto, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <img
                      src={foto}
                      alt={`Después ${index + 1}`}
                      className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <img src={foto} alt={`Después ${index + 1}`} className="w-full h-auto" />
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        )}

        {/* Información de Factura */}
        {orden.estado === 'Finalizado' && factura && (
          <>
            <Separator />
            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Información de Factura
              </h3>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Emisión</p>
                      <p className="font-medium">
                        {format(new Date(factura.fecha_emision), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-bold text-lg">${factura.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estado de Pago</p>
                      <Badge variant={factura.estado_pago === 'pagado' ? 'default' : 'destructive'}>
                        {factura.estado_pago === 'pagado' ? '✅ Pagado' : '💰 Pendiente'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Abrir página de facturas filtrada por esta factura
                        window.open(`/facturas`, '_blank');
                      }}
                    >
                      Ver Factura Completa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <Separator />

        {/* Acciones */}
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button onClick={handleWhatsApp} variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Cliente
            </Button>
          </div>
          
          <div className="flex gap-2">
            {orden.estado === 'En reparación' && (
              <FinalizarOrdenDialog 
                ordenId={orden.id} 
                onFinalize={() => {
                  // Recargar orden actualizada
                  onOrdenUpdated?.({...orden, estado: 'Finalizado'});
                }}
              >
                <Button size="sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar Orden
                </Button>
              </FinalizarOrdenDialog>
            )}
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              Cerrar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};