import { useState } from "react";
import { FacturasList } from "@/components/FacturasList";
import { VerifactuDashboard } from "@/components/VerifactuDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Shield } from "lucide-react";

const Facturas = () => {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="facturas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="facturas" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Gestión de Facturas
          </TabsTrigger>
          <TabsTrigger value="verifactu" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Panel Verifactu
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="facturas">
          <FacturasList />
        </TabsContent>
        
        <TabsContent value="verifactu">
          <VerifactuDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Facturas;