-- Create enum for action types
CREATE TYPE public.tipo_accion AS ENUM (
  'CREAR_CLIENTE',
  'ACTUALIZAR_CLIENTE', 
  'ELIMINAR_CLIENTE',
  'CREAR_BICICLETA',
  'ACTUALIZAR_BICICLETA',
  'ELIMINAR_BICICLETA',
  'CREAR_ORDEN',
  'ACTUALIZAR_ORDEN',
  'ELIMINAR_ORDEN',
  'CREAR_FACTURA',
  'ACTUALIZAR_FACTURA',
  'ELIMINAR_FACTURA',
  'CREAR_PRODUCTO',
  'ACTUALIZAR_PRODUCTO',
  'ELIMINAR_PRODUCTO',
  'LOGIN',
  'LOGOUT'
);

-- Create enum for entity types
CREATE TYPE public.entidad_tipo AS ENUM (
  'cliente',
  'bicicleta', 
  'orden',
  'factura',
  'producto',
  'sistema'
);

-- Create logs table
CREATE TABLE public.logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_email TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo_accion tipo_accion NOT NULL,
  entidad_afectada entidad_tipo NOT NULL,
  id_entidad UUID,
  descripcion TEXT NOT NULL,
  detalles_adicionales JSONB,
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Create policies for logs (only admins and auditors can view)
CREATE POLICY "Allow admin and auditor to view logs" 
ON public.logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'auditor')
  )
);

-- Create policy for inserting logs (all authenticated users can create logs)
CREATE POLICY "Allow authenticated users to insert logs" 
ON public.logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_logs_usuario_email ON public.logs(usuario_email);
CREATE INDEX idx_logs_tipo_accion ON public.logs(tipo_accion);
CREATE INDEX idx_logs_entidad_afectada ON public.logs(entidad_afectada);
CREATE INDEX idx_logs_id_entidad ON public.logs(id_entidad);
CREATE INDEX idx_logs_fecha_hora ON public.logs(fecha_hora DESC);

-- Create function to register logs
CREATE OR REPLACE FUNCTION public.registrar_log(
  p_tipo_accion tipo_accion,
  p_entidad_afectada entidad_tipo,
  p_id_entidad UUID,
  p_descripcion TEXT,
  p_detalles_adicionales JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_usuario_email TEXT;
  v_log_id UUID;
BEGIN
  -- Get current user email
  SELECT email INTO v_usuario_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- If no authenticated user, use 'sistema'
  IF v_usuario_email IS NULL THEN
    v_usuario_email := 'sistema';
  END IF;

  -- Insert log entry
  INSERT INTO public.logs (
    usuario_email,
    usuario_id,
    tipo_accion,
    entidad_afectada,
    id_entidad,
    descripcion,
    detalles_adicionales
  ) VALUES (
    v_usuario_email,
    auth.uid(),
    p_tipo_accion,
    p_entidad_afectada,
    p_id_entidad,
    p_descripcion,
    p_detalles_adicionales
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;