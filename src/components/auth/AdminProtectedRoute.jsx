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

  // Get user role from metadata
  const userRole = user?.unsafeMetadata?.role || 'patient';

  // Check if user is admin
  if (userRole !== 'admin') {
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
                    Esta página requiere permisos de administrador. Tu rol actual es: <span className="font-medium">{userRole}</span>
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