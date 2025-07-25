import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BicicletaDetail } from "./BicicletaDetail";
import { BicicletaForm } from "./BicicletaForm";
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
  clientes?: {
    nombre: string;
    apellidos: string;
  };
}

export const BicicletasList = () => {
  const [bicicletas, setBicicletas] = useState<Bicicleta[]>([]);
  const [filteredBicicletas, setFilteredBicicletas] = useState<Bicicleta[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBicicleta, setSelectedBicicleta] = useState<Bicicleta | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBicicletas();
  }, []);

  useEffect(() => {
    const filtered = bicicletas.filter(bicicleta =>
      bicicleta.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bicicleta.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bicicleta.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bicicleta.clientes && 
        `${bicicleta.clientes.nombre} ${bicicleta.clientes.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredBicicletas(filtered);
  }, [bicicletas, searchTerm]);

  const fetchBicicletas = async () => {
    try {
      const { data, error } = await supabase
        .from('bicicletas')
        .select(`
          *,
          clientes (
            nombre,
            apellidos
          )
        `)
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

  const handleBicicletaClick = (bicicleta: Bicicleta) => {
    setSelectedBicicleta(bicicleta);
    setIsDetailOpen(true);
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

  const handleBicicletaCreated = () => {
    fetchBicicletas();
    setIsFormOpen(false);
    toast({
      title: "Éxito",
      description: "Bicicleta creada correctamente",
    });
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
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando bicicletas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Bicicletas</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Bicicleta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva Bicicleta</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground mb-4">
              Nota: Para crear una bicicleta, necesitas seleccionar un cliente. Considera crear bicicletas desde la ficha del cliente.
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por alias, marca, modelo o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alias</TableHead>
              <TableHead>Marca/Modelo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBicicletas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {searchTerm ? "No se encontraron bicicletas" : "No hay bicicletas registradas"}
                </TableCell>
              </TableRow>
            ) : (
              filteredBicicletas.map((bicicleta) => (
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
                  <TableCell>
                    {bicicleta.clientes ? 
                      `${bicicleta.clientes.nombre} ${bicicleta.clientes.apellidos}` : 
                      "Cliente no encontrado"
                    }
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
};