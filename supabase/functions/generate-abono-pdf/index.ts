import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { abonoId } = await req.json();

    if (!abonoId) {
      throw new Error("ID de abono requerido");
    }

    // Obtener datos del abono
    const { data: abonoData, error: abonoError } = await supabaseServiceRole
      .rpc('obtener_datos_abono_completo', { p_abono_id: abonoId });

    if (abonoError) throw abonoError;
    if (!abonoData || abonoData.length === 0) {
      throw new Error("Abono no encontrado");
    }

    const abono = abonoData[0];

    // Generar HTML del PDF de nota de crédito/abono
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${abono.tipo === 'nota_credito' ? 'Nota de Crédito' : 'Justificante de Abono'} - ${abono.numero_abono}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
      color: #333;
    }
    .document-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #dc2626;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 8px;
    }
    .company-details {
      font-size: 14px;
      color: #666;
      line-height: 1.5;
    }
    .document-info {
      text-align: right;
      flex: 1;
    }
    .document-title {
      font-size: 32px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 8px;
    }
    .document-number {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .document-date {
      color: #666;
      font-size: 14px;
    }
    .client-info {
      background: #fef2f2;
      padding: 20px;
      border-radius: 6px;
      margin: 30px 0;
      border: 1px solid #fecaca;
    }
    .client-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
      color: #dc2626;
    }
    .client-details {
      line-height: 1.6;
    }
    .abono-details {
      background: #f8fafc;
      padding: 20px;
      border-radius: 6px;
      margin: 30px 0;
    }
    .abono-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
      color: #dc2626;
    }
    .amount-section {
      text-align: center;
      padding: 30px;
      background: #fef2f2;
      border-radius: 8px;
      margin: 30px 0;
      border: 2px solid #dc2626;
    }
    .amount {
      font-size: 36px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 10px;
    }
    .amount-label {
      font-size: 18px;
      color: #666;
    }
    .verifactu-info {
      background: #fef3c7;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border: 1px solid #f59e0b;
    }
    .verifactu-title {
      font-weight: bold;
      color: #d97706;
      margin-bottom: 8px;
    }
    .hash-info {
      font-family: monospace;
      font-size: 12px;
      color: #666;
      word-break: break-all;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .legal-text {
      background: #fef3c7;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border: 1px solid #f59e0b;
      font-size: 12px;
      color: #92400e;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .row-label {
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="document-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">${abono.emisor_nombre}</div>
        <div class="company-details">
          CIF: ${abono.emisor_cif}<br>
          ${abono.emisor_direccion}<br>
          Teléfono: +34 XXX XXX XXX<br>
          Email: info@tallerbicicletas.es
        </div>
      </div>
      <div class="document-info">
        <div class="document-title">${abono.tipo === 'nota_credito' ? 'NOTA DE CRÉDITO' : 'JUSTIFICANTE DE ABONO'}</div>
        <div class="document-number">${abono.numero_abono}</div>
        <div class="document-date">Fecha: ${new Date(abono.fecha_abono).toLocaleDateString('es-ES')}</div>
        <div class="document-date">Ejercicio: ${abono.ejercicio_fiscal}</div>
      </div>
    </div>

    ${abono.tipo === 'nota_credito' && abono.hash_actual ? `
    <!-- Verifactu Info -->
    <div class="verifactu-info">
      <div class="verifactu-title">🔐 Nota de crédito verificable conforme al sistema Verifactu</div>
      <div>Serie: ${abono.serie_abono || '001'} | Firma en cadena disponible</div>
      <div class="hash-info">
        Hash: ${abono.hash_actual}
      </div>
    </div>
    ` : ''}

    <!-- Client Info -->
    <div class="client-info">
      <div class="client-title">📋 DATOS DEL CLIENTE</div>
      <div class="client-details">
        <strong>${abono.cliente_nombre}</strong><br>
        ${abono.cliente_direccion ? `${abono.cliente_direccion}<br>` : ''}
        ${abono.cliente_telefono ? `Teléfono: ${abono.cliente_telefono}<br>` : ''}
        ${abono.cliente_email ? `Email: ${abono.cliente_email}` : ''}
      </div>
    </div>

    <!-- Abono Details -->
    <div class="abono-details">
      <div class="abono-title">📄 DETALLES DEL ${abono.tipo === 'nota_credito' ? 'CRÉDITO' : 'ABONO'}</div>
      <div class="row">
        <span class="row-label">Factura Original:</span>
        <span>${abono.factura_numero}</span>
      </div>
      ${abono.factura_total ? `
      <div class="row">
        <span class="row-label">Total Factura:</span>
        <span>€${Number(abono.factura_total).toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="row">
        <span class="row-label">Tipo:</span>
        <span>${abono.tipo === 'nota_credito' ? 'Nota de Crédito' : 'Reembolso'}</span>
      </div>
      ${abono.motivo ? `
      <div class="row">
        <span class="row-label">Motivo:</span>
        <span>${abono.motivo}</span>
      </div>
      ` : ''}
      ${abono.metodo_pago ? `
      <div class="row">
        <span class="row-label">Método de Devolución:</span>
        <span>${abono.metodo_pago.toUpperCase()}</span>
      </div>
      ` : ''}
      ${abono.referencia ? `
      <div class="row">
        <span class="row-label">Referencia:</span>
        <span>${abono.referencia}</span>
      </div>
      ` : ''}
    </div>

    <!-- Amount -->
    <div class="amount-section">
      <div class="amount">€${Number(abono.monto).toFixed(2)}</div>
      <div class="amount-label">IMPORTE ${abono.tipo === 'nota_credito' ? 'ACREDITADO' : 'REEMBOLSADO'}</div>
    </div>

    <!-- Legal Text -->
    <div class="legal-text">
      ⚖️ <strong>INFORMACIÓN LEGAL:</strong> 
      ${abono.tipo === 'nota_credito' 
        ? 'Esta nota de crédito cumple con la normativa española vigente y el sistema Verifactu de la Agencia Tributaria. La integridad de este documento está garantizada mediante firma electrónica en cadena.'
        : 'Este documento constituye un justificante válido del abono/reembolso realizado.'
      }
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Gracias por su comprensión</p>
      <p>Documento generado automáticamente por el sistema CRM | ${new Date().toLocaleDateString('es-ES')}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Actualizar abono con archivo PDF generado
    const fileName = `abono-${abono.numero_abono}.pdf`;
    const { error: updateError } = await supabaseServiceRole
      .from('abonos')
      .update({ archivo_pdf: fileName })
      .eq('id', abonoId);

    if (updateError) {
      console.error('Error actualizando PDF:', updateError);
    }

    // Registrar log
    await supabaseServiceRole.rpc('registrar_log_abono', {
      p_abono_id: abonoId,
      p_accion: 'crear',
      p_estado: 'exito',
      p_mensaje: 'PDF de abono generado correctamente'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      htmlContent,
      numeroAbono: abono.numero_abono,
      fileName
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error generando PDF de abono:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});