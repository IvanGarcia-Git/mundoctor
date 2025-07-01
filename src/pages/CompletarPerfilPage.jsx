import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/ClerkAuthContext';
import Logo from '@/components/Logo';

const CompletarPerfilPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    birthDate: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      validateToken(token);
    } else {
      setTokenValid(false);
    }
  }, [searchParams]);

  const validateToken = (token) => {
    try {
      // Decodificar el token (simulado)
      const decoded = atob(token);
      const parts = decoded.split('_');
      
      if (parts.length === 3 && parts[2] === 'setup') {
        // Simular búsqueda de paciente
        const mockPatient = {
          id: parts[0],
          name: 'Nuevo Paciente',
          email: 'nuevo.paciente@example.com',
          phone: '600123456'
        };
        
        setPatientData(mockPatient);
        setTokenValid(true);
      } else {
        setTokenValid(false);
      }
    } catch (error) {
      setTokenValid(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validaciones
      if (!formData.password || formData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (!acceptedTerms) {
        throw new Error('Debe aceptar los términos y condiciones');
      }

      // Simular completar perfil
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Crear usuario completo
      const completeUser = {
        ...patientData,
        role: 'patient',
        profileCompleted: true,
        birthDate: formData.birthDate,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        registrationCompleted: new Date().toISOString()
      };

      // Auto-login del usuario
      login(completeUser, navigate);

      toast({
        title: "¡Perfil completado exitosamente!",
        description: "Ya puede acceder a su área de paciente y gestionar sus citas."
      });

      // Redirigir al dashboard del paciente
      navigate('/paciente/dashboard');

    } catch (error) {
      toast({
        title: "Error al completar perfil",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-background p-4">
        <Card className="w-full max-w-md shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive flex items-center justify-center gap-2">
              <AlertCircle size={24} />
              Enlace no válido
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              El enlace para completar su perfil ha expirado o no es válido.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Por favor, contacte con su médico para solicitar un nuevo enlace de configuración.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-background p-4">
      <Card className="w-full max-w-2xl shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-12 w-auto" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground dark:text-white flex items-center justify-center gap-2">
            <CheckCircle size={28} className="text-green-600" />
            Complete su perfil
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {patientData && `¡Hola ${patientData.name}! Complete su información para acceder a su área de paciente.`}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información existente (readonly) */}
            <div className="bg-muted/50 dark:bg-gray-900/50 p-4 rounded-lg">
              <h3 className="font-semibold text-foreground dark:text-white mb-3">Sus datos registrados:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nombre:</span>
                  <p className="font-medium text-foreground dark:text-white">{patientData?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium text-foreground dark:text-white">{patientData?.email}</p>
                </div>
                <div className="md:col-span-1">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <p className="font-medium text-foreground dark:text-white">{patientData?.phone}</p>
                </div>
              </div>
            </div>

            {/* Contraseña */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground dark:text-gray-300">
                  Contraseña *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white pr-10"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground dark:text-gray-300">
                  Confirmar contraseña *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                  required
                  placeholder="Repita su contraseña"
                />
              </div>
            </div>

            {/* Información adicional */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground dark:text-white">Información adicional (opcional):</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-foreground dark:text-gray-300">
                    Fecha de nacimiento
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-foreground dark:text-gray-300">
                    Dirección
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                    placeholder="Su dirección"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact" className="text-foreground dark:text-gray-300">
                    Contacto de emergencia
                  </Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                    placeholder="Nombre del contacto"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone" className="text-foreground dark:text-gray-300">
                    Teléfono de emergencia
                  </Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                    className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                    placeholder="Teléfono del contacto"
                  />
                </div>
              </div>
            </div>

            {/* Términos y condiciones */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={setAcceptedTerms}
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground dark:text-gray-400 cursor-pointer"
                >
                  Acepto los términos y condiciones de uso de Mundoctor *
                </Label>
              </div>
            </div>

            {/* Botón submit */}
            <Button 
              type="submit" 
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? 'Completando perfil...' : 'Completar perfil y acceder'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-center text-muted-foreground/50">
        &copy; {new Date().getFullYear()} Mundoctor. Todos los derechos reservados.
      </p>
    </div>
  );
};

export default CompletarPerfilPage;