-- Crear tabla facturas
CREATE TABLE public.facturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_orden UUID NOT NULL REFERENCES public.ordenes_reparacion(id),
  id_cliente UUID NOT NULL REFERENCES public.clientes(id),
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  estado_pago TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_pago IN ('pendiente', 'pagado', 'parcial')),
  total DECIMAL(10,2) NOT NULL,
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
  archivo_pdf TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

-- Create policy for full access
CREATE POLICY "Permitir acceso completo a facturas" 
  ON public.facturas 
  FOR ALL 
  USING (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_facturas_updated_at
  BEFORE UPDATE ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', true);

-- Create storage policy for invoices
CREATE POLICY "Permitir acceso completo a invoices"
  ON storage.objects FOR ALL
  USING (bucket_id = 'invoices');