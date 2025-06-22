import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';

const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="mundoctor-theme">
        {children}
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default AppProviders;
