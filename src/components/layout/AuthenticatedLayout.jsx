import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProfessionalSidebar from '@/components/professional/ProfessionalSidebar';
import PatientSidebar from '@/components/patient/PatientSidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';

const AuthenticatedLayout = ({ children }) => {
  const { user } = useAuth();
  const renderSidebar = () => {
    if (!user) return null;

    switch (user.role) {
      case 'professional':
        return <ProfessionalSidebar />;
      case 'patient':
        return <PatientSidebar />;
      case 'admin':
        return <AdminSidebar />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="hidden md:flex">
        {renderSidebar()}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthenticatedLayout;
