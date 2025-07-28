-- Crear tabla para facturas del SaaS
CREATE TABLE public.facturas_saas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  app_id UUID NOT NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT NOT NULL,
  numero_factura TEXT NOT NULL UNIQUE,
  fecha_factura DATE NOT NULL DEFAULT CURRENT_DATE,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  concepto TEXT NOT NULL,
  importe_sin_iva NUMERIC(10,2) NOT NULL,
  tipo_iva NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  importe_iva NUMERIC(10,2) NOT NULL,
  importe_total NUMERIC(10,2) NOT NULL,
  archivo_pdf TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, generada, error
  stripe_payment_status TEXT NOT NULL,
  datos_empresa JSONB NOT NULL,
  datos_stripe JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX idx_facturas_saas_empresa ON public.facturas_saas(empresa_id);
CREATE INDEX idx_facturas_saas_stripe_invoice ON public.facturas_saas(stripe_invoice_id);
CREATE INDEX idx_facturas_saas_fecha ON public.facturas_saas(fecha_factura);

-- Función para generar número de factura SaaS
CREATE OR REPLACE FUNCTION public.generar_numero_factura_saas()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  ejercicio INT;
  siguiente_numero INT;
  numero_formateado TEXT;
BEGIN
  ejercicio := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Obtener el siguiente número secuencial para el ejercicio actual
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(numero_factura FROM 'SAS-[0-9]{4}-([0-9]{6})') AS INTEGER)
  ), 0) + 1
  INTO siguiente_numero
  FROM public.facturas_saas 
  WHERE EXTRACT(YEAR FROM fecha_factura) = ejercicio;
  
  -- Formatear número: SAS-YYYY-NNNNNN
  numero_formateado := 'SAS-' || ejercicio || '-' || LPAD(siguiente_numero::TEXT, 6, '0');
  
  RETURN numero_formateado;
END;
$$;

-- Trigger para generar número de factura automáticamente
CREATE OR REPLACE FUNCTION public.trigger_generar_numero_factura_saas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.numero_factura IS NULL THEN
    NEW.numero_factura := generar_numero_factura_saas();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_numero_factura_saas
  BEFORE INSERT ON public.facturas_saas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generar_numero_factura_saas();

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_facturas_saas_updated_at
  BEFORE UPDATE ON public.facturas_saas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.facturas_saas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_ve_sus_facturas_saas" ON public.facturas_saas
  FOR ALL
  USING (empresa_id IN (
    SELECT usuarios_empresas.empresa_id
    FROM usuarios_empresas
    WHERE usuarios_empresas.user_id = auth.uid() 
    AND usuarios_empresas.activo = true
  ));

-- Función para obtener datos completos de factura SaaS
CREATE OR REPLACE FUNCTION public.obtener_datos_factura_saas(p_factura_id UUID)
RETURNS TABLE(
  numero_factura TEXT,
  fecha_factura DATE,
  concepto TEXT,
  periodo_inicio DATE,
  periodo_fin DATE,
  importe_sin_iva NUMERIC,
  importe_iva NUMERIC,
  importe_total NUMERIC,
  empresa_nombre TEXT,
  empresa_cif TEXT,
  empresa_email TEXT,
  empresa_direccion TEXT,
  app_nombre TEXT,
  archivo_pdf TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fs.numero_factura,
    fs.fecha_factura,
    fs.concepto,
    fs.periodo_inicio,
    fs.periodo_fin,
    fs.importe_sin_iva,
    fs.importe_iva,
    fs.importe_total,
    e.razon_social as empresa_nombre,
    e.cif as empresa_cif,
    e.email as empresa_email,
    e.direccion as empresa_direccion,
    a.nombre as app_nombre,
    fs.archivo_pdf
  FROM public.facturas_saas fs
  JOIN public.empresas e ON fs.empresa_id = e.id
  JOIN public.apps a ON fs.app_id = a.id
  WHERE fs.id = p_factura_id;
END;
$$;