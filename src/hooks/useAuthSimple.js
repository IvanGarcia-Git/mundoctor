import { useAuth, useUser } from '@clerk/clerk-react';

/**
 * Hook simple que mantiene compatibilidad con el AuthContext original
 */
export const useAuthSimple = () => {
  const { isLoaded: authLoaded, isSignedIn, userId, signOut } = useAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  
  const loading = !authLoaded || !userLoaded;
  
  // Crear objeto user compatible
  const user = (isSignedIn && clerkUser) ? {
    id: clerkUser.id,
    clerk_id: userId,
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 
           clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0],
    email: clerkUser.emailAddresses?.[0]?.emailAddress,
    phone: clerkUser.phoneNumbers?.[0]?.phoneNumber,
    avatar_url: clerkUser.imageUrl,
    role: clerkUser.publicMetadata?.role || 'patient',
    verified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified'
  } : null;

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

  // Login compatible (redirige a Clerk)
  const login = (userData, navigate) => {
    console.warn('Using Clerk authentication. Redirecting to sign-in.');
    if (navigate) {
      navigate('/login');
    }
  };

  // Update user compatible
  const updateUser = async (userData) => {
    if (!clerkUser) return;
    
    try {
      if (userData.firstName || userData.lastName) {
        await clerkUser.update({
          firstName: userData.firstName || clerkUser.firstName,
          lastName: userData.lastName || clerkUser.lastName,
        });
      }

      if (userData.role) {
        await clerkUser.update({
          publicMetadata: {
            ...clerkUser.publicMetadata,
            role: userData.role
          }
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    updateUser,
    setUser: () => {}, // No-op for compatibility
    setLoading: () => {}, // No-op for compatibility
    isSignedIn,
    clerkUser
  };
};