import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

export default function ProfessionalVerificationControl() {
  const { user } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatus = user?.unsafeMetadata?.professionalData?.verificationStatus || 'pending';

  const updateVerificationStatus = async (newStatus) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          professionalData: {
            ...user.unsafeMetadata.professionalData,
            verificationStatus: newStatus,
            verifiedAt: newStatus === 'approved' ? new Date().toISOString() : null,
            verifiedBy: newStatus === 'approved' ? 'admin_simulation' : null
          }
        }
      });

      // Force page reload to trigger route protection logic
      window.location.reload();
    } catch (error) {
      console.error('Error updating verification status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>,
      approved: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Aprobado</Badge>,
      rejected: <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rechazado</Badge>
    };
    return badges[status] || badges.pending;
  };

  // Only show this component for users with professional role
  if (user?.unsafeMetadata?.role !== 'professional') {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Control de Verificación</CardTitle>
        <CardDescription>
          Simulador de administración para pruebas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Estado actual:</span>
          {getStatusBadge(currentStatus)}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => updateVerificationStatus('approved')}
            disabled={isUpdating || currentStatus === 'approved'}
            className="w-full bg-green-600 hover:bg-green-700"
            size="sm"
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Aprobar Verificación
          </Button>

          <Button
            onClick={() => updateVerificationStatus('rejected')}
            disabled={isUpdating || currentStatus === 'rejected'}
            variant="destructive"
            className="w-full"
            size="sm"
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Rechazar Verificación
          </Button>

          <Button
            onClick={() => updateVerificationStatus('pending')}
            disabled={isUpdating || currentStatus === 'pending'}
            variant="outline"
            className="w-full"
            size="sm"
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            Restablecer a Pendiente
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Este control solo está disponible para pruebas. En producción, solo los administradores pueden cambiar el estado de verificación.
        </p>
      </CardContent>
    </Card>
  );
}