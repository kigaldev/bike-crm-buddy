import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para logging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-SAAS-INVOICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando generación de factura SaaS");

    const { facturaId } = await req.json();
    if (!facturaId) {
      throw new Error("facturaId es requerido");
    }

    // Usar service role para acceso completo
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Obteniendo datos de la factura", { facturaId });

    // Obtener datos completos de la factura
    const { data: facturaData, error: facturaError } = await supabaseService
      .rpc('obtener_datos_factura_saas', { p_factura_id: facturaId });

    if (facturaError || !facturaData || facturaData.length === 0) {
      throw new Error(`Error obteniendo datos de factura: ${facturaError?.message || 'No encontrada'}`);
    }

    const factura = facturaData[0];
    logStep("Datos de factura obtenidos", factura);

    // Generar contenido HTML de la factura
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Factura ${factura.numero_factura}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #007acc; }
            .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company-info, .invoice-details { width: 45%; }
            .company-info h3, .invoice-details h3 { color: #007acc; margin-bottom: 10px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            .table th { background-color: #f8f9fa; font-weight: bold; }
            .totals { margin-top: 30px; }
            .totals table { width: 40%; margin-left: auto; }
            .total-row { font-weight: bold; font-size: 18px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">BICIFLIX SAAS</div>
            <p>Plataforma de Gestión Empresarial</p>
        </div>

        <div class="invoice-info">
            <div class="company-info">
                <h3>Datos del Cliente</h3>
                <p><strong>${factura.empresa_nombre}</strong></p>
                <p>CIF: ${factura.empresa_cif}</p>
                <p>Email: ${factura.empresa_email}</p>
                ${factura.empresa_direccion ? `<p>${factura.empresa_direccion}</p>` : ''}
            </div>
            <div class="invoice-details">
                <h3>Datos de la Factura</h3>
                <p><strong>Número:</strong> ${factura.numero_factura}</p>
                <p><strong>Fecha:</strong> ${new Date(factura.fecha_factura).toLocaleDateString('es-ES')}</p>
                <p><strong>Período:</strong> ${new Date(factura.periodo_inicio).toLocaleDateString('es-ES')} - ${new Date(factura.periodo_fin).toLocaleDateString('es-ES')}</p>
            </div>
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th>Módulo</th>
                    <th>Período</th>
                    <th>Base Imponible</th>
                    <th>IVA</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${factura.concepto}</td>
                    <td>${factura.app_nombre}</td>
                    <td>${new Date(factura.periodo_inicio).toLocaleDateString('es-ES')} - ${new Date(factura.periodo_fin).toLocaleDateString('es-ES')}</td>
                    <td>€${Number(factura.importe_sin_iva).toFixed(2)}</td>
                    <td>€${Number(factura.importe_iva).toFixed(2)}</td>
                    <td>€${Number(factura.importe_total).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div class="totals">
            <table class="table">
                <tr>
                    <td>Base Imponible:</td>
                    <td>€${Number(factura.importe_sin_iva).toFixed(2)}</td>
                </tr>
                <tr>
                    <td>IVA (21%):</td>
                    <td>€${Number(factura.importe_iva).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>TOTAL:</strong></td>
                    <td><strong>€${Number(factura.importe_total).toFixed(2)}</strong></td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>Esta factura ha sido generada automáticamente por el sistema Biciflix SaaS</p>
            <p>Gracias por confiar en nuestros servicios</p>
        </div>
    </body>
    </html>
    `;

    logStep("HTML generado, convirtiendo a PDF");

    // Convertir HTML a PDF (usando una API externa o biblioteca)
    // Por ahora usaremos el HTML como PDF simulado
    const pdfContent = new TextEncoder().encode(htmlContent);
    
    // Subir PDF a Storage
    const fileName = `facturas-saas/${factura.numero_factura}.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabaseService.storage
      .from('invoices')
      .upload(fileName, pdfContent, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Error subiendo PDF: ${uploadError.message}`);
    }

    logStep("PDF subido al storage", uploadData);

    // Actualizar la factura con la URL del PDF
    const { error: updateError } = await supabaseService
      .from('facturas_saas')
      .update({
        archivo_pdf: fileName,
        estado: 'generada'
      })
      .eq('id', facturaId);

    if (updateError) {
      throw new Error(`Error actualizando factura: ${updateError.message}`);
    }

    logStep("Factura actualizada con URL del PDF");

    return new Response(JSON.stringify({
      success: true,
      archivo_pdf: fileName,
      numero_factura: factura.numero_factura
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});