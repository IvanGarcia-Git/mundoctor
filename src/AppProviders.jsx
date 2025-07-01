import React from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { ClerkAuthProvider } from '@/contexts/ClerkAuthContext';

const AppProviders = ({ children }) => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="mundoctor-theme">
      <ClerkAuthProvider>
        {children}
        <Toaster />
      </ClerkAuthProvider>
    </ThemeProvider>
  );
};

export default AppProviders;
