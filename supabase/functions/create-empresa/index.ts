import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-EMPRESA] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando proceso de creación de empresa");

    // Create Supabase client with service role for bypassing RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("Usuario no autenticado");
    logStep("Usuario autenticado", { userId: user.id, email: user.email });

    const body = await req.json();
    const { 
      nombre_comercial, 
      razon_social, 
      cif, 
      email, 
      logo, 
      selected_apps = [] 
    } = body;

    // Validaciones
    if (!nombre_comercial || !cif || !email) {
      throw new Error("Campos obligatorios: nombre_comercial, cif, email");
    }

    logStep("Datos recibidos", { nombre_comercial, cif, email, selected_apps });

    // Verificar si ya existe una empresa con este CIF
    const { data: existingEmpresa, error: checkError } = await supabaseAdmin
      .from('empresas')
      .select('id')
      .eq('cif', cif)
      .single();

    if (existingEmpresa) {
      throw new Error("Ya existe una empresa registrada con este CIF");
    }

    // Verificar si el usuario ya tiene una empresa asignada
    const { data: existingUserEmpresa } = await supabaseAdmin
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', user.id)
      .eq('activo', true)
      .single();

    if (existingUserEmpresa) {
      throw new Error("El usuario ya está asociado a una empresa activa");
    }

    // Crear customer en Stripe
    let stripeCustomerId: string | null = null;
    try {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
        apiVersion: "2023-10-16" 
      });
      
      const customer = await stripe.customers.create({
        email: email,
        name: nombre_comercial,
        metadata: {
          cif: cif,
          user_id: user.id
        }
      });
      
      stripeCustomerId = customer.id;
      logStep("Customer de Stripe creado", { customerId: stripeCustomerId });
    } catch (stripeError) {
      console.warn("Error creando customer en Stripe:", stripeError);
      // Continuar sin Stripe por ahora
    }

    // 1. Crear la empresa
    const { data: nuevaEmpresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({
        nombre_comercial,
        razon_social: razon_social || nombre_comercial,
        cif,
        email,
        logo,
        plan_actual: 'free',
        estado_suscripcion: 'active',
        stripe_customer_id: stripeCustomerId,
        configuracion: {
          onboarding_completed: true,
          created_by: user.id
        }
      })
      .select()
      .single();

    if (empresaError) {
      logStep("Error creando empresa", empresaError);
      throw new Error(`Error creando empresa: ${empresaError.message}`);
    }

    logStep("Empresa creada", { empresaId: nuevaEmpresa.id });

    // 2. Asociar usuario como admin
    const { error: userEmpresaError } = await supabaseAdmin
      .from('usuarios_empresas')
      .insert({
        user_id: user.id,
        empresa_id: nuevaEmpresa.id,
        rol: 'admin',
        activo: true,
        invitado_por: user.id
      });

    if (userEmpresaError) {
      logStep("Error asociando usuario a empresa", userEmpresaError);
      throw new Error(`Error asociando usuario: ${userEmpresaError.message}`);
    }

    // 3. Actualizar perfil del usuario con empresa_actual
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        empresa_actual: nuevaEmpresa.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (profileError) {
      logStep("Error actualizando perfil", profileError);
      throw new Error(`Error actualizando perfil: ${profileError.message}`);
    }

    // 4. Activar apps por defecto (gratuitas y core)
    const { data: appsDefault, error: appsError } = await supabaseAdmin
      .from('apps')
      .select('id')
      .or('es_gratuita.eq.true,es_core.eq.true');

    if (appsDefault && appsDefault.length > 0) {
      const appsToActivate = appsDefault.map(app => ({
        empresa_id: nuevaEmpresa.id,
        app_id: app.id,
        activa: true,
        fecha_activacion: new Date().toISOString()
      }));

      const { error: activationError } = await supabaseAdmin
        .from('empresas_apps')
        .insert(appsToActivate);

      if (activationError) {
        logStep("Error activando apps por defecto", activationError);
      } else {
        logStep("Apps por defecto activadas", { count: appsToActivate.length });
      }
    }

    // 5. Activar apps seleccionadas por el usuario (si no son core/gratuitas)
    if (selected_apps.length > 0) {
      const { data: selectedAppsData } = await supabaseAdmin
        .from('apps')
        .select('id')
        .in('id', selected_apps)
        .eq('es_gratuita', false)
        .eq('es_core', false);

      if (selectedAppsData && selectedAppsData.length > 0) {
        const additionalApps = selectedAppsData.map(app => ({
          empresa_id: nuevaEmpresa.id,
          app_id: app.id,
          activa: true,
          fecha_activacion: new Date().toISOString(),
          trial_activo: true,
          trial_vence: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días
        }));

        const { error: additionalError } = await supabaseAdmin
          .from('empresas_apps')
          .insert(additionalApps);

        if (!additionalError) {
          logStep("Apps adicionales activadas en trial", { count: additionalApps.length });
        }
      }
    }

    logStep("Onboarding completado exitosamente", { empresaId: nuevaEmpresa.id });

    return new Response(JSON.stringify({
      success: true,
      empresa: nuevaEmpresa,
      message: "Empresa creada exitosamente"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR en create-empresa", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});