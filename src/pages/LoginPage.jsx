import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/ClerkAuthContext';
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, LogIn as LogInIcon, Mail, FacebookIcon } from 'lucide-react';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e, role) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulación de login
    await new Promise(resolve => setTimeout(resolve, 1000));

    let userData = null;
    if (role === 'patient' && email === 'paciente@example.com' && password === 'password') {
      userData = { id: 'user1', name: 'Paciente Ejemplo', email, role: 'patient' };
    } else if (role === 'professional' && email === 'profesional@example.com' && password === 'password') {
      userData = { id: 'prof1', name: 'Dr. Ejemplo', email, role: 'professional', subscriptionPlanId: 'basic' };
    } else if (email === 'admin@example.com' && password === 'password') {
      userData = { id: 'admin1', name: 'Admin User', email, role: 'admin' };
    }

    if (userData) {
      if (rememberMe) {
        // Aquí implementaríamos la lógica para recordar al usuario
        localStorage.setItem('rememberMe', 'true');
      }
      
      login(userData, navigate);
      toast({
        title: "Inicio de sesión exitoso",
        description: `¡Bienvenido de nuevo, ${userData.name}!`,
      });
    } else {
      setError('Correo electrónico o contraseña incorrectos.');
      toast({
        title: "Error de inicio de sesión",
        description: "Correo electrónico o contraseña incorrectos.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleSocialLogin = (provider) => {
    toast({
      title: "Próximamente",
      description: `El inicio de sesión con ${provider} estará disponible pronto.`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold text-foreground mb-2">Iniciar Sesión</CardTitle>
            <CardDescription className="text-muted-foreground">
              Selecciona tu tipo de cuenta para comenzar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="patient" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="patient">Paciente</TabsTrigger>
                <TabsTrigger value="professional">Profesional</TabsTrigger>
              </TabsList>

              {['patient', 'professional'].map((role) => (
                <TabsContent key={role} value={role}>
                  <form onSubmit={(e) => handleSubmit(e, role)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-white dark:bg-slate-700/50 border-gray-300 dark:border-border/30 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Contraseña</Label>
                        <Link to="/recuperar-contrasena" className="text-sm text-primary hover:underline">
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-white dark:bg-slate-700/50 border-gray-300 dark:border-border/30 focus:border-primary pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rememberMe"
                        checked={rememberMe}
                        onCheckedChange={setRememberMe}
                      />
                      <Label
                        htmlFor="rememberMe"
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Recordarme en este dispositivo
                      </Label>
                    </div>

                    {error && <p className="text-sm text-destructive text-center">{error}</p>}

                    <Button type="submit" className="w-full py-6 bg-primary hover:bg-primary/90" disabled={isLoading}>
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-background border-t-transparent rounded-full mr-2"
                        />
                      ) : (
                        <LogInIcon size={20} className="mr-2" />
                      )}
                      {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </Button>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-border/30"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-card px-2 text-muted-foreground">o continúa con</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSocialLogin('Google')}
                      >
                        <Mail size={18} className="mr-2" />
                        Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSocialLogin('Facebook')}
                      >
                        <FacebookIcon size={18} className="mr-2" />
                        Facebook
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
          <CardFooter className="text-center block pt-2">
            <p className="text-sm text-muted-foreground">
              ¿No tienes una cuenta?{' '}
              <Link to="/registro" className="font-semibold text-primary hover:underline">
                Regístrate aquí
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

export default LoginPage;
