-- Crear tabla abonos
CREATE TABLE public.abonos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_original_id UUID REFERENCES public.facturas(id) ON DELETE SET NULL,
  numero_abono TEXT,
  fecha_abono DATE DEFAULT CURRENT_DATE,
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('reembolso', 'nota_credito')),
  motivo TEXT,
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'bizum', 'cheque', 'otro')),
  referencia TEXT,
  archivo_pdf TEXT,
  archivo_xml TEXT,
  estado TEXT DEFAULT 'emitido' CHECK (estado IN ('emitido', 'cancelado')),
  observaciones TEXT,
  creado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Campos Verifactu para notas de crédito
  hash_actual TEXT,
  hash_anterior TEXT,
  ejercicio_fiscal INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  serie_abono TEXT DEFAULT '001'
);

-- Habilitar RLS
ALTER TABLE public.abonos ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Usuarios autenticados pueden ver abonos"
ON public.abonos FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar abonos"
ON public.abonos FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar abonos"
ON public.abonos FOR UPDATE USING (true);

CREATE POLICY "Solo admin puede eliminar abonos"
ON public.abonos FOR DELETE USING (false);

-- Trigger para updated_at
CREATE TRIGGER update_abonos_updated_at
  BEFORE UPDATE ON public.abonos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear tabla abonos_log para auditoría
CREATE TABLE public.abonos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abono_id UUID NOT NULL REFERENCES public.abonos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  usuario_email TEXT,
  accion TEXT NOT NULL CHECK (accion IN ('crear', 'firmar', 'anular', 'enviar')),
  estado TEXT NOT NULL CHECK (estado IN ('exito', 'error')),
  mensaje TEXT,
  metadatos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en abonos_log
ALTER TABLE public.abonos_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sistema puede insertar logs de abonos"
ON public.abonos_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Solo admin puede ver logs de abonos"
ON public.abonos_log FOR SELECT USING (true);

-- Función para generar número de abono
CREATE OR REPLACE FUNCTION public.generar_numero_abono()
RETURNS TEXT AS $$
DECLARE
  ejercicio INT;
  siguiente_numero INT;
  establecimiento TEXT DEFAULT '001';
  terminal TEXT DEFAULT '001';
  numero_formateado TEXT;
BEGIN
  ejercicio := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Obtener el siguiente número secuencial para el ejercicio actual
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero_abono FROM 'ABN-[0-9]{4}-[0-9]{3}-[0-9]{3}-([0-9]{8})') AS INTEGER)
  ), 0) + 1
  INTO siguiente_numero
  FROM public.abonos 
  WHERE ejercicio_fiscal = ejercicio;
  
  -- Formatear número con ceros a la izquierda
  numero_formateado := 'ABN-' || ejercicio || '-' || establecimiento || '-' || terminal || '-' || LPAD(siguiente_numero::TEXT, 8, '0');
  
  RETURN numero_formateado;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número de abono y hash Verifactu
CREATE OR REPLACE FUNCTION public.trigger_generar_abono_verifactu()
RETURNS TRIGGER AS $$
DECLARE
  ultimo_hash TEXT;
