import { Navigation } from "@/components/Navigation";
import { StockAlerts } from "@/components/StockAlerts";

export default function AlertasStock() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Alertas de Stock</h1>
          <p className="text-muted-foreground">
            Productos que requieren reposición urgente.
          </p>
        </div>
        
        <StockAlerts showActions={true} />
      </main>
    </div>
  );
}