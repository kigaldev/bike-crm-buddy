import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Bike, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BicicletaForm } from "./BicicletaForm";
import { BicicletaDetail } from "./BicicletaDetail";
import { useToast } from "@/hooks/use-toast";

interface Bicicleta {
  id: string;
  cliente_id: string;
  alias: string;
  marca: string;
  modelo: string;
  tipo: string;
  color: string;
  numero_de_serie: string;
  fecha_compra: string;
  notas: string;
}

interface ClienteBicicletasProps {
  clienteId: string;
  clienteNombre: string;
}

export const ClienteBicicletas = ({ clienteId, clienteNombre }: ClienteBicicletasProps) => {
  const [bicicletas, setBicicletas] = useState<Bicicleta[]>([]);
  const [selectedBicicleta, setSelectedBicicleta] = useState<Bicicleta | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBicicletas();
  }, [clienteId]);

  const fetchBicicletas = async () => {
    try {
      const { data, error } = await supabase
        .from('bicicletas')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('alias');

      if (error) throw error;
      setBicicletas(data || []);
    } catch (error) {
      console.error('Error fetching bicicletas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las bicicletas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBicicletaCreated = () => {
    fetchBicicletas();
    setIsFormOpen(false);
    toast({
      title: "Éxito",
      description: "Bicicleta creada correctamente",
    });
  };

  const handleBicicletaUpdated = () => {
    fetchBicicletas();
    setIsDetailOpen(false);
    toast({
      title: "Éxito",
      description: "Bicicleta actualizada correctamente",
    });
  };

  const handleBicicletaDeleted = () => {
    fetchBicicletas();
    setIsDetailOpen(false);
    toast({
      title: "Éxito",
      description: "Bicicleta eliminada correctamente",
    });
  };

  const handleBicicletaClick = (bicicleta: Bicicleta) => {
    setSelectedBicicleta(bicicleta);
    setIsDetailOpen(true);
  };

  const getTipoBadgeColor = (tipo: string) => {
    const colors: { [key: string]: string } = {
      "MTB": "destructive",
      "Carretera": "default", 
      "Eléctrica": "secondary",
      "Urbana": "outline",
      "Infantil": "default",
      "Otra": "secondary"
    };
    return colors[tipo] || "default";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-sm">Cargando bicicletas...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bike className="w-5 h-5" />
            <span>Bicicletas de {clienteNombre}</span>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Bicicleta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva Bicicleta</DialogTitle>
              </DialogHeader>
              <BicicletaForm 
                clienteId={clienteId} 
                onBicicletaCreated={handleBicicletaCreated} 
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bicicletas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay bicicletas registradas para este cliente
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alias</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bicicletas.map((bicicleta) => (
                  <TableRow
                    key={bicicleta.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleBicicletaClick(bicicleta)}
                  >
                    <TableCell className="font-medium">{bicicleta.alias}</TableCell>
                    <TableCell>{bicicleta.marca} {bicicleta.modelo}</TableCell>
                    <TableCell>
                      <Badge variant={getTipoBadgeColor(bicicleta.tipo) as any}>
                        {bicicleta.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{bicicleta.color}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBicicletaClick(bicicleta);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl">
            {selectedBicicleta && (
              <BicicletaDetail
                bicicleta={selectedBicicleta}
                onBicicletaUpdated={handleBicicletaUpdated}
                onBicicletaDeleted={handleBicicletaDeleted}
                onClose={() => setIsDetailOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};