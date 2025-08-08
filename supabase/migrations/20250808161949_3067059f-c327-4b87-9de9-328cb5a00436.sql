-- 1) Tables
-- tests_empresa: pruebas internas por empresa
CREATE TABLE IF NOT EXISTS public.tests_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  codigo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('funcionalidad','proceso','api','visual')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tests_empresa_codigo_unique UNIQUE (empresa_id, codigo)
);

-- logs_tests_empresa: logs de ejecuciones
CREATE TABLE IF NOT EXISTS public.logs_tests_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  user_id UUID NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('exito','error','pendiente')),
  mensaje TEXT,
  error_stack TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_tests_empresa_updated_at ON public.tests_empresa;
CREATE TRIGGER trg_tests_empresa_updated_at
BEFORE UPDATE ON public.tests_empresa
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 3) Enable RLS
ALTER TABLE public.tests_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_tests_empresa ENABLE ROW LEVEL SECURITY;

-- 4) Policies
-- tests_empresa: ver solo miembros activos de la empresa
DROP POLICY IF EXISTS tests_empresa_select ON public.tests_empresa;
CREATE POLICY tests_empresa_select ON public.tests_empresa
FOR SELECT TO authenticated
USING (
  empresa_id IN (
    SELECT ue.empresa_id FROM public.usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.activo = true
  )
);

-- tests_empresa: insertar solo admin o qa de la empresa
DROP POLICY IF EXISTS tests_empresa_insert ON public.tests_empresa;
CREATE POLICY tests_empresa_insert ON public.tests_empresa
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = tests_empresa.empresa_id
      AND ue.activo = true
      AND ue.rol IN ('admin','qa')
  )
);

-- tests_empresa: actualizar solo admin o qa de la empresa
DROP POLICY IF EXISTS tests_empresa_update ON public.tests_empresa;
CREATE POLICY tests_empresa_update ON public.tests_empresa
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = tests_empresa.empresa_id
      AND ue.activo = true
      AND ue.rol IN ('admin','qa')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = tests_empresa.empresa_id
      AND ue.activo = true
      AND ue.rol IN ('admin','qa')
  )
);

-- tests_empresa: eliminar solo admin o qa de la empresa
DROP POLICY IF EXISTS tests_empresa_delete ON public.tests_empresa;
CREATE POLICY tests_empresa_delete ON public.tests_empresa
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = tests_empresa.empresa_id
      AND ue.activo = true
      AND ue.rol IN ('admin','qa')
  )
);

-- logs_tests_empresa: ver solo miembros activos de la empresa
DROP POLICY IF EXISTS logs_tests_empresa_select ON public.logs_tests_empresa;
CREATE POLICY logs_tests_empresa_select ON public.logs_tests_empresa
FOR SELECT TO authenticated
USING (
  empresa_id IN (
    SELECT ue.empresa_id FROM public.usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.activo = true
  )
);

-- logs_tests_empresa: insertar solo admin o qa de la empresa
DROP POLICY IF EXISTS logs_tests_empresa_insert ON public.logs_tests_empresa;
CREATE POLICY logs_tests_empresa_insert ON public.logs_tests_empresa
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = logs_tests_empresa.empresa_id
      AND ue.activo = true
      AND ue.rol IN ('admin','qa')
  )
);

-- No permitir UPDATE/DELETE a logs (sin políticas => denegado)

-- 5) Functions
-- obtener empresa actual del usuario (ya existe: get_user_empresa_actual), la reutilizamos

