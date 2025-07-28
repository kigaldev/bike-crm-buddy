import { CheckCircle, Building, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingSuccessProps {
  onContinue: () => void;
}

export function OnboardingSuccess({ onContinue }: OnboardingSuccessProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-12 pb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-4">
            ¡Empresa creada exitosamente!
          </h1>
          
          <p className="text-muted-foreground mb-8">
            Tu cuenta empresarial está lista. Ya puedes comenzar a gestionar tu taller de bicicletas.
          </p>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Empresa configurada</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Aplicaciones básicas activadas</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Cuenta de administrador asignada</span>
            </div>
          </div>

          <Button 
            onClick={onContinue}
            size="lg"
            className="w-full"
          >
            Ir al Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}