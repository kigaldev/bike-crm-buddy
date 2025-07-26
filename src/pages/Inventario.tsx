import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ProductosList } from "@/components/ProductosList";
import { ProductoForm } from "@/components/ProductoForm";
import { StockAlerts } from "@/components/StockAlerts";

export default function Inventario() {
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);

  // Detectar parámetros de URL para filtros automáticos
  useEffect(() => {
    const stockParam = searchParams.get('stock');
    if (stockParam === 'bajo') {
      setShowAlerts(true);
    }
  }, [searchParams]);

  const handleNew = () => {
    setSelectedProducto(null);
    setShowForm(true);
  };

  const handleEdit = (producto: any) => {
    setSelectedProducto(producto);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setSelectedProducto(null);
    // Refresh will be handled by ProductosList
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedProducto(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Inventario</h1>
          <p className="text-muted-foreground">
            Controla el stock de productos y recibe alertas de reposición.
          </p>
        </div>
        
        {showAlerts && (
          <div className="mb-6">
            <StockAlerts showActions={true} />
          </div>
        )}
        
        {showForm ? (
          <ProductoForm
            producto={selectedProducto}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <ProductosList
            onEdit={handleEdit}
            onNew={handleNew}
          />
        )}
      </main>
    </div>
  );
}