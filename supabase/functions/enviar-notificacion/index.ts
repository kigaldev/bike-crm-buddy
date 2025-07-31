import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { Resend } from "npm:resend@2.0.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificacionRequest {
  user_id: string;
  titulo: string;
  mensaje: string;
  tipo: "sistema" | "feedback" | "suscripcion" | "seguridad" | "otro";
  url_redireccion?: string;
  enviar_email?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario es admin o manager
    const { data: userRole } = await supabase
      .from("usuarios_empresas")
      .select("rol, empresa_id")
      .eq("user_id", user.id)
      .eq("activo", true)
      .single();

    if (!userRole || !["admin", "manager"].includes(userRole.rol)) {
      throw new Error("No tienes permisos para enviar notificaciones");
    }

    const { 
      user_id, 
      titulo, 
      mensaje, 
      tipo, 
      url_redireccion,
      enviar_email = true
    }: NotificacionRequest = await req.json();

    // Obtener datos del usuario destinatario
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user_id)
      .single();

    if (!targetUser) {
      throw new Error("Usuario destinatario no encontrado");
    }

    // Crear la notificación en la base de datos
    const { data: notificacion, error: notifError } = await supabase
      .from("notificaciones_saas")
      .insert({
        empresa_id: userRole.empresa_id,
        user_id,
        titulo,
        mensaje,
        tipo,
        url_redireccion,
        enviado_email: false
      })
      .select()
      .single();

    if (notifError) {
      console.error("Error creando notificación:", notifError);
      throw new Error("Error al crear la notificación");
    }

    console.log("Notificación creada:", notificacion.id);

    // Enviar email si está habilitado
    if (enviar_email && targetUser.email) {
      try {
        // Obtener branding de la empresa
        const { data: branding } = await supabase
          .from("branding_empresas")
          .select("*")
          .eq("empresa_id", userRole.empresa_id)
          .single();

        const primaryColor = branding?.color_primario || "#3b82f6";
        const logoUrl = branding?.logo_url || "";

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${titulo}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .header { background-color: ${primaryColor}; color: white; padding: 24px; text-align: center; }
                .content { padding: 32px 24px; }
                .footer { background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 14px; color: #64748b; }
                .btn { display: inline-block; background-color: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
                .logo { max-height: 40px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ""}
                  <h1 style="margin: ${logoUrl ? "16px 0 0 0" : "0"}; font-size: 24px; font-weight: 600;">${titulo}</h1>
                </div>
                <div class="content">
                  <p style="margin: 0 0 16px 0; line-height: 1.6; color: #374151;">${mensaje}</p>
                  ${url_redireccion ? `<a href="${url_redireccion}" class="btn">Ver detalles</a>` : ""}
                </div>
                <div class="footer">
                  <p style="margin: 0;">Esta notificación fue enviada desde tu panel de administración.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        const emailResponse = await resend.emails.send({
          from: "Notificaciones <notifications@resend.dev>",
          to: [targetUser.email],
          subject: titulo,
          html: emailHtml,
        });

        console.log("Email enviado:", emailResponse);

        // Actualizar estado de envío de email
        await supabase
          .from("notificaciones_saas")
          .update({ enviado_email: true })
          .eq("id", notificacion.id);

      } catch (emailError) {
        console.error("Error enviando email:", emailError);
        // No fallar si el email falla, la notificación ya se creó
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificacion_id: notificacion.id,
        mensaje: "Notificación enviada correctamente"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error en enviar-notificacion:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);