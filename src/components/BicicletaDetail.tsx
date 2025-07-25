import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Trash2, Calendar, Hash, Palette, FileText } from "lucide-react";
import { BicicletaForm } from "./BicicletaForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

interface BicicletaDetailProps {
  bicicleta: Bicicleta;
  onBicicletaUpdated: () => void;
  onBicicletaDeleted: () => void;
  onClose: () => void;
}

export const BicicletaDetail = ({ bicicleta, onBicicletaUpdated, onBicicletaDeleted, onClose }: BicicletaDetailProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleBicicletaUpdated = () => {
    setIsEditing(false);
    onBicicletaUpdated();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('bicicletas')
        .delete()
        .eq('id', bicicleta.id);

      if (error) throw error;
      onBicicletaDeleted();
    } catch (error) {
      console.error('Error deleting bicicleta:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la bicicleta",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
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

  if (isEditing) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Editar Bicicleta</DialogTitle>
        </DialogHeader>
        <BicicletaForm
          bicicleta={bicicleta}
          clienteId={bicicleta.cliente_id}
          onBicicletaCreated={handleBicicletaUpdated}
          isEditing={true}
        />
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>Detalles de la Bicicleta</span>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la bicicleta "{bicicleta.alias}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "Eliminando..." : "Eliminar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{bicicleta.alias}</span>
              <Badge variant={getTipoBadgeColor(bicicleta.tipo) as any}>
                {bicicleta.tipo}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Marca</p>
                <p className="text-lg">{bicicleta.marca}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Modelo</p>
                <p className="text-lg">{bicicleta.modelo}</p>
              </div>
            </div>

            {bicicleta.color && (
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span>Color: {bicicleta.color}</span>
              </div>
            )}

            {bicicleta.numero_de_serie && (
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span>Número de serie: {bicicleta.numero_de_serie}</span>
              </div>
            )}

            {bicicleta.fecha_compra && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Fecha de compra: {new Date(bicicleta.fecha_compra).toLocaleDateString('es-ES')}</span>
              </div>
            )}

            {bicicleta.notas && (
              <div className="flex items-start space-x-2">
                <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium mb-1">Notas:</p>
                  <p className="text-sm text-muted-foreground">{bicicleta.notas}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones futuras (reparaciones, etc.) */}
        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <Badge variant="secondary">Sin reparaciones registradas</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};