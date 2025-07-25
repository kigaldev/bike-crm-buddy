import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MessageCircle, Settings, Bike, Edit2, Calendar, Mail, Phone, MapPin, FileText } from "lucide-react";
import { ClienteBicicletas } from "./ClienteBicicletas";
import { ClienteForm } from "./ClienteForm";
import { OrdenReparacionForm } from "./OrdenReparacionForm";

interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  direccion: string;
  fecha_alta: string;
  observaciones: string;
}

interface ClienteDetailProps {
  cliente: Cliente;
  onClienteUpdated: () => void;
  onClose: () => void;
}

export const ClienteDetail = ({ cliente, onClienteUpdated, onClose }: ClienteDetailProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showOrdenForm, setShowOrdenForm] = useState(false);

  const handleWhatsApp = () => {
    const cleanPhone = cliente.telefono.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCrearReparacion = () => {
    setShowOrdenForm(true);
  };

  const handleVerBicicletas = () => {
    // Esta funcionalidad ya está implementada en la vista
    console.log('Ver bicicletas de cliente:', cliente.id);
  };

  const handleClienteUpdated = () => {
    setIsEditing(false);
    onClienteUpdated();
  };

  if (isEditing) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <ClienteForm
          cliente={cliente}
          onClienteCreated={handleClienteUpdated}
          isEditing={true}
        />
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>Ficha del Cliente</span>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {cliente.nombre} {cliente.apellidos}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{cliente.telefono}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{cliente.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Cliente desde: {new Date(cliente.fecha_alta).toLocaleDateString('es-ES')}</span>
              </div>
            </div>

            {cliente.direccion && (
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                <span>{cliente.direccion}</span>
              </div>
            )}

            {cliente.observaciones && (
              <div className="flex items-start space-x-2">
                <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium mb-1">Observaciones:</p>
                  <p className="text-sm text-muted-foreground">{cliente.observaciones}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCrearReparacion} className="flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Crear Reparación
              </Button>
              
              <Button onClick={handleWhatsApp} variant="outline" className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar WhatsApp
              </Button>
              
              <Button onClick={handleVerBicicletas} variant="outline" className="flex items-center">
                <Bike className="w-4 h-4 mr-2" />
                Ver Bicicletas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bicicletas del cliente */}
        <ClienteBicicletas 
          clienteId={cliente.id} 
          clienteNombre={`${cliente.nombre} ${cliente.apellidos}`}
        />
      </div>

      {/* Dialog para crear orden */}
      <Dialog open={showOrdenForm} onOpenChange={setShowOrdenForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <OrdenReparacionForm
            clienteId={cliente.id}
            onOrdenCreated={() => setShowOrdenForm(false)}
            onCancel={() => setShowOrdenForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};