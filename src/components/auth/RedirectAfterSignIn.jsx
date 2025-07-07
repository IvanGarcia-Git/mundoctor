import React, { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';

const RedirectAfterSignIn = ({ children }) => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Solo redirigir si estamos en la página principal y el usuario está autenticado
    if (isLoaded && user && location.pathname === '/') {
      const role = user.publicMetadata?.role || 'patient';
      
      // Redirigir basado en el rol del usuario
      switch (role) {
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'professional':
          navigate('/profesionales/dashboard', { replace: true });
          break;
        case 'patient':
        default:
          // Para pacientes, permanecer en la página principal
          break;
      }
    }
  }, [user, isLoaded, navigate, location.pathname]);

  return children;
};

export default RedirectAfterSignIn;