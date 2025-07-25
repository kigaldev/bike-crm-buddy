import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { OrdenReparacionsList } from "@/components/OrdenReparacionsList";
import { OrdenReparacionKanban } from "@/components/OrdenReparacionKanban";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, Kanban } from "lucide-react";

const OrdenesReparacion = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Table className="w-4 h-4" />
                Vista Tabla
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <Kanban className="w-4 h-4" />
                Vista Kanban
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="table">
              <OrdenReparacionsList />
            </TabsContent>
            
            <TabsContent value="kanban">
              <OrdenReparacionKanban />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default OrdenesReparacion;