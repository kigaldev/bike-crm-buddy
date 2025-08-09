import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface IncidenciaItem {
  id: string;
  empresa_id: string;
  test_codigo: string;
  titulo: string;
  detalle: string | null;
  severidad: 'critica' | 'alta' | 'media' | 'baja' | string;
  estado: 'Abierta' | 'En curso' | 'Resuelta' | string;
  created_at: string;
  updated_at: string;
}

export function useIncidencias() {
  const { toast } = useToast();
  const [items, setItems] = useState<IncidenciaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIncidencias = useCallback(async (filters?: { estado?: string; severidad?: string }) => {
    setLoading(true);
    try {
      let q = (supabase as any).from('incidencias_saas').select('*').order('created_at', { ascending: false });
      if (filters?.estado && filters.estado !== 'todas') q = q.eq('estado', filters.estado);
      if (filters?.severidad && filters.severidad !== 'todas') q = q.eq('severidad', filters.severidad);
      const { data, error } = await q;
      if (error) throw error;
      setItems((data || []) as IncidenciaItem[]);
      return data as IncidenciaItem[];
    } catch (err: any) {
      console.error('Error cargando incidencias:', err);
      toast({ title: 'Error al cargar incidencias', description: err.message || 'Intenta nuevamente', variant: 'destructive' });
      setItems([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const crearIncidencia = useCallback(async (payload: { test_codigo: string; titulo: string; detalle?: string; severidad?: string }) => {
    try {
      const { data, error } = await (supabase as any).rpc('crear_incidencia', {
        p_test_codigo: payload.test_codigo,
        p_titulo: payload.titulo,
        p_detalle: payload.detalle || null,
        p_severidad: payload.severidad || 'alta',
      });
      if (error) throw error;
      toast({ title: 'Incidencia registrada', description: 'Se ha creado la incidencia correctamente.' });
      await fetchIncidencias();
      return data as string;
    } catch (err: any) {
      console.error('Error creando incidencia:', err);
      toast({ title: 'No se pudo crear la incidencia', description: err.message || 'Intenta nuevamente', variant: 'destructive' });
      return null;
    }
  }, [toast, fetchIncidencias]);

  const actualizarEstado = useCallback(async (id: string, estado: 'Abierta' | 'En curso' | 'Resuelta') => {
    try {
      const { data, error } = await (supabase as any).rpc('actualizar_estado_incidencia', { p_id: id, p_estado: estado });
      if (error) throw error;
      if (data) {
        toast({ title: 'Estado actualizado', description: `Incidencia marcada como ${estado}.` });
        await fetchIncidencias();
      }
      return !!data;
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      toast({ title: 'No se pudo actualizar', description: err.message || 'Intenta nuevamente', variant: 'destructive' });
      return false;
    }
  }, [toast, fetchIncidencias]);

  const counts = useMemo(() => {
    const bySeveridad: Record<string, number> = {};
    const byEstado: Record<string, number> = {};
    for (const it of items) {
      bySeveridad[it.severidad] = (bySeveridad[it.severidad] || 0) + 1;
      byEstado[it.estado] = (byEstado[it.estado] || 0) + 1;
    }
    return { bySeveridad, byEstado, total: items.length };
  }, [items]);

  return { items, loading, fetchIncidencias, crearIncidencia, actualizarEstado, counts };
}
