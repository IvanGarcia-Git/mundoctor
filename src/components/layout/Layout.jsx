
import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SidebarNav from '@/components/layout/SidebarNav';
import { useAuth } from '@/contexts/ClerkAuthContext';

const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Define dashboard paths
  const dashboardPaths = [
    '/admin/dashboard',
    '/profesionales/dashboard',
    '/paciente/dashboard',
  ];

  // Check if the current path is a dashboard path
  const isDashboardPath = dashboardPaths.some(path => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {user && <SidebarNav />}
      <div className={`flex flex-col min-h-screen ${user && !isDashboardPath ? 'md:ml-[70px]' : ''} transition-all duration-300`}>
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
