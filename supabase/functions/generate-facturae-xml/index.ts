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

    // Obtener datos de la factura para Facturae
    const { data: facturaData, error } = await supabase
      .rpc('obtener_datos_factura_facturae', { p_factura_id: facturaId });

    if (error) {
      console.error('Error getting factura data:', error);
      return new Response(
        JSON.stringify({ error: 'Error al obtener datos de factura' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!facturaData || facturaData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Factura no encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const factura = facturaData[0];

    // Generar XML Facturae 3.2.2
    const xmlFacturae = generateFacturaeXML(factura);

    // Registrar log de generación
    await supabase.rpc('registrar_log_firma', {
      p_factura_id: facturaId,
      p_accion: 'generar_xml',
      p_estado: 'exito',
      p_metadatos: {
        tamaño_xml: xmlFacturae.length,
        timestamp: new Date().toISOString()
      }
    });

    // Guardar XML en la factura
    await supabase
      .from('facturas')
      .update({ 
        xml_facturae: xmlFacturae,
        estado_facturae: 'xml_generado'
      })
      .eq('id', facturaId);

    // Return the XML with appropriate headers for download
    const fileName = `facturae-${factura.numero_factura?.replace(/[^a-zA-Z0-9]/g, '-') || facturaId}.xml`;
    
    return new Response(xmlFacturae, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Error in generate-facturae-xml function:', error);
    
    // Try to register error log if we have facturaId
    try {
      const url = new URL(req.url);
      const facturaId = url.searchParams.get('facturaId');
      if (facturaId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase.rpc('registrar_log_firma', {
          p_factura_id: facturaId,
          p_accion: 'generar_xml',
          p_estado: 'error',
          p_errores_validacion: { error: error.message }
        });
      }
    } catch (logError) {
      console.error('Error logging error:', logError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateFacturaeXML(factura: any): string {
  const fechaEmision = new Date(factura.fecha_emision).toISOString().split('T')[0];
  
  // Construir XML Facturae 3.2.2 conforme al estándar
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<fe:Facturae xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <fe:FileHeader>
    <fe:SchemaVersion>3.2.2</fe:SchemaVersion>
    <fe:Modality>I</fe:Modality>
    <fe:InvoiceIssuerType>EM</fe:InvoiceIssuerType>
    <fe:ThirdParty>
      <fe:TaxIdentification>
        <fe:PersonTypeCode>J</fe:PersonTypeCode>
        <fe:ResidenceTypeCode>R</fe:ResidenceTypeCode>
        <fe:TaxIdentificationNumber>${factura.emisor_cif}</fe:TaxIdentificationNumber>
      </fe:TaxIdentification>
      <fe:LegalEntity>
        <fe:CorporateName>${factura.emisor_nombre}</fe:CorporateName>
        <fe:AddressInSpain>
          <fe:Address>${factura.emisor_direccion}</fe:Address>
          <fe:PostCode>28001</fe:PostCode>
          <fe:Town>Madrid</fe:Town>
          <fe:Province>Madrid</fe:Province>
          <fe:CountryCode>ESP</fe:CountryCode>
        </fe:AddressInSpain>
      </fe:LegalEntity>
    </fe:ThirdParty>
  </fe:FileHeader>
  
  <fe:Parties>
    <fe:SellerParty>
      <fe:TaxIdentification>
        <fe:PersonTypeCode>J</fe:PersonTypeCode>
        <fe:ResidenceTypeCode>R</fe:ResidenceTypeCode>
        <fe:TaxIdentificationNumber>${factura.emisor_cif}</fe:TaxIdentificationNumber>
      </fe:TaxIdentification>
      <fe:LegalEntity>
        <fe:CorporateName>${factura.emisor_nombre}</fe:CorporateName>
        <fe:AddressInSpain>
          <fe:Address>${factura.emisor_direccion}</fe:Address>
          <fe:PostCode>28001</fe:PostCode>
          <fe:Town>Madrid</fe:Town>
          <fe:Province>Madrid</fe:Province>
          <fe:CountryCode>ESP</fe:CountryCode>
        </fe:AddressInSpain>
      </fe:LegalEntity>
    </fe:SellerParty>
    
    <fe:BuyerParty>
      <fe:TaxIdentification>
        <fe:PersonTypeCode>${factura.cliente_nif ? 'J' : 'F'}</fe:PersonTypeCode>
        <fe:ResidenceTypeCode>R</fe:ResidenceTypeCode>
        <fe:TaxIdentificationNumber>${factura.cliente_nif || 'SIN_NIF'}</fe:TaxIdentificationNumber>
      </fe:TaxIdentification>
      ${factura.cliente_nif ? `
      <fe:LegalEntity>
        <fe:CorporateName>${factura.cliente_nombre}</fe:CorporateName>
        <fe:AddressInSpain>
          <fe:Address>${factura.cliente_direccion || 'Dirección no especificada'}</fe:Address>
          <fe:PostCode>00000</fe:PostCode>
          <fe:Town>Madrid</fe:Town>
          <fe:Province>Madrid</fe:Province>
          <fe:CountryCode>ESP</fe:CountryCode>
        </fe:AddressInSpain>
      </fe:LegalEntity>
      ` : `
      <fe:Individual>
        <fe:Name>${factura.cliente_nombre?.split(' ')[0] || 'Cliente'}</fe:Name>
        <fe:FirstSurname>${factura.cliente_nombre?.split(' ')[1] || ''}</fe:FirstSurname>
        <fe:SecondSurname>${factura.cliente_nombre?.split(' ')[2] || ''}</fe:SecondSurname>
        <fe:AddressInSpain>
          <fe:Address>${factura.cliente_direccion || 'Dirección no especificada'}</fe:Address>
          <fe:PostCode>00000</fe:PostCode>
          <fe:Town>Madrid</fe:Town>
          <fe:Province>Madrid</fe:Province>
          <fe:CountryCode>ESP</fe:CountryCode>
        </fe:AddressInSpain>
      </fe:Individual>
      `}
    </fe:BuyerParty>
  </fe:Parties>
  
  <fe:Invoices>
    <fe:Invoice>
      <fe:InvoiceHeader>
        <fe:InvoiceNumber>${factura.numero_factura}</fe:InvoiceNumber>
        <fe:InvoiceSeriesCode>FAC</fe:InvoiceSeriesCode>
        <fe:InvoiceDocumentType>FC</fe:InvoiceDocumentType>
        <fe:InvoiceClass>OO</fe:InvoiceClass>
      </fe:InvoiceHeader>
      
      <fe:InvoiceIssueData>
        <fe:IssueDate>${fechaEmision}</fe:IssueDate>
        <fe:InvoiceCurrencyCode>EUR</fe:InvoiceCurrencyCode>
        <fe:TaxCurrencyCode>EUR</fe:TaxCurrencyCode>
        <fe:LanguageName>es</fe:LanguageName>
      </fe:InvoiceIssueData>
      
      <fe:TaxesOutputs>
        <fe:Tax>
          <fe:TaxTypeCode>01</fe:TaxTypeCode>
          <fe:TaxRate>${factura.tipo_iva}</fe:TaxRate>
          <fe:TaxableBase>
            <fe:TotalAmount>${factura.base_imponible}</fe:TotalAmount>
          </fe:TaxableBase>
          <fe:TaxAmount>
            <fe:TotalAmount>${factura.cuota_iva}</fe:TotalAmount>
          </fe:TaxAmount>
        </fe:Tax>
      </fe:TaxesOutputs>
      
      <fe:InvoiceTotals>
        <fe:TotalGrossAmount>${factura.base_imponible}</fe:TotalGrossAmount>
        <fe:TotalGeneralDiscounts>0.00</fe:TotalGeneralDiscounts>
        <fe:TotalGeneralSurcharges>0.00</fe:TotalGeneralSurcharges>
        <fe:TotalGrossAmountBeforeTaxes>${factura.base_imponible}</fe:TotalGrossAmountBeforeTaxes>
        <fe:TotalTaxOutputs>${factura.cuota_iva}</fe:TotalTaxOutputs>
        <fe:TotalTaxesWithheld>0.00</fe:TotalTaxesWithheld>
        <fe:InvoiceTotal>${factura.total}</fe:InvoiceTotal>
        <fe:TotalOutstandingAmount>${factura.total}</fe:TotalOutstandingAmount>
        <fe:TotalExecutableAmount>${factura.total}</fe:TotalExecutableAmount>
      </fe:InvoiceTotals>
      
      <fe:Items>
        <fe:InvoiceLine>
          <fe:ItemDescription>Reparación de bicicleta: ${factura.bicicleta_info}</fe:ItemDescription>
          <fe:Quantity>1</fe:Quantity>
          <fe:UnitOfMeasure>01</fe:UnitOfMeasure>
          <fe:UnitPriceWithoutTax>${factura.base_imponible}</fe:UnitPriceWithoutTax>
          <fe:TotalCost>${factura.base_imponible}</fe:TotalCost>
          <fe:DiscountsAndRebates>
            <fe:Discount>
              <fe:DiscountReason>No aplicable</fe:DiscountReason>
              <fe:DiscountRate>0</fe:DiscountRate>
              <fe:DiscountAmount>0.00</fe:DiscountAmount>
            </fe:Discount>
          </fe:DiscountsAndRebates>
          <fe:GrossAmount>${factura.base_imponible}</fe:GrossAmount>
          <fe:TaxesOutputs>
            <fe:Tax>
              <fe:TaxTypeCode>01</fe:TaxTypeCode>
              <fe:TaxRate>${factura.tipo_iva}</fe:TaxRate>
              <fe:TaxableBase>
                <fe:TotalAmount>${factura.base_imponible}</fe:TotalAmount>
              </fe:TaxableBase>
              <fe:TaxAmount>
                <fe:TotalAmount>${factura.cuota_iva}</fe:TotalAmount>
              </fe:TaxAmount>
            </fe:Tax>
          </fe:TaxesOutputs>
        </fe:InvoiceLine>
      </fe:Items>
      
      ${factura.descripcion_trabajo ? `
      <fe:AdditionalData>
        <fe:InvoiceAdditionalInformation>Descripción del trabajo: ${factura.descripcion_trabajo}</fe:InvoiceAdditionalInformation>
      </fe:AdditionalData>
      ` : ''}
      
      <!-- Información Verifactu -->
      <fe:Extensions>
        <fe:Extension>
          <fe:ExtensionContent>
            <Verifactu>
              <NumeroFactura>${factura.numero_factura}</NumeroFactura>
              <EjercicioFiscal>${factura.ejercicio_fiscal}</EjercicioFiscal>
              <HashAnterior>${factura.hash_anterior || ''}</HashAnterior>
              <HashActual>${factura.hash_actual}</HashActual>
            </Verifactu>
          </fe:ExtensionContent>
        </fe:Extension>
      </fe:Extensions>
    </fe:Invoice>
  </fe:Invoices>
</fe:Facturae>`;

  return xml;
}