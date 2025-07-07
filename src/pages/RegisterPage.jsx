import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-2xl bg-white/90 dark:bg-card/80 backdrop-blur-lg border-gray-200/50 dark:border-border/20 rounded-lg",
              headerTitle: "text-2xl font-bold text-foreground",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton: "bg-white dark:bg-slate-700/50 border-gray-300 dark:border-border/30 hover:bg-gray-50 dark:hover:bg-slate-600/50 text-foreground",
              socialButtonsBlockButtonText: "text-foreground font-medium",
              formFieldInput: "bg-white dark:bg-slate-700/50 border-gray-300 dark:border-border/30 focus:border-primary text-foreground",
              formFieldLabel: "text-foreground font-medium",
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5",
              footerActionLink: "text-primary hover:text-primary/80 font-medium",
              formFieldErrorText: "text-destructive",
              dividerLine: "bg-border",
              dividerText: "text-muted-foreground",
              identityPreviewText: "text-foreground",
              identityPreviewEditButtonIcon: "text-muted-foreground",
              formFieldSuccessText: "text-green-600 dark:text-green-400",
              alertClerkAPIResponseMessage: "text-destructive",
              formFieldWarningText: "text-yellow-600 dark:text-yellow-400",
              formHeaderTitle: "text-foreground",
              formHeaderSubtitle: "text-muted-foreground",
              socialButtonsProviderIcon: "brightness-100",
              otpCodeFieldInput: "bg-white dark:bg-slate-700/50 border-gray-300 dark:border-border/30 text-foreground",
              formResendCodeLink: "text-primary hover:text-primary/80",
              formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
              footer: "bg-transparent",
              footerPages: "bg-transparent",
              footerAction: "bg-transparent",
              footerActionText: "text-foreground",
              footerActionLink: "text-primary hover:text-primary/80",
              selectButton: "bg-white dark:bg-slate-700/50 border-gray-300 dark:border-border/30 text-foreground",
              selectSearchInput: "bg-white dark:bg-slate-700/50 border-gray-300 dark:border-border/30 text-foreground",
              selectOption: "text-foreground hover:bg-gray-50 dark:hover:bg-slate-600/50",
            },
            layout: {
              socialButtonsPlacement: "top",
              showOptionalFields: true,
            },
            variables: {
              colorPrimary: "#3b82f6",
              colorBackground: "transparent",
              colorInputBackground: "#ffffff",
              colorInputText: "#0f172a",
              borderRadius: "0.5rem",
            }
          }}
          routing="path"
          path="/registro"
          signInUrl="/login"
          redirectUrl="/"
          afterSignUpUrl="/seleccionar-tipo-usuario"
          verifyEmailAddressUrl="/registro/verify-email-address"
          unsafeMetadata={{
            role: 'patient' // Rol por defecto para nuevos usuarios
          }}
        />
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

export default RegisterPage;