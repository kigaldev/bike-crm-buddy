-- Crear tabla notificaciones_saas
CREATE TABLE public.notificaciones_saas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('sistema', 'feedback', 'suscripcion', 'seguridad', 'otro')),
  visto BOOLEAN NOT NULL DEFAULT false,
  enviado_email BOOLEAN NOT NULL DEFAULT false,
  url_redireccion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificaciones_saas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "usuarios_ven_sus_notificaciones" 
ON public.notificaciones_saas 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "usuarios_pueden_actualizar_sus_notificaciones" 
ON public.notificaciones_saas 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "solo_sistema_puede_insertar_notificaciones" 
ON public.notificaciones_saas 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    WHERE ue.user_id = notificaciones_saas.user_id 
    AND ue.empresa_id = notificaciones_saas.empresa_id
    AND ue.activo = true
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_notificaciones_saas_updated_at
BEFORE UPDATE ON public.notificaciones_saas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para marcar notificación como vista
CREATE OR REPLACE FUNCTION public.marcar_notificacion_vista(p_notificacion_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.notificaciones_saas 
  SET visto = true, updated_at = now()
  WHERE id = p_notificacion_id 
  AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$function$;

-- Función para obtener estadísticas de notificaciones
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_notificaciones(p_empresa_id UUID)
RETURNS TABLE(
  total_notificaciones INTEGER,
  notificaciones_vistas INTEGER,
  notificaciones_no_vistas INTEGER,
  por_tipo JSONB,
  recientes_7_dias INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_notificaciones,
    COUNT(CASE WHEN visto = true THEN 1 END)::INTEGER as notificaciones_vistas,
    COUNT(CASE WHEN visto = false THEN 1 END)::INTEGER as notificaciones_no_vistas,
    jsonb_object_agg(tipo, COUNT(*)) as por_tipo,
    COUNT(CASE WHEN created_at >= now() - INTERVAL '7 days' THEN 1 END)::INTEGER as recientes_7_dias
  FROM public.notificaciones_saas n
  WHERE n.empresa_id = p_empresa_id
  AND n.user_id = auth.uid();
END;
$function$;