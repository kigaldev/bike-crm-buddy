import { supabase } from "@/integrations/supabase/client";

// Función para generar una factura automáticamente cuando se finaliza una orden (actualizada para Verifactu)
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

    // Calcular totales con IVA para Verifactu
    const totalProductos = productos?.reduce((sum, p) => sum + p.subtotal, 0) || 0;
    const costoEstimado = orden.costo_estimado || 0;
    const totalSinIva = costoEstimado + totalProductos;
    
    // Calcular IVA (21%)
    const baseImponible = totalSinIva;
    const cuotaIva = Math.round(baseImponible * 0.21 * 100) / 100;
    const totalConIva = baseImponible + cuotaIva;

    // Crear factura Verifactu - el trigger automáticamente genera número y hash
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert({
        id_orden: ordenId,
        id_cliente: orden.cliente_id,
        total: totalConIva,
        base_imponible: baseImponible,
        cuota_iva: cuotaIva,
        tipo_iva: 21.00,
        estado_pago: 'pendiente',
        // Los campos numero_factura, hash_actual, etc. se generan automáticamente por el trigger
      })
      .select()
      .single();

    if (facturaError) throw facturaError;

    // Enviar notificaciones automáticamente después de generar la factura
    try {
      await supabase.functions.invoke('send-invoice-notifications', {
        body: { facturaId: factura.id, tipo: 'both' }
      });
    } catch (notificationError) {
      console.error('Error enviando notificaciones automáticas:', notificationError);
      // No lanzar error, la factura ya está creada
    }

    // Para empresas (con datos fiscales), generar automáticamente XML Facturae
    // Esto se puede activar manualmente desde el panel de facturas
    console.log('Factura creada correctamente. XML Facturae disponible en el panel.');

    return factura;
  } catch (error) {
    console.error('Error generando factura automática:', error);
    throw error;
  }
};