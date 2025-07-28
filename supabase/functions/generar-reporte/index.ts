import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReporteRequest {
  tipo: 'financiero' | 'operativo' | 'inventario' | 'clientes';
  fecha_inicio: string;
  fecha_fin: string;
  formato: 'pdf' | 'excel';
  filtros?: Record<string, any>;
}

const supabaseService = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tipo, fecha_inicio, fecha_fin, formato, filtros }: ReporteRequest = await req.json();

    console.log(`Generando reporte ${tipo} en formato ${formato} para período ${fecha_inicio} - ${fecha_fin}`);

    let datosReporte;

    switch (tipo) {
      case 'financiero':
        datosReporte = await generarReporteFinanciero(fecha_inicio, fecha_fin);
        break;
      case 'operativo':
        datosReporte = await generarReporteOperativo(fecha_inicio, fecha_fin);
        break;
      case 'inventario':
        datosReporte = await generarReporteInventario();
        break;
      case 'clientes':
        datosReporte = await generarReporteClientes(fecha_inicio, fecha_fin);
        break;
      default:
        throw new Error('Tipo de reporte no válido');
    }

    if (formato === 'pdf') {
      const pdfContent = await generarPDF(datosReporte, tipo, fecha_inicio, fecha_fin);
      return new Response(pdfContent, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="reporte-${tipo}-${fecha_inicio}-${fecha_fin}.pdf"`
        },
      });
    } else {
      const excelContent = await generarExcel(datosReporte, tipo);
      return new Response(excelContent, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="reporte-${tipo}-${fecha_inicio}-${fecha_fin}.xlsx"`
        },
      });
    }

  } catch (error) {
    console.error("Error generando reporte:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function generarReporteFinanciero(fechaInicio: string, fechaFin: string) {
  // Resumen financiero general
  const { data: resumen, error: resumenError } = await supabaseService
    .rpc('obtener_resumen_financiero', {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    });

  if (resumenError) throw resumenError;

  // Facturación mensual
  const anoActual = new Date(fechaInicio).getFullYear();
  const { data: facturacionMensual, error: facturacionError } = await supabaseService
    .rpc('obtener_facturacion_mensual', { p_ano: anoActual });

  if (facturacionError) throw facturacionError;

  // Análisis de métodos de pago
  const { data: metodosPago, error: metodosError } = await supabaseService
    .rpc('obtener_analisis_metodos_pago', {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    });

  if (metodosError) throw metodosError;

  return {
    resumen: resumen[0],
    facturacionMensual,
    metodosPago,
    periodo: { inicio: fechaInicio, fin: fechaFin }
  };
}

async function generarReporteOperativo(fechaInicio: string, fechaFin: string) {
  // Tiempo promedio de reparación
  const { data: tiempoReparacion, error: tiempoError } = await supabaseService
    .rpc('obtener_tiempo_promedio_reparacion', {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    });

  if (tiempoError) throw tiempoError;

  // Análisis de alertas
  const { data: analisisAlertas, error: alertasError } = await supabaseService
    .rpc('obtener_analisis_alertas', {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    });

  if (alertasError) throw alertasError;

  // Órdenes por estado
  const { data: ordenesPorEstado, error: ordenesError } = await supabaseService
    .from('ordenes_reparacion')
    .select('estado')
    .gte('fecha_entrada', fechaInicio)
    .lte('fecha_entrada', fechaFin);

  if (ordenesError) throw ordenesError;

  const estadisticasOrdenes = ordenesPorEstado.reduce((acc: any, orden: any) => {
    acc[orden.estado] = (acc[orden.estado] || 0) + 1;
    return acc;
  }, {});

  return {
    tiempoReparacion: tiempoReparacion[0],
    analisisAlertas: analisisAlertas[0],
    estadisticasOrdenes,
    periodo: { inicio: fechaInicio, fin: fechaFin }
  };
}

async function generarReporteInventario() {
  const { data: analisisInventario, error } = await supabaseService
    .rpc('obtener_analisis_inventario');

  if (error) throw error;

  // Productos con stock bajo
  const { data: stockBajo, error: stockError } = await supabaseService
    .from('productos_inventario')
    .select('nombre, cantidad_actual, cantidad_minima, categoria')
    .lte('cantidad_actual', supabaseService.raw('cantidad_minima'));

  if (stockError) throw stockError;

  return {
    analisis: analisisInventario[0],
    stockBajo,
    fechaGeneracion: new Date().toISOString()
  };
}

async function generarReporteClientes(fechaInicio: string, fechaFin: string) {
  const { data: topClientes, error } = await supabaseService
    .rpc('obtener_top_clientes', {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin,
      p_limite: 20
    });

  if (error) throw error;

  return {
    topClientes,
    periodo: { inicio: fechaInicio, fin: fechaFin }
  };
}

async function generarPDF(datos: any, tipo: string, fechaInicio: string, fechaFin: string) {
  // Generar HTML base para el PDF
  const html = generarHTMLReporte(datos, tipo, fechaInicio, fechaFin);
  
  // Simular generación de PDF (en producción usarías Puppeteer o similar)
  // Por ahora devolvemos el HTML como texto para demostración
  const encoder = new TextEncoder();
  return encoder.encode(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte ${tipo.toUpperCase()}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 25px; }
        .kpi { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `);
}

function generarHTMLReporte(datos: any, tipo: string, fechaInicio: string, fechaFin: string): string {
  const fechaGeneracion = new Date().toLocaleDateString('es-ES');
  
  switch (tipo) {
    case 'financiero':
      return `
        <div class="header">
          <h1>Reporte Financiero</h1>
          <p>Período: ${fechaInicio} - ${fechaFin}</p>
          <p>Generado el: ${fechaGeneracion}</p>
        </div>
        
        <div class="section">
          <h2>Resumen Financiero</h2>
          <div class="kpi">
            <h3>Total Facturado</h3>
            <p>€${datos.resumen?.total_facturado?.toFixed(2) || '0.00'}</p>
          </div>
          <div class="kpi">
            <h3>Total Cobrado</h3>
            <p>€${datos.resumen?.total_cobrado?.toFixed(2) || '0.00'}</p>
          </div>
          <div class="kpi">
            <h3>Pendiente de Cobro</h3>
            <p>€${datos.resumen?.total_pendiente?.toFixed(2) || '0.00'}</p>
          </div>
          <div class="kpi">
            <h3>Ticket Promedio</h3>
            <p>€${datos.resumen?.ticket_promedio?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
        
        <div class="section">
          <h2>Métodos de Pago</h2>
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th>Total</th>
                <th>N° Pagos</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              ${datos.metodosPago?.map((metodo: any) => `
                <tr>
                  <td>${metodo.metodo_pago}</td>
                  <td class="text-right">€${metodo.total_monto?.toFixed(2)}</td>
                  <td class="text-center">${metodo.numero_pagos}</td>
                  <td class="text-right">${metodo.porcentaje?.toFixed(1)}%</td>
                </tr>
              `).join('') || '<tr><td colspan="4">No hay datos disponibles</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
      
    case 'operativo':
      return `
        <div class="header">
          <h1>Reporte Operativo</h1>
          <p>Período: ${fechaInicio} - ${fechaFin}</p>
          <p>Generado el: ${fechaGeneracion}</p>
        </div>
        
        <div class="section">
          <h2>Tiempos de Reparación</h2>
          <div class="kpi">
            <h3>Tiempo Promedio</h3>
            <p>${datos.tiempoReparacion?.tiempo_promedio_dias?.toFixed(1) || '0'} días</p>
          </div>
          <div class="kpi">
            <h3>Órdenes Analizadas</h3>
            <p>${datos.tiempoReparacion?.ordenes_analizadas || 0}</p>
          </div>
        </div>
        
        <div class="section">
          <h2>Análisis de Alertas</h2>
          <div class="kpi">
            <h3>Total Alertas</h3>
            <p>${datos.analisisAlertas?.total_alertas || 0}</p>
          </div>
          <div class="kpi">
            <h3>Resueltas</h3>
            <p>${datos.analisisAlertas?.alertas_resueltas || 0}</p>
          </div>
          <div class="kpi">
            <h3>Ratio Resolución</h3>
            <p>${datos.analisisAlertas?.ratio_resolucion?.toFixed(1) || '0'}%</p>
          </div>
        </div>
      `;
      
    case 'inventario':
      return `
        <div class="header">
          <h1>Reporte de Inventario</h1>
          <p>Generado el: ${fechaGeneracion}</p>
        </div>
        
        <div class="section">
          <h2>Resumen de Inventario</h2>
          <div class="kpi">
            <h3>Total Productos</h3>
            <p>${datos.analisis?.total_productos || 0}</p>
          </div>
          <div class="kpi">
            <h3>Valor Total</h3>
            <p>€${datos.analisis?.valor_total_inventario?.toFixed(2) || '0.00'}</p>
          </div>
          <div class="kpi">
            <h3>Stock Bajo</h3>
            <p>${datos.analisis?.productos_stock_bajo || 0}</p>
          </div>
        </div>
        
        <div class="section">
          <h2>Productos con Stock Bajo</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock Actual</th>
                <th>Stock Mínimo</th>
                <th>Categoría</th>
              </tr>
            </thead>
            <tbody>
              ${datos.stockBajo?.map((producto: any) => `
                <tr>
                  <td>${producto.nombre}</td>
                  <td class="text-center">${producto.cantidad_actual}</td>
                  <td class="text-center">${producto.cantidad_minima}</td>
                  <td>${producto.categoria}</td>
                </tr>
              `).join('') || '<tr><td colspan="4">No hay productos con stock bajo</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
      
    default:
      return `<h1>Reporte no disponible</h1>`;
  }
}

async function generarExcel(datos: any, tipo: string) {
  // Simular generación de Excel
  // En producción usarías una biblioteca como ExcelJS
  const csvContent = convertirACSV(datos, tipo);
  const encoder = new TextEncoder();
  return encoder.encode(csvContent);
}

function convertirACSV(datos: any, tipo: string): string {
  // Generar contenido CSV básico
  let csv = `Reporte ${tipo.toUpperCase()}\n`;
  csv += `Generado el: ${new Date().toLocaleDateString('es-ES')}\n\n`;
  
  if (tipo === 'financiero' && datos.resumen) {
    csv += "Resumen Financiero\n";
    csv += "Concepto,Valor\n";
    csv += `Total Facturado,€${datos.resumen.total_facturado}\n`;
    csv += `Total Cobrado,€${datos.resumen.total_cobrado}\n`;
    csv += `Total Pendiente,€${datos.resumen.total_pendiente}\n`;
    csv += `Ticket Promedio,€${datos.resumen.ticket_promedio}\n\n`;
    
    if (datos.metodosPago?.length > 0) {
      csv += "Métodos de Pago\n";
      csv += "Método,Total,Número Pagos,Porcentaje\n";
      datos.metodosPago.forEach((metodo: any) => {
        csv += `${metodo.metodo_pago},€${metodo.total_monto},${metodo.numero_pagos},${metodo.porcentaje}%\n`;
      });
    }
  }
  
  return csv;
}