import { BicicletasList } from "@/components/BicicletasList";
import { Navigation } from "@/components/Navigation";

const Bicicletas = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <BicicletasList />
        </div>
      </div>
    </div>
  );
};

export default Bicicletas;