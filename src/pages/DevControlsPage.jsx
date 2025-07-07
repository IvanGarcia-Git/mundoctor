import { useUser } from '@clerk/clerk-react';
import AdminRoleControl from '@/components/admin/AdminRoleControl';
import ProfessionalVerificationControl from '@/components/admin/ProfessionalVerificationControl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Code, Settings, AlertTriangle } from 'lucide-react';

export default function DevControlsPage() {
  const { user } = useUser();

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Code className="w-8 h-8 text-primary mr-3" />
            <h1 className="text-3xl font-bold">Controles de Desarrollo</h1>
          </div>
          <p className="text-muted-foreground">
            Panel para probar diferentes roles y funcionalidades durante el desarrollo
          </p>
        </header>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Aviso:</strong> Esta página es solo para pruebas y desarrollo. En producción, 
            los roles son asignados por administradores autorizados únicamente.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Role Control */}
          <div>
            <AdminRoleControl />
          </div>

          {/* Professional Verification Control */}
          <div>
            <ProfessionalVerificationControl />
          </div>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Información del Usuario
            </CardTitle>
            <CardDescription>
              Información actual del usuario en Clerk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-semibold">ID:</span> {user.id}</p>
                <p><span className="font-semibold">Email:</span> {user.emailAddresses[0]?.emailAddress}</p>
                <p><span className="font-semibold">Nombre:</span> {user.firstName} {user.lastName}</p>
              </div>
              <div>
                <p><span className="font-semibold">Rol:</span> {user.unsafeMetadata?.role || 'No definido'}</p>
                <p><span className="font-semibold">Estado Profesional:</span> {user.unsafeMetadata?.professionalData?.verificationStatus || 'N/A'}</p>
                <p><span className="font-semibold">Registrado:</span> {new Date(user.createdAt).toLocaleDateString('es-ES')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Help */}
        <Card>
          <CardHeader>
            <CardTitle>Enlaces Rápidos para Pruebas</CardTitle>
            <CardDescription>
              Rutas importantes para probar diferentes funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold mb-2">👨‍⚕️ Rutas de Admin</h4>
                <ul className="text-sm space-y-1">
                  <li><a href="/admin/dashboard" className="text-blue-600 hover:underline">/admin/dashboard</a></li>
                  <li><a href="/admin/validaciones" className="text-blue-600 hover:underline">/admin/validaciones</a></li>
                  <li><a href="/admin/usuarios" className="text-blue-600 hover:underline">/admin/usuarios</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🩺 Rutas de Profesional</h4>
                <ul className="text-sm space-y-1">
                  <li><a href="/profesionales/dashboard" className="text-blue-600 hover:underline">/profesionales/dashboard</a></li>
                  <li><a href="/registro/profesional-datos" className="text-blue-600 hover:underline">/registro/profesional-datos</a></li>
                  <li><a href="/profesional/verificacion-pendiente" className="text-blue-600 hover:underline">/verificacion-pendiente</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">👤 Rutas de Paciente</h4>
                <ul className="text-sm space-y-1">
                  <li><a href="/paciente/dashboard" className="text-blue-600 hover:underline">/paciente/dashboard</a></li>
                  <li><a href="/seleccionar-tipo-usuario" className="text-blue-600 hover:underline">/seleccionar-tipo-usuario</a></li>
                  <li><a href="/" className="text-blue-600 hover:underline">/ (home)</a></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}