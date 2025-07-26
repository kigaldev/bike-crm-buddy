-- Crear tabla para gestionar productos/servicios utilizados en órdenes de reparación
CREATE TABLE public.orden_productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orden_id UUID NOT NULL REFERENCES public.ordenes_reparacion(id) ON DELETE CASCADE,
  producto_inventario_id UUID REFERENCES public.productos_inventario(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('producto', 'servicio')),
  cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  es_inventariado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orden_productos ENABLE ROW LEVEL SECURITY;

-- Create policies for orden_productos
CREATE POLICY "Permitir acceso completo a orden_productos" 
ON public.orden_productos 
FOR ALL 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_orden_productos_updated_at
BEFORE UPDATE ON public.orden_productos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_orden_productos_orden_id ON public.orden_productos(orden_id);
CREATE INDEX idx_orden_productos_producto_inventario_id ON public.orden_productos(producto_inventario_id);

-- Agregar campo total_productos a ordenes_reparacion para cálculo automático
ALTER TABLE public.ordenes_reparacion 
ADD COLUMN total_productos DECIMAL(10,2) DEFAULT 0;

-- Función para calcular el total de productos de una orden
CREATE OR REPLACE FUNCTION public.calcular_total_productos_orden(orden_id_param UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  total_calc DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) 
  INTO total_calc
  FROM public.orden_productos 
  WHERE orden_id = orden_id_param;
  
  RETURN total_calc;
END;
$$;

-- Función para descontar stock al finalizar orden
CREATE OR REPLACE FUNCTION public.descontar_stock_orden(orden_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  producto_record RECORD;
BEGIN
  -- Descontar stock solo de productos inventariados
  FOR producto_record IN 
    SELECT op.producto_inventario_id, op.cantidad, op.nombre
    FROM public.orden_productos op
    WHERE op.orden_id = orden_id_param 
    AND op.es_inventariado = true 
    AND op.producto_inventario_id IS NOT NULL
  LOOP
    -- Actualizar stock en productos_inventario
    UPDATE public.productos_inventario 
    SET cantidad_actual = cantidad_actual - producto_record.cantidad,
        updated_at = now()
    WHERE id = producto_record.producto_inventario_id
    AND cantidad_actual >= producto_record.cantidad;
    
    -- Si no se pudo actualizar (stock insuficiente), lanzar error
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para el producto: %', producto_record.nombre;
    END IF;
  END LOOP;
END;
$$;

-- Trigger para actualizar total_productos automáticamente
CREATE OR REPLACE FUNCTION public.actualizar_total_productos_orden()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  orden_id_affected UUID;
BEGIN
  -- Determinar qué orden se vio afectada
  IF TG_OP = 'DELETE' THEN
    orden_id_affected := OLD.orden_id;
  ELSE
    orden_id_affected := NEW.orden_id;
  END IF;
  
  -- Actualizar el total de productos en la orden
  UPDATE public.ordenes_reparacion 
  SET total_productos = calcular_total_productos_orden(orden_id_affected),
      updated_at = now()
  WHERE id = orden_id_affected;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear triggers para actualización automática
CREATE TRIGGER trigger_actualizar_total_productos_orden
AFTER INSERT OR UPDATE OR DELETE ON public.orden_productos
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_total_productos_orden();