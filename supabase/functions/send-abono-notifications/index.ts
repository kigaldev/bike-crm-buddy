import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const { abonoId, tipo } = await req.json();

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

    // Determinar título del documento
    const tipoDocumento = abono.tipo === 'nota_credito' ? 'Nota de Crédito' : 'Justificante de Abono';
    const accion = abono.tipo === 'nota_credito' ? 'acreditado' : 'reembolsado';

    let emailResult = null;
    let whatsappResult = null;

    // Enviar por email
    if (tipo === 'email' || tipo === 'both') {
      try {
        emailResult = await resend.emails.send({
          from: "Taller de Bicicletas <noreply@tallerbicicletas.es>",
          to: [abono.cliente_email],
          subject: `${tipoDocumento} ${abono.numero_abono} - €${Number(abono.monto).toFixed(2)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">${tipoDocumento}</h1>
                <h2 style="margin: 10px 0 0 0;">${abono.numero_abono}</h2>
              </div>
              
              <div style="padding: 30px; background: #f9f9f9;">
                <p>Estimado/a <strong>${abono.cliente_nombre}</strong>,</p>
                
                <p>Le informamos que se ha emitido ${abono.tipo === 'nota_credito' ? 'una nota de crédito' : 'un justificante de abono'} por importe de <strong>€${Number(abono.monto).toFixed(2)}</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #dc2626; margin-top: 0;">Detalles del ${abono.tipo === 'nota_credito' ? 'Crédito' : 'Abono'}:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li><strong>Número:</strong> ${abono.numero_abono}</li>
                    <li><strong>Fecha:</strong> ${new Date(abono.fecha_abono).toLocaleDateString('es-ES')}</li>
                    <li><strong>Importe:</strong> €${Number(abono.monto).toFixed(2)}</li>
                    ${abono.factura_numero !== 'Sin factura asociada' ? `<li><strong>Factura Original:</strong> ${abono.factura_numero}</li>` : ''}
                    ${abono.motivo ? `<li><strong>Motivo:</strong> ${abono.motivo}</li>` : ''}
                    ${abono.metodo_pago ? `<li><strong>Método:</strong> ${abono.metodo_pago.toUpperCase()}</li>` : ''}
                  </ul>
                </div>
                
                ${abono.tipo === 'nota_credito' ? 
                  '<p>Esta nota de crédito reduce el importe de su factura original. Si tenía pendiente algún pago, el importe ha sido ajustado automáticamente.</p>' :
                  '<p>El reembolso se procesará según el método de pago indicado en los próximos días hábiles.</p>'
                }
                
                <p>Si tiene alguna pregunta sobre este ${abono.tipo === 'nota_credito' ? 'crédito' : 'reembolso'}, no dude en contactarnos.</p>
                
                <div style="background: #dc2626; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-top: 30px;">
                  <p style="margin: 0; font-size: 18px; font-weight: bold;">Importe ${accion.toUpperCase()}: €${Number(abono.monto).toFixed(2)}</p>
                </div>
              </div>
              
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">Taller de Bicicletas - Servicio técnico especializado</p>
                <p style="margin: 5px 0 0 0;">Este es un email automático, por favor no responda directamente.</p>
              </div>
            </div>
          `,
        });

        // Registrar log de email
        await supabaseServiceRole.rpc('registrar_log_abono', {
          p_abono_id: abonoId,
          p_accion: 'enviar',
          p_estado: 'exito',
          p_mensaje: `Email de ${tipoDocumento.toLowerCase()} enviado a ${abono.cliente_email}`,
          p_metadatos: { tipo: 'email', destinatario: abono.cliente_email }
        });

      } catch (error) {
        console.error('Error enviando email:', error);
        
        // Registrar error
        await supabaseServiceRole.rpc('registrar_log_abono', {
          p_abono_id: abonoId,
          p_accion: 'enviar',
          p_estado: 'error',
          p_mensaje: `Error enviando email: ${error.message}`,
          p_metadatos: { tipo: 'email', error: error.message }
        });
        
        if (tipo === 'email') {
          throw error;
        }
      }
    }

    // Simular envío por WhatsApp (en producción integrar con API de WhatsApp Business)
    if (tipo === 'whatsapp' || tipo === 'both') {
      try {
        // En desarrollo: simular envío exitoso
        whatsappResult = {
          success: true,
          message: `${tipoDocumento} ${abono.numero_abono} - €${Number(abono.monto).toFixed(2)} enviado por WhatsApp a ${abono.cliente_telefono}`
        };

        // Registrar log de WhatsApp
        await supabaseServiceRole.rpc('registrar_log_abono', {
          p_abono_id: abonoId,
          p_accion: 'enviar',
          p_estado: 'exito',
          p_mensaje: `WhatsApp de ${tipoDocumento.toLowerCase()} enviado a ${abono.cliente_telefono}`,
          p_metadatos: { tipo: 'whatsapp', destinatario: abono.cliente_telefono }
        });

      } catch (error) {
        console.error('Error enviando WhatsApp:', error);
        
        // Registrar error
        await supabaseServiceRole.rpc('registrar_log_abono', {
          p_abono_id: abonoId,
          p_accion: 'enviar',
          p_estado: 'error',
          p_mensaje: `Error enviando WhatsApp: ${error.message}`,
          p_metadatos: { tipo: 'whatsapp', error: error.message }
        });
        
        if (tipo === 'whatsapp') {
          throw error;
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      emailResult,
      whatsappResult,
      message: `${tipoDocumento} enviado correctamente`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error enviando notificaciones de abono:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});