-- Crear tabla de alertas y recordatorios
CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('mantenimiento_recurrente', 'factura_vencida', 'pago_parcial', 'anticipo_sin_conciliar', 'abono_sin_usar', 'tarea_interna', 'cumpleanos_cliente', 'revision_preventiva')),
  id_entidad UUID, -- puede referenciar facturas, ordenes, bicicletas, clientes
  tipo_entidad TEXT CHECK (tipo_entidad IN ('factura', 'orden', 'bicicleta', 'cliente', 'pago', 'abono')),
  descripcion TEXT NOT NULL,
  fecha_recordatorio DATE NOT NULL,
  es_recurrente BOOLEAN DEFAULT false,
  frecuencia TEXT, -- 'mensual', 'anual', 'cada_30_dias', 'cada_6_meses'
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviada', 'resuelta', 'fallida', 'pospuesta')),
  enviar_email BOOLEAN DEFAULT false,
  enviar_whatsapp BOOLEAN DEFAULT false,
  fecha_resolucion DATE,
  resuelto_por UUID REFERENCES auth.users(id),
  log_envios JSONB DEFAULT '[]'::jsonb,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden ver alertas" 
ON public.alertas FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar alertas" 
ON public.alertas FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar alertas" 
ON public.alertas FOR UPDATE USING (true);

CREATE POLICY "Solo admin puede eliminar alertas" 
ON public.alertas FOR DELETE USING (false);

-- Índices para optimizar consultas
CREATE INDEX idx_alertas_fecha_recordatorio ON public.alertas(fecha_recordatorio);
CREATE INDEX idx_alertas_estado ON public.alertas(estado);
CREATE INDEX idx_alertas_tipo ON public.alertas(tipo);
CREATE INDEX idx_alertas_entidad ON public.alertas(id_entidad, tipo_entidad);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_alertas_updated_at
BEFORE UPDATE ON public.alertas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear alerta de mantenimiento recurrente
CREATE OR REPLACE FUNCTION public.crear_alerta_mantenimiento(
  p_bicicleta_id UUID,
  p_descripcion TEXT,
  p_meses_frecuencia INTEGER DEFAULT 12
)
RETURNS UUID AS $$
DECLARE
  v_alerta_id UUID;
  v_fecha_proxima DATE;
BEGIN
  v_fecha_proxima := CURRENT_DATE + INTERVAL '1 month' * p_meses_frecuencia;
  
  INSERT INTO public.alertas (
    tipo,
    id_entidad,
    tipo_entidad,
    descripcion,
    fecha_recordatorio,
    es_recurrente,
    frecuencia,
    prioridad,
    enviar_email
  ) VALUES (
    'mantenimiento_recurrente',
    p_bicicleta_id,
    'bicicleta',
    p_descripcion,
    v_fecha_proxima,
    true,
    CASE 
      WHEN p_meses_frecuencia = 1 THEN 'mensual'
      WHEN p_meses_frecuencia = 6 THEN 'cada_6_meses'
      WHEN p_meses_frecuencia = 12 THEN 'anual'
      ELSE 'personalizado'
    END,
    'media',
    true
  ) RETURNING id INTO v_alerta_id;
  
  RETURN v_alerta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear alerta de factura vencida
CREATE OR REPLACE FUNCTION public.crear_alerta_factura_vencida(
  p_factura_id UUID,
  p_dias_vencimiento INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  v_alerta_id UUID;
  v_factura_record RECORD;
  v_fecha_alerta DATE;
BEGIN
  -- Obtener datos de la factura
  SELECT f.*, c.nombre, c.apellidos, f.numero_factura
  INTO v_factura_record
  FROM public.facturas f
  JOIN public.clientes c ON f.id_cliente = c.id
  WHERE f.id = p_factura_id;
  
  v_fecha_alerta := v_factura_record.fecha_emision + INTERVAL '1 day' * p_dias_vencimiento;
  
  INSERT INTO public.alertas (
    tipo,
    id_entidad,
    tipo_entidad,
    descripcion,
    fecha_recordatorio,
    prioridad,
    enviar_email,
    enviar_whatsapp
  ) VALUES (
    'factura_vencida',
    p_factura_id,
    'factura',
    CONCAT('Factura ', v_factura_record.numero_factura, ' vencida - Cliente: ', v_factura_record.nombre, ' ', v_factura_record.apellidos, ' - €', v_factura_record.total),
    v_fecha_alerta,
    CASE 
      WHEN p_dias_vencimiento > 60 THEN 'critica'
      WHEN p_dias_vencimiento > 30 THEN 'alta'
      ELSE 'media'
    END,
    true,
    true
  ) RETURNING id INTO v_alerta_id;
  
  RETURN v_alerta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear alertas automáticas al insertar facturas
CREATE OR REPLACE FUNCTION public.trigger_crear_alerta_factura()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear alerta para facturas pendientes
  IF NEW.estado_pago = 'pendiente' THEN
    PERFORM public.crear_alerta_factura_vencida(NEW.id, 30);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alerta_factura_pendiente
AFTER INSERT ON public.facturas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_crear_alerta_factura();

-- Función para procesar alertas vencidas
CREATE OR REPLACE FUNCTION public.procesar_alertas_vencidas()
RETURNS INTEGER AS $$
DECLARE
  v_alertas_procesadas INTEGER := 0;
  v_alerta RECORD;
BEGIN
  -- Marcar alertas vencidas como enviadas si están pendientes
  FOR v_alerta IN 
    SELECT * FROM public.alertas 
    WHERE estado = 'pendiente' 
    AND fecha_recordatorio <= CURRENT_DATE
  LOOP
    -- Actualizar estado
    UPDATE public.alertas 
    SET estado = 'enviada',
        log_envios = log_envios || jsonb_build_object(
          'fecha_envio', now()::text,
          'tipo', 'automatico',
          'resultado', 'procesada'
        )
    WHERE id = v_alerta.id;
    
    v_alertas_procesadas := v_alertas_procesadas + 1;
  END LOOP;
  
  RETURN v_alertas_procesadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;