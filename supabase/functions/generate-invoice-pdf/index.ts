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
    const { facturaId } = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch factura with related data
    const { data: factura, error } = await supabase
      .from('facturas')
      .select(`
        *,
        clientes!inner(nombre, apellidos, telefono, email, direccion),
        ordenes_reparacion!inner(
          descripcion_trabajo,
          fecha_entrada,
          fecha_estim_entrega,
          bicicletas!inner(alias, marca, modelo, tipo)
        )
      `)
      .eq('id', facturaId)
      .single();

    if (error) throw error;

    // Generate HTML for the invoice
    const html = generateInvoiceHTML(factura);

    // Convert HTML to PDF using a simple HTML structure
    // Note: For production, you might want to use a proper PDF library
    const pdfResponse = await generatePDFFromHTML(html);

    if (!pdfResponse.ok) {
      throw new Error('Failed to generate PDF');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Upload PDF to Supabase Storage
    const fileName = `factura-${factura.id}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);

    // Update factura with PDF URL
    const { error: updateError } = await supabase
      .from('facturas')
      .update({ archivo_pdf: publicUrl })
      .eq('id', facturaId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      success: true, 
      pdfUrl: publicUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateInvoiceHTML(factura: any): string {
  const fechaEmision = new Date(factura.fecha_emision).toLocaleDateString('es-ES');
  const fechaEntrada = new Date(factura.ordenes_reparacion.fecha_entrada).toLocaleDateString('es-ES');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura #${factura.id.slice(-8)}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          color: #333; 
        }
        .header { 
          text-align: center; 
          margin-bottom: 40px; 
          border-bottom: 2px solid #0ea5e9;
          padding-bottom: 20px;
        }
        .company-name { 
          font-size: 28px; 
          font-weight: bold; 
          color: #0ea5e9; 
          margin-bottom: 10px;
        }
        .invoice-title { 
          font-size: 24px; 
          font-weight: bold; 
          margin: 20px 0; 
        }
        .invoice-info { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 30px; 
        }
        .section { 
          margin-bottom: 25px; 
        }
        .section-title { 
          font-weight: bold; 
          font-size: 16px; 
          margin-bottom: 10px; 
          color: #0ea5e9;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        .row { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 8px; 
        }
        .label { 
          font-weight: bold; 
        }
        .total-section { 
          background-color: #f8fafc; 
          padding: 20px; 
          border-radius: 8px; 
          margin-top: 30px;
          border: 2px solid #0ea5e9;
        }
        .total { 
          font-size: 20px; 
          font-weight: bold; 
          color: #0ea5e9;
        }
        .footer { 
          margin-top: 40px; 
          text-align: center; 
          font-size: 12px; 
          color: #666; 
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">CRM Taller Bicicletas</div>
        <div>Reparación y Mantenimiento de Bicicletas</div>
      </div>

      <div class="invoice-title">FACTURA #${factura.id.slice(-8)}</div>

      <div class="invoice-info">
        <div>
          <div class="section-title">Fecha de Emisión</div>
          <div>${fechaEmision}</div>
        </div>
        <div>
          <div class="section-title">Estado</div>
          <div>${factura.estado_pago === 'pagado' ? 'PAGADO' : 'PENDIENTE'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Datos del Cliente</div>
        <div class="row">
          <span class="label">Nombre:</span>
          <span>${factura.clientes.nombre} ${factura.clientes.apellidos}</span>
        </div>
        <div class="row">
          <span class="label">Teléfono:</span>
          <span>${factura.clientes.telefono}</span>
        </div>
        <div class="row">
          <span class="label">Email:</span>
          <span>${factura.clientes.email}</span>
        </div>
        ${factura.clientes.direccion ? `
        <div class="row">
          <span class="label">Dirección:</span>
          <span>${factura.clientes.direccion}</span>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Información de la Bicicleta</div>
        <div class="row">
          <span class="label">Alias:</span>
          <span>${factura.ordenes_reparacion.bicicletas.alias}</span>
        </div>
        <div class="row">
          <span class="label">Marca y Modelo:</span>
          <span>${factura.ordenes_reparacion.bicicletas.marca} ${factura.ordenes_reparacion.bicicletas.modelo}</span>
        </div>
        <div class="row">
          <span class="label">Tipo:</span>
          <span>${factura.ordenes_reparacion.bicicletas.tipo}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Detalles del Servicio</div>
        <div class="row">
          <span class="label">Fecha de Entrada:</span>
          <span>${fechaEntrada}</span>
        </div>
        ${factura.ordenes_reparacion.fecha_estim_entrega ? `
        <div class="row">
          <span class="label">Fecha Est. Entrega:</span>
          <span>${new Date(factura.ordenes_reparacion.fecha_estim_entrega).toLocaleDateString('es-ES')}</span>
        </div>
        ` : ''}
        ${factura.ordenes_reparacion.descripcion_trabajo ? `
        <div class="row">
          <span class="label">Descripción:</span>
          <span>${factura.ordenes_reparacion.descripcion_trabajo}</span>
        </div>
        ` : ''}
        ${factura.metodo_pago ? `
        <div class="row">
          <span class="label">Método de Pago:</span>
          <span>${factura.metodo_pago.charAt(0).toUpperCase() + factura.metodo_pago.slice(1)}</span>
        </div>
        ` : ''}
      </div>

      <div class="total-section">
        <div class="row">
          <span class="label">TOTAL A PAGAR:</span>
          <span class="total">$${factura.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        <div>¡Gracias por confiar en nuestro taller!</div>
        <div>Esta factura fue generada automáticamente el ${new Date().toLocaleString('es-ES')}</div>
      </div>
    </body>
    </html>
  `;
}

async function generatePDFFromHTML(html: string): Promise<Response> {
  // For simplicity, this example returns the HTML as a "PDF"
  // In production, you would use a service like Puppeteer, jsPDF, or an external API
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}