import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ProductosList } from "@/components/ProductosList";
import { ProductoForm } from "@/components/ProductoForm";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function Inventario() {
  const [showForm, setShowForm] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);

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
    <ProtectedRoute allowedRoles={['admin', 'recepcion']}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 px-6">
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
    </ProtectedRoute>
  );
}