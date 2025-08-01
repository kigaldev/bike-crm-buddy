-- Crear tabla de permisos por rol por empresa
CREATE TABLE public.permisos_roles_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  rol TEXT NOT NULL,
  recurso TEXT NOT NULL,
  accion TEXT NOT NULL,
  permitido BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (empresa_id, rol, recurso, accion)
);

-- Habilitar RLS
ALTER TABLE public.permisos_roles_empresa ENABLE ROW LEVEL SECURITY;

-- Solo admins de una empresa pueden gestionar permisos
CREATE POLICY "Admins gestionan permisos" 
ON public.permisos_roles_empresa 
FOR ALL
USING (
  empresa_id IN (
    SELECT empresa_id FROM usuarios_empresas 
    WHERE user_id = auth.uid()
    AND rol = 'admin'
    AND activo = true
  )
);

-- Función para verificar permisos de usuario
CREATE OR REPLACE FUNCTION public.verificar_permiso_usuario(
  p_recurso TEXT,
  p_accion TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rol TEXT;
  v_empresa UUID;
  v_permitido BOOLEAN;
BEGIN
  -- Obtener empresa actual del usuario
  SELECT empresa_actual INTO v_empresa FROM profiles WHERE user_id = auth.uid();
  
  -- Obtener rol del usuario en esa empresa
  SELECT rol INTO v_rol FROM usuarios_empresas 
  WHERE user_id = auth.uid() AND empresa_id = v_empresa AND activo = true;

  -- Si no tiene rol o empresa, denegar acceso
  IF v_rol IS NULL OR v_empresa IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar permiso específico
  SELECT permitido INTO v_permitido FROM permisos_roles_empresa
  WHERE empresa_id = v_empresa AND rol = v_rol
  AND recurso = p_recurso AND accion = p_accion;

  -- Si no existe configuración específica, usar defaults por rol
  IF v_permitido IS NULL THEN
    -- Admins tienen acceso total por defecto
    IF v_rol = 'admin' THEN
      RETURN true;
    -- Managers tienen acceso de lectura y edición pero no eliminación
    ELSIF v_rol = 'manager' THEN
      RETURN p_accion IN ('ver', 'crear', 'editar');
    -- Usuarios solo lectura por defecto
    ELSE
      RETURN p_accion = 'ver';
    END IF;
  END IF;

  RETURN COALESCE(v_permitido, false);
END;
$$;

-- Función para insertar permisos por defecto para una empresa
CREATE OR REPLACE FUNCTION public.insertar_permisos_default_empresa(p_empresa_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recursos TEXT[] := ARRAY['branding', 'feedback', 'suscripciones', 'notificaciones', 'usuarios', 'facturas', 'dashboard', 'apps', 'clientes', 'bicicletas', 'ordenes', 'inventario', 'pagos', 'abonos', 'alertas'];
  acciones TEXT[] := ARRAY['ver', 'crear', 'editar', 'eliminar'];
  recurso TEXT;
  accion TEXT;
BEGIN
  -- Permisos para admin (acceso total)
  FOREACH recurso IN ARRAY recursos LOOP
    FOREACH accion IN ARRAY acciones LOOP
      INSERT INTO public.permisos_roles_empresa (empresa_id, rol, recurso, accion, permitido)
      VALUES (p_empresa_id, 'admin', recurso, accion, true)
      ON CONFLICT (empresa_id, rol, recurso, accion) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Permisos para manager (sin eliminar usuarios y suscripciones)
  FOREACH recurso IN ARRAY recursos LOOP
    FOREACH accion IN ARRAY acciones LOOP
      INSERT INTO public.permisos_roles_empresa (empresa_id, rol, recurso, accion, permitido)
      VALUES (p_empresa_id, 'manager', recurso, accion, 
        CASE 
          WHEN accion = 'eliminar' AND recurso IN ('usuarios', 'suscripciones') THEN false
          ELSE true
        END)
      ON CONFLICT (empresa_id, rol, recurso, accion) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Permisos para usuario (solo lectura en la mayoría)
  FOREACH recurso IN ARRAY recursos LOOP
    FOREACH accion IN ARRAY acciones LOOP
      INSERT INTO public.permisos_roles_empresa (empresa_id, rol, recurso, accion, permitido)
      VALUES (p_empresa_id, 'usuario', recurso, accion,
        CASE 
          -- Solo lectura en dashboard, notificaciones propias, feedback propio
          WHEN accion = 'ver' AND recurso IN ('dashboard', 'notificaciones', 'feedback', 'clientes', 'bicicletas', 'ordenes', 'facturas', 'pagos') THEN true
          -- Puede crear feedback y clientes/bicicletas/ordenes básicas
          WHEN accion = 'crear' AND recurso IN ('feedback', 'clientes', 'bicicletas', 'ordenes') THEN true
          -- Puede editar algunos recursos básicos
          WHEN accion = 'editar' AND recurso IN ('clientes', 'bicicletas', 'ordenes') THEN true
          ELSE false
        END)
      ON CONFLICT (empresa_id, rol, recurso, accion) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- Trigger para crear permisos por defecto al crear nueva empresa
CREATE OR REPLACE FUNCTION public.trigger_crear_permisos_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Crear permisos por defecto para la nueva empresa
  PERFORM public.insertar_permisos_default_empresa(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER crear_permisos_default_empresa
  AFTER INSERT ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_crear_permisos_empresa();

-- Trigger para actualizar updated_at
CREATE TRIGGER update_permisos_roles_empresa_updated_at
  BEFORE UPDATE ON public.permisos_roles_empresa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();