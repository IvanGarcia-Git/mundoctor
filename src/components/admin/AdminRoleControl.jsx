import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, Crown, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AdminRoleControl() {
  const { user } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const currentRole = user?.unsafeMetadata?.role || 'patient';

  const updateRole = async (newRole) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          role: newRole,
          roleUpdatedAt: new Date().toISOString(),
          roleUpdatedBy: 'self_assignment' // En producción esto sería controlado por backend
        }
      });

      toast({
        title: "Rol Actualizado",
        description: `Tu rol ha sido cambiado a ${newRole}. Recarga la página para ver los cambios.`
      });

      // Reload to update route protections
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      patient: <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Shield className="w-3 h-3 mr-1" />Paciente</Badge>,
      professional: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><ShieldCheck className="w-3 h-3 mr-1" />Profesional</Badge>,
      admin: <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Crown className="w-3 h-3 mr-1" />Administrador</Badge>
    };
    return badges[role] || badges.patient;
  };

  return (
    <Card className="w-full max-w-md mx-auto mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Control de Roles</CardTitle>
        <CardDescription>
          Simulador para cambiar roles durante las pruebas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Rol actual:</span>
          {getRoleBadge(currentRole)}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => updateRole('admin')}
            disabled={isUpdating || currentRole === 'admin'}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="sm"
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Crown className="w-4 h-4 mr-2" />
            )}
            Convertirse en Admin
          </Button>

          <Button
            onClick={() => updateRole('professional')}
            disabled={isUpdating || currentRole === 'professional'}
            className="w-full bg-green-600 hover:bg-green-700"
            size="sm"
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            Convertirse en Profesional
          </Button>

          <Button
            onClick={() => updateRole('patient')}
            disabled={isUpdating || currentRole === 'patient'}
            variant="outline"
            className="w-full"
            size="sm"
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Convertirse en Paciente
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Este control solo está disponible para pruebas. En producción, solo los administradores autorizados pueden asignar roles.
        </p>
      </CardContent>
    </Card>
  );
}