import { supabase } from "@/integrations/supabase/client";

// Función para generar una factura automáticamente cuando se finaliza una orden
export const generarFacturaAutomatica = async (ordenId: string) => {
  try {
    // Obtener datos de la orden y productos
    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_reparacion')
      .select(`
        *,
        clientes(*)
      `)
      .eq('id', ordenId)
      .single();

    if (ordenError) throw ordenError;

    // Obtener productos de la orden
    const { data: productos, error: productosError } = await supabase
      .from('orden_productos')
      .select('*')
      .eq('orden_id', ordenId);

    if (productosError) throw productosError;

    // Calcular total (costo estimado + productos)
    const totalProductos = productos?.reduce((sum, p) => sum + p.subtotal, 0) || 0;
    const costoEstimado = orden.costo_estimado || 0;
    const total = costoEstimado + totalProductos;

    // Crear factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert({
        id_orden: ordenId,
        id_cliente: orden.cliente_id,
        total: total,
        estado_pago: 'pendiente'
      })
      .select()
      .single();

    if (facturaError) throw facturaError;

    return factura;
  } catch (error) {
    console.error('Error generando factura automática:', error);
    throw error;
  }
};