-- Ensure unique index for idempotent upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_tests_empresa_empresa_codigo
ON public.tests_empresa (empresa_id, codigo);

-- Create function to preload demo tests for current user's company
CREATE OR REPLACE FUNCTION public.precargar_tests_demo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_empresa uuid;
  v_inserted int := 0;
BEGIN
  SELECT public.get_user_empresa_actual() INTO v_empresa;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'No hay empresa actual para el usuario';
  END IF;

  -- ping_api
  WITH ins AS (
    INSERT INTO public.tests_empresa (empresa_id, nombre, descripcion, codigo, tipo, activo)
    VALUES (v_empresa, 'Ping API', 'Comprobar disponibilidad de RPCs y latencia básica', 'ping_api', 'api', true)
    ON CONFLICT (empresa_id, codigo) DO NOTHING
    RETURNING 1
  ) SELECT COALESCE((SELECT COUNT(*) FROM ins), 0) INTO STRICT v_inserted;

  -- flujo_factura
  WITH ins AS (
    INSERT INTO public.tests_empresa (empresa_id, nombre, descripcion, codigo, tipo, activo)
    VALUES (v_empresa, 'Flujo factura', 'Crear cliente → crear orden → emitir factura (simulada)', 'flujo_factura', 'proceso', true)
    ON CONFLICT (empresa_id, codigo) DO NOTHING
    RETURNING 1
  ) SELECT v_inserted + COALESCE((SELECT COUNT(*) FROM ins), 0) INTO v_inserted;

  -- permisos_basicos
  WITH ins AS (
    INSERT INTO public.tests_empresa (empresa_id, nombre, descripcion, codigo, tipo, activo)
    VALUES (v_empresa, 'Permisos básicos', 'Validar visibilidad por rol (usuario/manager/admin)', 'permisos_basicos', 'funcionalidad', true)
    ON CONFLICT (empresa_id, codigo) DO NOTHING
    RETURNING 1
  ) SELECT v_inserted + COALESCE((SELECT COUNT(*) FROM ins), 0) INTO v_inserted;

  -- ui_smoke
  WITH ins AS (
    INSERT INTO public.tests_empresa (empresa_id, nombre, descripcion, codigo, tipo, activo)
    VALUES (v_empresa, 'UI smoke', 'Render básico de páginas críticas (Dashboard, Clientes, Órdenes)', 'ui_smoke', 'visual', true)
    ON CONFLICT (empresa_id, codigo) DO NOTHING
    RETURNING 1
  ) SELECT v_inserted + COALESCE((SELECT COUNT(*) FROM ins), 0) INTO v_inserted;

  -- Ensure records stay updated with latest labels/types (idempotent update)
  UPDATE public.tests_empresa t
  SET nombre = s.nombre,
      descripcion = s.descripcion,
      tipo = s.tipo,
      activo = true,
      updated_at = now()
  FROM (
    VALUES
      ('ping_api', 'Ping API', 'Comprobar disponibilidad de RPCs y latencia básica', 'api'),
      ('flujo_factura', 'Flujo factura', 'Crear cliente → crear orden → emitir factura (simulada)', 'proceso'),
      ('permisos_basicos', 'Permisos básicos', 'Validar visibilidad por rol (usuario/manager/admin)', 'funcionalidad'),
      ('ui_smoke', 'UI smoke', 'Render básico de páginas críticas (Dashboard, Clientes, Órdenes)', 'visual')
  ) AS s(codigo, nombre, descripcion, tipo)
  WHERE t.empresa_id = v_empresa AND t.codigo = s.codigo;

  RETURN jsonb_build_object('inserted', v_inserted);
END;
$function$;