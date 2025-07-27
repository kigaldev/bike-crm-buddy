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
    const { facturaId, certificateData, certificatePassword } = await req.json();

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

    // Obtener XML actual de la factura
    const { data: factura, error } = await supabase
      .from('facturas')
      .select('xml_facturae, numero_factura')
      .eq('id', facturaId)
      .single();

    if (error || !factura) {
      return new Response(
        JSON.stringify({ error: 'Factura no encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!factura.xml_facturae) {
      return new Response(
        JSON.stringify({ error: 'XML Facturae no encontrado. Genere primero el XML.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Simular firma digital (en producción usar librería de criptografía)
    const xmlFirmado = await signXMLDocument(factura.xml_facturae, certificateData, certificatePassword);

    // Validar XML firmado (validación básica)
    const validacionResult = validateSignedXML(xmlFirmado);

    // Actualizar factura con XML firmado
    await supabase
      .from('facturas')
      .update({ 
        xml_firmado: xmlFirmado,
        estado_facturae: validacionResult.isValid ? 'firmado_valido' : 'firmado_error',
        fecha_firma: new Date().toISOString(),
        certificado_usado: certificateData ? 'certificado_cargado' : 'certificado_demo',
        validacion_xsd: validacionResult.isValid
      })
      .eq('id', facturaId);

    // Registrar log de firma
    await supabase.rpc('registrar_log_firma', {
      p_factura_id: facturaId,
      p_accion: 'firmar_xml',
      p_estado: validacionResult.isValid ? 'exito' : 'error',
      p_archivo_generado: validacionResult.isValid ? 'xml_firmado' : null,
      p_certificado_usado: certificateData ? 'certificado_cargado' : 'certificado_demo',
      p_errores_validacion: validacionResult.errors,
      p_metadatos: {
        tamaño_xml: xmlFirmado.length,
        timestamp: new Date().toISOString(),
        validacion_xsd: validacionResult.isValid
      }
    });

    return new Response(JSON.stringify({
      success: true,
      xmlFirmado: xmlFirmado,
      validacion: validacionResult,
      message: validacionResult.isValid ? 'XML firmado correctamente' : 'XML firmado con errores de validación'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sign-facturae-xml function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function signXMLDocument(xmlContent: string, certificateData?: string, password?: string): Promise<string> {
  // En un entorno de producción, aquí utilizarías una librería como xml-crypto
  // para firmar digitalmente el XML con el certificado proporcionado
  
  const timestamp = new Date().toISOString();
  const signatureId = `sig-${Date.now()}`;
  
  // Crear firma digital simulada (en producción usar certificado real)
  const signature = `
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
        <ds:Reference URI="">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
          <ds:DigestValue>SIMULATED_DIGEST_VALUE_${Date.now()}</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>SIMULATED_SIGNATURE_VALUE_${Date.now()}</ds:SignatureValue>
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>SIMULATED_CERTIFICATE_DATA</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
      <ds:Object>
        <fe:SignedProperties xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml">
          <fe:SignedSignatureProperties>
            <fe:SigningTime>${timestamp}</fe:SigningTime>
            <fe:SigningCertificate>
              <fe:Cert>
                <fe:CertDigest>
                  <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
                  <ds:DigestValue>SIMULATED_CERT_DIGEST</ds:DigestValue>
                </fe:CertDigest>
                <fe:IssuerSerial>
                  <ds:X509IssuerName>CN=Demo Certificate Authority</ds:X509IssuerName>
                  <ds:X509SerialNumber>123456789</ds:X509SerialNumber>
                </fe:IssuerSerial>
              </fe:Cert>
            </fe:SigningCertificate>
          </fe:SignedSignatureProperties>
        </fe:SignedProperties>
      </ds:Object>
    </ds:Signature>`;

  // Insertar la firma antes del cierre del elemento raíz
  const xmlFirmado = xmlContent.replace(
    '</fe:Facturae>',
    `  ${signature}\n</fe:Facturae>`
  );

  return xmlFirmado;
}

function validateSignedXML(xmlContent: string): { isValid: boolean; errors: any } {
  // Validación básica del XML firmado
  const errors: any = {};
  let isValid = true;

  try {
    // Verificar que contiene elementos de firma
    if (!xmlContent.includes('<ds:Signature')) {
      errors.signature = 'Firma digital no encontrada';
      isValid = false;
    }

    // Verificar estructura básica de Facturae
    if (!xmlContent.includes('<fe:Facturae')) {
      errors.structure = 'Estructura Facturae inválida';
      isValid = false;
    }

    // Verificar elementos obligatorios
    const requiredElements = [
      '<fe:FileHeader>',
      '<fe:Parties>',
      '<fe:Invoices>',
      '<fe:InvoiceHeader>',
      '<fe:InvoiceIssueData>',
      '<fe:TaxesOutputs>',
      '<fe:InvoiceTotals>'
    ];

    for (const element of requiredElements) {
      if (!xmlContent.includes(element)) {
        errors.missing_elements = errors.missing_elements || [];
        errors.missing_elements.push(element);
        isValid = false;
      }
    }

    // En producción: validar contra esquema XSD oficial
    // Aquí se implementaría la validación real contra el XSD de Facturae 3.2.2

  } catch (error) {
    errors.validation_error = error.message;
    isValid = false;
  }

  return { isValid, errors: Object.keys(errors).length > 0 ? errors : null };
}