BEGIN
  -- Solo generar en INSERT
  IF TG_OP = 'INSERT' THEN
    -- Generar número de abono si no se proporciona
    IF NEW.numero_abono IS NULL THEN
      NEW.numero_abono := generar_numero_abono();
    END IF;
    
    -- Establecer ejercicio fiscal
    NEW.ejercicio_fiscal := EXTRACT(YEAR FROM NEW.fecha_abono);
    
    -- Para notas de crédito, generar hash en cadena Verifactu
    IF NEW.tipo = 'nota_credito' THEN
      -- Obtener último hash para la cadena
      SELECT hash_actual INTO ultimo_hash 
      FROM public.facturas 
      WHERE ejercicio_fiscal = NEW.ejercicio_fiscal 
      ORDER BY created_at DESC 
      LIMIT 1;
      
      -- Si no hay facturas, buscar en abonos
      IF ultimo_hash IS NULL THEN
        SELECT hash_actual INTO ultimo_hash 
        FROM public.abonos 
        WHERE ejercicio_fiscal = NEW.ejercicio_fiscal 
        AND tipo = 'nota_credito'
        ORDER BY created_at DESC 
        LIMIT 1;
      END IF;
      
      NEW.hash_anterior := ultimo_hash;
      NEW.hash_actual := calcular_hash_verifactu(
        NEW.numero_abono, 
        NEW.fecha_abono, 
        NEW.monto, 
        ultimo_hash
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar abono
CREATE TRIGGER trigger_generar_abono_verifactu
  BEFORE INSERT ON public.abonos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generar_abono_verifactu();

-- Función para conciliación inversa (actualizar estado de factura)
CREATE OR REPLACE FUNCTION public.conciliar_abono_factura()
RETURNS TRIGGER AS $$
DECLARE
  factura_total NUMERIC;
  total_abonos NUMERIC;
BEGIN
  -- Solo procesar si hay factura asociada
  IF NEW.factura_original_id IS NOT NULL THEN
    -- Obtener total de la factura
    SELECT total INTO factura_total 
    FROM public.facturas 
    WHERE id = NEW.factura_original_id;
    
    -- Calcular total de abonos para esta factura
    SELECT COALESCE(SUM(monto), 0) INTO total_abonos
    FROM public.abonos 
    WHERE factura_original_id = NEW.factura_original_id 
    AND estado = 'emitido';
    
    -- Actualizar estado de la factura
    IF total_abonos >= factura_total THEN
      -- Abono total - factura anulada
      UPDATE public.facturas 
      SET 
        estado_pago = 'anulado',
        es_rectificativa = true
      WHERE id = NEW.factura_original_id;
    ELSE
      -- Abono parcial - factura queda parcial
      UPDATE public.facturas 
      SET estado_pago = 'parcial'
      WHERE id = NEW.factura_original_id;
    END IF;
    
    -- Registrar log de conciliación
    PERFORM public.registrar_log(
      'CREAR_ABONO'::tipo_accion,
      'abono'::entidad_tipo,
      NEW.id,
      CONCAT('Abono de ', NEW.monto, '€ aplicado a factura. Total abonos: ', total_abonos, '€'),
      jsonb_build_object(
        'factura_id', NEW.factura_original_id,
        'monto_abono', NEW.monto,
        'total_abonos', total_abonos,
        'total_factura', factura_total,
        'tipo_abono', NEW.tipo
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para conciliación inversa
CREATE TRIGGER trigger_conciliar_abono_factura
  AFTER INSERT ON public.abonos
  FOR EACH ROW
  EXECUTE FUNCTION public.conciliar_abono_factura();

-- Función para obtener datos de abono para PDF/notificación
CREATE OR REPLACE FUNCTION public.obtener_datos_abono_completo(p_abono_id UUID)
RETURNS TABLE(
  numero_abono TEXT,
  fecha_abono DATE,
  monto NUMERIC,
  tipo TEXT,
  motivo TEXT,
  metodo_pago TEXT,
  referencia TEXT,
  cliente_nombre TEXT,
  cliente_email TEXT,
  cliente_telefono TEXT,
  cliente_direccion TEXT,
  factura_numero TEXT,
  factura_total NUMERIC,
  emisor_nombre TEXT,
  emisor_cif TEXT,
  emisor_direccion TEXT,
  hash_actual TEXT,
  ejercicio_fiscal INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.numero_abono,
    a.fecha_abono,
    a.monto,
    a.tipo,
    a.motivo,
    a.metodo_pago,
    a.referencia,
    CONCAT(c.nombre, ' ', c.apellidos) as cliente_nombre,
    c.email as cliente_email,
    c.telefono as cliente_telefono,
    c.direccion as cliente_direccion,
    COALESCE(f.numero_factura, 'Sin factura asociada') as factura_numero,
    f.total as factura_total,
    COALESCE(f.emisor_nombre, 'Tu Taller de Bicicletas') as emisor_nombre,
    COALESCE(f.emisor_cif, 'B12345678') as emisor_cif,
    COALESCE(f.emisor_direccion, 'Calle Principal 123, 28001 Madrid') as emisor_direccion,
    a.hash_actual,
    a.ejercicio_fiscal
  FROM public.abonos a
  LEFT JOIN public.facturas f ON a.factura_original_id = f.id
  LEFT JOIN public.clientes c ON f.id_cliente = c.id
  WHERE a.id = p_abono_id;
END;
$$;

-- Función para registrar log de abono
CREATE OR REPLACE FUNCTION public.registrar_log_abono(
  p_abono_id UUID,
  p_accion TEXT,
  p_estado TEXT,
  p_mensaje TEXT DEFAULT NULL,
  p_metadatos JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usuario_email TEXT;
  v_log_id UUID;
BEGIN
  -- Get current user email
  SELECT email INTO v_usuario_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- If no authenticated user, use 'sistema'
  IF v_usuario_email IS NULL THEN
    v_usuario_email := 'sistema';
  END IF;

  -- Insert log entry
  INSERT INTO public.abonos_log (
    abono_id,
    usuario_id,
    usuario_email,
    accion,
    estado,
    mensaje,
    metadatos
  ) VALUES (
    p_abono_id,
    auth.uid(),
    v_usuario_email,
    p_accion,
    p_estado,
    p_mensaje,
    p_metadatos
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Añadir tipos de acción al enum existente
ALTER TYPE tipo_accion ADD VALUE IF NOT EXISTS 'CREAR_ABONO';
ALTER TYPE tipo_accion ADD VALUE IF NOT EXISTS 'ACTUALIZAR_ABONO';
ALTER TYPE tipo_accion ADD VALUE IF NOT EXISTS 'ELIMINAR_ABONO';
ALTER TYPE tipo_accion ADD VALUE IF NOT EXISTS 'FIRMAR_ABONO';

-- Añadir abono al enum de entidades
ALTER TYPE entidad_tipo ADD VALUE IF NOT EXISTS 'abono';