import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import ProfessionalsPage from '@/pages/ProfessionalsPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ContactPage from '@/pages/ContactPage';
import SearchResultsPage from '@/pages/SearchResultsPage';
import ProfessionalProfilePage from '@/pages/ProfessionalProfilePage';
import BlogPage from '@/pages/BlogPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminUserManagementPage from '@/pages/admin/AdminUserManagementPage';
import AdminSubscriptionManagementPage from '@/pages/admin/AdminSubscriptionManagementPage';
import AdminValidationPage from '@/pages/admin/AdminValidationPage';
import AdminDiscountCodesPage from '@/pages/admin/AdminDiscountCodesPage';
import CreateDiscountCodePage from '@/pages/admin/CreateDiscountCodePage';
import SupportTicketsPage from '@/pages/admin/SupportTicketsPage';
import ProfessionalDashboardPage from '@/pages/professional/ProfessionalDashboardPage'; 
import ProfessionalAppointmentsPage from '@/pages/professional/ProfessionalAppointmentsPage';
import ProfessionalPatientsPage from '@/pages/professional/ProfessionalPatientsPage';
import ProfessionalEditProfilePage from '@/pages/professional/ProfessionalEditProfilePage';
import ProfessionalAnalyticsPage from '@/pages/professional/ProfessionalAnalyticsPage';
import ProfessionalSettingsPage from '@/pages/professional/ProfessionalSettingsPage';
import ProfessionalSubscriptionPage from '@/pages/professional/ProfessionalSubscriptionPage';
import ProfessionalServicesPage from '@/pages/professional/ProfessionalServicesPage';
import ProfessionalValoracionesPage from '@/pages/professional/ProfessionalValoracionesPage';
import PatientDashboardPage from '@/pages/patient/PatientDashboardPage';
import PatientAppointmentsPage from '@/pages/patient/PatientAppointmentsPage';
import PatientProfilePage from '@/pages/patient/PatientProfilePage';
import PatientReviewsPage from '@/pages/patient/PatientReviewsPage';
import ComingSoonPage from '@/pages/ComingSoonPage.jsx';
import CompletarPerfilPage from '@/pages/CompletarPerfilPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import { useUser } from '@clerk/clerk-react';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoaded } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-screen"><p>Cargando...</p></div>;
  }

  // Get user role from metadata
  const userRole = user?.publicMetadata?.role || 'patient';
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" state={{ from: location }} replace />; 
  }

  return (
    <>
      <SignedIn>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

const AppRoutes = () => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-screen"><p>Inicializando aplicación...</p></div>;
  }
  
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/profesionales" element={<ProfessionalsPage />} />
      <Route path="/profesional/:id" element={<ProfessionalProfilePage />} />
      
      <Route path="/login" element={
        user ? (
          <Navigate to={
            user.publicMetadata?.role === 'professional' ? "/profesionales/dashboard" : 
            (user.publicMetadata?.role === 'admin' ? "/admin/dashboard" : "/")
          } replace />
        ) : <LoginPage />
      } />
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/registro" element={
        user ? (
          <Navigate to={
            user.publicMetadata?.role === 'professional' ? "/profesionales/dashboard" : 
            (user.publicMetadata?.role === 'admin' ? "/admin/dashboard" : "/")
          } replace />
        ) : <RegisterPage />
      } />
      <Route path="/registro/*" element={<RegisterPage />} />
      <Route path="/registro/verify-email-address" element={<VerifyEmailPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      
      <Route path="/contacto" element={<ContactPage />} />
      <Route path="/buscar" element={<SearchResultsPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/completar-perfil" element={<CompletarPerfilPage />} />

      {/* Patient Area Routes */}
      <Route path="/paciente" element={<ProtectedRoute allowedRoles={['patient']}><Navigate to="/paciente/dashboard" replace /></ProtectedRoute>} />
      <Route 
        path="/paciente/dashboard" 
        element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboardPage /></ProtectedRoute>} 
      />
      <Route 
        path="/paciente/citas" 
        element={<ProtectedRoute allowedRoles={['patient']}><PatientAppointmentsPage /></ProtectedRoute>} 
      />
      <Route 
        path="/paciente/perfil" 
        element={<ProtectedRoute allowedRoles={['patient']}><PatientProfilePage /></ProtectedRoute>} 
      />
      <Route 
        path="/paciente/resenas" 
        element={<ProtectedRoute allowedRoles={['patient']}><PatientReviewsPage /></ProtectedRoute>} 
      />

      {/* Professional Area Routes */}
      <Route 
        path="/profesionales/dashboard" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalDashboardPage /></ProtectedRoute>} 
      />
      <Route 
        path="/profesionales/citas" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalAppointmentsPage /></ProtectedRoute>} 
      />
      <Route 
        path="/profesionales/pacientes" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalPatientsPage /></ProtectedRoute>} 
      />
       <Route 
        path="/profesionales/perfil" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalEditProfilePage /></ProtectedRoute>} 
      />
       <Route 
        path="/profesionales/servicios" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalServicesPage /></ProtectedRoute>} 
      />
       <Route 
        path="/profesionales/suscripcion" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalSubscriptionPage /></ProtectedRoute>} 
      />
       <Route 
        path="/profesionales/servicios" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalServicesPage /></ProtectedRoute>} 
      />
       <Route 
        path="/profesionales/estadisticas" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalAnalyticsPage /></ProtectedRoute>} 
      />
       <Route 
        path="/profesionales/configuracion" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalSettingsPage /></ProtectedRoute>} 
      />
      <Route 
        path="/profesionales/valoraciones" 
        element={<ProtectedRoute allowedRoles={['professional']}><ProfessionalValoracionesPage /></ProtectedRoute>} 
      />


      {/* Admin Area Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>} />
      <Route 
        path="/admin/dashboard" 
        element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardPage /></ProtectedRoute>} 
      />
      <Route 
        path="/admin/usuarios" 
        element={<ProtectedRoute allowedRoles={['admin']}><AdminUserManagementPage /></ProtectedRoute>} 
      />
      <Route 
        path="/admin/suscripciones" 
        element={<ProtectedRoute allowedRoles={['admin']}><AdminSubscriptionManagementPage /></ProtectedRoute>} 
      />
      <Route 
        path="/admin/validaciones" 
        element={<ProtectedRoute allowedRoles={['admin']}><AdminValidationPage /></ProtectedRoute>} 
      />
      <Route 
        path="/admin/tickets" 
        element={<ProtectedRoute allowedRoles={['admin']}><SupportTicketsPage /></ProtectedRoute>} 
      />
      <Route 
        path="/admin/descuentos" 
        element={<ProtectedRoute allowedRoles={['admin']}><AdminDiscountCodesPage /></ProtectedRoute>} 
      />
      <Route 
        path="/admin/configuracion" 
        element={<ProtectedRoute allowedRoles={['admin']}><ComingSoonPage title="Configuración General del Sitio" /></ProtectedRoute>} 
      />


      <Route path="/terminos" element={<ComingSoonPage title="Términos y Condiciones" />} />
      <Route path="/privacidad" element={<ComingSoonPage title="Política de Privacidad" />} />
      <Route path="/cookies" element={<ComingSoonPage title="Política de Cookies" />} />

      <Route path="*" element={<ComingSoonPage title="Página no encontrada (404)" />} />
    </Routes>
  );
};

export default AppRoutes;
