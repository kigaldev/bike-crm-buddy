import { ClientesList } from "@/components/ClientesList";
import { Navigation } from "@/components/Navigation";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <ClientesList />
        </div>
      </div>
    </div>
  );
};

export default Index;
