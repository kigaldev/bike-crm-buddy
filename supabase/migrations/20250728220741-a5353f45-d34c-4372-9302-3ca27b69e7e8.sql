-- Crear tabla para registrar uso de apps por empresa
CREATE TABLE public.uso_apps_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  app_codigo TEXT NOT NULL,
  fecha_uso TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo_accion TEXT NOT NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX idx_uso_apps_empresa_empresa ON public.uso_apps_empresa(empresa_id);
CREATE INDEX idx_uso_apps_empresa_app ON public.uso_apps_empresa(app_codigo);
CREATE INDEX idx_uso_apps_empresa_fecha ON public.uso_apps_empresa(fecha_uso);
CREATE INDEX idx_uso_apps_empresa_empresa_app ON public.uso_apps_empresa(empresa_id, app_codigo);
CREATE INDEX idx_uso_apps_empresa_empresa_fecha ON public.uso_apps_empresa(empresa_id, fecha_uso);

-- RLS Policies
ALTER TABLE public.uso_apps_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_ve_su_uso" ON public.uso_apps_empresa
  FOR SELECT
  USING (empresa_id IN (
    SELECT usuarios_empresas.empresa_id
    FROM usuarios_empresas
    WHERE usuarios_empresas.user_id = auth.uid() 
    AND usuarios_empresas.activo = true
  ));

CREATE POLICY "sistema_puede_insertar_uso" ON public.uso_apps_empresa
  FOR INSERT
  WITH CHECK (true);

-- Función para registrar uso de apps
CREATE OR REPLACE FUNCTION public.registrar_uso_app(
  p_app_codigo TEXT,
  p_tipo_accion TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
  v_user_id UUID;
  v_uso_id UUID;
BEGIN
  -- Obtener usuario actual
  v_user_id := auth.uid();
  
  -- Obtener empresa actual del usuario
  SELECT empresa_actual INTO v_empresa_id
  FROM public.profiles
  WHERE user_id = v_user_id;
  
  -- Si no hay empresa, no registrar
  IF v_empresa_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Insertar registro de uso
  INSERT INTO public.uso_apps_empresa (
    empresa_id,
    app_codigo,
    tipo_accion,
    user_id,
    metadata
  ) VALUES (
    v_empresa_id,
    p_app_codigo,
    p_tipo_accion,
    v_user_id,
    p_metadata
  ) RETURNING id INTO v_uso_id;
  
  RETURN v_uso_id;
END;
$$;

-- Función para obtener estadísticas de uso por empresa
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_uso_empresa(p_empresa_id UUID)
RETURNS TABLE(
  app_codigo TEXT,
  app_nombre TEXT,
  total_acciones INTEGER,
  ultimo_uso TIMESTAMPTZ,
  acciones_mes_actual INTEGER,
  acciones_semana_actual INTEGER,
  tipos_acciones JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.app_codigo,
    a.nombre as app_nombre,
    COUNT(u.id)::INTEGER as total_acciones,
    MAX(u.fecha_uso) as ultimo_uso,
    COUNT(CASE WHEN u.fecha_uso >= date_trunc('month', now()) THEN 1 END)::INTEGER as acciones_mes_actual,
    COUNT(CASE WHEN u.fecha_uso >= date_trunc('week', now()) THEN 1 END)::INTEGER as acciones_semana_actual,
    jsonb_object_agg(u.tipo_accion, COUNT(*)) as tipos_acciones
  FROM public.uso_apps_empresa u
  LEFT JOIN public.apps a ON u.app_codigo = a.codigo
  WHERE u.empresa_id = p_empresa_id
  GROUP BY u.app_codigo, a.nombre
  ORDER BY total_acciones DESC;
END;
$$;

-- Función para obtener actividad diaria de una empresa
CREATE OR REPLACE FUNCTION public.obtener_actividad_diaria_empresa(
  p_empresa_id UUID,
  p_dias INTEGER DEFAULT 30
)
RETURNS TABLE(
  fecha DATE,
  total_acciones INTEGER,
  apps_usadas INTEGER,
  usuarios_activos INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.fecha_uso::DATE as fecha,
    COUNT(u.id)::INTEGER as total_acciones,
    COUNT(DISTINCT u.app_codigo)::INTEGER as apps_usadas,
    COUNT(DISTINCT u.user_id)::INTEGER as usuarios_activos
  FROM public.uso_apps_empresa u
  WHERE u.empresa_id = p_empresa_id
    AND u.fecha_uso >= (now() - INTERVAL '1 day' * p_dias)
  GROUP BY u.fecha_uso::DATE
  ORDER BY fecha DESC;
END;
$$;

-- Función para obtener apps no utilizadas recientemente
CREATE OR REPLACE FUNCTION public.obtener_apps_sin_uso_reciente(
  p_empresa_id UUID,
  p_dias INTEGER DEFAULT 30
)
RETURNS TABLE(
  app_codigo TEXT,
  app_nombre TEXT,
  ultimo_uso TIMESTAMPTZ,
  dias_sin_uso INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH apps_empresa AS (
    SELECT DISTINCT ea.app_id, a.codigo, a.nombre
    FROM public.empresas_apps ea
    JOIN public.apps a ON ea.app_id = a.id
    WHERE ea.empresa_id = p_empresa_id 
    AND ea.activa = true
  ),
  ultimo_uso_por_app AS (
    SELECT 
      u.app_codigo,
      MAX(u.fecha_uso) as ultimo_uso
    FROM public.uso_apps_empresa u
    WHERE u.empresa_id = p_empresa_id
    GROUP BY u.app_codigo
  )
  SELECT 
    ae.codigo as app_codigo,
    ae.nombre as app_nombre,
    COALESCE(uu.ultimo_uso, '1970-01-01'::timestamptz) as ultimo_uso,
    EXTRACT(DAY FROM now() - COALESCE(uu.ultimo_uso, '1970-01-01'::timestamptz))::INTEGER as dias_sin_uso
  FROM apps_empresa ae
  LEFT JOIN ultimo_uso_por_app uu ON ae.codigo = uu.app_codigo
  WHERE COALESCE(uu.ultimo_uso, '1970-01-01'::timestamptz) < (now() - INTERVAL '1 day' * p_dias)
  ORDER BY dias_sin_uso DESC;
END;
$$;