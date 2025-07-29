-- Crear tabla feedback_saas
CREATE TABLE public.feedback_saas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('sugerencia', 'bug', 'mejora', 'otro')),
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  app_relacionada TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_revision', 'aceptado', 'rechazado', 'implementado')),
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
  respuesta_admin TEXT,
  resuelto_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.feedback_saas ENABLE ROW LEVEL SECURITY;

-- Índices para rendimiento
CREATE INDEX idx_feedback_empresa_id ON public.feedback_saas(empresa_id);
CREATE INDEX idx_feedback_user_id ON public.feedback_saas(user_id);
CREATE INDEX idx_feedback_estado ON public.feedback_saas(estado);
CREATE INDEX idx_feedback_tipo ON public.feedback_saas(tipo);
CREATE INDEX idx_feedback_app_relacionada ON public.feedback_saas(app_relacionada);

-- Políticas RLS
-- Los usuarios pueden ver su propio feedback
CREATE POLICY "Usuarios ven su propio feedback" 
ON public.feedback_saas 
FOR SELECT 
USING (user_id = auth.uid());

-- Los usuarios pueden crear su propio feedback
CREATE POLICY "Usuarios pueden crear feedback" 
ON public.feedback_saas 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND empresa_id IN (
    SELECT empresa_id FROM usuarios_empresas 
    WHERE user_id = auth.uid() AND activo = true
  )
);

-- Los usuarios pueden actualizar su propio feedback (solo algunos campos)
CREATE POLICY "Usuarios pueden actualizar su feedback" 
ON public.feedback_saas 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND empresa_id = (SELECT empresa_id FROM public.feedback_saas WHERE id = NEW.id)
  AND user_id = (SELECT user_id FROM public.feedback_saas WHERE id = NEW.id)
);

-- Admins de empresa pueden ver todo el feedback de su empresa
CREATE POLICY "Admins ven feedback de su empresa" 
ON public.feedback_saas 
FOR ALL
USING (
  empresa_id IN (
    SELECT empresa_id FROM usuarios_empresas 
    WHERE user_id = auth.uid() 
    AND rol IN ('admin', 'manager') 
    AND activo = true
  )
);

-- Función para actualizar updated_at automáticamente
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback_saas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para obtener estadísticas de feedback por empresa
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_feedback_empresa(p_empresa_id UUID)
RETURNS TABLE(
  total_feedback INTEGER,
  por_estado JSONB,
  por_tipo JSONB,
  por_app JSONB,
  feedback_reciente INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_feedback,
    jsonb_object_agg(estado, count_estado) as por_estado,
    jsonb_object_agg(tipo, count_tipo) as por_tipo,
    jsonb_object_agg(COALESCE(app_relacionada, 'General'), count_app) as por_app,
    COUNT(CASE WHEN created_at >= now() - INTERVAL '30 days' THEN 1 END)::INTEGER as feedback_reciente
  FROM (
    SELECT 
      estado,
      tipo,
      app_relacionada,
      created_at,
      COUNT(*) OVER (PARTITION BY estado) as count_estado,
      COUNT(*) OVER (PARTITION BY tipo) as count_tipo,
      COUNT(*) OVER (PARTITION BY COALESCE(app_relacionada, 'General')) as count_app
    FROM public.feedback_saas 
    WHERE empresa_id = p_empresa_id
  ) stats;
END;
$$;

-- Función para obtener feedback por app
CREATE OR REPLACE FUNCTION public.obtener_feedback_por_app(p_empresa_id UUID, p_app_codigo TEXT)
RETURNS TABLE(
  total INTEGER,
  pendientes INTEGER,
  implementados INTEGER,
  ultimo_feedback TIMESTAMP WITH TIME ZONE,
  feedback_reciente JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total,
    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END)::INTEGER as pendientes,
    COUNT(CASE WHEN estado = 'implementado' THEN 1 END)::INTEGER as implementados,
    MAX(created_at) as ultimo_feedback,
    jsonb_agg(
      jsonb_build_object(
        'titulo', titulo,
        'tipo', tipo,
        'estado', estado,
        'created_at', created_at
      ) ORDER BY created_at DESC
    ) FILTER (WHERE created_at >= now() - INTERVAL '30 days') as feedback_reciente
  FROM public.feedback_saas 
  WHERE empresa_id = p_empresa_id 
  AND (app_relacionada = p_app_codigo OR (p_app_codigo IS NULL AND app_relacionada IS NULL));
END;
$$;