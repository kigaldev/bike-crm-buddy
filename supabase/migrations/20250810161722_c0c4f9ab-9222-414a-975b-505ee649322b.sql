-- Verificación del entorno de pruebas
CREATE OR REPLACE FUNCTION public.verificar_entorno_pruebas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  emp_alfa RECORD;
  emp_beta RECORD;
  v_admin_qa_alfa boolean := false;
  v_admin_qa_beta boolean := false;
  v_tests_alfa jsonb := '[]'::jsonb;
  v_tests_beta jsonb := '[]'::jsonb;
  v_apps_alfa boolean := false;
  v_apps_beta boolean := false;
  v_result jsonb;
BEGIN
  -- Buscar empresas demo por nombre_comercial
  SELECT * INTO emp_alfa FROM public.empresas WHERE nombre_comercial = 'Empresa Alfa' LIMIT 1;
  SELECT * INTO emp_beta FROM public.empresas WHERE nombre_comercial = 'Empresa Beta' LIMIT 1;

  -- Verificar roles admin y qa del usuario actual en cada empresa
  IF emp_alfa IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.usuarios_empresas
      WHERE empresa_id = emp_alfa.id AND user_id = v_user AND rol = 'admin' AND activo = true
    ) AND EXISTS(
      SELECT 1 FROM public.usuarios_empresas
      WHERE empresa_id = emp_alfa.id AND user_id = v_user AND rol = 'qa' AND activo = true
    ) INTO v_admin_qa_alfa;
  END IF;

  IF emp_beta IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.usuarios_empresas
      WHERE empresa_id = emp_beta.id AND user_id = v_user AND rol = 'admin' AND activo = true
    ) AND EXISTS(
      SELECT 1 FROM public.usuarios_empresas
      WHERE empresa_id = emp_beta.id AND user_id = v_user AND rol = 'qa' AND activo = true
    ) INTO v_admin_qa_beta;
  END IF;

  -- Verificar tests en ambas empresas
  IF emp_alfa IS NOT NULL THEN
    SELECT jsonb_agg(jsonb_build_object('codigo', t.codigo, 'activo', t.activo)) INTO v_tests_alfa
    FROM (
      SELECT 'ping_api'::text AS codigo UNION ALL
      SELECT 'permisos_basicos' UNION ALL
      SELECT 'ui_smoke' UNION ALL
      SELECT 'flujo_factura'
    ) req
    LEFT JOIN public.tests_empresa te ON te.empresa_id = emp_alfa.id AND te.codigo = req.codigo
    LEFT JOIN LATERAL (
      SELECT COALESCE(te.codigo, req.codigo) as codigo, COALESCE(te.activo, false) as activo
    ) t ON true;
  END IF;

  IF emp_beta IS NOT NULL THEN
    SELECT jsonb_agg(jsonb_build_object('codigo', t.codigo, 'activo', t.activo)) INTO v_tests_beta
    FROM (
      SELECT 'ping_api'::text AS codigo UNION ALL
      SELECT 'permisos_basicos' UNION ALL
      SELECT 'ui_smoke' UNION ALL
      SELECT 'flujo_factura'
    ) req
    LEFT JOIN public.tests_empresa te ON te.empresa_id = emp_beta.id AND te.codigo = req.codigo
    LEFT JOIN LATERAL (
      SELECT COALESCE(te.codigo, req.codigo) as codigo, COALESCE(te.activo, false) as activo
    ) t ON true;
  END IF;

  -- Verificar apps por defecto activas (usa activar_apps_default_empresa al crear). Consideramos que si hay apps core o gratuitas activas >=1 está OK
  IF emp_alfa IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.empresas_apps ea
      JOIN public.apps a ON a.id = ea.app_id
      WHERE ea.empresa_id = emp_alfa.id AND ea.activa = true AND (a.es_core = true OR a.es_gratuita = true)
    ) INTO v_apps_alfa;
  END IF;

  IF emp_beta IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.empresas_apps ea
      JOIN public.apps a ON a.id = ea.app_id
      WHERE ea.empresa_id = emp_beta.id AND ea.activa = true AND (a.es_core = true OR a.es_gratuita = true)
    ) INTO v_apps_beta;
  END IF;

  -- Construir resultado
  v_result := jsonb_build_object(
    'empresas', jsonb_build_object(
      'alfa_existe', emp_alfa IS NOT NULL,
      'beta_existe', emp_beta IS NOT NULL,
      'alfa_id', COALESCE(emp_alfa.id::text, NULL),
      'beta_id', COALESCE(emp_beta.id::text, NULL)
    ),
    'roles_usuario', jsonb_build_object(
      'alfa_admin_y_qa', v_admin_qa_alfa,
      'beta_admin_y_qa', v_admin_qa_beta
    ),
    'tests', jsonb_build_object(
      'alfa', COALESCE(v_tests_alfa, '[]'::jsonb),
      'beta', COALESCE(v_tests_beta, '[]'::jsonb)
    ),
    'apps_defecto', jsonb_build_object(
      'alfa', v_apps_alfa,
      'beta', v_apps_beta
    )
  );

  RETURN v_result;
END;
$$;

-- Reparación del entorno de pruebas
CREATE OR REPLACE FUNCTION public.reparar_entorno_pruebas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result_verif jsonb;
  v_msg text;
  v_result jsonb;
BEGIN
  -- Estrategia simple y segura: reutilizar reset_entorno_pruebas()
  v_result := public.reset_entorno_pruebas();
  v_result_verif := public.verificar_entorno_pruebas();
  RETURN jsonb_build_object(
    'accion', 'reparar',
    'resultado_reset', v_result,
    'verificacion_post', v_result_verif
  );
END;
$$;