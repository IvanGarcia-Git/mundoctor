import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import ProfessionalsPage from '@/pages/ProfessionalsPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ContactPage from '@/pages/ContactPage';
import SearchResultsPage from '@/pages/SearchResultsPage';
import ProfessionalProfilePage from '@/pages/ProfessionalProfilePage';
import BlogPage from '@/pages/BlogPage';
import ComingSoonPage from '@/pages/ComingSoonPage.jsx';
import CompletarPerfilPage from '@/pages/CompletarPerfilPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import SelectUserTypePage from '@/pages/SelectUserTypePage';
import ProfessionalDataPage from '@/pages/ProfessionalDataPage';
import ProfessionalVerificationPendingPage from '@/pages/ProfessionalVerificationPendingPage';
import DevControlsPage from '@/pages/DevControlsPage';

// Lazy load dashboard pages for better performance
const AdminDashboardPage = React.lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUserManagementPage = React.lazy(() => import('@/pages/admin/AdminUserManagementPage'));
const AdminSubscriptionManagementPage = React.lazy(() => import('@/pages/admin/AdminSubscriptionManagementPage'));
const AdminValidationPage = React.lazy(() => import('@/pages/admin/AdminValidationPage'));
const AdminDiscountCodesPage = React.lazy(() => import('@/pages/admin/AdminDiscountCodesPage'));
const CreateDiscountCodePage = React.lazy(() => import('@/pages/admin/CreateDiscountCodePage'));
const SupportTicketsPage = React.lazy(() => import('@/pages/admin/SupportTicketsPage'));

const ProfessionalDashboardPage = React.lazy(() => import('@/pages/professional/ProfessionalDashboardPage')); 
const ProfessionalAppointmentsPage = React.lazy(() => import('@/pages/professional/ProfessionalAppointmentsPage'));
const ProfessionalPatientsPage = React.lazy(() => import('@/pages/professional/ProfessionalPatientsPage'));
const ProfessionalEditProfilePage = React.lazy(() => import('@/pages/professional/ProfessionalEditProfilePage'));
const ProfessionalAnalyticsPage = React.lazy(() => import('@/pages/professional/ProfessionalAnalyticsPage'));
const ProfessionalSettingsPage = React.lazy(() => import('@/pages/professional/ProfessionalSettingsPage'));
const ProfessionalSubscriptionPage = React.lazy(() => import('@/pages/professional/ProfessionalSubscriptionPage'));
const ProfessionalServicesPage = React.lazy(() => import('@/pages/professional/ProfessionalServicesPage'));
const ProfessionalValoracionesPage = React.lazy(() => import('@/pages/professional/ProfessionalValoracionesPage'));

