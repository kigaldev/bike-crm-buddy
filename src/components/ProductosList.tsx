import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialogConfirm } from "@/components/ui/alert-dialog-confirm";
import { logProducto } from "@/lib/logs";
import { Search, Plus, Edit, Trash2, Package, AlertTriangle, ScanLine } from "lucide-react";
import { format } from "date-fns";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  cantidad_actual: number;
  cantidad_minima: number;
  proveedor: string;
  costo_unitario: number;
  margen: number;
  codigo_barras: string;
  imagen: string;
  notas: string;
  fecha_actualizacion: string;
}

interface ProductosListProps {
  onEdit: (producto: Producto) => void;
  onNew: () => void;
}

export function ProductosList({ onEdit, onNew }: ProductosListProps) {
  const { toast } = useToast();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [codigoBarras, setCodigoBarras] = useState("");

  const categorias = [
    'Piezas', 'Herramientas', 'Lubricantes', 'Neumaticos', 
    'Accesorios', 'Cables', 'Frenos', 'Cadenas', 'Otros'
  ];

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("productos_inventario")
        .select("*")
        .order("nombre");

      if (error) throw error;
      setProductos(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
    
    // Si hay parámetros de URL, aplicar filtros
    const urlParams = new URLSearchParams(window.location.search);
    const stockParam = urlParams.get('stock');
    if (stockParam === 'bajo') {
      setStockFilter('bajo');
    }
  }, []);

  const handleDelete = async (id: string, nombre: string) => {
    try {
      const { error } = await supabase
        .from("productos_inventario")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await logProducto.eliminar(id, nombre);

      toast({
        title: "Producto eliminado",
        description: "El producto se eliminó correctamente.",
      });
      
      fetchProductos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const searchByBarcode = () => {
    if (codigoBarras.trim()) {
      setSearchTerm(codigoBarras);
    }
  };

  const filteredProductos = productos.filter((producto) => {
    const matchesSearch = 
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.proveedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.codigo_barras?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = categoriaFilter === "all" || producto.categoria === categoriaFilter;
    
    const matchesStock = stockFilter === "all" || 
      (stockFilter === "bajo" && producto.cantidad_actual <= producto.cantidad_minima);

    return matchesSearch && matchesCategoria && matchesStock;
  });

  const getTotalValue = () => {
    return filteredProductos.reduce((total, producto) => 
      total + (producto.cantidad_actual * producto.costo_unitario), 0
    ).toFixed(2);
  };

  const getLowStockCount = () => {
    return productos.filter(p => p.cantidad_actual <= p.cantidad_minima).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Productos</p>
                <p className="text-2xl font-bold">{productos.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Bajo</p>
                <p className="text-2xl font-bold text-orange-600">{getLowStockCount()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold">€{getTotalValue()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categorías</p>
                <p className="text-2xl font-bold">{categorias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filtros y Búsqueda</span>
            <Button onClick={onNew} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, proveedor o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria} value={categoria}>
                    {categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado de stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el stock</SelectItem>
                <SelectItem value="bajo">Stock bajo</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Código de barras"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && searchByBarcode()}
                />
              </div>
              <Button onClick={searchByBarcode} variant="outline">
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Productos ({filteredProductos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProductos.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-lg font-medium text-gray-900">No hay productos</p>
              <p className="text-sm text-gray-500">
                {productos.length === 0 
                  ? "Comienza creando tu primer producto." 
                  : "Intenta cambiar los filtros de búsqueda."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imagen</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Margen</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Actualización</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductos.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell>
                        {producto.imagen ? (
                          <img 
                            src={producto.imagen} 
                            alt={producto.nombre}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{producto.nombre}</p>
                          {producto.notas && (
                            <p className="text-sm text-muted-foreground">{producto.notas}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{producto.categoria}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{producto.cantidad_actual}</span>
                          {producto.cantidad_actual <= producto.cantidad_minima && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Stock Bajo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{producto.proveedor || "-"}</TableCell>
                      <TableCell>€{producto.costo_unitario.toFixed(2)}</TableCell>
                      <TableCell>{producto.margen}%</TableCell>
                      <TableCell>{producto.codigo_barras || "-"}</TableCell>
                      <TableCell>
                        {format(new Date(producto.fecha_actualizacion), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(producto)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialogConfirm
                            title="Eliminar producto"
                            description={`¿Estás seguro de que quieres eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`}
                            onConfirm={() => handleDelete(producto.id, producto.nombre)}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}