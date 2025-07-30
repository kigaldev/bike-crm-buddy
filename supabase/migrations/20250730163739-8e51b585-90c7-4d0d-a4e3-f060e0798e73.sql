-- Crear tabla branding_empresas
CREATE TABLE public.branding_empresas (
  empresa_id UUID NOT NULL PRIMARY KEY,
  logo_url TEXT,
  color_primario TEXT DEFAULT '#3b82f6',
  color_secundario TEXT DEFAULT '#64748b', 
  tipografia_base TEXT,
  modo_oscuro BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.branding_empresas ENABLE ROW LEVEL SECURITY;

-- Política para que la empresa vea y edite su propio branding
CREATE POLICY "empresa_gestiona_su_branding" 
ON public.branding_empresas 
FOR ALL 
USING (empresa_id IN (
  SELECT usuarios_empresas.empresa_id
  FROM usuarios_empresas
  WHERE usuarios_empresas.user_id = auth.uid()
  AND usuarios_empresas.activo = true
));

-- Función para obtener branding de la empresa actual
CREATE OR REPLACE FUNCTION public.obtener_branding_empresa_actual()
RETURNS TABLE(
  empresa_id UUID,
  logo_url TEXT,
  color_primario TEXT,
  color_secundario TEXT,
  tipografia_base TEXT,
  modo_oscuro BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Obtener empresa actual del usuario
  SELECT empresa_actual INTO v_empresa_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Si no hay empresa, retornar vacío
  IF v_empresa_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retornar branding de la empresa actual
  RETURN QUERY
  SELECT 
    b.empresa_id,
    b.logo_url,
    b.color_primario,
    b.color_secundario,
    b.tipografia_base,
    b.modo_oscuro,
    b.updated_at
  FROM public.branding_empresas b
  WHERE b.empresa_id = v_empresa_id;
  
  -- Si no existe branding, crear uno por defecto
  IF NOT FOUND THEN
    INSERT INTO public.branding_empresas (empresa_id)
    VALUES (v_empresa_id);
    
    RETURN QUERY
    SELECT 
      b.empresa_id,
      b.logo_url,
      b.color_primario,
      b.color_secundario,
      b.tipografia_base,
      b.modo_oscuro,
      b.updated_at
    FROM public.branding_empresas b
    WHERE b.empresa_id = v_empresa_id;
  END IF;
END;
$$;

-- Función para actualizar branding
CREATE OR REPLACE FUNCTION public.actualizar_branding_empresa(
  p_logo_url TEXT DEFAULT NULL,
  p_color_primario TEXT DEFAULT NULL,
  p_color_secundario TEXT DEFAULT NULL,
  p_tipografia_base TEXT DEFAULT NULL,
  p_modo_oscuro BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
  v_result JSONB;
BEGIN
  -- Obtener empresa actual del usuario
  SELECT empresa_actual INTO v_empresa_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF v_empresa_id IS NULL THEN
    RETURN '{"error": "No hay empresa seleccionada"}'::JSONB;
  END IF;
  
  -- Insertar o actualizar branding
  INSERT INTO public.branding_empresas (
    empresa_id,
    logo_url,
    color_primario,
    color_secundario,
    tipografia_base,
    modo_oscuro,
    updated_at
  ) VALUES (
    v_empresa_id,
    p_logo_url,
    COALESCE(p_color_primario, '#3b82f6'),
    COALESCE(p_color_secundario, '#64748b'),
    p_tipografia_base,
    COALESCE(p_modo_oscuro, false),
    now()
  )
  ON CONFLICT (empresa_id) DO UPDATE SET
    logo_url = COALESCE(p_logo_url, branding_empresas.logo_url),
    color_primario = COALESCE(p_color_primario, branding_empresas.color_primario),
    color_secundario = COALESCE(p_color_secundario, branding_empresas.color_secundario),
    tipografia_base = COALESCE(p_tipografia_base, branding_empresas.tipografia_base),
    modo_oscuro = COALESCE(p_modo_oscuro, branding_empresas.modo_oscuro),
    updated_at = now();
  
  -- Retornar el branding actualizado
  SELECT to_jsonb(b.*) INTO v_result
  FROM public.branding_empresas b
  WHERE b.empresa_id = v_empresa_id;
  
  RETURN v_result;
END;
$$;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_branding_empresas_updated_at
  BEFORE UPDATE ON public.branding_empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();