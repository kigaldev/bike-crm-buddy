import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const facturaId = url.searchParams.get('facturaId');

    if (!facturaId) {
      return new Response(
        JSON.stringify({ error: 'facturaId es requerido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use the database function to generate Verifactu JSON
    const { data: jsonData, error } = await supabase
      .rpc('generar_json_verifactu', { p_factura_id: facturaId });

    if (error) {
      console.error('Error generating Verifactu JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Error al generar JSON Verifactu' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!jsonData) {
      return new Response(
        JSON.stringify({ error: 'Factura no encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return the JSON with appropriate headers for download
    const fileName = `verifactu-${jsonData.IDFactura?.NumSerieFactura || facturaId}.json`;
    
    return new Response(JSON.stringify(jsonData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Error in export-verifactu-json function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});