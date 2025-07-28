import { FacturasSaasList } from "@/components/FacturasSaasList";

const FacturasSaas = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación SaaS</h1>
          <p className="text-muted-foreground">
            Gestiona las facturas generadas automáticamente por las suscripciones de módulos
          </p>
        </div>
        
        <FacturasSaasList />
      </div>
    </div>
  );
};

export default FacturasSaas;