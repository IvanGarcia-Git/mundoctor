import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const LoginPageClerk = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20 overflow-hidden">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold text-foreground mb-2">
              Bienvenido a Mundoctor
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Inicia sesión para acceder a tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SignIn 
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-none bg-transparent",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "bg-white dark:bg-slate-700 border border-gray-300 dark:border-border/30 hover:bg-gray-50 dark:hover:bg-slate-600 text-foreground",
                  socialButtonsBlockButtonText: "text-foreground text-sm font-medium",
                  dividerLine: "bg-border",
                  dividerText: "text-muted-foreground text-xs",
                  formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
                  formFieldInput: "bg-white dark:bg-slate-700/50 border-gray-300 dark:border-border/30 focus:border-primary",
                  formFieldLabel: "text-foreground",
                  identityPreviewText: "text-foreground",
                  identityPreviewEditButton: "text-primary hover:text-primary/80",
                  footerActionText: "text-muted-foreground",
                  footerActionLink: "text-primary hover:text-primary/80 font-semibold",
                  footer: "hidden" // Hide default footer to add custom one
                },
                variables: {
                  colorPrimary: "hsl(var(--primary))",
                  colorTextOnPrimaryBackground: "hsl(var(--primary-foreground))",
                  colorBackground: "transparent",
                  colorInputBackground: "hsl(var(--background))",
                  colorInputText: "hsl(var(--foreground))",
                  colorText: "hsl(var(--foreground))",
                  colorTextSecondary: "hsl(var(--muted-foreground))",
                  borderRadius: "0.375rem",
                  fontFamily: "inherit"
                }
              }}
              fallbackRedirectUrl="/dashboard"
              redirectUrl="/dashboard"
              signUpUrl="/registro"
            />
          </CardContent>
        </Card>
        
        {/* Custom footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground/70">
            ¿No tienes una cuenta?{' '}
            <a 
              href="/registro" 
              className="font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Regístrate aquí
            </a>
          </p>
        </div>
        
        <p className="mt-8 text-xs text-center text-muted-foreground/50">
          &copy; {new Date().getFullYear()} Mundoctor. Todos los derechos reservados.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPageClerk;