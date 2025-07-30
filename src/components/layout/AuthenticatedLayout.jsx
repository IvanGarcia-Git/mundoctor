import React from 'react';
import { useAuth } from '@/contexts/ClerkAuthContext';
import ProfessionalSidebar from '@/components/professional/ProfessionalSidebar';
import PatientSidebar from '@/components/patient/PatientSidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';

const AuthenticatedLayout = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content - Full width without secondary sidebar */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthenticatedLayout;
