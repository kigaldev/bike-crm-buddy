import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserRole } from "@/hooks/useAuth";
import { CheckCircle2, XCircle, RefreshCw, Hammer, ShieldCheck } from "lucide-react";

interface TestStatusItem {
  codigo: string;
  activo: boolean;
}

interface VerificacionResultado {
  empresas: {
    alfa_existe: boolean;
    beta_existe: boolean;
    alfa_id?: string | null;
    beta_id?: string | null;
  };
  roles_usuario: {
    alfa_admin_y_qa: boolean;
    beta_admin_y_qa: boolean;
  };
  tests: {
    alfa: TestStatusItem[];
    beta: TestStatusItem[];
  };
  apps_defecto: {
    alfa: boolean;
    beta: boolean;
  };
}

const REQUIRED_TESTS = ["ping_api", "permisos_basicos", "ui_smoke", "flujo_factura"];

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-2 text-primary">
      <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
      <span className="sr-only">OK</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-destructive">
      <XCircle className="h-5 w-5 text-destructive" aria-hidden />
      <span className="sr-only">Error</span>
    </span>
  );
}

export default function QaSetup() {
  const { toast } = useToast();
  const currentRole = useCurrentUserRole();

  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [resultado, setResultado] = useState<VerificacionResultado | null>(null);

  const allOk = useMemo(() => {
    if (!resultado) return false;
    const testsOk = (arr: TestStatusItem[]) =>
      REQUIRED_TESTS.every((c) => arr.find((t) => t.codigo === c && t.activo));
    return (
      resultado.empresas.alfa_existe &&
      resultado.empresas.beta_existe &&
      resultado.roles_usuario.alfa_admin_y_qa &&
      resultado.roles_usuario.beta_admin_y_qa &&
      testsOk(resultado.tests.alfa) &&
      testsOk(resultado.tests.beta) &&
      resultado.apps_defecto.alfa &&
      resultado.apps_defecto.beta
    );
  }, [resultado]);

  const setSeo = () => {
    document.title = "QA Setup – Entorno de pruebas";
    const desc = "Verificación del entorno de pruebas (Empresa Alfa/Beta, roles, tests, apps).";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + "/qa/setup";
  };

  useEffect(() => {
    setSeo();
    // Auto-verificar al abrir
    handleVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("verificar_entorno_pruebas");
      if (error) throw error;
      setResultado(data as VerificacionResultado);
      toast({ title: "Verificación completada" });
    } catch (err: any) {
      console.error("Error verificando entorno:", err);
      toast({ title: "Error al verificar", description: err.message ?? "Intenta nuevamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async () => {
    setRepairing(true);
    try {
      const { data, error } = await (supabase as any).rpc("reparar_entorno_pruebas");
      if (error) throw error;
      setResultado((data?.verificacion_post ?? null) as VerificacionResultado);
      toast({ title: "Entorno reparado" });
    } catch (err: any) {
      console.error("Error reparando entorno:", err);
      toast({ title: "Error al reparar", description: err.message ?? "Intenta nuevamente", variant: "destructive" });
    } finally {
      setRepairing(false);
    }
  };

  const handleReset = async () => {
    setRepairing(true);
    try {
      const { data, error } = await (supabase as any).rpc("reset_entorno_pruebas");
      if (error) throw error;
      await handleVerify();
      toast({ title: "Entorno reseteado" });
      return data;
    } catch (err: any) {
      console.error("Error reseteando entorno:", err);
      toast({ title: "Error al resetear", description: err.message ?? "Intenta nuevamente", variant: "destructive" });
      return null;
    } finally {
      setRepairing(false);
    }
  };

  const handlePrecargar = async () => {
    setRepairing(true);
    try {
      const { error } = await (supabase as any).rpc("precargar_tests_demo");
      if (error) throw error;
      await handleVerify();
      toast({ title: "Datos demo precargados" });
    } catch (err: any) {
      console.error("Error precargando demo:", err);
      toast({ title: "No se pudo precargar", description: err.message ?? "Intenta nuevamente", variant: "destructive" });
    } finally {
      setRepairing(false);
    }
  };

  const handleVolverInicial = async () => {
    setRepairing(true);
    try {
      const { data, error } = await (supabase as any).rpc("volver_estado_inicial");
      if (error) throw error;
      await handleVerify();
      toast({ title: "Estado inicial restaurado" });
      return data;
    } catch (err: any) {
      console.error("Error volviendo a estado inicial:", err);
      toast({ title: "Error al restaurar", description: err.message ?? "Intenta nuevamente", variant: "destructive" });
      return null;
    } finally {
      setRepairing(false);
    }
  };

  const roleStr = String(currentRole ?? '');
  const unauthorized = roleStr !== 'admin' && roleStr !== 'qa';

  const renderTestSummary = (items: TestStatusItem[]) => {
    return (
      <div className="flex flex-wrap gap-2">
        {REQUIRED_TESTS.map((code) => {
          const found = items?.find((t) => t.codigo === code);
          const ok = !!found?.activo;
          return (
            <span key={code} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${ok ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}`}>
              {code}
              <StatusIcon ok={ok} />
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">QA Setup – Verificación del entorno de pruebas</h1>
        <p className="text-sm text-muted-foreground">Comprueba empresas demo, roles, tests y apps por defecto. Repara con un clic si algo falla.</p>
      </header>

      {unauthorized ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" />
              <p>Acceso restringido. Solo perfiles admin o qa.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="default" onClick={handleVerify} disabled={loading || repairing}>
              <RefreshCw className="h-4 w-4 mr-2" /> Verificar
            </Button>
            <Button variant="secondary" onClick={handleRepair} disabled={loading || repairing || allOk}>
              <Hammer className="h-4 w-4 mr-2" /> Reparar
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={loading || repairing}>Resetear entorno</Button>
              <Button variant="outline" onClick={handlePrecargar} disabled={loading || repairing}>Precargar datos demo</Button>
              <Button variant="outline" onClick={handleVolverInicial} disabled={loading || repairing}>Volver a estado inicial</Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprobación</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Empresa Alfa existe</TableCell>
                    <TableCell>
                      <StatusIcon ok={!!resultado?.empresas.alfa_existe} />
                    </TableCell>
                    <TableCell>
                      {!resultado?.empresas.alfa_existe && (
                        <Button size="sm" variant="secondary" onClick={handleRepair} disabled={repairing}>Reparar</Button>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Empresa Beta existe</TableCell>
                    <TableCell>
                      <StatusIcon ok={!!resultado?.empresas.beta_existe} />
                    </TableCell>
                    <TableCell>
                      {!resultado?.empresas.beta_existe && (
                        <Button size="sm" variant="secondary" onClick={handleRepair} disabled={repairing}>Reparar</Button>
                      )}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>Usuario admin y qa en Empresa Alfa</TableCell>
                    <TableCell>
                      <StatusIcon ok={!!resultado?.roles_usuario.alfa_admin_y_qa} />
                    </TableCell>
                    <TableCell>
                      {!resultado?.roles_usuario.alfa_admin_y_qa && (
                        <Button size="sm" variant="secondary" onClick={handleRepair} disabled={repairing}>Reparar</Button>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Usuario admin y qa en Empresa Beta</TableCell>
                    <TableCell>
                      <StatusIcon ok={!!resultado?.roles_usuario.beta_admin_y_qa} />
                    </TableCell>
                    <TableCell>
                      {!resultado?.roles_usuario.beta_admin_y_qa && (
                        <Button size="sm" variant="secondary" onClick={handleRepair} disabled={repairing}>Reparar</Button>
                      )}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>Tests demo activos en Empresa Alfa</TableCell>
                    <TableCell>{resultado ? renderTestSummary(resultado.tests.alfa) : null}</TableCell>
                    <TableCell>
                      {resultado && REQUIRED_TESTS.some((c) => !resultado.tests.alfa?.find((t) => t.codigo === c && t.activo)) && (
                        <Button size="sm" variant="secondary" onClick={handleRepair} disabled={repairing}>Reparar</Button>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Tests demo activos en Empresa Beta</TableCell>
                    <TableCell>{resultado ? renderTestSummary(resultado.tests.beta) : null}</TableCell>
                    <TableCell>
                      {resultado && REQUIRED_TESTS.some((c) => !resultado.tests.beta?.find((t) => t.codigo === c && t.activo)) && (
                        <Button size="sm" variant="secondary" onClick={handleRepair} disabled={repairing}>Reparar</Button>
                      )}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>Apps por defecto activas (Empresa Alfa)</TableCell>
                    <TableCell>
                      <StatusIcon ok={!!resultado?.apps_defecto.alfa} />
                    </TableCell>
                    <TableCell>
                      {!resultado?.apps_defecto.alfa && (
                        <Button size="sm" variant="secondary" onClick={handleRepair} disabled={repairing}>Reparar</Button>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Apps por defecto activas (Empresa Beta)</TableCell>
                    <TableCell>
                      <StatusIcon ok={!!resultado?.apps_defecto.beta} />
                    </TableCell>
                    <TableCell>
                      {!resultado?.apps_defecto.beta && (
                        <Button size="sm" variant="secondary" onClick={handleRepair} disabled={repairing}>Reparar</Button>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
