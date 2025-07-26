-- Migración: Sistema de notificaciones y entrega de facturas

-- 1. Añadir campos de tracking a la tabla facturas
ALTER TABLE public.facturas 
ADD COLUMN email_enviado BOOLEAN DEFAULT FALSE,
ADD COLUMN email_fecha_envio TIMESTAMP WITH TIME ZONE,
ADD COLUMN whatsapp_enviado BOOLEAN DEFAULT FALSE,
ADD COLUMN whatsapp_fecha_envio TIMESTAMP WITH TIME ZONE,
ADD COLUMN estado_notificacion TEXT DEFAULT 'pendiente', -- 'pendiente', 'enviado', 'error'
ADD COLUMN intentos_envio INTEGER DEFAULT 0,
ADD COLUMN ultimo_error TEXT;

-- 2. Tabla de logs de notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES public.facturas(id),
  tipo_notificacion TEXT NOT NULL, -- 'email', 'whatsapp'
  destinatario TEXT NOT NULL, -- email o teléfono
  estado TEXT NOT NULL, -- 'enviado', 'error', 'pendiente'
  mensaje_error TEXT,
  fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadatos JSONB, -- datos adicionales como ID de mensaje, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. RLS para logs de notificaciones
ALTER TABLE public.notificaciones_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo lectura de logs de notificaciones" 
ON public.notificaciones_log 
FOR SELECT 
USING (true);

CREATE POLICY "Sistema puede insertar logs" 
ON public.notificaciones_log 
FOR INSERT 
WITH CHECK (true);

-- 4. Función para registrar intento de notificación
CREATE OR REPLACE FUNCTION public.registrar_notificacion(
  p_factura_id UUID,
  p_tipo TEXT,
  p_destinatario TEXT,
  p_estado TEXT,
  p_error TEXT DEFAULT NULL,
  p_metadatos JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  -- Insertar log
  INSERT INTO public.notificaciones_log (
    factura_id, tipo_notificacion, destinatario, estado, mensaje_error, metadatos
  ) VALUES (
    p_factura_id, p_tipo, p_destinatario, p_estado, p_error, p_metadatos
  ) RETURNING id INTO log_id;
  
  -- Actualizar contador de intentos y estado en facturas
  UPDATE public.facturas 
  SET 
    intentos_envio = intentos_envio + 1,
    ultimo_error = CASE WHEN p_estado = 'error' THEN p_error ELSE ultimo_error END,
    estado_notificacion = CASE 
      WHEN p_estado = 'enviado' THEN 'enviado'
      WHEN p_estado = 'error' AND intentos_envio >= 2 THEN 'error'
      ELSE estado_notificacion
    END,
    email_enviado = CASE WHEN p_tipo = 'email' AND p_estado = 'enviado' THEN TRUE ELSE email_enviado END,
    email_fecha_envio = CASE WHEN p_tipo = 'email' AND p_estado = 'enviado' THEN now() ELSE email_fecha_envio END,
    whatsapp_enviado = CASE WHEN p_tipo = 'whatsapp' AND p_estado = 'enviado' THEN TRUE ELSE whatsapp_enviado END,
    whatsapp_fecha_envio = CASE WHEN p_tipo = 'whatsapp' AND p_estado = 'enviado' THEN now() ELSE whatsapp_fecha_envio END
  WHERE id = p_factura_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para obtener datos completos de factura para notificación
CREATE OR REPLACE FUNCTION public.obtener_datos_factura_notificacion(p_factura_id UUID)
RETURNS TABLE(
  factura_numero TEXT,
  factura_total NUMERIC,
  cliente_nombre TEXT,
  cliente_email TEXT,
  cliente_telefono TEXT,
  archivo_pdf TEXT,
  bicicleta_info TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.numero_factura,
    f.total,
    CONCAT(c.nombre, ' ', c.apellidos) as cliente_nombre,
    c.email,
    c.telefono,
    f.archivo_pdf,
    CONCAT(b.alias, ' - ', b.marca, ' ', b.modelo) as bicicleta_info
  FROM public.facturas f
  JOIN public.clientes c ON f.id_cliente = c.id
  JOIN public.ordenes_reparacion o ON f.id_orden = o.id
  JOIN public.bicicletas b ON o.bicicleta_id = b.id
  WHERE f.id = p_factura_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger para envío automático al crear factura
CREATE OR REPLACE FUNCTION public.trigger_envio_automatico_factura()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo para nuevas facturas
  IF TG_OP = 'INSERT' THEN
    -- Llamar edge function de forma asíncrona (se implementará en el edge function)
    -- Este trigger solo marca que necesita envío
    NEW.estado_notificacion := 'pendiente';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger solo si no existe
DROP TRIGGER IF EXISTS trigger_envio_factura ON public.facturas;
CREATE TRIGGER trigger_envio_factura
  AFTER INSERT ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_envio_automatico_factura();

-- 7. Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_facturas_notificacion ON public.facturas(estado_notificacion);
CREATE INDEX IF NOT EXISTS idx_notificaciones_factura ON public.notificaciones_log(factura_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON public.notificaciones_log(fecha_envio);