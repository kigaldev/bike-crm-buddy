import { Button } from "@/components/ui/button";
import { Bike, Users, Calendar, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

export const Navigation = () => {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">CRM Taller Bicicletas</h1>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Clientes</span>
              </Button>
            </Link>
            
            <Link to="/bicicletas">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Bike className="w-4 h-4" />
                <span>Bicicletas</span>
              </Button>
            </Link>
            
            <Link to="/ordenes">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Órdenes</span>
              </Button>
            </Link>
            
            <Link to="/facturas">
              <Button variant="ghost" className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Facturas</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};