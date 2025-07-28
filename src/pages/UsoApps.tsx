import { UsoAppsPanel } from "@/components/UsoAppsPanel";

const UsoApps = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas de Uso de Aplicaciones</h1>
          <p className="text-muted-foreground">
            Analiza el uso de cada módulo para optimizar la productividad de tu empresa
          </p>
        </div>
        
        <UsoAppsPanel />
      </div>
    </div>
  );
};

export default UsoApps;