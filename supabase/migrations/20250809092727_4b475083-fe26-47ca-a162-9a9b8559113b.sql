-- Fix: CREATE POLICY doesn't support IF NOT EXISTS; use DO blocks

-- Ensure table exists (created previously)
CREATE TABLE IF NOT EXISTS public.incidencias_saas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  test_codigo text NOT NULL,
  titulo text NOT NULL,
  detalle text,
  severidad text NOT NULL DEFAULT 'alta',
  estado text NOT NULL DEFAULT 'Abierta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidencias_saas_empresa ON public.incidencias_saas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_saas_estado ON public.incidencias_saas(estado);
CREATE INDEX IF NOT EXISTS idx_incidencias_saas_severidad ON public.incidencias_saas(severidad);
CREATE INDEX IF NOT EXISTS idx_incidencias_saas_test_codigo ON public.incidencias_saas(test_codigo);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incidencias_saas_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_incidencias_saas_set_updated_at
    BEFORE UPDATE ON public.incidencias_saas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.incidencias_saas ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='incidencias_saas' AND policyname='incidencias_read_miembros'
  ) THEN
    CREATE POLICY incidencias_read_miembros
    ON public.incidencias_saas
    FOR SELECT
    USING (
      empresa_id IN (
        SELECT ue.empresa_id FROM public.usuarios_empresas ue
        WHERE ue.user_id = auth.uid() AND ue.activo = true
      )
    );
  END IF;
END $$;

-- Create write policy (ALL) if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='incidencias_saas' AND policyname='incidencias_write_admin_qa'
  ) THEN
    CREATE POLICY incidencias_write_admin_qa
    ON public.incidencias_saas
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios_empresas ue
        WHERE ue.user_id = auth.uid() AND ue.empresa_id = empresa_id AND ue.activo = true AND ue.rol IN ('admin','qa')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.usuarios_empresas ue
        WHERE ue.user_id = auth.uid() AND ue.empresa_id = empresa_id AND ue.activo = true AND ue.rol IN ('admin','qa')
      )
    );
  END IF;
END $$;

-- Functions
CREATE OR REPLACE FUNCTION public.crear_incidencia(
  p_test_codigo text,
  p_titulo text,
  p_detalle text,
  p_severidad text DEFAULT 'alta'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_empresa uuid;
  v_id uuid;
BEGIN
  SELECT public.get_user_empresa_actual() INTO v_empresa;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'No hay empresa actual para el usuario';
  END IF;

  INSERT INTO public.incidencias_saas(empresa_id, test_codigo, titulo, detalle, severidad)
  VALUES (v_empresa, p_test_codigo, p_titulo, p_detalle, COALESCE(p_severidad, 'alta'))
  RETURNING id INTO v_id;

  IF lower(COALESCE(p_severidad,'alta')) IN ('alta','critica') THEN
    INSERT INTO public.notificaciones_saas (empresa_id, user_id, tipo, titulo, mensaje, url_redireccion)
    SELECT v_empresa, ue.user_id, 'sistema',
           CONCAT('Nueva incidencia ', p_severidad, ' en test ', p_test_codigo),
           p_titulo,
           CONCAT('/test-interno?tab=incidencias&id=', v_id)
    FROM public.usuarios_empresas ue
    WHERE ue.empresa_id = v_empresa AND ue.activo = true AND ue.rol = 'admin';
  END IF;

  RETURN v_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.actualizar_estado_incidencia(p_id uuid, p_estado text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_empresa uuid;
BEGIN
  SELECT public.get_user_empresa_actual() INTO v_empresa;
  IF v_empresa IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.incidencias_saas
  SET estado = p_estado, updated_at = now()
  WHERE id = p_id AND empresa_id = v_empresa;

  RETURN FOUND;
END;
$fn$;