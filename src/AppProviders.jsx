import React from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';

const AppProviders = ({ children }) => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="mundoctor-theme">
      {children}
      <Toaster />
    </ThemeProvider>
  );
};

export default AppProviders;
