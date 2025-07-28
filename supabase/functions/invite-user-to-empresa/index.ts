import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteUserRequest {
  email: string;
  rol: string;
  empresa_id: string;
  invitado_por: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, rol, empresa_id, invitado_por }: InviteUserRequest = await req.json();

    console.log('Inviting user:', { email, rol, empresa_id, invitado_por });

    // Validar datos de entrada
    if (!email || !rol || !empresa_id || !invitado_por) {
      throw new Error('Faltan datos obligatorios');
    }

    // Verificar que el usuario que invita sea admin de la empresa
    const { data: inviterData, error: inviterError } = await supabaseClient
      .from('usuarios_empresas')
      .select('rol')
      .eq('user_id', invitado_por)
      .eq('empresa_id', empresa_id)
      .eq('activo', true)
      .single();

    if (inviterError || !inviterData || inviterData.rol !== 'admin') {
      throw new Error('No tienes permisos para invitar usuarios');
    }

    // Verificar si el usuario ya existe en auth.users
    const { data: existingUser, error: userSearchError } = await supabaseClient.auth.admin.listUsers();
    
    if (userSearchError) {
      throw new Error('Error al buscar usuarios existentes');
    }

    let targetUserId: string | null = null;
    const userExists = existingUser.users.find(user => user.email === email);

    if (userExists) {
      targetUserId = userExists.id;
      console.log('Usuario ya existe:', targetUserId);

      // Verificar si ya está en la empresa
      const { data: existingMembership, error: membershipError } = await supabaseClient
        .from('usuarios_empresas')
        .select('id, activo')
        .eq('user_id', targetUserId)
        .eq('empresa_id', empresa_id)
        .maybeSingle();

      if (membershipError) {
        throw new Error('Error al verificar membresía existente');
      }

      if (existingMembership) {
        if (existingMembership.activo) {
          throw new Error('El usuario ya pertenece a esta empresa');
        } else {
          // Reactivar usuario
          const { error: reactivateError } = await supabaseClient
            .from('usuarios_empresas')
            .update({ 
              activo: true, 
              rol: rol,
              fecha_invitacion: new Date().toISOString(),
              invitado_por: invitado_por
            })
            .eq('id', existingMembership.id);

          if (reactivateError) {
            throw new Error('Error al reactivar usuario');
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Usuario reactivado correctamente' }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      }
    } else {
      // Crear nuevo usuario con invitación por email
      const tempPassword = crypto.randomUUID();
      
      const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true
      });

      if (createUserError || !newUser.user) {
        throw new Error(`Error al crear usuario: ${createUserError?.message}`);
      }

      targetUserId = newUser.user.id;
      console.log('Nuevo usuario creado:', targetUserId);
    }

    // Crear la relación en usuarios_empresas
    const { error: insertError } = await supabaseClient
      .from('usuarios_empresas')
      .insert({
        user_id: targetUserId,
        empresa_id: empresa_id,
        rol: rol,
        activo: true,
        invitado_por: invitado_por,
        fecha_invitacion: new Date().toISOString()
      });

    if (insertError) {
      throw new Error(`Error al crear relación usuario-empresa: ${insertError.message}`);
    }

    // TODO: Enviar email de invitación usando Resend
    // Por ahora solo logueamos la invitación
    console.log(`Invitación enviada a ${email} para empresa ${empresa_id} con rol ${rol}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuario invitado correctamente',
        user_id: targetUserId 
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in invite-user-to-empresa function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);