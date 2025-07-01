
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import AppRoutes from '@/AppRoutes';
import { Toaster } from "@/components/ui/toaster";
import RedirectAfterSignIn from '@/components/auth/RedirectAfterSignIn';

const AppRouter = () => {
  return (
    <Router>
      <RedirectAfterSignIn>
        <Layout>
          <AppRoutes />
          <Toaster />
        </Layout>
      </RedirectAfterSignIn>
    </Router>
  );
};

export default AppRouter;
