-- Create enum for product categories
CREATE TYPE public.categoria_producto AS ENUM (
  'Piezas',
  'Herramientas', 
  'Lubricantes',
  'Neumaticos',
  'Accesorios',
  'Cables',
  'Frenos',
  'Cadenas',
  'Otros'
);

-- Create productos_inventario table
CREATE TABLE public.productos_inventario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria categoria_producto NOT NULL,
  cantidad_actual INTEGER NOT NULL DEFAULT 0,
  cantidad_minima INTEGER NOT NULL DEFAULT 1,
  proveedor TEXT,
  costo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  margen NUMERIC(5,2) NOT NULL DEFAULT 0,
  codigo_barras TEXT,
  imagen TEXT,
  notas TEXT,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.productos_inventario ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow full access to productos_inventario" 
ON public.productos_inventario 
FOR ALL 
USING (true);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Create storage policies for product images
CREATE POLICY "Allow public access to product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated users to upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_productos_inventario_updated_at
  BEFORE UPDATE ON public.productos_inventario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();