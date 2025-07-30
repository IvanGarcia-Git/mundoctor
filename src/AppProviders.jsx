import React from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { ClerkAuthProvider } from '@/contexts/ClerkAuthContext';
import ClerkThemeProvider from '@/components/ClerkThemeProvider';
import ErrorBoundary, { ClerkErrorBoundary } from '@/components/ErrorBoundary';

const AppProviders = ({ children }) => {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="mundoctor-theme">
        <ClerkErrorBoundary>
          <ClerkThemeProvider>
            <ClerkAuthProvider>
              {children}
              <Toaster />
            </ClerkAuthProvider>
          </ClerkThemeProvider>
        </ClerkErrorBoundary>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
