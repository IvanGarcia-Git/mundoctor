import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/ClerkAuthContext';
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, UserPlus as UserPlusIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [professionalLicense, setProfessionalLicense] = useState('');
  const [dni, setDni] = useState('');
  const [degree, setDegree] = useState(null);
  const [collegiateCard, setCollegiateCard] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedCommunications, setAcceptedCommunications] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones para continuar.');
      setIsLoading(false);
      toast({
        title: "Error de registro",
        description: "Debes aceptar los términos y condiciones para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (role === 'professional') {
      if (!professionalLicense || !dni || !degree || !collegiateCard) {
        setError('Todos los campos son obligatorios para profesionales sanitarios.');
        setIsLoading(false);
        toast({
          title: "Error de registro",
          description: "Todos los campos son obligatorios para profesionales sanitarios.",
          variant: "destructive",
        });
        return;
      }
    }

    // Simulación de registro
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      phone,
      role,
      acceptedCommunications,
      ...(role === 'professional' && {
        professionalLicense,
        dni,
        subscriptionPlanId: 'free'
      })
    };

    login(newUser, navigate);
    toast({
      title: "Registro exitoso",
      description: `¡Bienvenido a Mundoctor, ${name}! Tu cuenta ha sido creada.`,
    });
    setIsLoading(false);
  };

  const handleFileChange = (setter) => (e) => {
    const file = e.target.files[0];
    if (file) {
      setter(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold text-foreground mb-2">Crear una cuenta</CardTitle>
            <CardDescription className="text-muted-foreground">
              Elige el tipo de cuenta que deseas crear
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={role} onValueChange={setRole} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="patient">Paciente</TabsTrigger>
                <TabsTrigger value="professional">Profesional</TabsTrigger>
              </TabsList>

              <TabsContent value="patient">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold mb-4">Registro de Paciente</h2>
                    <p className="text-sm text-muted-foreground mb-6">Ingresa tus datos para crear tu cuenta de paciente</p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nombre completo</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          placeholder="Tu nombre"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          placeholder="Tu teléfono"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="nombre@ejemplo.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="password">Contraseña</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Tu contraseña"
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
                    </div>

                    <div className="space-y-4 mt-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="terms"
                          checked={acceptedTerms}
                          onCheckedChange={setAcceptedTerms}
                        />
                        <Label
                          htmlFor="terms"
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Acepto los términos y condiciones
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="communications"
                          checked={acceptedCommunications}
                          onCheckedChange={setAcceptedCommunications}
                        />
                        <Label
                          htmlFor="communications"
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Acepto recibir comunicaciones y novedades
                        </Label>
                      </div>
                    </div>

                    {error && <p className="text-sm text-destructive text-center">{error}</p>}

                    <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                      {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                    </Button>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-border/30"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-card px-2 text-muted-foreground">O CONTINUAR CON</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="w-full">
                        Google
                      </Button>
                      <Button variant="outline" className="w-full">
                        Facebook
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="professional">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold mb-4">Registro de Profesional</h2>
                    <p className="text-sm text-muted-foreground mb-6">Ingresa tus datos para crear tu cuenta de profesional</p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name-prof">Nombre completo</Label>
                        <Input
                          id="name-prof"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          placeholder="Tu nombre"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone-prof">Teléfono</Label>
                        <Input
                          id="phone-prof"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          placeholder="Tu teléfono"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email-prof">Correo electrónico</Label>
                        <Input
                          id="email-prof"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="nombre@ejemplo.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="password-prof">Contraseña</Label>
                        <div className="relative">
                          <Input
                            id="password-prof"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Tu contraseña"
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

                      <div>
                        <Label htmlFor="license">Número de Colegiado</Label>
                        <Input
                          id="license"
                          value={professionalLicense}
                          onChange={(e) => setProfessionalLicense(e.target.value)}
                          required
                          placeholder="Tu número de colegiado"
                        />
                      </div>

                      <div>
                        <Label htmlFor="dni">DNI</Label>
                        <div className="flex gap-4">
                          <Input
                            id="dni"
                            value={dni}
                            onChange={(e) => setDni(e.target.value)}
                            required
                            placeholder="Tu DNI"
                          />
                          <Button variant="secondary" type="button" className="shrink-0">
                            Seleccionar archivo
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={handleFileChange(setDni)}
                            />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="degree">Titulación Universitaria</Label>
                        <div className="flex gap-4">
                          <Input
                            id="degree"
                            type="file"
                            onChange={handleFileChange(setDegree)}
                            required
                            className="hidden"
                          />
                          <div className="flex-1 bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground">
                            {degree ? degree.name : 'Ningún archivo seleccionado'}
                          </div>
                          <Button variant="secondary" type="button" onClick={() => document.getElementById('degree').click()}>
                            Seleccionar archivo
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="collegiate">Certificado de Colegiación</Label>
                        <div className="flex gap-4">
                          <Input
                            id="collegiate"
                            type="file"
                            onChange={handleFileChange(setCollegiateCard)}
                            required
                            className="hidden"
                          />
                          <div className="flex-1 bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground">
                            {collegiateCard ? collegiateCard.name : 'Ningún archivo seleccionado'}
                          </div>
                          <Button variant="secondary" type="button" onClick={() => document.getElementById('collegiate').click()}>
                            Seleccionar archivo
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 mt-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="terms-prof"
                          checked={acceptedTerms}
                          onCheckedChange={setAcceptedTerms}
                        />
                        <Label
                          htmlFor="terms-prof"
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Acepto los términos y condiciones
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="communications-prof"
                          checked={acceptedCommunications}
                          onCheckedChange={setAcceptedCommunications}
                        />
                        <Label
                          htmlFor="communications-prof"
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Acepto recibir comunicaciones y novedades
                        </Label>
                      </div>
                    </div>

                    {error && <p className="text-sm text-destructive text-center">{error}</p>}

                    <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                      {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-center block">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
      <p className="mt-8 text-xs text-center text-muted-foreground/50">
        &copy; {new Date().getFullYear()} Mundoctor. Todos los derechos reservados.
      </p>
    </div>
  );
};

export default RegisterPage;
