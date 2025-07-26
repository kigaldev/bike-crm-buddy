import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { validarCadenaVerifactu, generarLibroRegistroFacturas } from "@/utils/verifactu";
import { Shield, Download, FileCheck, AlertTriangle, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const VerifactuDashboard = () => {
  const { toast } = useToast();
  const [ejercicio, setEjercicio] = useState(new Date().getFullYear().toString());
  const [validacion, setValidacion] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleValidarCadena = async () => {
    setLoading(true);
    try {
      const resultado = await validarCadenaVerifactu(parseInt(ejercicio));
      setValidacion(resultado);
      
      if (resultado.valida) {
        toast({
          title: "✅ Cadena Verifactu válida",
          description: `Se validaron ${resultado.totalFacturas} facturas correctamente`
        });
      } else {
        toast({
          title: "⚠️ Errores en cadena Verifactu",
          description: `Se encontraron ${resultado.errores.length} errores`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error validating chain:', error);
      toast({
        title: "Error",
        description: "Error al validar la cadena Verifactu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarLibro = async () => {
    setLoading(true);
    try {
      const resultado = await generarLibroRegistroFacturas(parseInt(ejercicio));
      toast({
        title: "📊 Libro registro generado",
        description: `Descargado: ${resultado.archivo} con ${resultado.totalFacturas} facturas`
      });
    } catch (error) {
      console.error('Error generating register book:', error);
      toast({
        title: "Error",
        description: "Error al generar el libro registro",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Panel de Control Verifactu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ejercicio Fiscal</label>
              <Select value={ejercicio} onValueChange={setEjercicio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleValidarCadena} 
              disabled={loading}
              className="mt-auto"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              {loading ? "Validando..." : "Validar Cadena"}
            </Button>
            
            <Button 
              onClick={handleGenerarLibro} 
              disabled={loading}
              variant="outline"
              className="mt-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? "Generando..." : "Libro Registro CSV"}
            </Button>
          </div>

          {/* Resultado de validación */}
          {validacion && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {validacion.valida ? (
                    <>
                      <Shield className="w-5 h-5 text-green-600" />
                      Validación Exitosa
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Errores Detectados
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant={validacion.valida ? "default" : "destructive"}>
                      {validacion.valida ? "VÁLIDA" : "ERRORES"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Total facturas: {validacion.totalFacturas}
                    </span>
                  </div>

                  {validacion.errores.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Errores encontrados:</h4>
                      {validacion.errores.map((error: any, index: number) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="font-medium">{error.numero_factura}</p>
                          <p className="text-sm text-red-600">{error.error}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Información sobre Verifactu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Información Verifactu 2025
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">✅ Funcionalidades Implementadas</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Numeración secuencial conforme (FAC-YYYY-001-001-########)</li>
                <li>• Cálculo automático de IVA (21%)</li>
                <li>• Hash en cadena SHA256</li>
                <li>• Datos fiscales completos</li>
                <li>• Exportación JSON Verifactu</li>
                <li>• Generación de PDFs oficiales</li>
                <li>• Protección de inmutabilidad (RLS)</li>
                <li>• Libro registro CSV para AEAT</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">🔧 Configuración Requerida</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Actualizar datos del emisor en BD</li>
                <li>• Configurar NIF de clientes</li>
                <li>• Verificar tipos de IVA por producto</li>
                <li>• Implementar firma electrónica (opcional)</li>
                <li>• Conexión con AEAT (futuro)</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Normativa Verifactu 2025</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Este sistema cumple con los requisitos del Real Decreto de facturación electrónica 
                  y está preparado para la implementación obligatoria del sistema Verifactu de la AEAT.
                  La integridad de las facturas está garantizada mediante hash en cadena.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};