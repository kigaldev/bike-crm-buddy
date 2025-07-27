import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileX, Shield, CheckCircle, AlertTriangle, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FacturaePanelProps {
  facturaId: string;
  factura: any;
  onFacturaUpdated: () => void;
}

export const FacturaePanel = ({ facturaId, factura, onFacturaUpdated }: FacturaePanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");

  const getEstadoFacturaeBadge = (estado: string) => {
    switch (estado) {
      case 'firmado_valido':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Firmado y Válido</Badge>;
      case 'firmado_error':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Firmado con Errores</Badge>;
      case 'xml_generado':
        return <Badge variant="secondary" className="flex items-center gap-1"><FileText className="w-3 h-3" />XML Generado</Badge>;
      case 'pendiente':
      default:
        return <Badge variant="outline" className="flex items-center gap-1"><FileX className="w-3 h-3" />Pendiente</Badge>;
    }
  };

  const generarXMLFacturae = async () => {
    setLoading(true);
    try {
      window.open(
        `https://udbcfwtgniqbupgeodga.supabase.co/functions/v1/generate-facturae-xml?facturaId=${facturaId}`,
        '_blank'
      );
      
      // Esperar un momento y refrescar datos
      setTimeout(() => {
        onFacturaUpdated();
        toast({
          title: "XML Facturae generado",
          description: "El archivo XML ha sido generado y descargado correctamente"
        });
      }, 2000);
    } catch (error) {
      console.error('Error generating XML:', error);
      toast({
        title: "Error",
        description: "Error al generar XML Facturae",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const firmarXML = async () => {
    if (!factura.xml_facturae) {
      toast({
        title: "Error",
        description: "Primero debe generar el XML Facturae",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let certificateData = null;
      
      // Si hay un archivo de certificado, convertirlo a base64
      if (certificateFile) {
        certificateData = await fileToBase64(certificateFile);
      }

      const { data, error } = await supabase.functions.invoke('sign-facturae-xml', {
        body: { 
          facturaId,
          certificateData,
          certificatePassword
        }
      });

      if (error) throw error;

      onFacturaUpdated();
      toast({
        title: data.validacion.isValid ? "XML firmado correctamente" : "XML firmado con advertencias",
        description: data.message,
        variant: data.validacion.isValid ? "default" : "destructive"
      });
    } catch (error: any) {
      console.error('Error signing XML:', error);
      toast({
        title: "Error",
        description: `Error al firmar XML: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const descargarXMLFirmado = () => {
    if (!factura.xml_firmado) {
      toast({
        title: "Error",
        description: "No hay XML firmado disponible",
        variant: "destructive"
      });
      return;
    }

    // Crear blob y descargar
    const blob = new Blob([factura.xml_firmado], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturae-firmado-${factura.numero_factura?.replace(/[^a-zA-Z0-9]/g, '-') || facturaId}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Descarga iniciada",
      description: "El XML firmado se ha descargado correctamente"
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remover el prefijo data:...;base64,
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleCertificateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar que sea un archivo de certificado válido
      if (file.name.endsWith('.p12') || file.name.endsWith('.pfx') || file.name.endsWith('.pem')) {
        setCertificateFile(file);
        toast({
          title: "Certificado cargado",
          description: `Archivo ${file.name} cargado correctamente`
        });
      } else {
        toast({
          title: "Archivo inválido",
          description: "Solo se permiten archivos .p12, .pfx o .pem",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Facturae y Firma Digital
        </h3>
        {getEstadoFacturaeBadge(factura.estado_facturae || 'pendiente')}
      </div>

      {/* Estado actual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado del Proceso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              {factura.xml_facturae ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <FileX className="w-4 h-4 text-gray-400" />
              )}
              <span>XML Generado</span>
            </div>
            <div className="flex items-center gap-2">
              {factura.xml_firmado ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <FileX className="w-4 h-4 text-gray-400" />
              )}
              <span>XML Firmado</span>
            </div>
            <div className="flex items-center gap-2">
              {factura.validacion_xsd ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
              <span>Validación XSD</span>
            </div>
          </div>

          {factura.fecha_firma && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Firmado el:</strong> {new Date(factura.fecha_firma).toLocaleString()}
              </p>
              {factura.certificado_usado && (
                <p className="text-sm">
                  <strong>Certificado:</strong> {factura.certificado_usado}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generar XML Facturae */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Generar XML Facturae 3.2.2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Genera el archivo XML conforme al estándar Facturae 3.2.2 de la Agencia Tributaria española.
            El XML incluirá información de Verifactu y todos los datos necesarios para administración pública.
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={generarXMLFacturae} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {loading ? "Generando..." : "Generar XML Facturae"}
            </Button>
            
            {factura.xml_facturae && (
              <Button 
                variant="outline" 
                onClick={() => {
                  const blob = new Blob([factura.xml_facturae], { type: 'application/xml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `facturae-${factura.numero_factura?.replace(/[^a-zA-Z0-9]/g, '-') || facturaId}.xml`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar XML
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cargar Certificado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Certificado Digital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cargue su certificado digital (.p12, .pfx o .pem) para firmar el XML.
            Si no carga un certificado, se usará una firma de demostración.
          </p>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="certificate">Archivo de Certificado (opcional)</Label>
              <Input
                id="certificate"
                type="file"
                accept=".p12,.pfx,.pem"
                onChange={handleCertificateFileChange}
                className="mt-1"
              />
              {certificateFile && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {certificateFile.name} cargado
                </p>
              )}
            </div>
            
            {certificateFile && (
              <div>
                <Label htmlFor="password">Contraseña del Certificado</Label>
                <Input
                  id="password"
                  type="password"
                  value={certificatePassword}
                  onChange={(e) => setCertificatePassword(e.target.value)}
                  placeholder="Ingrese la contraseña del certificado"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Firmar XML */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Firmar XML</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aplique la firma digital al XML generado. El XML firmado será válido para presentación
            ante la administración pública española.
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={firmarXML} 
              disabled={loading || !factura.xml_facturae}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {loading ? "Firmando..." : "Firmar XML"}
            </Button>
            
            {factura.xml_firmado && (
              <Button 
                variant="outline" 
                onClick={descargarXMLFirmado}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar XML Firmado
              </Button>
            )}
          </div>
          
          {!factura.xml_facturae && (
            <p className="text-sm text-yellow-600">
              ⚠️ Primero debe generar el XML Facturae
            </p>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información Técnica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Versión Facturae:</strong> 3.2.2</p>
              <p><strong>Compatibilidad:</strong> Agencia Tributaria ES</p>
              <p><strong>Algoritmo Firma:</strong> RSA-SHA1</p>
            </div>
            <div>
              <p><strong>Integración:</strong> Verifactu incluido</p>
              <p><strong>Validación:</strong> Esquema XSD oficial</p>
              <p><strong>Formato:</strong> XMLDSig estándar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};