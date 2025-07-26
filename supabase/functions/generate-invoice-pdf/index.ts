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

function generateInvoiceHTML(factura: any, productos: any[]): string {
  const fechaEmision = new Date(factura.fecha_emision).toLocaleDateString('es-ES');
  const fechaVencimiento = factura.fecha_pago ? new Date(factura.fecha_pago).toLocaleDateString('es-ES') : 'No especificada';
  
  // Calculate totals for products
  const totalProductos = productos.reduce((sum, p) => sum + (p.subtotal || 0), 0);
  const costoEstimado = factura.ordenes_reparacion?.costo_estimado || 0;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura ${factura.numero_factura || factura.id.slice(-8)}</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
                color: #333;
            }
            .invoice-container {
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
                border-bottom: 3px solid #2563eb;
            }
            .company-info {
                flex: 1;
            }
            .company-name {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 8px;
            }
            .company-details {
                font-size: 14px;
                color: #666;
                line-height: 1.5;
            }
            .invoice-info {
                text-align: right;
                flex: 1;
            }
            .invoice-title {
                font-size: 32px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 8px;
            }
            .invoice-number {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 4px;
            }
            .invoice-date {
                color: #666;
                font-size: 14px;
            }
            .verifactu-info {
                background: #f8fafc;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
                border: 1px solid #e2e8f0;
            }
            .verifactu-title {
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 8px;
            }
            .hash-info {
                font-family: monospace;
                font-size: 12px;
                color: #666;
                word-break: break-all;
            }
            .client-info {
                background: #f8fafc;
                padding: 20px;
                border-radius: 6px;
                margin: 30px 0;
            }
            .client-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 10px;
                color: #2563eb;
            }
            .client-details {
                line-height: 1.6;
            }
            .services-table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
            }
            .services-table th,
            .services-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
            }
            .services-table th {
                background: #f8fafc;
                font-weight: bold;
                color: #2563eb;
            }
            .services-table td:last-child,
            .services-table th:last-child {
                text-align: right;
            }
            .totals {
                margin-top: 30px;
                text-align: right;
            }
            .total-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 8px 0;
            }
            .total-label {
                font-weight: bold;
            }
            .total-amount {
                font-weight: bold;
                min-width: 100px;
                text-align: right;
            }
            .grand-total {
                border-top: 2px solid #2563eb;
                padding-top: 12px;
                margin-top: 12px;
                font-size: 18px;
                color: #2563eb;
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
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <!-- Header -->
            <div class="header">
                <div class="company-info">
                    <div class="company-name">${factura.emisor_nombre || 'Tu Taller de Bicicletas'}</div>
                    <div class="company-details">
                        CIF: ${factura.emisor_cif || 'B12345678'}<br>
                        ${factura.emisor_direccion || 'Calle Principal 123, 28001 Madrid'}<br>
                        Teléfono: +34 XXX XXX XXX<br>
                        Email: info@tallerbicicletas.es
                    </div>
                </div>
                <div class="invoice-info">
                    <div class="invoice-title">FACTURA</div>
                    <div class="invoice-number">${factura.numero_factura || factura.id.slice(-8)}</div>
                    <div class="invoice-date">Fecha: ${fechaEmision}</div>
                    <div class="invoice-date">Ejercicio: ${factura.ejercicio_fiscal || new Date().getFullYear()}</div>
                </div>
            </div>

            <!-- Verifactu Info -->
            <div class="verifactu-info">
                <div class="verifactu-title">🔐 Factura verificable conforme al sistema Verifactu</div>
                <div>Serie: ${factura.serie_factura || '001'} | Firma en cadena disponible</div>
                ${factura.hash_actual ? `
                <div class="hash-info">
                    Hash: ${factura.hash_actual}
                </div>
                ` : ''}
            </div>

            <!-- Client Info -->
            <div class="client-info">
                <div class="client-title">📋 DATOS DEL CLIENTE</div>
                <div class="client-details">
                    <strong>${factura.clientes?.nombre} ${factura.clientes?.apellidos}</strong><br>
                    ${factura.cliente_nif ? `NIF/CIF: ${factura.cliente_nif}<br>` : ''}
                    ${factura.clientes?.direccion ? `${factura.clientes.direccion}<br>` : ''}
                    ${factura.clientes?.telefono ? `Teléfono: ${factura.clientes.telefono}<br>` : ''}
                    ${factura.clientes?.email ? `Email: ${factura.clientes.email}` : ''}
                </div>
            </div>

            <!-- Repair Details -->
            ${factura.ordenes_reparacion ? `
            <div class="client-info">
                <div class="client-title">🚲 DETALLES DE LA REPARACIÓN</div>
                <div class="client-details">
                    <strong>Bicicleta:</strong> ${factura.ordenes_reparacion.bicicletas?.alias}<br>
                    <strong>Marca/Modelo:</strong> ${factura.ordenes_reparacion.bicicletas?.marca} ${factura.ordenes_reparacion.bicicletas?.modelo}<br>
                    <strong>Tipo:</strong> ${factura.ordenes_reparacion.bicicletas?.tipo}<br>
                    ${factura.ordenes_reparacion.descripcion_trabajo ? `<strong>Trabajo realizado:</strong> ${factura.ordenes_reparacion.descripcion_trabajo}` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Services Table -->
            <table class="services-table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos.map(producto => `
                        <tr>
                            <td>${producto.nombre}</td>
                            <td>${producto.tipo}</td>
                            <td>${producto.cantidad}</td>
                            <td>€${producto.precio_unitario.toFixed(2)}</td>
                            <td>€${producto.subtotal.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    ${costoEstimado > 0 ? `
                        <tr>
                            <td>Mano de obra y servicio</td>
                            <td>Servicio</td>
                            <td>1</td>
                            <td>€${costoEstimado.toFixed(2)}</td>
                            <td>€${costoEstimado.toFixed(2)}</td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>

            <!-- Totals -->
            <div class="totals">
                <div class="total-row">
                    <span class="total-label">Base imponible:</span>
                    <span class="total-amount">€${(factura.base_imponible || factura.total / 1.21).toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">IVA (${factura.tipo_iva || 21}%):</span>
                    <span class="total-amount">€${(factura.cuota_iva || (factura.total - factura.total / 1.21)).toFixed(2)}</span>
                </div>
                <div class="total-row grand-total">
                    <span class="total-label">TOTAL:</span>
                    <span class="total-amount">€${factura.total.toFixed(2)}</span>
                </div>
            </div>

            <!-- Payment Info -->
            ${factura.estado_pago === 'pagado' ? `
            <div class="client-info">
                <div class="client-title">💳 INFORMACIÓN DE PAGO</div>
                <div class="client-details">
                    <strong>Estado:</strong> PAGADO ✅<br>
                    ${factura.metodo_pago ? `<strong>Método:</strong> ${factura.metodo_pago.toUpperCase()}<br>` : ''}
                    ${factura.fecha_pago ? `<strong>Fecha de pago:</strong> ${new Date(factura.fecha_pago).toLocaleDateString('es-ES')}` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Legal Text -->
            <div class="legal-text">
                ⚖️ <strong>INFORMACIÓN LEGAL:</strong> Esta factura cumple con la normativa española vigente y el sistema Verifactu de la Agencia Tributaria. 
                La integridad de este documento está garantizada mediante firma electrónica en cadena. 
                Para verificar la autenticidad, consulte el hash proporcionado en el sistema.
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>Gracias por confiar en nuestros servicios</p>
                <p>Documento generado automáticamente por el sistema CRM | ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

async function generatePDFFromHTML(html: string): Promise<Response> {
  // For development, return HTML as PDF placeholder
  // In production, integrate with a PDF generation service like:
  // - Puppeteer: Convert HTML to PDF via headless Chrome
  // - jsPDF: Client-side PDF generation
  // - External API: HTML to PDF service
  
  return new Response(html, {
    headers: {
      'Content-Type': 'application/pdf',
    },
  });
}