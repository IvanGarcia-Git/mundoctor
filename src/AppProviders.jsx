import React from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { ClerkAuthProvider } from '@/contexts/ClerkAuthContext';
import ErrorBoundary, { ClerkErrorBoundary } from '@/components/ErrorBoundary';

const AppProviders = ({ children }) => {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="mundoctor-theme">
        <ClerkErrorBoundary>
          <ClerkAuthProvider>
            {children}
            <Toaster />
          </ClerkAuthProvider>
        </ClerkErrorBoundary>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
