-- Crear tabla de bicicletas para el CRM
CREATE TABLE public.bicicletas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('MTB', 'Carretera', 'Eléctrica', 'Urbana', 'Infantil', 'Otra')),
  color TEXT,
  numero_de_serie TEXT,
  fecha_compra DATE,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.bicicletas ENABLE ROW LEVEL SECURITY;

-- Crear políticas para acceso público (para simplicidad del CRM)
CREATE POLICY "Permitir acceso completo a bicicletas" 
ON public.bicicletas 
FOR ALL 
USING (true);

-- Crear trigger para actualizar timestamps automáticamente
CREATE TRIGGER update_bicicletas_updated_at
  BEFORE UPDATE ON public.bicicletas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear índices para mejorar el rendimiento de búsquedas
CREATE INDEX idx_bicicletas_cliente_id ON public.bicicletas(cliente_id);
CREATE INDEX idx_bicicletas_alias ON public.bicicletas(alias);
CREATE INDEX idx_bicicletas_marca ON public.bicicletas(marca);
CREATE INDEX idx_bicicletas_modelo ON public.bicicletas(modelo);