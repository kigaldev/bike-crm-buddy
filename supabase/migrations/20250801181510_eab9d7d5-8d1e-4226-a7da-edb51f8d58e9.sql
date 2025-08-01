-- Crear tabla de configuración de apps por empresa
CREATE TABLE public.config_apps_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  app_codigo TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  limite_uso_mensual INTEGER NULL,
  restricciones JSONB DEFAULT '{}'::jsonb,
  modo_demo BOOLEAN NOT NULL DEFAULT false,
  configuracion_personalizada JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (empresa_id, app_codigo)
);

-- Habilitar RLS
ALTER TABLE public.config_apps_empresa ENABLE ROW LEVEL SECURITY;

-- Solo usuarios de la empresa pueden ver/editar su configuración
CREATE POLICY "empresa_gestiona_config_apps" 
ON public.config_apps_empresa 
FOR ALL
USING (
  empresa_id IN (
    SELECT empresa_id FROM usuarios_empresas 
    WHERE user_id = auth.uid()
    AND activo = true
  )
);

-- Función para obtener configuración de app para empresa actual
CREATE OR REPLACE FUNCTION public.obtener_config_app_empresa(p_app_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
  v_config JSONB;
  v_app_exists BOOLEAN;
BEGIN
  -- Obtener empresa actual del usuario
  SELECT empresa_actual INTO v_empresa_id
  FROM profiles WHERE user_id = auth.uid();
  
  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No hay empresa seleccionada');
  END IF;

  -- Verificar que la app existe
  SELECT EXISTS(SELECT 1 FROM apps WHERE codigo = p_app_codigo) INTO v_app_exists;
  
  IF NOT v_app_exists THEN
    RETURN jsonb_build_object('error', 'App no encontrada');
  END IF;

  -- Obtener configuración existente o crear una por defecto
  SELECT jsonb_build_object(
    'activa', COALESCE(activa, true),
    'limite_uso_mensual', limite_uso_mensual,
    'restricciones', COALESCE(restricciones, '{}'::jsonb),
    'modo_demo', COALESCE(modo_demo, false),
    'configuracion_personalizada', COALESCE(configuracion_personalizada, '{}'::jsonb),
    'app_codigo', p_app_codigo,
    'empresa_id', v_empresa_id
  ) INTO v_config
  FROM config_apps_empresa 
  WHERE empresa_id = v_empresa_id AND app_codigo = p_app_codigo;

  -- Si no existe configuración, crear una por defecto
  IF v_config IS NULL THEN
    INSERT INTO config_apps_empresa (empresa_id, app_codigo)
    VALUES (v_empresa_id, p_app_codigo)
    ON CONFLICT (empresa_id, app_codigo) DO NOTHING;
    
    v_config := jsonb_build_object(
      'activa', true,
      'limite_uso_mensual', null,
      'restricciones', '{}'::jsonb,
      'modo_demo', false,
      'configuracion_personalizada', '{}'::jsonb,
      'app_codigo', p_app_codigo,
      'empresa_id', v_empresa_id
    );
  END IF;

  RETURN v_config;
END;
$$;

-- Función para actualizar configuración de app
CREATE OR REPLACE FUNCTION public.actualizar_config_app_empresa(
  p_app_codigo TEXT,
  p_configuracion JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
  v_config JSONB;
BEGIN
  -- Obtener empresa actual del usuario
  SELECT empresa_actual INTO v_empresa_id
  FROM profiles WHERE user_id = auth.uid();
  
  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No hay empresa seleccionada');
  END IF;

  -- Verificar que el usuario tiene permisos de admin
  IF NOT verificar_permiso_usuario('apps', 'editar') THEN
    RETURN jsonb_build_object('error', 'Sin permisos para editar configuración');
  END IF;

  -- Actualizar o insertar configuración
  INSERT INTO config_apps_empresa (
    empresa_id, 
    app_codigo,
    activa,
    limite_uso_mensual,
    restricciones,
    modo_demo,
    configuracion_personalizada
  ) VALUES (
    v_empresa_id,
    p_app_codigo,
    COALESCE((p_configuracion->>'activa')::boolean, true),
    CASE WHEN p_configuracion->>'limite_uso_mensual' = 'null' THEN NULL 
         ELSE (p_configuracion->>'limite_uso_mensual')::integer END,
    COALESCE(p_configuracion->'restricciones', '{}'::jsonb),
    COALESCE((p_configuracion->>'modo_demo')::boolean, false),
    COALESCE(p_configuracion->'configuracion_personalizada', '{}'::jsonb)
  )
  ON CONFLICT (empresa_id, app_codigo) DO UPDATE SET
    activa = EXCLUDED.activa,
    limite_uso_mensual = EXCLUDED.limite_uso_mensual,
    restricciones = EXCLUDED.restricciones,
    modo_demo = EXCLUDED.modo_demo,
    configuracion_personalizada = EXCLUDED.configuracion_personalizada,
    updated_at = now();

  -- Retornar configuración actualizada
  RETURN obtener_config_app_empresa(p_app_codigo);
END;
$$;

-- Función para obtener todas las configuraciones de apps de una empresa
CREATE OR REPLACE FUNCTION public.obtener_todas_config_apps_empresa()
RETURNS TABLE(
  app_codigo TEXT,
  app_nombre TEXT,
  app_descripcion TEXT,
  activa BOOLEAN,
  limite_uso_mensual INTEGER,
  restricciones JSONB,
  modo_demo BOOLEAN,
  configuracion_personalizada JSONB,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Obtener empresa actual del usuario
  SELECT empresa_actual INTO v_empresa_id
  FROM profiles WHERE user_id = auth.uid();
  
  IF v_empresa_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    a.codigo as app_codigo,
    a.nombre as app_nombre,
    a.descripcion as app_descripcion,
    COALESCE(c.activa, true) as activa,
    c.limite_uso_mensual,
    COALESCE(c.restricciones, '{}'::jsonb) as restricciones,
    COALESCE(c.modo_demo, false) as modo_demo,
    COALESCE(c.configuracion_personalizada, '{}'::jsonb) as configuracion_personalizada,
    c.updated_at
  FROM apps a
  LEFT JOIN config_apps_empresa c ON (a.codigo = c.app_codigo AND c.empresa_id = v_empresa_id)
  WHERE a.activa = true
  ORDER BY a.orden_display, a.nombre;
END;
$$;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_config_apps_empresa_updated_at
  BEFORE UPDATE ON public.config_apps_empresa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();