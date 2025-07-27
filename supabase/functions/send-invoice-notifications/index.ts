import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuración del taller
const TALLER_CONFIG = {
  nombre: "Tu Taller de Bicicletas",
  email: "info@tallerbicicletas.es",
  telefono: "+34 XXX XXX XXX",
  sitio_web: "https://tallerbicicletas.es"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { facturaId, tipo } = await req.json(); // tipo: 'email', 'whatsapp', 'both'

    if (!facturaId) {
      return new Response(
        JSON.stringify({ error: 'facturaId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener datos de la factura
    const { data: facturaData, error: facturaError } = await supabase
      .rpc('obtener_datos_factura_notificacion', { p_factura_id: facturaId });

    if (facturaError || !facturaData || facturaData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Factura no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const factura = facturaData[0];
    const resultados = { email: null, whatsapp: null, errores: [] };

    // Generar PDF si no existe
    if (!factura.archivo_pdf) {
      console.log('Generando PDF primero...');
      const { error: pdfError } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { facturaId }
      });
      
      if (pdfError) {
        console.error('Error generando PDF:', pdfError);
        resultados.errores.push('Error generando PDF: ' + pdfError.message);
      }
    }

    // Envío por Email
    if ((tipo === 'email' || tipo === 'both') && factura.cliente_email) {
      try {
        const emailResult = await enviarEmail(factura, facturaId, supabase);
        resultados.email = emailResult;
      } catch (error) {
        console.error('Error enviando email:', error);
        resultados.errores.push('Email: ' + error.message);
        
        // Registrar error
        await supabase.rpc('registrar_notificacion', {
          p_factura_id: facturaId,
          p_tipo: 'email',
          p_destinatario: factura.cliente_email,
          p_estado: 'error',
          p_error: error.message
        });
      }
    }

    // Envío por WhatsApp (simulado en desarrollo)
    if ((tipo === 'whatsapp' || tipo === 'both') && factura.cliente_telefono) {
      try {
        const whatsappResult = await enviarWhatsApp(factura, facturaId, supabase);
        resultados.whatsapp = whatsappResult;
      } catch (error) {
        console.error('Error enviando WhatsApp:', error);
        resultados.errores.push('WhatsApp: ' + error.message);
        
        // Registrar error
        await supabase.rpc('registrar_notificacion', {
          p_factura_id: facturaId,
          p_tipo: 'whatsapp',
          p_destinatario: factura.cliente_telefono,
          p_estado: 'error',
          p_error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      facturaId,
      resultados,
      mensaje: 'Notificaciones procesadas'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-invoice-notifications:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function enviarEmail(factura: any, facturaId: string, supabase: any) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY no configurada');
  }

  const resend = new Resend(resendApiKey);

  // Crear HTML del email
  const emailHTML = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura de tu reparación</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; }
            .invoice-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${TALLER_CONFIG.nombre}</h1>
            <p>Tu factura está lista</p>
        </div>
        
        <div class="content">
            <h2>¡Hola ${factura.cliente_nombre}!</h2>
            
            <p>Tu reparación ha sido completada y tu factura está lista para descargar.</p>
            
            <div class="invoice-info">
                <h3>📄 Detalles de la Factura</h3>
                <p><strong>Número:</strong> ${factura.factura_numero}</p>
                <p><strong>Bicicleta:</strong> ${factura.bicicleta_info}</p>
                <p><strong>Total a pagar:</strong> <span class="amount">€${factura.factura_total.toFixed(2)}</span></p>
            </div>
            
            ${factura.archivo_pdf ? `
            <div style="text-align: center; margin: 30px 0;">
                <a href="${factura.archivo_pdf}" class="button">📥 Descargar Factura PDF</a>
            </div>
            ` : ''}
            
            <p>Esta factura cumple con la normativa Verifactu y es válida para efectos fiscales.</p>
            
            ${factura.cliente_nif && factura.xml_firmado ? `
            <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 8px;">
                <h3 style="color: #1a365d; margin: 0 0 10px 0;">📋 Facturae XML Disponible</h3>
                <p style="margin: 0; color: #2d3748;">
                    Como empresa registrada, tiene disponible el archivo XML Facturae firmado digitalmente, 
                    compatible con la administración pública española. Puede descargarlo desde el panel de facturas.
                </p>
            </div>
            ` : ''}
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos:</p>
            <ul>
                <li>📞 Teléfono: ${TALLER_CONFIG.telefono}</li>
                <li>📧 Email: ${TALLER_CONFIG.email}</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Gracias por confiar en ${TALLER_CONFIG.nombre}</p>
            <p>Este email fue generado automáticamente por nuestro sistema.</p>
        </div>
    </body>
    </html>
  `;

  // Enviar email
  const { data, error } = await resend.emails.send({
    from: `${TALLER_CONFIG.nombre} <onboarding@resend.dev>`,
    to: [factura.cliente_email],
    subject: `Factura de tu reparación en ${TALLER_CONFIG.nombre} - ${factura.factura_numero}`,
    html: emailHTML,
  });

  if (error) {
    throw new Error(`Error enviando email: ${error.message}`);
  }

  // Registrar éxito
  await supabase.rpc('registrar_notificacion', {
    p_factura_id: facturaId,
    p_tipo: 'email',
    p_destinatario: factura.cliente_email,
    p_estado: 'enviado',
    p_metadatos: { email_id: data?.id }
  });

  return { id: data?.id, destinatario: factura.cliente_email, estado: 'enviado' };
}

async function enviarWhatsApp(factura: any, facturaId: string, supabase: any) {
  // Validar número de teléfono
  const telefono = factura.cliente_telefono?.replace(/[^\d+]/g, '');
  if (!telefono || telefono.length < 9) {
    throw new Error('Número de teléfono inválido');
  }

  // Asegurar formato internacional
  let telefonoFinal = telefono;
  if (!telefono.startsWith('+')) {
    // Asumir España si no tiene prefijo
    telefonoFinal = telefono.startsWith('34') ? `+${telefono}` : `+34${telefono}`;
  }

  // Mensaje de WhatsApp
  const mensaje = `🚲 ¡Hola ${factura.cliente_nombre}!

Tu factura está lista:
📄 ${factura.factura_numero}
💰 Total: €${factura.factura_total.toFixed(2)}

${factura.archivo_pdf ? `📥 Descárgala aquí: ${factura.archivo_pdf}` : ''}

Gracias por confiar en ${TALLER_CONFIG.nombre}`;

  // En desarrollo, simular envío exitoso
  // En producción, aquí iría la integración con Twilio o similar
  console.log(`WhatsApp simulado a ${telefonoFinal}:`, mensaje);

  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Registrar éxito (simulado)
  await supabase.rpc('registrar_notificacion', {
    p_factura_id: facturaId,
    p_tipo: 'whatsapp',
    p_destinatario: telefonoFinal,
    p_estado: 'enviado',
    p_metadatos: { mensaje_simulado: true }
  });

  return { destinatario: telefonoFinal, estado: 'enviado', simulado: true };
}