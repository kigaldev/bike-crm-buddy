import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Bicicleta {
  id: string;
  cliente_id: string;
  alias: string;
  marca: string;
  modelo: string;
  tipo: string;
  color: string;
  numero_de_serie: string;
  fecha_compra: string;
  notas: string;
}

interface BicicletaFormProps {
  bicicleta?: Bicicleta;
  clienteId: string;
  onBicicletaCreated: () => void;
  isEditing?: boolean;
}

const tiposBicicleta = [
  "MTB",
  "Carretera", 
  "Eléctrica",
  "Urbana",
  "Infantil",
  "Otra"
];

export const BicicletaForm = ({ bicicleta, clienteId, onBicicletaCreated, isEditing = false }: BicicletaFormProps) => {
  const [formData, setFormData] = useState({
    alias: bicicleta?.alias || "",
    marca: bicicleta?.marca || "",
    modelo: bicicleta?.modelo || "",
    tipo: bicicleta?.tipo || "",
    color: bicicleta?.color || "",
    numero_de_serie: bicicleta?.numero_de_serie || "",
    fecha_compra: bicicleta?.fecha_compra || "",
    notas: bicicleta?.notas || "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      tipo: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.alias.trim()) {
      toast({
        title: "Error de validación",
        description: "El alias es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.marca.trim()) {
      toast({
        title: "Error de validación",
        description: "La marca es obligatoria",
        variant: "destructive",
      });
      return;
    }

    if (!formData.modelo.trim()) {
      toast({
        title: "Error de validación",
        description: "El modelo es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tipo) {
      toast({
        title: "Error de validación",
        description: "El tipo es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        cliente_id: clienteId,
        fecha_compra: formData.fecha_compra || null,
      };

      if (isEditing && bicicleta) {
        const { error } = await supabase
          .from('bicicletas')
          .update(dataToSend)
          .eq('id', bicicleta.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bicicletas')
          .insert([dataToSend]);

        if (error) throw error;
      }

      toast({
        title: "Éxito",
        description: `Bicicleta ${isEditing ? 'actualizada' : 'creada'} correctamente`,
      });
      onBicicletaCreated();
    } catch (error) {
      console.error('Error saving bicicleta:', error);
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la bicicleta`,
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
          <Label htmlFor="alias">Alias *</Label>
          <Input
            id="alias"
            name="alias"
            value={formData.alias}
            onChange={handleInputChange}
            placeholder="Ej: Mi bici roja"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo *</Label>
          <Select value={formData.tipo} onValueChange={handleSelectChange} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposBicicleta.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="marca">Marca *</Label>
          <Input
            id="marca"
            name="marca"
            value={formData.marca}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo *</Label>
          <Input
            id="modelo"
            name="modelo"
            value={formData.modelo}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            name="color"
            value={formData.color}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_compra">Fecha de Compra</Label>
          <Input
            id="fecha_compra"
            name="fecha_compra"
            type="date"
            value={formData.fecha_compra}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="numero_de_serie">Número de Serie</Label>
        <Input
          id="numero_de_serie"
          name="numero_de_serie"
          value={formData.numero_de_serie}
          onChange={handleInputChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea
          id="notas"
          name="notas"
          value={formData.notas}
          onChange={handleInputChange}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : isEditing ? "Actualizar Bicicleta" : "Crear Bicicleta"}
        </Button>
      </div>
    </form>
  );
};