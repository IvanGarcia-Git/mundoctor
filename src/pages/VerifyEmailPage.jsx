import React, { useState, useEffect } from 'react';
import { useSignUp, useClerk } from '@clerk/clerk-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';

const VerifyEmailPage = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { handleEmailLinkVerification } = useClerk();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // States
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState('code'); // 'code' or 'link'
  const [isResendingCode, setIsResendingCode] = useState(false);

  // Check if this is an email link verification
  useEffect(() => {
    const verifyEmailLink = async () => {
      // Check if URL contains verification parameters
      const ticket = searchParams.get('ticket');
      const status = searchParams.get('status');
      
      if (ticket || status) {
        setVerificationMethod('link');
        setIsVerifying(true);
        
        try {
          await handleEmailLinkVerification({
            redirectUrl: '/dashboard',
            redirectUrlComplete: '/'
          });
          
          setSuccess(true);
          setIsVerifying(false);
          
          // Redirect after successful verification
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } catch (err) {
          console.error('Email link verification error:', err);
          setError('Error al verificar el enlace del email. Por favor intenta con el código de verificación.');
          setVerificationMethod('code');
          setIsVerifying(false);
        }
      }
    };

    if (isLoaded) {
      verifyEmailLink();
    }
  }, [isLoaded, handleEmailLinkVerification, navigate, searchParams]);

  // Handle code verification
  const handleCodeVerification = async (e) => {
    e.preventDefault();
    
    if (!isLoaded || !signUp) {
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        setSuccess(true);
        
        // Redirect based on user role
        const userRole = signUpAttempt.createdUserId ? 'patient' : 'patient'; // Default to patient
        setTimeout(() => {
          if (userRole === 'professional') {
            navigate('/profesionales/dashboard');
          } else if (userRole === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/');
          }
        }, 2000);
      } else {
        setError('Verificación incompleta. Por favor intenta nuevamente.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      
      if (err.errors && err.errors[0]) {
        const errorCode = err.errors[0].code;
        if (errorCode === 'form_code_incorrect') {
          setError('Código incorrecto. Por favor verifica e intenta nuevamente.');
        } else if (errorCode === 'verification_expired') {
          setError('El código ha expirado. Por favor solicita uno nuevo.');
        } else {
          setError(err.errors[0].message || 'Error al verificar el código.');
        }
      } else {
        setError('Error al verificar el código. Por favor intenta nuevamente.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (!isLoaded || !signUp) {
      return;
    }

    setIsResendingCode(true);
    setError('');

    try {
      await signUp.prepareEmailAddressVerification({ 
        strategy: 'email_code' 
      });
      
      setError(''); // Clear any previous errors
      // Show success message briefly
      setError('Código enviado exitosamente. Revisa tu email.');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      console.error('Resend code error:', err);
      setError('Error al enviar el código. Por favor intenta nuevamente.');
    } finally {
      setIsResendingCode(false);
    }
  };

  // Loading state for email link verification
  if (verificationMethod === 'link' && isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Logo className="h-12 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Verificando Email</CardTitle>
              <CardDescription className="text-muted-foreground">
                Verificando tu dirección de correo electrónico...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Por favor espera mientras verificamos tu email.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Logo className="h-12 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                ¡Email Verificado!
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Tu cuenta ha sido creada exitosamente
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-700 dark:text-green-300">
                  Bienvenido a Mundoctor. Serás redirigido automáticamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Code verification form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Verificar Email
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Ingresa el código de verificación que enviamos a tu correo electrónico
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleCodeVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Código de Verificación</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="Ej: 123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono bg-white dark:bg-slate-700/50 border-gray-300 dark:border-border/30 focus:border-primary"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Revisa tu bandeja de entrada y carpeta de spam
                </p>
              </div>

              {error && (
                <Alert variant={error.includes('exitosamente') ? 'default' : 'destructive'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full py-6 bg-primary hover:bg-primary/90" 
                disabled={isVerifying || !verificationCode.trim()}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verificar Email
                  </>
                )}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  ¿No recibiste el código?
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={isResendingCode}
                  className="text-primary hover:text-primary/80"
                >
                  {isResendingCode ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    'Reenviar código'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-center text-muted-foreground/50"
      >
        &copy; {new Date().getFullYear()} Mundoctor. Todos los derechos reservados.
      </motion.p>
    </div>
  );
};

export default VerifyEmailPage;