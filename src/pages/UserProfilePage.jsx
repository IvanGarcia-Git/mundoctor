import React from 'react';
import { UserProfile } from '@clerk/clerk-react';
import { useClerkAppearance } from '@/components/ClerkThemeProvider';

const UserProfilePage = () => {
  const { appearance, isDarkMode } = useClerkAppearance();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Gestionar Cuenta
            </h1>
            <p className={`mt-2 transition-colors duration-300 ${
              isDarkMode ? 'text-slate-400' : 'text-gray-600'
            }`}>
              Administra tu información personal y configuración de seguridad
            </p>
          </div>
          
          <div className={`rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
            isDarkMode 
              ? 'bg-slate-800 border border-slate-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <UserProfile 
              routing="path"
              path="/perfil"
              appearance={appearance}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;