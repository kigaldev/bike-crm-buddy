import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/hooks/useEmpresaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FacturaSaas {
  id: string;
  numero_factura: string;
  fecha_factura: string;
  periodo_inicio: string;
  periodo_fin: string;
  concepto: string;
  importe_total: number;
  estado: string;
  stripe_payment_status: string;
  archivo_pdf: string | null;
  apps: {
    nombre: string;
    codigo: string;
  };
}

export function FacturasSaasList() {
  const { empresaActual } = useEmpresa();
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

  const { data: facturas, isLoading, refetch } = useQuery({
    queryKey: ['facturas-saas', empresaActual?.id],
    queryFn: async () => {
      if (!empresaActual?.id) return [];

      const { data, error } = await supabase
        .from('facturas_saas')
        .select(`
          id,
          numero_factura,
          fecha_factura,
          periodo_inicio,
          periodo_fin,
          concepto,
          importe_total,
          estado,
          stripe_payment_status,
          archivo_pdf,
          apps (
            nombre,
            codigo
          )
        `)
        .eq('empresa_id', empresaActual.id)
        .order('fecha_factura', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!empresaActual?.id,
  });

  const generatePdf = async (facturaId: string) => {
    setIsGeneratingPdf(facturaId);
    try {
      const { error } = await supabase.functions.invoke('generate-saas-invoice-pdf', {
        body: { facturaId }
      });

      if (error) throw error;

      toast({
        title: "PDF generado",
        description: "El PDF de la factura ha sido generado correctamente",
      });

      // Refrescar la lista
      refetch();
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF de la factura",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  const downloadPdf = async (archivo_pdf: string, numero_factura: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .download(archivo_pdf);

      if (error) throw error;

      // Crear URL para descarga
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${numero_factura}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Descarga iniciada",
        description: "El PDF se está descargando",
      });
    } catch (error) {
      console.error('Error descargando PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF",
        variant: "destructive",
      });
    }
  };

  const getEstadoBadge = (estado: string, paymentStatus: string) => {
    if (paymentStatus === 'paid' && estado === 'generada') {
      return <Badge variant="default" className="bg-green-500">Pagada</Badge>;
    }
    if (paymentStatus === 'failed') {
      return <Badge variant="destructive">Pago Fallido</Badge>;
    }
    if (estado === 'pendiente') {
      return <Badge variant="outline">Pendiente</Badge>;
    }
    if (estado === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    }
    return <Badge variant="secondary">{estado}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Facturas SaaS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Facturas de Suscripción SaaS
        </CardTitle>
      </CardHeader>
      <CardContent>
        {facturas && facturas.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturas.map((factura) => (
                <TableRow key={factura.id}>
                  <TableCell className="font-mono">
                    {factura.numero_factura}
                  </TableCell>
                  <TableCell>
                    {new Date(factura.fecha_factura).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{factura.apps.nombre}</div>
                      <div className="text-sm text-muted-foreground">
                        {factura.concepto}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(factura.periodo_inicio).toLocaleDateString('es-ES')} -{' '}
                      {new Date(factura.periodo_fin).toLocaleDateString('es-ES')}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    €{Number(factura.importe_total).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {getEstadoBadge(factura.estado, factura.stripe_payment_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {factura.archivo_pdf ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPdf(factura.archivo_pdf!, factura.numero_factura)}
                        >
                          <Download className="w-4 h-4" />
                          Descargar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePdf(factura.id)}
                          disabled={isGeneratingPdf === factura.id}
                        >
                          {isGeneratingPdf === factura.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          Generar PDF
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No hay facturas SaaS</h3>
            <p className="text-sm text-muted-foreground">
              Las facturas se generarán automáticamente cuando se procesen los pagos de Stripe
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}