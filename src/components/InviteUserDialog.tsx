import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Loader2 } from "lucide-react";
import { RolEmpresa } from '@/hooks/useUsuariosEmpresa';
import { toast } from "sonner";

interface InviteUserDialogProps {
  onInviteUser: (email: string, rol: RolEmpresa) => Promise<{ error: any }>;
}

export function InviteUserDialog({ onInviteUser }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<RolEmpresa>('usuario');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('El email es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const { error } = await onInviteUser(email.trim(), rol);
      
      if (error) {
        throw error;
      }

      toast.success('Invitación enviada correctamente');
      setEmail('');
      setRol('usuario');
      setOpen(false);
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Error al enviar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const getRolDescription = (rol: RolEmpresa) => {
    switch (rol) {
      case 'admin':
        return 'Acceso completo y gestión de usuarios';
      case 'manager':
        return 'Acceso de lectura a todas las funcionalidades';
      case 'tecnico':
        return 'Acceso a órdenes y reparaciones';
      case 'usuario':
        return 'Acceso básico al sistema';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invitar Usuario a la Empresa</DialogTitle>
          <DialogDescription>
            Envía una invitación por email para que un usuario se una a tu empresa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email del usuario</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rol">Rol en la empresa</Label>
              <Select value={rol} onValueChange={(value) => setRol(value as RolEmpresa)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Administrador</span>
                      <span className="text-xs text-muted-foreground">
                        {getRolDescription('admin')}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Manager</span>
                      <span className="text-xs text-muted-foreground">
                        {getRolDescription('manager')}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="tecnico">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Técnico</span>
                      <span className="text-xs text-muted-foreground">
                        {getRolDescription('tecnico')}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="usuario">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Usuario</span>
                      <span className="text-xs text-muted-foreground">
                        {getRolDescription('usuario')}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}