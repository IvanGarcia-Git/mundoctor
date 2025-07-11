import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, AlertCircle, Mail, Phone, FileText, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';
import VerificationDebug from '@/components/debug/VerificationDebug';

export default function ProfessionalVerificationPendingPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { verificationStatus, refreshVerificationStatus } = useVerificationStatus();

  // Check verification status and redirect if approved
  useEffect(() => {
    if (verificationStatus === 'approved') {
      navigate('/profesionales/dashboard');
    }
  }, [verificationStatus, navigate]);

  const handleLogout = () => {
    navigate('/');
  };

  const handleContactSupport = () => {
    // This could open a support ticket or redirect to contact page
    navigate('/contacto');
  };

  const handleRefreshStatus = () => {
    refreshVerificationStatus();
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Clock className="w-16 h-16 text-yellow-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'pending':
        return {
          title: '¡Cuenta Creada Exitosamente!',
          subtitle: 'Tu documentación está siendo verificada',
          description: 'Hemos recibido tu documentación profesional y nuestro equipo la está revisando cuidadosamente.',
          timeframe: 'Este proceso generalmente toma entre 24-48 horas hábiles.'
        };
      case 'approved':
        return {
          title: '¡Verificación Completada!',
          subtitle: 'Tu cuenta profesional ha sido aprobada',
          description: 'Felicitaciones, ya puedes acceder a todas las funcionalidades profesionales.',
          timeframe: 'Serás redirigido automáticamente...'
        };
      case 'rejected':
        return {
          title: 'Verificación Requiere Atención',
          subtitle: 'Necesitamos información adicional',
          description: 'Algunos de tus documentos requieren corrección o información adicional.',
          timeframe: 'Por favor contacta con soporte para más detalles.'
        };
      default:
        return {
          title: 'Verificando Información',
          subtitle: 'Procesando tu solicitud...',
          description: 'Por favor espera mientras verificamos tu información.',
          timeframe: ''
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        
        {/* Debug Component */}
        <VerificationDebug />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
        <Card className="shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              {getStatusIcon()}
            </motion.div>
            
            <CardTitle className="text-3xl font-bold text-foreground mb-2">
              {statusInfo.title}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              {statusInfo.subtitle}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Status Description */}
            <div className="text-center space-y-4">
              <p className="text-foreground leading-relaxed">
                {statusInfo.description}
              </p>
              {statusInfo.timeframe && (
                <p className="text-sm text-muted-foreground font-medium">
                  {statusInfo.timeframe}
                </p>
              )}
            </div>

            {/* Information Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>Notificación por Email</strong><br />
                  Te enviaremos un email cuando tu cuenta sea verificada.
                </AlertDescription>
              </Alert>

              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Documentos Enviados</strong><br />
                  • Número de colegiado<br />
                  • DNI y documentación<br />
                  • Certificados profesionales
                </AlertDescription>
              </Alert>
            </div>

            {/* What happens next */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                ¿Qué sucede después?
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Nuestro equipo verificará tu número de colegiado con el registro oficial
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Validaremos tus certificados y documentos de identidad
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Una vez aprobado, tendrás acceso completo al panel profesional
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={handleRefreshStatus}
                variant="default" 
                className="flex-1 h-12"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verificar Estado
              </Button>
              
              <Button 
                onClick={handleContactSupport}
                variant="outline" 
                className="flex-1 h-12"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contactar Soporte
              </Button>
              
              <Button 
                onClick={handleLogout}
                variant="ghost" 
                className="flex-1 h-12"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Volver al Inicio
              </Button>
            </div>

            {/* Professional Info */}
            {user?.unsafeMetadata?.professionalData && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground text-center">
                  Solicitud enviada el {new Date(user.unsafeMetadata.professionalData.submittedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  );
}