import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TestItem {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string;
  tipo: 'funcionalidad' | 'proceso' | 'api' | 'visual';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestLogItem {
  id: string;
  test_id: string;
  empresa_id: string;
  user_id: string;
  estado: 'exito' | 'error' | 'pendiente';
  mensaje: string | null;
  error_stack: string | null;
  created_at: string;
}

export function useTestRunner() {
  const { toast } = useToast();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loadingTests, setLoadingTests] = useState<boolean>(false);

  const fetchTests = useCallback(async () => {
    setLoadingTests(true);
    try {
      const { data, error } = await (supabase as any).rpc('obtener_tests_disponibles');
      if (error) throw error;
      setTests((data || []) as TestItem[]);
    } catch (err: any) {
      console.error('Error fetching tests:', err);
      toast({ title: 'Error cargando tests', description: err.message || 'Intenta nuevamente', variant: 'destructive' });
      setTests([]);
    } finally {
      setLoadingTests(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const runTest = useCallback(async (codigo: string) => {
    try {
      const { data, error } = await (supabase as any).rpc('ejecutar_test', { codigo_test: codigo });
      if (error) throw error;
      const estado = data?.estado as 'exito' | 'error' | 'pendiente';
      const mensaje = data?.mensaje as string;
      if (estado === 'exito') {
        toast({ title: 'Test OK', description: mensaje });
      } else {
        toast({ title: 'Test con errores', description: mensaje, variant: 'destructive' });
      }
      return data;
    } catch (err: any) {
      console.error('Error running test:', err);
      toast({ title: 'No se pudo ejecutar el test', description: err.message || 'Permisos insuficientes o error interno', variant: 'destructive' });
      return null;
    }
  }, [toast]);

  const getLogs = useCallback(async (testId: string) => {
    try {
      const { data, error } = await (supabase as any).rpc('obtener_logs_test', { p_test_id: testId });
      if (error) throw error;
      return (data || []) as TestLogItem[];
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      toast({ title: 'Error cargando logs', description: err.message || 'Intenta nuevamente', variant: 'destructive' });
      return [];
    }
  }, [toast]);

  const preloadDemoTests = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any).rpc('precargar_tests_demo');
      if (error) throw error;
      const inserted = data?.inserted ?? 0;
      toast({ title: 'Precarga completada', description: `${inserted} test(s) insertados` });
      await fetchTests();
      return data;
    } catch (err: any) {
      console.error('Error precargando tests:', err);
      toast({ title: 'No se pudo precargar', description: err.message || 'Intenta nuevamente', variant: 'destructive' });
      return null;
    }
  }, [toast, fetchTests]);

  return useMemo(() => ({ tests, loadingTests, fetchTests, runTest, getLogs, preloadDemoTests }), [tests, loadingTests, fetchTests, runTest, getLogs, preloadDemoTests]);
}