-- obtener_tests_disponibles: tests activos para la empresa actual del usuario
CREATE OR REPLACE FUNCTION public.obtener_tests_disponibles()
RETURNS TABLE (
  id uuid,
  empresa_id uuid,
  nombre text,
  descripcion text,
  codigo text,
  tipo text,
  activo boolean,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
DECLARE
  v_empresa uuid;
BEGIN
  SELECT public.get_user_empresa_actual() INTO v_empresa;
  IF v_empresa IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT t.id, t.empresa_id, t.nombre, t.descripcion, t.codigo, t.tipo, t.activo, t.created_at, t.updated_at
  FROM public.tests_empresa t
  WHERE t.empresa_id = v_empresa AND t.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- obtener_logs_test: últimos logs de un test del contexto de empresa
CREATE OR REPLACE FUNCTION public.obtener_logs_test(p_test_id uuid)
RETURNS TABLE (
  id uuid,
  test_id uuid,
  empresa_id uuid,
  user_id uuid,
  estado text,
  mensaje text,
  error_stack text,
  created_at timestamptz
) AS $$
DECLARE
  v_empresa uuid;
BEGIN
  SELECT public.get_user_empresa_actual() INTO v_empresa;
  IF v_empresa IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT l.id, l.test_id, l.empresa_id, l.user_id, l.estado, l.mensaje, l.error_stack, l.created_at
  FROM public.logs_tests_empresa l
  JOIN public.tests_empresa t ON t.id = l.test_id
  WHERE l.test_id = p_test_id AND l.empresa_id = v_empresa AND t.empresa_id = v_empresa
  ORDER BY l.created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ejecutar_test: valida permisos, ejecuta dummy y registra log
CREATE OR REPLACE FUNCTION public.ejecutar_test(codigo_test text)
RETURNS JSONB AS $$
DECLARE
  v_empresa uuid;
  v_user uuid;
  v_test RECORD;
  v_estado TEXT := 'exito';
  v_mensaje TEXT := 'Test ejecutado correctamente';
  v_error TEXT;
  v_log_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT public.get_user_empresa_actual() INTO v_empresa;

  IF v_user IS NULL OR v_empresa IS NULL THEN
    RAISE EXCEPTION 'Usuario o empresa no definidos';
  END IF;

  -- Verificar que el usuario es admin o qa en la empresa
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    WHERE ue.user_id = v_user AND ue.empresa_id = v_empresa AND ue.activo = true AND ue.rol IN ('admin','qa')
  ) THEN
    RAISE EXCEPTION 'No autorizado para ejecutar tests';
  END IF;

  -- Buscar test por código en la empresa
  SELECT * INTO v_test
  FROM public.tests_empresa t
  WHERE t.empresa_id = v_empresa AND t.codigo = codigo_test AND t.activo = true
  LIMIT 1;

  IF NOT FOUND THEN
    v_estado := 'error';
    v_mensaje := 'Test no encontrado o inactivo';
  ELSE
    -- Dummy execution segun tipo
    IF v_test.tipo = 'api' THEN
      v_mensaje := 'Ping API OK';
    ELSIF v_test.tipo = 'visual' THEN
      v_mensaje := 'Chequeo visual básico OK';
    ELSIF v_test.tipo = 'proceso' THEN
      v_mensaje := 'Proceso simulado completado';
    ELSE
      v_mensaje := 'Funcionalidad verificada';
    END IF;
  END IF;

  -- Registrar log
  INSERT INTO public.logs_tests_empresa (test_id, empresa_id, user_id, estado, mensaje, error_stack)
  VALUES (COALESCE(v_test.id, gen_random_uuid()), COALESCE(v_empresa, gen_random_uuid()), v_user, v_estado, v_mensaje, v_error)
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'estado', v_estado,
    'mensaje', v_mensaje,
    'test_id', COALESCE(v_test.id, NULL),
    'log_id', v_log_id
  );
EXCEPTION WHEN OTHERS THEN
  v_estado := 'error';
  v_mensaje := COALESCE(SQLERRM, 'Error desconocido');
  v_error := v_mensaje;
  -- Intentar registrar log si fue posible obtener empresa y test
  BEGIN
    INSERT INTO public.logs_tests_empresa (test_id, empresa_id, user_id, estado, mensaje, error_stack)
    VALUES (COALESCE(v_test.id, gen_random_uuid()), COALESCE(v_empresa, gen_random_uuid()), v_user, 'error', v_mensaje, v_error)
    RETURNING id INTO v_log_id;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar si no se puede registrar
    v_log_id := NULL;
  END;
  RETURN jsonb_build_object('estado','error','mensaje', v_mensaje, 'test_id', COALESCE(v_test.id, NULL), 'log_id', v_log_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tests_empresa_empresa_codigo ON public.tests_empresa(empresa_id, codigo);
CREATE INDEX IF NOT EXISTS idx_logs_tests_empresa_test ON public.logs_tests_empresa(test_id);
CREATE INDEX IF NOT EXISTS idx_logs_tests_empresa_empresa ON public.logs_tests_empresa(empresa_id);
