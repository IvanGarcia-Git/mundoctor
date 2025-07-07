import { useAuth, useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

/**
 * Hook que proporciona una interfaz compatible con el AuthContext original
 * pero usando Clerk como backend de autenticación
 */
export const useClerkAuth = () => {
  const { isLoaded: authLoaded, isSignedIn, userId, signOut } = useAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Actualizar estado del usuario cuando Clerk cargue
  useEffect(() => {
    if (!authLoaded || !userLoaded) {
      setLoading(true);
      return;
    }

    if (isSignedIn && clerkUser) {
      const userData = {
        id: clerkUser.id,
        clerk_id: userId,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 
               clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0],
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        phone: clerkUser.phoneNumbers?.[0]?.phoneNumber,
        avatar_url: clerkUser.imageUrl,
        role: clerkUser.publicMetadata?.role || 'patient',
        verified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified'
      };
      
      setUser(userData);
    } else {
      setUser(null);
    }
    
    setLoading(false);
  }, [authLoaded, userLoaded, isSignedIn, clerkUser, userId]);

  // Función de login compatible (para backward compatibility)
  const login = (userData, navigate) => {
    console.warn('login() function is deprecated when using Clerk. Use Clerk SignIn component instead.');
    if (navigate) {
      navigate('/login');
    }
  };

  // Función de logout
  const logout = async (navigate) => {
    try {
      await signOut();
      if (navigate) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Actualizar usuario
  const updateUser = async (userData) => {
    if (!clerkUser) {
      console.warn('Cannot update user: not signed in with Clerk');
      return;
    }

    try {
      // Actualizar Clerk user si es necesario
      if (userData.firstName || userData.lastName) {
        await clerkUser.update({
          firstName: userData.firstName || clerkUser.firstName,
          lastName: userData.lastName || clerkUser.lastName,
        });
      }

      // Actualizar public metadata si incluye role
      if (userData.role) {
        await clerkUser.update({
          publicMetadata: {
            ...clerkUser.publicMetadata,
            role: userData.role
          }
        });
      }

      // Actualizar estado local
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);

    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  // Helper function para verificar roles
  const hasRole = (requiredRole) => {
    if (!user) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  };

  // Helper function para verificar autenticación
  const isAuthenticated = () => {
    return isSignedIn && !!user;
  };

  return {
    // Interfaz compatible con AuthContext original
    user,
    loading,
    login,
    logout,
    updateUser,
    setUser,
    setLoading: () => {}, // No-op para compatibilidad
    
    // Funciones adicionales
    hasRole,
    isAuthenticated,
    
    // Datos de Clerk
    clerkUser,
    isSignedIn,
    userId,
    authLoaded,
    userLoaded
  };
};