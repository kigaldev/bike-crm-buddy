import { supabase } from "@/integrations/supabase/client";

// Actualizar la factura automática para incluir numeración Verifactu
export const generarFacturaAutomaticaVerifactu = async (ordenId: string) => {
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

    // Calcular totales
    const totalProductos = productos?.reduce((sum, p) => sum + p.subtotal, 0) || 0;
    const costoEstimado = orden.costo_estimado || 0;
    const totalSinIva = totalProductos + costoEstimado;
    
    // Calcular IVA (21%)
    const baseImponible = totalSinIva;
    const cuotaIva = Math.round(baseImponible * 0.21 * 100) / 100;
    const totalConIva = baseImponible + cuotaIva;

    // Crear factura - el trigger automáticamente generará número y hash
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
        cliente_nif: '', // Se puede agregar desde el cliente si está disponible
        // Los campos numero_factura, hash_actual, etc. se generan automáticamente
      })
      .select()
      .single();

    if (facturaError) throw facturaError;

    return factura;
  } catch (error) {
    console.error('Error generando factura Verifactu:', error);
    throw error;
  }
};

// Exportar JSON Verifactu
export const exportarJSONVerifactu = async (facturaId: string) => {
  try {
    const response = await fetch(
      `https://udbcfwtgniqbupgeodga.supabase.co/functions/v1/export-verifactu-json?facturaId=${facturaId}`
    );
    
    if (!response.ok) {
      throw new Error('Error al exportar JSON Verifactu');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `verifactu-${facturaId}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error exportando JSON:', error);
    throw error;
  }
};

// Validar integridad de hash en cadena
export const validarCadenaVerifactu = async (ejercicio: number) => {
  try {
    const { data: facturas, error } = await supabase
      .from('facturas')
      .select('id, numero_factura, hash_anterior, hash_actual, fecha_emision, total')
      .eq('ejercicio_fiscal', ejercicio)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const errores = [];
    
    for (let i = 0; i < facturas.length; i++) {
      const factura = facturas[i];
      const hashAnteriorEsperado = i > 0 ? facturas[i - 1].hash_actual : null;
      
      if (factura.hash_anterior !== hashAnteriorEsperado) {
        errores.push({
          numero_factura: factura.numero_factura,
          error: 'Hash anterior no coincide',
          esperado: hashAnteriorEsperado,
          actual: factura.hash_anterior
        });
      }
    }

    return {
      valida: errores.length === 0,
      errores,
      totalFacturas: facturas.length
    };
  } catch (error) {
    console.error('Error validando cadena Verifactu:', error);
    throw error;
  }
};

// Generar libro registro de facturas emitidas (CSV para AEAT)
export const generarLibroRegistroFacturas = async (ejercicio: number) => {
  try {
    const { data: facturas, error } = await supabase
      .from('facturas')
      .select(`
        *,
        clientes(nombre, apellidos)
      `)
      .eq('ejercicio_fiscal', ejercicio)
      .order('fecha_emision', { ascending: true });

    if (error) throw error;

    // Encabezados CSV según formato AEAT
    const headers = [
      'Número Factura',
      'Fecha Emisión',
      'Cliente',
      'NIF Cliente',
      'Base Imponible',
      'Tipo IVA',
      'Cuota IVA',
      'Total Factura',
      'Estado Pago',
      'Hash Verifactu'
    ].join(';');

    const rows = facturas.map(f => [
      f.numero_factura,
      f.fecha_emision,
      `${f.clientes?.nombre} ${f.clientes?.apellidos}`,
      f.cliente_nif || '',
      f.base_imponible?.toFixed(2) || '0.00',
      f.tipo_iva?.toFixed(2) || '21.00',
      f.cuota_iva?.toFixed(2) || '0.00',
      f.total?.toFixed(2) || '0.00',
      f.estado_pago,
      f.hash_actual || ''
    ].join(';'));

    const csv = [headers, ...rows].join('\n');

    // Descargar CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `libro-registro-facturas-${ejercicio}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return {
      success: true,
      totalFacturas: facturas.length,
      archivo: `libro-registro-facturas-${ejercicio}.csv`
    };
  } catch (error) {
    console.error('Error generando libro registro:', error);
    throw error;
  }
};