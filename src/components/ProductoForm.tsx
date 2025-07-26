import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Package, Scan } from "lucide-react";

type CategoriaProducto = 'Piezas' | 'Herramientas' | 'Lubricantes' | 'Neumaticos' | 'Accesorios' | 'Cables' | 'Frenos' | 'Cadenas' | 'Otros';

const categorias: CategoriaProducto[] = [
  'Piezas', 'Herramientas', 'Lubricantes', 'Neumaticos', 
  'Accesorios', 'Cables', 'Frenos', 'Cadenas', 'Otros'
];

const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  categoria: z.string().min(1, "La categoría es obligatoria"),
  cantidad_actual: z.number().min(0, "La cantidad no puede ser negativa"),
  cantidad_minima: z.number().min(0, "La cantidad mínima no puede ser negativa"),
  proveedor: z.string().optional(),
  costo_unitario: z.number().min(0, "El costo debe ser mayor o igual a 0"),
  margen: z.number().min(0, "El margen debe ser mayor o igual a 0").max(100, "El margen no puede ser mayor a 100%"),
  codigo_barras: z.string().optional(),
  notas: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProductoFormProps {
  producto?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductoForm({ producto, onSuccess, onCancel }: ProductoFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(producto?.imagen || null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: producto?.nombre || "",
      categoria: producto?.categoria || "",
      cantidad_actual: producto?.cantidad_actual || 0,
      cantidad_minima: producto?.cantidad_minima || 1,
      proveedor: producto?.proveedor || "",
      costo_unitario: producto?.costo_unitario || 0,
      margen: producto?.margen || 0,
      codigo_barras: producto?.codigo_barras || "",
      notas: producto?.notas || "",
    },
  });

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setUploadedImage(publicUrl);
      toast({
        title: "Imagen subida",
        description: "La imagen se subió correctamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const productData = {
        nombre: data.nombre,
        categoria: data.categoria as CategoriaProducto,
        cantidad_actual: data.cantidad_actual,
        cantidad_minima: data.cantidad_minima,
        proveedor: data.proveedor || null,
        costo_unitario: data.costo_unitario,
        margen: data.margen,
        codigo_barras: data.codigo_barras || null,
        notas: data.notas || null,
        imagen: uploadedImage,
        fecha_actualizacion: new Date().toISOString(),
      };

      if (producto) {
        const { error } = await supabase
          .from("productos_inventario")
          .update(productData)
          .eq("id", producto.id);

        if (error) throw error;

        toast({
          title: "Producto actualizado",
          description: "El producto se actualizó correctamente.",
        });
      } else {
        const { error } = await supabase
          .from("productos_inventario")
          .insert([productData]);

        if (error) throw error;

        toast({
          title: "Producto creado",
          description: "El producto se creó correctamente.",
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {producto ? "Editar Producto" : "Nuevo Producto"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                {...register("nombre")}
                placeholder="Nombre del producto"
              />
              {errors.nombre && (
                <p className="text-sm text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría *</Label>
              <Select onValueChange={(value) => setValue("categoria", value)} defaultValue={producto?.categoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoria && (
                <p className="text-sm text-destructive">{errors.categoria.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad_actual">Cantidad Actual *</Label>
              <Input
                id="cantidad_actual"
                type="number"
                {...register("cantidad_actual", { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.cantidad_actual && (
                <p className="text-sm text-destructive">{errors.cantidad_actual.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad_minima">Cantidad Mínima *</Label>
              <Input
                id="cantidad_minima"
                type="number"
                {...register("cantidad_minima", { valueAsNumber: true })}
                placeholder="1"
              />
              {errors.cantidad_minima && (
                <p className="text-sm text-destructive">{errors.cantidad_minima.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                {...register("proveedor")}
                placeholder="Nombre del proveedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costo_unitario">Costo Unitario *</Label>
              <Input
                id="costo_unitario"
                type="number"
                step="0.01"
                {...register("costo_unitario", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.costo_unitario && (
                <p className="text-sm text-destructive">{errors.costo_unitario.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="margen">Margen (%) *</Label>
              <Input
                id="margen"
                type="number"
                step="0.01"
                max="100"
                {...register("margen", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.margen && (
                <p className="text-sm text-destructive">{errors.margen.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo_barras" className="flex items-center gap-2">
                <Scan className="w-4 h-4" />
                Código de Barras
              </Label>
              <Input
                id="codigo_barras"
                {...register("codigo_barras")}
                placeholder="Escanear o escribir código"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagen del Producto</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {uploadedImage ? (
                <div className="relative">
                  <img
                    src={uploadedImage}
                    alt="Producto"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeImage}
                    className="absolute top-2 right-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        {uploading ? "Subiendo..." : "Subir imagen"}
                      </span>
                      <input
                        id="image-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImage(file);
                        }}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              {...register("notas")}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : producto ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}