const PatientDashboardPage = React.lazy(() => import('@/pages/patient/PatientDashboardPage'));
const PatientAppointmentsPage = React.lazy(() => import('@/pages/patient/PatientAppointmentsPage'));
const PatientProfilePage = React.lazy(() => import('@/pages/patient/PatientProfilePage'));
const PatientReviewsPage = React.lazy(() => import('@/pages/patient/PatientReviewsPage'));
import { useUser } from '@clerk/clerk-react';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Cargando página...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoaded } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-screen"><p>Cargando...</p></div>;
  }

  // Get user role from metadata
  const userRole = user?.unsafeMetadata?.role || 'patient';
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" state={{ from: location }} replace />; 
  }

  // Check if professional is verified for professional routes
  if (userRole === 'professional' && allowedRoles?.includes('professional')) {
    const verificationStatus = user?.unsafeMetadata?.professionalData?.verificationStatus;
    
    // If professional is not verified, redirect to verification pending page
    if (verificationStatus !== 'approved') {
      return <Navigate to="/profesional/verificacion-pendiente" replace />;
    }
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
            user.unsafeMetadata?.role === 'professional' ? "/profesionales/dashboard" : 
            (user.unsafeMetadata?.role === 'admin' ? "/admin/dashboard" : "/")
          } replace />
        ) : <LoginPage />
      } />
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/registro" element={
        user ? (
          <Navigate to={
            user.unsafeMetadata?.role === 'professional' ? "/profesionales/dashboard" : 
            (user.unsafeMetadata?.role === 'admin' ? "/admin/dashboard" : "/")
          } replace />
        ) : <RegisterPage />
      } />
      <Route path="/registro/*" element={<RegisterPage />} />
      <Route path="/registro/verify-email-address" element={<VerifyEmailPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/seleccionar-tipo-usuario" element={<SelectUserTypePage />} />
      <Route path="/registro/profesional-datos" element={<ProfessionalDataPage />} />
      <Route path="/profesional/verificacion-pendiente" element={<ProfessionalVerificationPendingPage />} />
      <Route path="/dev-controls" element={<DevControlsPage />} />
      
      <Route path="/contacto" element={<ContactPage />} />
      <Route path="/buscar" element={<SearchResultsPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/completar-perfil" element={<CompletarPerfilPage />} />

      {/* Patient Area Routes */}
      <Route path="/paciente" element={<ProtectedRoute allowedRoles={['patient']}><Navigate to="/paciente/dashboard" replace /></ProtectedRoute>} />
      <Route 
        path="/paciente/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <Suspense fallback={<PageLoader />}>
              <PatientDashboardPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/paciente/citas" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <Suspense fallback={<PageLoader />}>
              <PatientAppointmentsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/paciente/perfil" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <Suspense fallback={<PageLoader />}>
              <PatientProfilePage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/paciente/resenas" 
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <Suspense fallback={<PageLoader />}>
              <PatientReviewsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />

      {/* Professional Area Routes */}
      <Route 
        path="/profesionales/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['professional']}>
            <Suspense fallback={<PageLoader />}>
              <ProfessionalDashboardPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profesionales/citas" 
        element={
          <ProtectedRoute allowedRoles={['professional']}>
            <Suspense fallback={<PageLoader />}>
              <ProfessionalAppointmentsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profesionales/pacientes" 
        element={
          <ProtectedRoute allowedRoles={['professional']}>
            <Suspense fallback={<PageLoader />}>
              <ProfessionalPatientsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
       <Route 
        path="/profesionales/perfil" 
        element={
          <ProtectedRoute allowedRoles={['professional']}>
            <Suspense fallback={<PageLoader />}>
              <ProfessionalEditProfilePage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
       <Route 
        path="/profesionales/servicios" 
        element={
          <ProtectedRoute allowedRoles={['professional']}>
            <Suspense fallback={<PageLoader />}>
              <ProfessionalServicesPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
       <Route 
        path="/profesionales/suscripcion" 
        element={
          <ProtectedRoute allowedRoles={['professional']}>
            <Suspense fallback={<PageLoader />}>
              <ProfessionalSubscriptionPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
       <Route 
        path="/profesionales/estadisticas" 
        element={
          <ProtectedRoute allowedRoles={['professional']}>
            <Suspense fallback={<PageLoader />}>
              <ProfessionalAnalyticsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
       <Route 
        path="/profesionales/configuracion" 
        element={
          <ProtectedRoute allowedRoles={['professional']}>
            <Suspense fallback={<PageLoader />}>
              <ProfessionalSettingsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profesionales/valoraciones" 
        element={
          <ProtectedRoute allowedRoles={['professional']}>
            <Suspense fallback={<PageLoader />}>
              <ProfessionalValoracionesPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />


      {/* Admin Area Routes */}
      <Route path="/admin" element={<AdminProtectedRoute><Navigate to="/admin/dashboard" replace /></AdminProtectedRoute>} />
      <Route 
        path="/admin/dashboard" 
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AdminDashboardPage />
            </Suspense>
          </AdminProtectedRoute>
        } 
      />
      <Route 
        path="/admin/usuarios" 
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AdminUserManagementPage />
            </Suspense>
          </AdminProtectedRoute>
        } 
      />
      <Route 
        path="/admin/suscripciones" 
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AdminSubscriptionManagementPage />
            </Suspense>
          </AdminProtectedRoute>
        } 
      />
      <Route 
        path="/admin/validaciones" 
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AdminValidationPage />
            </Suspense>
          </AdminProtectedRoute>
        } 
      />
      <Route 
        path="/admin/tickets" 
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <SupportTicketsPage />
            </Suspense>
          </AdminProtectedRoute>
        } 
      />
      <Route 
        path="/admin/descuentos" 
        element={
          <AdminProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AdminDiscountCodesPage />
            </Suspense>
          </AdminProtectedRoute>
        } 
      />
      <Route 
        path="/admin/configuracion" 
        element={<AdminProtectedRoute><ComingSoonPage title="Configuración General del Sitio" /></AdminProtectedRoute>} 
      />


      <Route path="/terminos" element={<ComingSoonPage title="Términos y Condiciones" />} />
      <Route path="/privacidad" element={<ComingSoonPage title="Política de Privacidad" />} />
      <Route path="/cookies" element={<ComingSoonPage title="Política de Cookies" />} />

      <Route path="*" element={<ComingSoonPage title="Página no encontrada (404)" />} />
    </Routes>
  );
};

export default AppRoutes;
