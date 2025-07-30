import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

// Create a context to provide the appearance configuration
const ClerkAppearanceContext = createContext(null);

export const useClerkAppearance = () => {
  const context = useContext(ClerkAppearanceContext);
  if (!context) {
    throw new Error('useClerkAppearance must be used within ClerkThemeProvider');
  }
  return context;
};

const ClerkThemeProvider = ({ children }) => {
  const { theme } = useTheme();
  const [appearance, setAppearance] = useState(null);
  const [systemTheme, setSystemTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  
  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Determine the effective theme based on current theme setting
  const getEffectiveTheme = () => {
    if (theme === 'system') {
      return systemTheme;
    }
    return theme;
  };

  const effectiveTheme = getEffectiveTheme();
  const isDarkMode = effectiveTheme === 'dark';

  // Update appearance configuration when theme changes
  useEffect(() => {
    const newAppearance = {
      baseTheme: undefined, // Using custom CSS variables instead of predefined themes
      variables: {
        // Primary colors
        colorPrimary: isDarkMode ? '#3b82f6' : '#1e40af',
        colorPrimaryForeground: '#ffffff',
        
        // Background colors
        colorBackground: isDarkMode ? '#0f172a' : '#ffffff',
        colorInputBackground: isDarkMode ? '#1e293b' : '#ffffff',
        
        // Text colors with high contrast  
        colorText: isDarkMode ? '#ffffff' : '#111827',
        colorTextSecondary: isDarkMode ? '#e5e7eb' : '#374151',
        colorTextOnPrimaryBackground: '#ffffff',
        
        // Neutral colors
        colorNeutral: isDarkMode ? '#475569' : '#e2e8f0',
        colorInputBorder: isDarkMode ? '#475569' : '#d1d5db',
        
        // Status colors
        colorSuccess: isDarkMode ? '#22c55e' : '#16a34a',
        colorDanger: isDarkMode ? '#ef4444' : '#dc2626',
        colorWarning: isDarkMode ? '#f59e0b' : '#d97706',
        
        // Layout and typography
        borderRadius: '0.5rem',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '0.875rem',
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        },
        
        // Spacing
        spacingUnit: '1rem'
      },
      elements: {
        // Root container
        rootBox: 'w-full',
        
        // Main card styling
        card: isDarkMode 
          ? 'shadow-none border-0' 
          : 'shadow-none border-0',
        
        // Header and navigation
        header: isDarkMode 
          ? 'border-b' 
          : 'border-b',
        
        navbar: isDarkMode 
          ? 'border-b px-6 py-4' 
          : 'border-b px-6 py-4',
        
        navbarButton: 'rounded-md px-3 py-2 transition-colors',
        navbarButtonActive: 'rounded-md px-3 py-2',
        
        // Form elements
        formButtonPrimary: 'font-medium py-2 px-4 rounded-md transition-colors',
        formFieldInput: 'rounded-md transition-colors',
        
        formFieldLabel: 'font-medium',
        
        // Profile and identity elements
        identityPreview: 'rounded-lg p-4',
        profileSection: '',
        profileSectionTitle: 'font-semibold text-lg',
        profileSectionContent: '',
        
        // Badges and status indicators
        badge: '',
        
        // Page layout
        page: 'bg-transparent p-6',
        pageScrollBox: 'bg-transparent',
        
        // Modal and overlay elements
        modalContent: '',
        modalCloseButton: 'transition-colors',
        
        // Additional elements
        accordionTriggerButton: 'transition-colors',
        dividerLine: '',
        dividerText: ''
      }
    };

    setAppearance(newAppearance);
  }, [isDarkMode, theme, systemTheme]);

  const contextValue = {
    appearance,
    isDarkMode,
    effectiveTheme
  };

  return (
    <ClerkAppearanceContext.Provider value={contextValue}>
      {children}
    </ClerkAppearanceContext.Provider>
  );
};

export default ClerkThemeProvider;