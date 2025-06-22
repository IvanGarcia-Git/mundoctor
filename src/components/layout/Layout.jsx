
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SidebarNav from '@/components/layout/SidebarNav';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SidebarNav />
      <div className="flex flex-col min-h-screen md:ml-[70px] transition-all duration-300">
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
