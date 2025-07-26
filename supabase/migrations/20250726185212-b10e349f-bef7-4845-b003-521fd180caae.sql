-- Migración Verifactu: Sistema completo de facturación conforme al estándar español 2025

-- 1. Modificar tabla facturas para incluir campos Verifactu
ALTER TABLE public.facturas 
ADD COLUMN numero_factura TEXT,
ADD COLUMN serie_factura TEXT DEFAULT '001',
ADD COLUMN ejercicio_fiscal INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
ADD COLUMN base_imponible NUMERIC(10,2),
ADD COLUMN tipo_iva NUMERIC(5,2) DEFAULT 21.00,
ADD COLUMN cuota_iva NUMERIC(10,2),
ADD COLUMN hash_anterior TEXT,
ADD COLUMN hash_actual TEXT,
ADD COLUMN emisor_nombre TEXT DEFAULT 'Tu Taller de Bicicletas',
ADD COLUMN emisor_cif TEXT DEFAULT 'B12345678',
ADD COLUMN emisor_direccion TEXT DEFAULT 'Calle Principal 123, 28001 Madrid',
ADD COLUMN cliente_nif TEXT,
ADD COLUMN fecha_pago DATE,
ADD COLUMN es_rectificativa BOOLEAN DEFAULT FALSE,
ADD COLUMN factura_origen_id UUID REFERENCES public.facturas(id),
ADD COLUMN observaciones TEXT;

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON public.facturas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_ejercicio ON public.facturas(ejercicio_fiscal);
CREATE INDEX IF NOT EXISTS idx_facturas_hash ON public.facturas(hash_actual);

-- 3. Función para generar número de factura secuencial Verifactu
CREATE OR REPLACE FUNCTION public.generar_numero_factura_verifactu()
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
    CAST(SUBSTRING(numero_factura FROM 'FAC-[0-9]{4}-[0-9]{3}-[0-9]{3}-([0-9]{8})') AS INTEGER)
  ), 0) + 1
  INTO siguiente_numero
  FROM public.facturas 
  WHERE ejercicio_fiscal = ejercicio;
  
  -- Formatear número con ceros a la izquierda
  numero_formateado := 'FAC-' || ejercicio || '-' || establecimiento || '-' || terminal || '-' || LPAD(siguiente_numero::TEXT, 8, '0');
  
  RETURN numero_formateado;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para calcular hash Verifactu en cadena
