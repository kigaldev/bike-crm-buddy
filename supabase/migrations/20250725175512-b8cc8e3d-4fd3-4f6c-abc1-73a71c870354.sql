
-- Create tabla ordenes_reparacion
CREATE TABLE public.ordenes_reparacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  bicicleta_id UUID NOT NULL REFERENCES public.bicicletas(id),
  estado TEXT NOT NULL DEFAULT 'Recibido' CHECK (estado IN ('Recibido', 'Diagnóstico', 'En reparación', 'Esperando repuestos', 'Finalizado', 'Avisar cliente', 'Entregado')),
  descripcion_trabajo TEXT,
  fecha_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_estim_entrega DATE,
  costo_estimado DECIMAL(10,2),
  fotos_antes TEXT[], -- Array de URLs de fotos
  fotos_despues TEXT[], -- Array de URLs de fotos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger to update updated_at
CREATE TRIGGER update_ordenes_reparacion_updated_at
  BEFORE UPDATE ON public.ordenes_reparacion
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add Row Level Security (RLS)
ALTER TABLE public.ordenes_reparacion ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (similar to other tables)
CREATE POLICY "Permitir acceso completo a ordenes_reparacion" 
  ON public.ordenes_reparacion 
  FOR ALL 
  USING (true);

-- Create storage bucket for repair photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('repair-photos', 'repair-photos', true);

-- Create storage policy for repair photos
CREATE POLICY "Permitir acceso completo a repair-photos"
  ON storage.objects FOR ALL
  USING (bucket_id = 'repair-photos');
