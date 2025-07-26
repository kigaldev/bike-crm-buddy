import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logCliente } from "@/lib/logs";

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

interface ClienteFormProps {
  cliente?: Cliente;
  onClienteCreated: () => void;
  isEditing?: boolean;
}

export const ClienteForm = ({ cliente, onClienteCreated, isEditing = false }: ClienteFormProps) => {
  const [formData, setFormData] = useState({
    nombre: cliente?.nombre || "",
    apellidos: cliente?.apellidos || "",
    telefono: cliente?.telefono || "",
    email: cliente?.email || "",
    direccion: cliente?.direccion || "",
    observaciones: cliente?.observaciones || "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!validateEmail(formData.email)) {
      toast({
        title: "Error de validación",
        description: "Por favor, introduce un email válido",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhone(formData.telefono)) {
      toast({
        title: "Error de validación", 
        description: "El teléfono debe tener exactamente 9 dígitos numéricos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && cliente) {
        // Actualizar cliente existente
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', cliente.id);

        if (error) throw error;

        await logCliente.actualizar(cliente.id, `${formData.nombre} ${formData.apellidos}`);
      } else {
        // Crear nuevo cliente
        const { data: newCliente, error } = await supabase
          .from('clientes')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;

        await logCliente.crear(newCliente.id, `${formData.nombre} ${formData.apellidos}`);
      }

      toast({
        title: "Éxito",
        description: `Cliente ${isEditing ? 'actualizado' : 'creado'} correctamente`,
      });
      onClienteCreated();
    } catch (error) {
      console.error('Error saving cliente:', error);
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? 'actualizar' : 'crear'} el cliente`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apellidos">Apellidos *</Label>
          <Input
            id="apellidos"
            name="apellidos"
            value={formData.apellidos}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono *</Label>
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            value={formData.telefono}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Textarea
          id="direccion"
          name="direccion"
          value={formData.direccion}
          onChange={handleInputChange}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea
          id="observaciones"
          name="observaciones"
          value={formData.observaciones}
          onChange={handleInputChange}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : isEditing ? "Actualizar Cliente" : "Crear Cliente"}
        </Button>
      </div>
    </form>
  );
};