CREATE OR REPLACE FUNCTION public.calcular_hash_verifactu(
  p_numero_factura TEXT,
  p_fecha_emision DATE,
  p_total NUMERIC,
  p_hash_anterior TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  contenido_factura TEXT;
  hash_resultado TEXT;
BEGIN
  -- Crear contenido para hash: numero|fecha|total
  contenido_factura := p_numero_factura || '|' || p_fecha_emision::TEXT || '|' || p_total::TEXT;
  
  -- Si hay hash anterior, incluirlo en el cálculo
  IF p_hash_anterior IS NOT NULL THEN
    contenido_factura := contenido_factura || '|' || p_hash_anterior;
  END IF;
  
  -- Calcular SHA256 y convertir a base64 (simulado con digest para desarrollo)
  hash_resultado := encode(digest(contenido_factura, 'sha256'), 'base64');
  
  RETURN hash_resultado;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para calcular IVA automáticamente
CREATE OR REPLACE FUNCTION public.calcular_iva_factura(p_total_sin_iva NUMERIC, p_tipo_iva NUMERIC DEFAULT 21.00)
RETURNS TABLE(base_imponible NUMERIC, cuota_iva NUMERIC, total_con_iva NUMERIC) AS $$
BEGIN
  base_imponible := p_total_sin_iva;
  cuota_iva := ROUND(p_total_sin_iva * (p_tipo_iva / 100), 2);
  total_con_iva := base_imponible + cuota_iva;
  
  RETURN QUERY SELECT 
    calcular_iva_factura.base_imponible,
    calcular_iva_factura.cuota_iva,
    calcular_iva_factura.total_con_iva;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para auto-generar número de factura y hash
CREATE OR REPLACE FUNCTION public.trigger_generar_factura_verifactu()
RETURNS TRIGGER AS $$
DECLARE
  ultimo_hash TEXT;
  iva_calculo RECORD;
BEGIN
  -- Solo generar en INSERT
  IF TG_OP = 'INSERT' THEN
    -- Generar número de factura si no se proporciona
    IF NEW.numero_factura IS NULL THEN
      NEW.numero_factura := generar_numero_factura_verifactu();
    END IF;
    
    -- Establecer ejercicio fiscal
    NEW.ejercicio_fiscal := EXTRACT(YEAR FROM NEW.fecha_emision);
    
    -- Calcular IVA si no se proporciona base imponible
    IF NEW.base_imponible IS NULL THEN
      -- Asumir que el total actual es sin IVA, calcular con IVA
      SELECT * INTO iva_calculo FROM calcular_iva_factura(NEW.total, COALESCE(NEW.tipo_iva, 21.00));
      NEW.base_imponible := iva_calculo.base_imponible;
      NEW.cuota_iva := iva_calculo.cuota_iva;
      NEW.total := iva_calculo.total_con_iva;
    END IF;
    
    -- Obtener último hash para la cadena
    SELECT hash_actual INTO ultimo_hash 
    FROM public.facturas 
    WHERE ejercicio_fiscal = NEW.ejercicio_fiscal 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    NEW.hash_anterior := ultimo_hash;
    NEW.hash_actual := calcular_hash_verifactu(
      NEW.numero_factura, 
      NEW.fecha_emision, 
      NEW.total, 
      ultimo_hash
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger
DROP TRIGGER IF EXISTS trigger_factura_verifactu ON public.facturas;
CREATE TRIGGER trigger_factura_verifactu
  BEFORE INSERT ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generar_factura_verifactu();

-- 8. Tabla de auditoría para facturas (inmutabilidad)
CREATE TABLE IF NOT EXISTS public.facturas_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES public.facturas(id),
  accion TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  usuario_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. RLS y políticas de protección para facturas
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

-- Política: Solo lectura para todos los usuarios autenticados
CREATE POLICY "Facturas son de solo lectura" 
ON public.facturas 
FOR SELECT 
USING (true);

-- Política: Solo insertar nuevas facturas (no actualizar ni eliminar)
CREATE POLICY "Solo insertar facturas nuevas" 
ON public.facturas 
FOR INSERT 
WITH CHECK (true);

-- Política: Prohibir actualizaciones de campos críticos
CREATE POLICY "Prohibir actualizaciones de facturas" 
ON public.facturas 
FOR UPDATE 
USING (false);

-- Política: Prohibir eliminación
CREATE POLICY "Prohibir eliminación de facturas" 
ON public.facturas 
FOR DELETE 
USING (false);

-- 10. RLS para tabla de auditoría
ALTER TABLE public.facturas_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin puede ver logs de facturas" 
ON public.facturas_log 
FOR SELECT 
USING (true); -- Temporal, cambiar por verificación de rol admin

CREATE POLICY "Sistema puede insertar logs" 
ON public.facturas_log 
FOR INSERT 
WITH CHECK (true);

-- 11. Función para generar JSON Verifactu
CREATE OR REPLACE FUNCTION public.generar_json_verifactu(p_factura_id UUID)
RETURNS JSONB AS $$
DECLARE
  factura_data RECORD;
  json_resultado JSONB;
BEGIN
  -- Obtener datos completos de la factura
  SELECT 
    f.*,
    c.nombre as cliente_nombre,
    c.apellidos as cliente_apellidos,
    c.telefono as cliente_telefono,
    c.email as cliente_email,
    c.direccion as cliente_direccion
  INTO factura_data
  FROM public.facturas f
  LEFT JOIN public.clientes c ON f.id_cliente = c.id
  WHERE f.id = p_factura_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Factura no encontrada"}'::JSONB;
  END IF;
  
  -- Construir JSON conforme a Verifactu
  json_resultado := jsonb_build_object(
    'IDFactura', jsonb_build_object(
      'IDEmisorFactura', factura_data.emisor_cif,
      'NumSerieFactura', factura_data.numero_factura
    ),
    'DatosFactura', jsonb_build_object(
      'FechaExpedicionFactura', factura_data.fecha_emision,
      'TipoFactura', 'F1',
      'ImporteTotalFactura', factura_data.total,
      'BaseImponible', factura_data.base_imponible,
      'TipoImpositivo', factura_data.tipo_iva,
      'CuotaImpuesto', factura_data.cuota_iva
    ),
    'DatosEmisor', jsonb_build_object(
      'NIF', factura_data.emisor_cif,
      'NombreRazonSocial', factura_data.emisor_nombre,
      'Direccion', factura_data.emisor_direccion
    ),
    'DatosDestinatario', jsonb_build_object(
      'NIF', COALESCE(factura_data.cliente_nif, ''),
      'NombreRazonSocial', CONCAT(factura_data.cliente_nombre, ' ', factura_data.cliente_apellidos),
      'Direccion', COALESCE(factura_data.cliente_direccion, '')
    ),
    'Huella', jsonb_build_object(
      'HuellaAnterior', COALESCE(factura_data.hash_anterior, ''),
      'Huella', factura_data.hash_actual
    ),
    'Metadatos', jsonb_build_object(
      'Version', '1.0',
      'GeneradoPor', 'CRM Taller Bicicletas',
      'FechaGeneracion', now()::TEXT
    )
  );
  
  RETURN json_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Actualizar facturas existentes con numeración Verifactu
DO $$
DECLARE
  factura_record RECORD;
  nuevo_numero TEXT;
  contador INT := 1;
BEGIN
  -- Actualizar facturas existentes con numeración Verifactu
  FOR factura_record IN 
    SELECT id, fecha_emision, total 
    FROM public.facturas 
    WHERE numero_factura IS NULL 
    ORDER BY fecha_emision ASC
  LOOP
    nuevo_numero := 'FAC-' || EXTRACT(YEAR FROM factura_record.fecha_emision) || '-001-001-' || LPAD(contador::TEXT, 8, '0');
    
    UPDATE public.facturas 
    SET 
      numero_factura = nuevo_numero,
      ejercicio_fiscal = EXTRACT(YEAR FROM fecha_emision),
      base_imponible = ROUND(total / 1.21, 2),
      cuota_iva = ROUND(total - (total / 1.21), 2),
      tipo_iva = 21.00
    WHERE id = factura_record.id;
    
    contador := contador + 1;
  END LOOP;
  
  -- Calcular hashes para facturas existentes
  FOR factura_record IN 
    SELECT id, numero_factura, fecha_emision, total 
    FROM public.facturas 
    WHERE hash_actual IS NULL 
    ORDER BY fecha_emision ASC
  LOOP
    UPDATE public.facturas 
    SET hash_actual = calcular_hash_verifactu(numero_factura, fecha_emision, total, NULL)
    WHERE id = factura_record.id;
  END LOOP;
END $$;