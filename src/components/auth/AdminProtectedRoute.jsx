import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminProtectedRoute = ({ children }) => {
  const { user, isLoaded } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  // Debug logging
  console.log('AdminProtectedRoute - User data:', {
    user: user ? {
      id: user.id,
      publicMetadata: user.publicMetadata,
      unsafeMetadata: user.unsafeMetadata
    } : null,
    isLoaded
  });

  // Get user role from metadata - handle both publicMetadata and unsafeMetadata
  const userRole = user?.publicMetadata?.role || user?.unsafeMetadata?.role || 'patient';
  
  // Ensure userRole is a string
  const safeUserRole = typeof userRole === 'string' ? userRole : String(userRole || 'patient');
  
  console.log('AdminProtectedRoute - Role info:', { userRole, safeUserRole });

  // Check if user is admin
  if (safeUserRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Acceso Denegado</h3>
                  <p className="text-sm mt-1">
                    Esta página requiere permisos de administrador. Tu rol actual es: <span className="font-medium">{safeUserRole}</span>
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = '/dev-controls'}
                    className="w-full"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Ir a Controles de Desarrollo
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.location.href = '/'}
                    className="w-full"
                  >
                    Volver al Inicio
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

export default AdminProtectedRoute;