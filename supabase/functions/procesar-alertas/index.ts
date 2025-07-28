import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertaNotificacion {
  id: string;
  tipo: string;
  descripcion: string;
  fecha_recordatorio: string;
  prioridad: string;
  enviar_email: boolean;
  enviar_whatsapp: boolean;
  id_entidad?: string;
  tipo_entidad?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    console.log("Iniciando procesamiento de alertas automáticas...");

    // Obtener alertas pendientes que deben procesarse hoy
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data: alertasPendientes, error: alertasError } = await supabaseService
      .from('alertas')
      .select('*')
      .eq('estado', 'pendiente')
      .lte('fecha_recordatorio', hoy);

    if (alertasError) {
      console.error('Error obteniendo alertas:', alertasError);
      throw alertasError;
    }

    console.log(`Encontradas ${alertasPendientes?.length || 0} alertas para procesar`);

    let alertasProcesadas = 0;
    let errores = 0;

    for (const alerta of alertasPendientes || []) {
      try {
        await procesarAlerta(alerta);
        alertasProcesadas++;
        
        // Actualizar estado de la alerta
        await supabaseService
          .from('alertas')
          .update({ 
            estado: 'enviada',
            log_envios: alerta.log_envios ? 
              [...alerta.log_envios, {
                fecha: new Date().toISOString(),
                tipo: 'automatico',
                resultado: 'enviada'
              }] : 
              [{
                fecha: new Date().toISOString(),
                tipo: 'automatico',
                resultado: 'enviada'
              }]
          })
          .eq('id', alerta.id);

        console.log(`Alerta ${alerta.id} procesada exitosamente`);
        
      } catch (error) {
        console.error(`Error procesando alerta ${alerta.id}:`, error);
        errores++;
        
        // Marcar como fallida
        await supabaseService
          .from('alertas')
          .update({ 
            estado: 'fallida',
            log_envios: alerta.log_envios ? 
              [...alerta.log_envios, {
                fecha: new Date().toISOString(),
                tipo: 'automatico',
                resultado: 'error',
                error: error.message
              }] : 
              [{
                fecha: new Date().toISOString(),
                tipo: 'automatico',
                resultado: 'error',
                error: error.message
              }]
          })
          .eq('id', alerta.id);
      }
    }

    // Procesar alertas recurrentes que necesitan renovación
    await procesarAlertasRecurrentes();

    console.log(`Procesamiento completado: ${alertasProcesadas} exitosas, ${errores} con error`);

    return new Response(JSON.stringify({
      success: true,
      alertasProcesadas,
      errores,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error en procesamiento de alertas:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function procesarAlerta(alerta: AlertaNotificacion) {
  console.log(`Procesando alerta: ${alerta.tipo} - ${alerta.descripcion}`);

  // Obtener datos relacionados según el tipo de entidad
  let datosEntidad = null;
  if (alerta.id_entidad && alerta.tipo_entidad) {
    datosEntidad = await obtenerDatosEntidad(alerta.id_entidad, alerta.tipo_entidad);
  }

  // Enviar email si está habilitado
  if (alerta.enviar_email) {
    await enviarEmailAlerta(alerta, datosEntidad);
  }

  // Enviar WhatsApp si está habilitado
  if (alerta.enviar_whatsapp) {
    await enviarWhatsAppAlerta(alerta, datosEntidad);
  }

  // Crear notificación interna
  await crearNotificacionInterna(alerta, datosEntidad);
}

async function obtenerDatosEntidad(idEntidad: string, tipoEntidad: string) {
  try {
    switch (tipoEntidad) {
      case 'factura':
        const { data: factura } = await supabaseService
          .from('facturas')
          .select(`
            *,
            clientes (nombre, apellidos, email, telefono)
          `)
          .eq('id', idEntidad)
          .single();
        return factura;

      case 'cliente':
        const { data: cliente } = await supabaseService
          .from('clientes')
          .select('*')
          .eq('id', idEntidad)
          .single();
        return cliente;

      case 'bicicleta':
        const { data: bicicleta } = await supabaseService
          .from('bicicletas')
          .select(`
            *,
            clientes (nombre, apellidos, email, telefono)
          `)
          .eq('id', idEntidad)
          .single();
        return bicicleta;

      case 'orden':
        const { data: orden } = await supabaseService
          .from('ordenes_reparacion')
          .select(`
            *,
            clientes (nombre, apellidos, email, telefono),
            bicicletas (alias, marca, modelo)
          `)
          .eq('id', idEntidad)
          .single();
        return orden;

      default:
        return null;
    }
  } catch (error) {
    console.error(`Error obteniendo datos de ${tipoEntidad}:`, error);
    return null;
  }
}

async function enviarEmailAlerta(alerta: AlertaNotificacion, datosEntidad: any) {
  try {
    const emailDestinatario = datosEntidad?.clientes?.email || datosEntidad?.email || 'admin@taller.com';
    
    const asunto = generarAsuntoEmail(alerta);
    const contenido = generarContenidoEmail(alerta, datosEntidad);

    const { error } = await resend.emails.send({
      from: "CRM Taller <notificaciones@resend.dev>",
      to: [emailDestinatario],
      subject: asunto,
      html: contenido,
    });

    if (error) {
      throw error;
    }

    console.log(`Email enviado exitosamente a ${emailDestinatario}`);
  } catch (error) {
    console.error('Error enviando email:', error);
    throw error;
  }
}

async function enviarWhatsAppAlerta(alerta: AlertaNotificacion, datosEntidad: any) {
  // Implementación placeholder para WhatsApp
  // Aquí se integraría con una API de WhatsApp como Twilio o similar
  console.log(`WhatsApp placeholder para alerta ${alerta.id}`);
}

async function crearNotificacionInterna(alerta: AlertaNotificacion, datosEntidad: any) {
  // Crear registro de log interno para el equipo del taller
  console.log(`Notificación interna creada para alerta ${alerta.id}`);
}

function generarAsuntoEmail(alerta: AlertaNotificacion): string {
  const tiposAsunto = {
    'mantenimiento_recurrente': '🔧 Recordatorio de Mantenimiento',
    'factura_vencida': '💰 Factura Pendiente de Pago',
    'pago_parcial': '💳 Pago Pendiente de Completar',
    'anticipo_sin_conciliar': '🔄 Anticipo Pendiente',
    'abono_sin_usar': '💰 Saldo Disponible',
    'tarea_interna': '📋 Recordatorio Interno',
    'cumpleanos_cliente': '🎂 ¡Feliz Cumpleaños!',
    'revision_preventiva': '🔍 Revisión Preventiva Recomendada'
  };

  return tiposAsunto[alerta.tipo as keyof typeof tiposAsunto] || 'Recordatorio del Taller';
}

function generarContenidoEmail(alerta: AlertaNotificacion, datosEntidad: any): string {
  const nombreCliente = datosEntidad?.clientes?.nombre 
    ? `${datosEntidad.clientes.nombre} ${datosEntidad.clientes.apellidos}`
    : datosEntidad?.nombre 
    ? `${datosEntidad.nombre} ${datosEntidad.apellidos}`
    : 'Estimado cliente';

  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">CRM Taller de Bicicletas</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Recordatorio Automático</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #495057; margin-top: 0;">Hola ${nombreCliente},</h2>
            
            <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea; margin: 15px 0;">
              <p style="margin: 0; font-weight: bold; color: #495057;">
                ${alerta.descripcion}
              </p>
            </div>
            
            <p style="color: #6c757d;">
              Fecha del recordatorio: <strong>${new Date(alerta.fecha_recordatorio).toLocaleDateString('es-ES')}</strong>
            </p>
            
            ${alerta.prioridad === 'critica' ? 
              '<div style="background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; border: 1px solid #f5c6cb; margin: 15px 0;"><strong>⚠️ PRIORIDAD CRÍTICA</strong></div>' :
              alerta.prioridad === 'alta' ?
              '<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; border: 1px solid #ffeaa7; margin: 15px 0;"><strong>🔸 PRIORIDAD ALTA</strong></div>' : ''
            }
            
            <div style="margin: 20px 0; text-align: center;">
              <a href="tel:+34123456789" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                📞 Contactar Taller
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
            
            <p style="font-size: 14px; color: #6c757d; margin: 0;">
              Este es un mensaje automático del sistema CRM Taller de Bicicletas.<br>
              Si tienes dudas, no dudes en contactarnos.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function procesarAlertasRecurrentes() {
  try {
    // Obtener alertas recurrentes que ya fueron enviadas y necesitan renovación
    const { data: alertasRecurrentes } = await supabaseService
      .from('alertas')
      .select('*')
      .eq('es_recurrente', true)
      .eq('estado', 'enviada');

    for (const alerta of alertasRecurrentes || []) {
      const fechaOriginal = new Date(alerta.fecha_recordatorio);
      const hoy = new Date();
      
      // Calcular próxima fecha según frecuencia
      let proximaFecha = new Date(fechaOriginal);
      
      switch (alerta.frecuencia) {
        case 'mensual':
          proximaFecha.setMonth(proximaFecha.getMonth() + 1);
          break;
        case 'cada_6_meses':
          proximaFecha.setMonth(proximaFecha.getMonth() + 6);
          break;
        case 'anual':
          proximaFecha.setFullYear(proximaFecha.getFullYear() + 1);
          break;
        default:
          continue; // Saltar si no hay frecuencia definida
      }
      
      // Solo crear nueva alerta si la fecha ya pasó
      if (proximaFecha <= hoy) {
        await supabaseService
          .from('alertas')
          .insert([{
            tipo: alerta.tipo,
            id_entidad: alerta.id_entidad,
            tipo_entidad: alerta.tipo_entidad,
            descripcion: alerta.descripcion,
            fecha_recordatorio: proximaFecha.toISOString().split('T')[0],
            es_recurrente: true,
            frecuencia: alerta.frecuencia,
            prioridad: alerta.prioridad,
            enviar_email: alerta.enviar_email,
            enviar_whatsapp: alerta.enviar_whatsapp,
            estado: 'pendiente'
          }]);
          
        console.log(`Nueva alerta recurrente creada para ${alerta.id}`);
      }
    }
  } catch (error) {
    console.error('Error procesando alertas recurrentes:', error);
  }
}