import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, Stethoscope, ArrowRight, User } from 'lucide-react';

export default function SelectUserTypePage() {
  const [selectedType, setSelectedType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();

  const handleTypeSelection = async () => {
    if (!selectedType || !user) return;

    setIsLoading(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          userType: selectedType
        }
      });

      if (selectedType === 'patient') {
        navigate('/');
      } else if (selectedType === 'professional') {
        navigate('/registro/profesional-datos');
      }
    } catch (error) {
      console.error('Error updating user type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¿Qué tipo de cuenta necesitas?
          </h1>
          <p className="text-gray-600">
            Selecciona el tipo de cuenta que mejor se adapte a tus necesidades
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedType === 'patient' 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setSelectedType('patient')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Paciente</CardTitle>
              <CardDescription className="text-sm">
                Busca y reserva citas médicas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Buscar profesionales de la salud
                </li>
                <li className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Reservar citas médicas
                </li>
                <li className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Gestionar tu historial médico
                </li>
                <li className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Recibir recordatorios de citas
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedType === 'professional' 
                ? 'ring-2 ring-green-500 bg-green-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setSelectedType('professional')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Stethoscope className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Profesional de la Salud</CardTitle>
              <CardDescription className="text-sm">
                Gestiona tu consulta médica
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Gestionar agenda y citas
                </li>
                <li className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Administrar pacientes
                </li>
                <li className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Crear servicios médicos
                </li>
                <li className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Análisis y reportes
                </li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-700">
                  <strong>Nota:</strong> Se requiere verificación profesional
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button 
            onClick={handleTypeSelection}
            disabled={!selectedType || isLoading}
            className="min-w-48 h-12 text-lg"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Procesando...
              </div>
            ) : (
              <div className="flex items-center">
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}