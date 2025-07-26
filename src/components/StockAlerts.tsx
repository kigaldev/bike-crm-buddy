import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Package, ExternalLink, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ProductoStockBajo {
  id: string;
  nombre: string;
  categoria: string;
  cantidad_actual: number;
  cantidad_minima: number;
  costo_unitario: number;
  proveedor: string | null;
}

interface StockAlertsProps {
  showActions?: boolean;
  maxItems?: number;
}

export function StockAlerts({ showActions = true, maxItems }: StockAlertsProps) {
  const { toast } = useToast();
  const [productos, setProductos] = useState<ProductoStockBajo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProductosStockBajo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("productos_inventario")
        .select("id, nombre, categoria, cantidad_actual, cantidad_minima, costo_unitario, proveedor")
        .lte("cantidad_actual", "cantidad_minima")
        .order("cantidad_actual", { ascending: true });

      if (error) throw error;
      
      const productosLimitados = maxItems ? data?.slice(0, maxItems) : data;
      setProductos(productosLimitados || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las alertas de stock.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductosStockBajo();
  }, []);

  const getCriticalityLevel = (producto: ProductoStockBajo) => {
    if (producto.cantidad_actual === 0) return "critical";
    if (producto.cantidad_actual < producto.cantidad_minima * 0.5) return "high";
    return "medium";
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case "critical": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getCriticalityText = (level: string) => {
    switch (level) {
      case "critical": return "Agotado";
      case "high": return "Crítico";
      case "medium": return "Bajo";
      default: return "Normal";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            <span>Cargando alertas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (productos.length === 0) {
    return (
      <Alert>
        <Package className="h-4 w-4" />
        <AlertTitle>¡Excelente!</AlertTitle>
        <AlertDescription>
          No hay productos con stock bajo en este momento.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertas de Stock ({productos.length})
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProductosStockBajo}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button asChild size="sm">
                <Link to="/inventario?stock=bajo">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Ver todos
                </Link>
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {productos.map((producto) => {
            const criticality = getCriticalityLevel(producto);
            return (
              <div
                key={producto.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{producto.nombre}</p>
                    <Badge variant="outline" className="text-xs">
                      {producto.categoria}
                    </Badge>
                    <Badge 
                      variant={getCriticalityColor(criticality) as any}
                      className="text-xs"
                    >
                      {getCriticalityText(criticality)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Stock: <strong>{producto.cantidad_actual}</strong> / {producto.cantidad_minima}
                    </span>
                    <span>
                      Valor: <strong>€{(producto.cantidad_actual * producto.costo_unitario).toFixed(2)}</strong>
                    </span>
                    {producto.proveedor && (
                      <span>
                        Proveedor: <strong>{producto.proveedor}</strong>
                      </span>
                    )}
                  </div>
                </div>
                
                {showActions && (
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/inventario?edit=${producto.id}`}>
                        Reabastecer
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {maxItems && productos.length === maxItems && (
          <div className="mt-4 text-center">
            <Button asChild variant="outline">
              <Link to="/inventario?stock=bajo">
                Ver todos los productos con stock bajo
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}