import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrdenReparacion {
  id?: string;
  cliente_id: string;
  bicicleta_id: string;
  estado: string;
  descripcion_trabajo?: string;
  fecha_entrada: string;
  fecha_estim_entrega?: string;
  costo_estimado?: number;
  fotos_antes?: string[];
  fotos_despues?: string[];
}

interface OrdenReparacionFormProps {
  orden?: OrdenReparacion;
  clienteId?: string;
  bicicletaId?: string;
  onOrdenCreated?: (orden: OrdenReparacion) => void;
  onOrdenUpdated?: (orden: OrdenReparacion) => void;
  onCancel: () => void;
}

const estadosOrden = [
  { value: "Recibido", label: "📥 Recibido" },
  { value: "Diagnóstico", label: "🔍 Diagnóstico" },
  { value: "En reparación", label: "⚙️ En reparación" },
  { value: "Esperando repuestos", label: "⏳ Esperando repuestos" },
  { value: "Finalizado", label: "✅ Finalizado" },
  { value: "Avisar cliente", label: "📞 Avisar cliente" },
  { value: "Entregado", label: "🚚 Entregado" }
];

export const OrdenReparacionForm = ({
  orden,
  clienteId,
  bicicletaId,
  onOrdenCreated,
  onOrdenUpdated,
  onCancel
}: OrdenReparacionFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    cliente_id: orden?.cliente_id || clienteId || "",
    bicicleta_id: orden?.bicicleta_id || bicicletaId || "",
    estado: orden?.estado || "Recibido",
    descripcion_trabajo: orden?.descripcion_trabajo || "",
    fecha_entrada: orden?.fecha_entrada || new Date().toISOString().split('T')[0],
    fecha_estim_entrega: orden?.fecha_estim_entrega || "",
    costo_estimado: orden?.costo_estimado || 0,
    fotos_antes: orden?.fotos_antes || [],
    fotos_despues: orden?.fotos_despues || []
  });

  const [clientes, setClientes] = useState<any[]>([]);
  const [bicicletas, setBicicletas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchClientes();
    if (formData.cliente_id) {
      fetchBicicletas(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, apellidos')
      .order('nombre');
    
    if (error) {
      console.error('Error fetching clientes:', error);
    } else {
      setClientes(data || []);
    }
  };

  const fetchBicicletas = async (clienteId: string) => {
    const { data, error } = await supabase
      .from('bicicletas')
      .select('id, alias, marca, modelo')
      .eq('cliente_id', clienteId)
      .order('alias');
    
    if (error) {
      console.error('Error fetching bicicletas:', error);
    } else {
      setBicicletas(data || []);
    }
  };

  const uploadPhoto = async (file: File, folder: 'antes' | 'despues') => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('repair-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('repair-photos')
        .getPublicUrl(filePath);

      const fotosKey = folder === 'antes' ? 'fotos_antes' : 'fotos_despues';
      setFormData(prev => ({
        ...prev,
        [fotosKey]: [...prev[fotosKey], publicUrl]
      }));

      toast({
        title: "Foto subida",
        description: "La foto se ha subido correctamente"
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Error al subir la foto",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number, folder: 'antes' | 'despues') => {
    const fotosKey = folder === 'antes' ? 'fotos_antes' : 'fotos_despues';
    setFormData(prev => ({
      ...prev,
      [fotosKey]: prev[fotosKey].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.cliente_id) {
      toast({
        title: "Error de validación",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      });
      return;
    }

    if (!formData.bicicleta_id) {
      toast({
        title: "Error de validación", 
        description: "Debes seleccionar una bicicleta",
        variant: "destructive",
      });
      return;
    }

    if (!formData.descripcion_trabajo?.trim()) {
      toast({
        title: "Error de validación",
        description: "La descripción del trabajo es obligatoria",
        variant: "destructive",
      });
      return;
    }

    if (formData.costo_estimado < 0) {
      toast({
        title: "Error de validación",
        description: "El costo estimado no puede ser negativo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const ordenData = {
        cliente_id: formData.cliente_id,
        bicicleta_id: formData.bicicleta_id,
        estado: formData.estado,
        descripcion_trabajo: formData.descripcion_trabajo || null,
        fecha_entrada: formData.fecha_entrada,
        fecha_estim_entrega: formData.fecha_estim_entrega || null,
        costo_estimado: formData.costo_estimado || null,
        fotos_antes: formData.fotos_antes,
        fotos_despues: formData.fotos_despues
      };

      if (orden?.id) {
        const { data, error } = await supabase
          .from('ordenes_reparacion')
          .update(ordenData)
          .eq('id', orden.id)
          .select()
          .single();

        if (error) throw error;

        onOrdenUpdated?.(data);
        toast({
          title: "Éxito",
          description: "Orden de reparación actualizada correctamente"
        });
      } else {
        const { data, error } = await supabase
          .from('ordenes_reparacion')
          .insert(ordenData)
          .select()
          .single();

        if (error) throw error;

        onOrdenCreated?.(data);
        toast({
          title: "Éxito",
          description: "Orden de reparación creada correctamente"
        });
      }
    } catch (error) {
      console.error('Error saving orden:', error);
      toast({
        title: "Error",
        description: "Error al guardar la orden de reparación",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>
          {orden ? "Editar Orden de Reparación" : "Nueva Orden de Reparación"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, cliente_id: value, bicicleta_id: "" }));
                  fetchBicicletas(value);
                }}
                disabled={!!clienteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bicicleta">Bicicleta</Label>
              <Select
                value={formData.bicicleta_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, bicicleta_id: value }))}
                disabled={!!bicicletaId || !formData.cliente_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una bicicleta" />
                </SelectTrigger>
                <SelectContent>
                  {bicicletas.map((bicicleta) => (
                    <SelectItem key={bicicleta.id} value={bicicleta.id}>
                      {bicicleta.alias} - {bicicleta.marca} {bicicleta.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {estadosOrden.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costo_estimado">Costo Estimado</Label>
              <Input
                id="costo_estimado"
                type="number"
                step="0.01"
                value={formData.costo_estimado}
                onChange={(e) => setFormData(prev => ({ ...prev, costo_estimado: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_entrada">Fecha de Entrada</Label>
              <Input
                id="fecha_entrada"
                type="date"
                value={formData.fecha_entrada}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha_entrada: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_estim_entrega">Fecha Estimada de Entrega</Label>
              <Input
                id="fecha_estim_entrega"
                type="date"
                value={formData.fecha_estim_entrega}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha_estim_entrega: e.target.value }))}
              />
            </div>
          </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion_trabajo">Descripción del Trabajo *</Label>
              <Textarea
                id="descripcion_trabajo"
                value={formData.descripcion_trabajo}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion_trabajo: e.target.value }))}
                placeholder="Describe el trabajo a realizar..."
                rows={4}
                required
              />
            </div>

          {/* Fotos Antes */}
          <div className="space-y-2">
            <Label>Fotos Antes</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.fotos_antes.map((foto, index) => (
                <div key={index} className="relative">
                  <img src={foto} alt={`Antes ${index + 1}`} className="w-full h-24 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index, 'antes')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="border-2 border-dashed border-gray-300 rounded h-24 flex items-center justify-center cursor-pointer hover:border-gray-400">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(file, 'antes');
                  }}
                />
                <Upload className="w-6 h-6 text-gray-400" />
              </label>
            </div>
          </div>

          {/* Fotos Después */}
          <div className="space-y-2">
            <Label>Fotos Después</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.fotos_despues.map((foto, index) => (
                <div key={index} className="relative">
                  <img src={foto} alt={`Después ${index + 1}`} className="w-full h-24 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index, 'despues')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="border-2 border-dashed border-gray-300 rounded h-24 flex items-center justify-center cursor-pointer hover:border-gray-400">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(file, 'despues');
                  }}
                />
                <Upload className="w-6 h-6 text-gray-400" />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? "Guardando..." : orden ? "Actualizar" : "Crear"} Orden
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};