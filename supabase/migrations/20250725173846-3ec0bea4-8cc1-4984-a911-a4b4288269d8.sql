-- Crear tabla de clientes para CRM de talleres de bicicletas
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL,
  direccion TEXT,
  fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Crear políticas para acceso público (para simplicidad del CRM)
CREATE POLICY "Permitir acceso completo a clientes" 
ON public.clientes 
FOR ALL 
USING (true);

-- Crear función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar timestamps automáticamente
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear índices para mejorar el rendimiento de búsquedas
CREATE INDEX idx_clientes_nombre ON public.clientes(nombre);
CREATE INDEX idx_clientes_telefono ON public.clientes(telefono);
CREATE INDEX idx_clientes_email ON public.clientes(email);