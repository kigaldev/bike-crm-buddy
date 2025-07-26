import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Package, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrdenProducto {
  id?: string;
  orden_id: string;
  producto_inventario_id?: string;
  nombre: string;
  tipo: 'producto' | 'servicio';
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  es_inventariado: boolean;
}

interface ProductoInventario {
  id: string;
  nombre: string;
  categoria: string;
  costo_unitario: number;
  cantidad_actual: number;
  margen: number;
}

interface OrdenProductosProps {
  ordenId: string;
  readonly?: boolean;
  onTotalChange?: (total: number) => void;
}

export const OrdenProductos = ({ ordenId, readonly = false, onTotalChange }: OrdenProductosProps) => {
  const { toast } = useToast();
  const [productos, setProductos] = useState<OrdenProducto[]>([]);
  const [productosInventario, setProductosInventario] = useState<ProductoInventario[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    producto_inventario_id: '',
    nombre: '',
    tipo: 'producto' as 'producto' | 'servicio',
    cantidad: 1,
    precio_unitario: 0,
    es_inventariado: false,
    guardar_en_inventario: false
  });

  useEffect(() => {
    if (ordenId) {
      fetchProductos();
    }
    fetchProductosInventario();
  }, [ordenId]);

  useEffect(() => {
    const total = productos.reduce((sum, producto) => sum + producto.subtotal, 0);
    onTotalChange?.(total);
  }, [productos, onTotalChange]);

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('orden_productos')
        .select('*')
        .eq('orden_id', ordenId)
        .order('created_at');

      if (error) throw error;
      setProductos((data || []).map(item => ({
        ...item,
        tipo: item.tipo as 'producto' | 'servicio'
      })));
    } catch (error) {
      console.error('Error fetching productos:', error);
    }
  };

  const fetchProductosInventario = async () => {
    try {
      const { data, error } = await supabase
        .from('productos_inventario')
        .select('id, nombre, categoria, costo_unitario, cantidad_actual, margen')
        .gt('cantidad_actual', 0)
        .order('nombre');

      if (error) throw error;
      setProductosInventario(data || []);
    } catch (error) {
      console.error('Error fetching productos inventario:', error);
    }
  };

  const handleProductoInventarioSelect = (productoId: string) => {
    const producto = productosInventario.find(p => p.id === productoId);
    if (producto) {
      const precioVenta = producto.costo_unitario * (1 + (producto.margen / 100));
      setFormData(prev => ({
        ...prev,
        producto_inventario_id: productoId,
        nombre: producto.nombre,
        tipo: 'producto',
        precio_unitario: Number(precioVenta.toFixed(2)),
        es_inventariado: true,
        guardar_en_inventario: false
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      producto_inventario_id: '',
      nombre: '',
      tipo: 'producto',
      cantidad: 1,
      precio_unitario: 0,
      es_inventariado: false,
      guardar_en_inventario: false
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (formData.cantidad <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    if (formData.precio_unitario < 0) {
      toast({
        title: "Error",
        description: "El precio no puede ser negativo",
        variant: "destructive"
      });
      return;
    }

    // Validar stock disponible si es producto inventariado
    if (formData.es_inventariado && formData.producto_inventario_id) {
      const producto = productosInventario.find(p => p.id === formData.producto_inventario_id);
      if (producto && producto.cantidad_actual < formData.cantidad) {
        toast({
          title: "Error",
          description: `Stock insuficiente. Disponible: ${producto.cantidad_actual}`,
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Si se marca "guardar en inventario" y no es un producto existente
      let producto_inventario_id = formData.producto_inventario_id || null;
      
      if (formData.guardar_en_inventario && !formData.es_inventariado) {
        // Verificar si ya existe un producto con el mismo nombre
        const { data: existingProduct } = await supabase
          .from('productos_inventario')
          .select('id')
          .ilike('nombre', formData.nombre.trim())
          .limit(1);

        if (existingProduct && existingProduct.length > 0) {
          toast({
            title: "Producto ya existe",
            description: "Ya existe un producto con ese nombre en el inventario",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Crear nuevo producto en inventario
        const { data: newProduct, error: productError } = await supabase
          .from('productos_inventario')
          .insert({
            nombre: formData.nombre.trim(),
            categoria: 'Otros',
            costo_unitario: formData.precio_unitario,
            cantidad_actual: 0, // Se inicia en 0 porque se usa en la orden
            cantidad_minima: 1,
            margen: 0
          })
          .select()
          .single();

        if (productError) throw productError;
        producto_inventario_id = newProduct.id;
      }

      // Insertar producto en la orden
      const { error } = await supabase
        .from('orden_productos')
        .insert({
          orden_id: ordenId,
          producto_inventario_id,
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
          cantidad: formData.cantidad,
          precio_unitario: formData.precio_unitario,
          es_inventariado: formData.es_inventariado || formData.guardar_en_inventario
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${formData.tipo === 'producto' ? 'Producto' : 'Servicio'} agregado correctamente`
      });

      fetchProductos();
      resetForm();
    } catch (error) {
      console.error('Error saving producto:', error);
      toast({
        title: "Error",
        description: "Error al guardar el producto/servicio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productoId: string) => {
    try {
      const { error } = await supabase
        .from('orden_productos')
        .delete()
        .eq('id', productoId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Producto eliminado correctamente"
      });

      fetchProductos();
    } catch (error) {
      console.error('Error deleting producto:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el producto",
        variant: "destructive"
      });
    }
  };

  const total = productos.reduce((sum, producto) => sum + producto.subtotal, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Productos y Servicios
          </CardTitle>
          {!readonly && (
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Formulario para agregar productos */}
        {showForm && !readonly && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Agregar Producto/Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Desde Inventario (Opcional)</Label>
                    <Select
                      value={formData.producto_inventario_id}
                      onValueChange={handleProductoInventarioSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto del inventario..." />
                      </SelectTrigger>
                      <SelectContent>
                        {productosInventario.map((producto) => (
                          <SelectItem key={producto.id} value={producto.id}>
                            {producto.nombre} - Stock: {producto.cantidad_actual}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: 'producto' | 'servicio') => 
                        setFormData(prev => ({ ...prev, tipo: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producto">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Producto
                          </div>
                        </SelectItem>
                        <SelectItem value="servicio">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4" />
                            Servicio
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Nombre del producto/servicio"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.cantidad}
                      onChange={(e) => setFormData(prev => ({ ...prev, cantidad: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Precio Unitario *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.precio_unitario}
                      onChange={(e) => setFormData(prev => ({ ...prev, precio_unitario: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subtotal</Label>
                    <Input
                      value={`$${(formData.cantidad * formData.precio_unitario).toFixed(2)}`}
                      disabled
                    />
                  </div>
                </div>

                {!formData.es_inventariado && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="guardar_en_inventario"
                      checked={formData.guardar_en_inventario}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, guardar_en_inventario: !!checked }))
                      }
                    />
                    <Label htmlFor="guardar_en_inventario" className="text-sm">
                      💾 Guardar este ítem en el inventario para usos futuros
                    </Label>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Guardando..." : "Agregar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de productos */}
        {productos.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto/Servicio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unit.</TableHead>
                  <TableHead>Subtotal</TableHead>
                  {!readonly && <TableHead>Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {producto.es_inventariado && (
                          <Badge variant="secondary" className="text-xs">
                            Inventario
                          </Badge>
                        )}
                        {producto.nombre}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {producto.tipo === 'producto' ? (
                          <Package className="w-4 h-4" />
                        ) : (
                          <Wrench className="w-4 h-4" />
                        )}
                        {producto.tipo === 'producto' ? 'Producto' : 'Servicio'}
                      </div>
                    </TableCell>
                    <TableCell>{producto.cantidad}</TableCell>
                    <TableCell>${producto.precio_unitario.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">
                      ${producto.subtotal.toFixed(2)}
                    </TableCell>
                    {!readonly && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(producto.id!)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Productos/Servicios</p>
                <p className="text-xl font-bold">${total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay productos o servicios agregados</p>
            {!readonly && (
              <p className="text-sm">Haz clic en "Agregar" para comenzar</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};