import { useUser } from '@clerk/clerk-react';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';
import { getSimulatedVerificationStatus, clearSimulatedVerificationData, forceUpdateVerificationStatus } from '@/utils/verificationUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function VerificationDebug() {
  const { user } = useUser();
  const { verificationStatus, statusSource, refreshVerificationStatus } = useVerificationStatus();

  if (!user) return null;

  const clerkStatus = user.unsafeMetadata?.professionalData?.verificationStatus;
  const simulatedStatus = getSimulatedVerificationStatus(user.id);

  const handleClearSimulation = () => {
    clearSimulatedVerificationData(user.id);
    refreshVerificationStatus();
  };

  const handleForceApproved = () => {
    forceUpdateVerificationStatus(user.id, 'approved');
  };

  const handleForceRejected = () => {
    forceUpdateVerificationStatus(user.id, 'rejected');
  };

  const handleForcePending = () => {
    forceUpdateVerificationStatus(user.id, 'pending');
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <h4 className="font-semibold text-sm mb-2">Fuente del Estado:</h4>
            <Badge variant={statusSource === 'database' ? 'default' : 'outline'}>
              {statusSource}
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
            <RefreshCw className="w-4 h-4 mr-2" />
            Refrescar Estado
          </Button>
          <Button 
            onClick={handleForceApproved}
            variant="outline"
            size="sm"
            className="text-green-700 border-green-300"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Forzar Aprobado
          </Button>
          <Button 
            onClick={handleForceRejected}
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Forzar Rechazado
          </Button>
          <Button 
            onClick={handleForcePending}
            variant="outline"
            size="sm"
            className="text-yellow-700 border-yellow-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Forzar Pendiente
          </Button>
        </div>

        <p className="text-xs text-orange-600">
          Este componente solo se muestra en desarrollo para debugging.
        </p>
      </CardContent>
    </Card>
  );
}