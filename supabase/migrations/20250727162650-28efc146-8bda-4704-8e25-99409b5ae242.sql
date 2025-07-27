-- Crear tabla pagos
CREATE TABLE public.pagos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id UUID REFERENCES public.facturas(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'paypal', 'stripe', 'bizum', 'cheque', 'otro')),
  referencia TEXT,
  es_anticipo BOOLEAN NOT NULL DEFAULT false,
  es_parcial BOOLEAN NOT NULL DEFAULT false,
  estado_conciliacion TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_conciliacion IN ('pendiente', 'conciliado', 'parcial', 'error')),
  observaciones TEXT,
  archivo_justificante TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Usuarios autenticados pueden ver pagos" 
ON public.pagos 
FOR SELECT 
USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar pagos" 
ON public.pagos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar pagos" 
ON public.pagos 
FOR UPDATE 
USING (true);

CREATE POLICY "Solo admin puede eliminar pagos" 
ON public.pagos 
FOR DELETE 
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_pagos_updated_at
  BEFORE UPDATE ON public.pagos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para conciliar pagos automáticamente
CREATE OR REPLACE FUNCTION public.conciliar_pago_automatico()
RETURNS TRIGGER AS $$
DECLARE
  factura_pendiente RECORD;
  saldo_restante NUMERIC;
BEGIN
  -- Solo procesar si es un pago nuevo y no es anticipo
  IF TG_OP = 'INSERT' AND NOT NEW.es_anticipo THEN
    -- Buscar factura pendiente del mismo cliente con monto exacto
    SELECT f.*, (f.total - COALESCE(SUM(p.monto), 0)) as saldo
    INTO factura_pendiente
    FROM public.facturas f
    LEFT JOIN public.pagos p ON f.id = p.factura_id AND p.estado_conciliacion IN ('conciliado', 'parcial')
    WHERE f.id_cliente = NEW.cliente_id 
    AND f.estado_pago IN ('pendiente', 'parcial')
    GROUP BY f.id, f.total
    HAVING (f.total - COALESCE(SUM(p.monto), 0)) = NEW.monto
    ORDER BY f.fecha_emision ASC
    LIMIT 1;
    
    -- Si no encuentra monto exacto, buscar facturas que puedan pagarse parcialmente
    IF factura_pendiente IS NULL THEN
      SELECT f.*, (f.total - COALESCE(SUM(p.monto), 0)) as saldo
      INTO factura_pendiente
      FROM public.facturas f
      LEFT JOIN public.pagos p ON f.id = p.factura_id AND p.estado_conciliacion IN ('conciliado', 'parcial')
      WHERE f.id_cliente = NEW.cliente_id 
      AND f.estado_pago IN ('pendiente', 'parcial')
      GROUP BY f.id, f.total
      HAVING (f.total - COALESCE(SUM(p.monto), 0)) >= NEW.monto
      ORDER BY f.fecha_emision ASC
      LIMIT 1;
    END IF;
    
    -- Si encuentra una factura candidata, conciliar
    IF factura_pendiente IS NOT NULL THEN
      NEW.factura_id := factura_pendiente.id;
      
      -- Determinar estado del pago
      IF factura_pendiente.saldo = NEW.monto THEN
        NEW.estado_conciliacion := 'conciliado';
        NEW.es_parcial := false;
        
        -- Actualizar estado de la factura a pagada
        UPDATE public.facturas 
        SET estado_pago = 'pagado', fecha_pago = NEW.fecha_pago
        WHERE id = factura_pendiente.id;
      ELSE
        NEW.estado_conciliacion := 'parcial';
        NEW.es_parcial := true;
        
        -- Actualizar estado de la factura a parcial
        UPDATE public.facturas 
        SET estado_pago = 'parcial'
        WHERE id = factura_pendiente.id;
      END IF;
      
      -- Registrar log de conciliación
      PERFORM public.registrar_log(
        'CONCILIAR_PAGO'::tipo_accion,
        'pago'::entidad_tipo,
        NEW.id,
        CONCAT('Pago conciliado automáticamente con factura ', factura_pendiente.numero_factura),
        jsonb_build_object(
          'factura_id', factura_pendiente.id,
          'monto_pago', NEW.monto,
          'saldo_anterior', factura_pendiente.saldo,
          'tipo_conciliacion', NEW.estado_conciliacion
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para conciliación automática
CREATE TRIGGER trigger_conciliar_pago_automatico
  BEFORE INSERT ON public.pagos
  FOR EACH ROW
  EXECUTE FUNCTION public.conciliar_pago_automatico();

-- Función para obtener datos de pago para justificante
CREATE OR REPLACE FUNCTION public.obtener_datos_pago_justificante(p_pago_id UUID)
RETURNS TABLE(
  numero_recibo TEXT,
  fecha_pago DATE,
  monto NUMERIC,
  metodo_pago TEXT,
  referencia TEXT,
  cliente_nombre TEXT,
  cliente_nif TEXT,
  cliente_direccion TEXT,
  factura_numero TEXT,
  emisor_nombre TEXT,
  emisor_cif TEXT,
  emisor_direccion TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CONCAT('REC-', EXTRACT(YEAR FROM p.fecha_pago), '-', LPAD(ROW_NUMBER() OVER (ORDER BY p.created_at)::TEXT, 6, '0')) as numero_recibo,
    p.fecha_pago,
    p.monto,
    p.metodo_pago,
    p.referencia,
    CONCAT(c.nombre, ' ', c.apellidos) as cliente_nombre,
    COALESCE(f.cliente_nif, '') as cliente_nif,
    c.direccion as cliente_direccion,
    COALESCE(f.numero_factura, 'Sin factura asociada') as factura_numero,
    COALESCE(f.emisor_nombre, 'Tu Taller de Bicicletas') as emisor_nombre,
    COALESCE(f.emisor_cif, 'B12345678') as emisor_cif,
    COALESCE(f.emisor_direccion, 'Calle Principal 123, 28001 Madrid') as emisor_direccion
  FROM public.pagos p
  JOIN public.clientes c ON p.cliente_id = c.id
  LEFT JOIN public.facturas f ON p.factura_id = f.id
  WHERE p.id = p_pago_id;
END;
$$;

-- Añadir tipos de acción al enum existente
ALTER TYPE tipo_accion ADD VALUE IF NOT EXISTS 'CREAR_PAGO';
ALTER TYPE tipo_accion ADD VALUE IF NOT EXISTS 'ACTUALIZAR_PAGO';
ALTER TYPE tipo_accion ADD VALUE IF NOT EXISTS 'ELIMINAR_PAGO';
ALTER TYPE tipo_accion ADD VALUE IF NOT EXISTS 'CONCILIAR_PAGO';

-- Añadir pago al enum de entidades
ALTER TYPE entidad_tipo ADD VALUE IF NOT EXISTS 'pago';