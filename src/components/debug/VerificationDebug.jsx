import { useUser } from '@clerk/clerk-react';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';
import { getSimulatedVerificationStatus, clearSimulatedVerificationData } from '@/utils/clerkSimulation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, Trash2 } from 'lucide-react';

export default function VerificationDebug() {
  const { user } = useUser();
  const { verificationStatus, refreshVerificationStatus } = useVerificationStatus();

  if (!user) return null;

  const clerkStatus = user.unsafeMetadata?.professionalData?.verificationStatus;
  const simulatedStatus = getSimulatedVerificationStatus(user.id);

  const handleClearSimulation = () => {
    clearSimulatedVerificationData(user.id);
    refreshVerificationStatus();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center text-orange-800">
          <Bug className="w-5 h-5 mr-2" />
          Debug: Estado de Verificación
        </CardTitle>
        <CardDescription className="text-orange-700">
          Información detallada del estado de verificación para debugging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Estado en Clerk:</h4>
            <Badge variant={clerkStatus === 'approved' ? 'default' : 'secondary'}>
              {clerkStatus || 'No definido'}
            </Badge>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Estado Simulado:</h4>
            <Badge variant={simulatedStatus === 'approved' ? 'default' : 'secondary'}>
              {simulatedStatus || 'No definido'}
            </Badge>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Estado Final Usado:</h4>
          <Badge variant={verificationStatus === 'approved' ? 'default' : 'destructive'}>
            {verificationStatus || 'No definido'}
          </Badge>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Metadata Completo:</h4>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(user.unsafeMetadata, null, 2)}
          </pre>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleClearSimulation}
            variant="outline"
            size="sm"
            className="text-orange-700 border-orange-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpiar Simulación
          </Button>
          <Button 
            onClick={refreshVerificationStatus}
            variant="outline"
            size="sm"
            className="text-orange-700 border-orange-300"
          >
            Refrescar Estado
          </Button>
        </div>

        <p className="text-xs text-orange-600">
          Este componente solo se muestra en desarrollo para debugging.
        </p>
      </CardContent>
    </Card>
  );
}