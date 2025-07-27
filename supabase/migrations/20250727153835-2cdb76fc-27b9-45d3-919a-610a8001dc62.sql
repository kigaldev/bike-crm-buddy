-- Tabla para auditoría de firmas digitales
CREATE TABLE public.firmas_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id UUID NOT NULL,
  usuario_id UUID,
  usuario_email TEXT NOT NULL,
  accion TEXT NOT NULL, -- 'generar_xml', 'firmar_xml', 'validar_xml', 'descargar_xml'
  estado TEXT NOT NULL, -- 'exito', 'error', 'pendiente'
  archivo_generado TEXT, -- URL del archivo XML generado/firmado
  certificado_usado TEXT, -- Nombre/hash del certificado usado
  errores_validacion JSONB, -- Errores encontrados durante validación
  metadatos JSONB, -- Información adicional (tamaño archivo, tiempo procesamiento, etc)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.firmas_log ENABLE ROW LEVEL SECURITY;

-- Políticas para firmas_log
CREATE POLICY "Solo admin puede ver logs de firmas" 
ON public.firmas_log 
FOR SELECT 
USING (true);

CREATE POLICY "Sistema puede insertar logs de firmas" 
ON public.firmas_log 
FOR INSERT 
WITH CHECK (true);

-- No permitir actualizaciones ni eliminaciones
-- Los logs son inmutables

-- Añadir campos Facturae a tabla facturas
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS xml_facturae TEXT;
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS xml_firmado TEXT;
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS estado_facturae TEXT DEFAULT 'pendiente';
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS fecha_firma TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS certificado_usado TEXT;
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS validacion_xsd BOOLEAN DEFAULT false;

-- Función para registrar logs de firma digital
CREATE OR REPLACE FUNCTION public.registrar_log_firma(
  p_factura_id UUID,
  p_accion TEXT,
  p_estado TEXT,
  p_archivo_generado TEXT DEFAULT NULL,
  p_certificado_usado TEXT DEFAULT NULL,
  p_errores_validacion JSONB DEFAULT NULL,
  p_metadatos JSONB DEFAULT NULL
) RETURNS UUID
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
  INSERT INTO public.firmas_log (
    factura_id,
    usuario_id,
    usuario_email,
    accion,
    estado,
    archivo_generado,
    certificado_usado,
    errores_validacion,
    metadatos
  ) VALUES (
    p_factura_id,
    auth.uid(),
    v_usuario_email,
    p_accion,
    p_estado,
    p_archivo_generado,
    p_certificado_usado,
    p_errores_validacion,
    p_metadatos
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Función para obtener datos completos de factura para Facturae
CREATE OR REPLACE FUNCTION public.obtener_datos_factura_facturae(p_factura_id UUID)
RETURNS TABLE(
  -- Datos de la factura
  numero_factura TEXT,
  fecha_emision DATE,
  total NUMERIC,
  base_imponible NUMERIC,
  cuota_iva NUMERIC,
  tipo_iva NUMERIC,
  
  -- Datos del emisor
  emisor_cif TEXT,
  emisor_nombre TEXT,
  emisor_direccion TEXT,
  
  -- Datos del cliente
  cliente_nombre TEXT,
  cliente_nif TEXT,
  cliente_direccion TEXT,
  cliente_telefono TEXT,
  cliente_email TEXT,
  
  -- Datos de la bicicleta/orden
  bicicleta_info TEXT,
  descripcion_trabajo TEXT,
  
  -- Verifactu
  hash_actual TEXT,
  hash_anterior TEXT,
  ejercicio_fiscal INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.numero_factura,
    f.fecha_emision,
    f.total,
    f.base_imponible,
    f.cuota_iva,
    f.tipo_iva,
    
    f.emisor_cif,
    f.emisor_nombre,
    f.emisor_direccion,
    
    CONCAT(c.nombre, ' ', c.apellidos) as cliente_nombre,
    f.cliente_nif,
    c.direccion as cliente_direccion,
    c.telefono as cliente_telefono,
    c.email as cliente_email,
    
    CONCAT(b.alias, ' - ', b.marca, ' ', b.modelo) as bicicleta_info,
    o.descripcion_trabajo,
    
    f.hash_actual,
    f.hash_anterior,
    f.ejercicio_fiscal
    
  FROM public.facturas f
  JOIN public.clientes c ON f.id_cliente = c.id
  JOIN public.ordenes_reparacion o ON f.id_orden = o.id
  JOIN public.bicicletas b ON o.bicicleta_id = b.id
  WHERE f.id = p_factura_id;
END;
$$;