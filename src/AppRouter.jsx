
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import AppRoutes from '@/AppRoutes';
import { Toaster } from "@/components/ui/toaster";

const AppRouter = () => {
  return (
    <Router>
      <Layout>
        <AppRoutes />
        <Toaster />
      </Layout>
    </Router>
  );
};

export default AppRouter;
