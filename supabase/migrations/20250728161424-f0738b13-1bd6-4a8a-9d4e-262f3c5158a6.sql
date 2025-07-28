-- Crear funciones SQL optimizadas para reportes

-- Función para obtener resumen financiero por período
CREATE OR REPLACE FUNCTION public.obtener_resumen_financiero(
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS TABLE(
  total_facturado NUMERIC,
  total_cobrado NUMERIC,
  total_abonos NUMERIC,
  total_pendiente NUMERIC,
  numero_ordenes INTEGER,
  numero_facturas INTEGER,
  numero_clientes INTEGER,
  ticket_promedio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(f.total), 0) as total_facturado,
    COALESCE((SELECT SUM(p.monto) FROM public.pagos p WHERE p.fecha_pago BETWEEN p_fecha_inicio AND p_fecha_fin), 0) as total_cobrado,
    COALESCE((SELECT SUM(a.monto) FROM public.abonos a WHERE a.fecha_abono BETWEEN p_fecha_inicio AND p_fecha_fin), 0) as total_abonos,
    COALESCE(SUM(CASE WHEN f.estado_pago IN ('pendiente', 'parcial') THEN f.total ELSE 0 END), 0) as total_pendiente,
    COUNT(DISTINCT o.id)::INTEGER as numero_ordenes,
    COUNT(DISTINCT f.id)::INTEGER as numero_facturas,
    COUNT(DISTINCT f.id_cliente)::INTEGER as numero_clientes,
    CASE 
      WHEN COUNT(DISTINCT f.id) > 0 THEN COALESCE(SUM(f.total), 0) / COUNT(DISTINCT f.id)
      ELSE 0 
    END as ticket_promedio
  FROM public.facturas f
  LEFT JOIN public.ordenes_reparacion o ON f.id_orden = o.id
  WHERE f.fecha_emision BETWEEN p_fecha_inicio AND p_fecha_fin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener facturación mensual agregada
CREATE OR REPLACE FUNCTION public.obtener_facturacion_mensual(
  p_ano INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS TABLE(
  mes INTEGER,
  mes_nombre TEXT,
  total_facturado NUMERIC,
  total_cobrado NUMERIC,
  numero_facturas INTEGER,
  numero_ordenes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(MONTH FROM f.fecha_emision)::INTEGER as mes,
    CASE EXTRACT(MONTH FROM f.fecha_emision)
      WHEN 1 THEN 'Enero'
      WHEN 2 THEN 'Febrero'
      WHEN 3 THEN 'Marzo'
      WHEN 4 THEN 'Abril'
      WHEN 5 THEN 'Mayo'
      WHEN 6 THEN 'Junio'
      WHEN 7 THEN 'Julio'
      WHEN 8 THEN 'Agosto'
      WHEN 9 THEN 'Septiembre'
      WHEN 10 THEN 'Octubre'
      WHEN 11 THEN 'Noviembre'
      WHEN 12 THEN 'Diciembre'
    END as mes_nombre,
    COALESCE(SUM(f.total), 0) as total_facturado,
    COALESCE(SUM(CASE WHEN f.estado_pago = 'pagado' THEN f.total ELSE 0 END), 0) as total_cobrado,
    COUNT(f.id)::INTEGER as numero_facturas,
    COUNT(DISTINCT f.id_orden)::INTEGER as numero_ordenes
  FROM public.facturas f
  WHERE EXTRACT(YEAR FROM f.fecha_emision) = p_ano
  GROUP BY EXTRACT(MONTH FROM f.fecha_emision)
  ORDER BY mes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener top clientes por facturación
CREATE OR REPLACE FUNCTION public.obtener_top_clientes(
  p_fecha_inicio DATE,
  p_fecha_fin DATE,
  p_limite INTEGER DEFAULT 10
)
RETURNS TABLE(
  cliente_id UUID,
  nombre_completo TEXT,
  total_facturado NUMERIC,
  total_pagado NUMERIC,
  numero_ordenes INTEGER,
  numero_facturas INTEGER,
  ultima_factura DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as cliente_id,
    CONCAT(c.nombre, ' ', c.apellidos) as nombre_completo,
    COALESCE(SUM(f.total), 0) as total_facturado,
    COALESCE(SUM(CASE WHEN f.estado_pago = 'pagado' THEN f.total ELSE 0 END), 0) as total_pagado,
    COUNT(DISTINCT f.id_orden)::INTEGER as numero_ordenes,
    COUNT(f.id)::INTEGER as numero_facturas,
    MAX(f.fecha_emision) as ultima_factura
  FROM public.clientes c
  LEFT JOIN public.facturas f ON c.id = f.id_cliente 
    AND f.fecha_emision BETWEEN p_fecha_inicio AND p_fecha_fin
  GROUP BY c.id, c.nombre, c.apellidos
  HAVING COALESCE(SUM(f.total), 0) > 0
  ORDER BY total_facturado DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener análisis de métodos de pago
CREATE OR REPLACE FUNCTION public.obtener_analisis_metodos_pago(
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS TABLE(
  metodo_pago TEXT,
  total_monto NUMERIC,
  numero_pagos INTEGER,
  porcentaje NUMERIC
) AS $$
DECLARE
  total_general NUMERIC;
BEGIN
  -- Calcular total general
  SELECT COALESCE(SUM(monto), 0) INTO total_general 
  FROM public.pagos 
  WHERE fecha_pago BETWEEN p_fecha_inicio AND p_fecha_fin;
  
  RETURN QUERY
  SELECT 
    p.metodo_pago,
    COALESCE(SUM(p.monto), 0) as total_monto,
    COUNT(p.id)::INTEGER as numero_pagos,
    CASE 
      WHEN total_general > 0 THEN (COALESCE(SUM(p.monto), 0) / total_general) * 100
      ELSE 0 
    END as porcentaje
  FROM public.pagos p
  WHERE p.fecha_pago BETWEEN p_fecha_inicio AND p_fecha_fin
  GROUP BY p.metodo_pago
  ORDER BY total_monto DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener análisis de inventario
CREATE OR REPLACE FUNCTION public.obtener_analisis_inventario()
RETURNS TABLE(
  total_productos INTEGER,
  valor_total_inventario NUMERIC,
  productos_stock_bajo INTEGER,
  productos_sin_stock INTEGER,
  categoria_mayor_valor TEXT,
  producto_mayor_rotacion TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_productos,
    COALESCE(SUM(pi.cantidad_actual * pi.costo_unitario), 0) as valor_total_inventario,
    COUNT(CASE WHEN pi.cantidad_actual <= pi.cantidad_minima THEN 1 END)::INTEGER as productos_stock_bajo,
    COUNT(CASE WHEN pi.cantidad_actual = 0 THEN 1 END)::INTEGER as productos_sin_stock,
    (SELECT pi2.categoria::TEXT 
     FROM public.productos_inventario pi2 
     GROUP BY pi2.categoria 
     ORDER BY SUM(pi2.cantidad_actual * pi2.costo_unitario) DESC 
     LIMIT 1) as categoria_mayor_valor,
    (SELECT pi3.nombre 
     FROM public.productos_inventario pi3
     LEFT JOIN public.orden_productos op ON pi3.id = op.producto_inventario_id
     GROUP BY pi3.id, pi3.nombre
     ORDER BY COUNT(op.id) DESC
     LIMIT 1) as producto_mayor_rotacion
  FROM public.productos_inventario pi;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener análisis de alertas
CREATE OR REPLACE FUNCTION public.obtener_analisis_alertas(
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS TABLE(
  total_alertas INTEGER,
  alertas_resueltas INTEGER,
  alertas_pendientes INTEGER,
  alertas_criticas INTEGER,
  ratio_resolucion NUMERIC,
  tipo_mas_frecuente TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_alertas,
    COUNT(CASE WHEN a.estado = 'resuelta' THEN 1 END)::INTEGER as alertas_resueltas,
    COUNT(CASE WHEN a.estado = 'pendiente' THEN 1 END)::INTEGER as alertas_pendientes,
    COUNT(CASE WHEN a.prioridad = 'critica' THEN 1 END)::INTEGER as alertas_criticas,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN a.estado = 'resuelta' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
      ELSE 0 
    END as ratio_resolucion,
    (SELECT a2.tipo 
     FROM public.alertas a2 
     WHERE a2.created_at BETWEEN p_fecha_inicio AND (p_fecha_fin + INTERVAL '1 day')
     GROUP BY a2.tipo 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as tipo_mas_frecuente
  FROM public.alertas a
  WHERE a.created_at BETWEEN p_fecha_inicio AND (p_fecha_fin + INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener tiempo promedio de reparación
CREATE OR REPLACE FUNCTION public.obtener_tiempo_promedio_reparacion(
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS TABLE(
  tiempo_promedio_dias NUMERIC,
  ordenes_analizadas INTEGER,
  tiempo_minimo_dias INTEGER,
  tiempo_maximo_dias INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(EXTRACT(DAY FROM (f.fecha_emision - o.fecha_entrada))), 0) as tiempo_promedio_dias,
    COUNT(o.id)::INTEGER as ordenes_analizadas,
    COALESCE(MIN(EXTRACT(DAY FROM (f.fecha_emision - o.fecha_entrada)))::INTEGER, 0) as tiempo_minimo_dias,
    COALESCE(MAX(EXTRACT(DAY FROM (f.fecha_emision - o.fecha_entrada)))::INTEGER, 0) as tiempo_maximo_dias
  FROM public.ordenes_reparacion o
  JOIN public.facturas f ON o.id = f.id_orden
  WHERE o.fecha_entrada BETWEEN p_fecha_inicio AND p_fecha_fin
    AND o.estado = 'Entregado'
    AND f.fecha_emision IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;