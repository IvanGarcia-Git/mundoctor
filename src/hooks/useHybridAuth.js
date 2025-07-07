import { useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';

/**
 * Hook híbrido que soporta tanto localStorage como Clerk
 * Permite migración gradual sin romper funcionalidad existente
 */
export const useHybridAuth = () => {
  const { isLoaded: clerkLoaded, isSignedIn, userId } = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useClerkUser();
  
  const [legacyUser, setLegacyUser] = useState(null);
  const [isLegacyLoaded, setIsLegacyLoaded] = useState(false);
  const [migrationMode, setMigrationMode] = useState('hybrid'); // 'legacy', 'clerk', 'hybrid'

  // Load legacy user from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setLegacyUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading legacy user:', error);
      localStorage.removeItem('currentUser');
    }
    setIsLegacyLoaded(true);
  }, []);

  // Determine which auth system to use
  const getAuthState = () => {
    const isClerkReady = clerkLoaded && userLoaded;
    const isLegacyReady = isLegacyLoaded;

    // Determine loading state
    const loading = !isClerkReady || !isLegacyReady;

    // Determine authenticated state and user data
    let isAuthenticated = false;
    let user = null;
    let authMethod = 'none';

    if (!loading) {
      // Priority: Clerk > localStorage
      if (isSignedIn && clerkUser) {
        isAuthenticated = true;
        authMethod = 'clerk';
        user = {
          id: clerkUser.id,
          clerk_id: userId,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 
                 clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0],
          email: clerkUser.emailAddresses?.[0]?.emailAddress,
          phone: clerkUser.phoneNumbers?.[0]?.phoneNumber,
          avatar_url: clerkUser.imageUrl,
          role: clerkUser.publicMetadata?.role || 'patient',
          verified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified',
          source: 'clerk'
        };
      } else if (legacyUser) {
        isAuthenticated = true;
        authMethod = 'legacy';
        user = {
          ...legacyUser,
          source: 'localStorage'
        };
      }
    }

    return {
      loading,
      isAuthenticated,
      user,
      authMethod,
      clerkUser,
      legacyUser,
      isClerkReady,
      isLegacyReady
    };
  };

  // Migration helpers
  const migrateToClerk = async () => {
    if (!legacyUser) {
      console.warn('No legacy user to migrate');
      return false;
    }

    if (!isSignedIn) {
      console.warn('User must be signed in with Clerk to migrate');
      return false;
    }

    try {
      // Update Clerk user with legacy data
      if (legacyUser.name && clerkUser) {
        const [firstName, ...lastNameParts] = legacyUser.name.split(' ');
        await clerkUser.update({
          firstName: firstName || '',
          lastName: lastNameParts.join(' ') || '',
        });
      }

      // Update public metadata with role
      if (legacyUser.role && clerkUser) {
        await clerkUser.update({
          publicMetadata: {
            ...clerkUser.publicMetadata,
            role: legacyUser.role,
            migratedFrom: 'localStorage',
            migrationDate: new Date().toISOString()
          }
        });
      }

      // Clear localStorage after successful migration
      localStorage.removeItem('currentUser');
      setLegacyUser(null);
      
      console.log('✅ Migration to Clerk completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error migrating to Clerk:', error);
      return false;
    }
  };

  const clearLegacyData = () => {
    localStorage.removeItem('currentUser');
    setLegacyUser(null);
  };

  // Legacy compatibility functions
  const legacyLogin = (userData, navigate) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setLegacyUser(userData);
    
    if (navigate) {
      const redirectUrl = getRoleRedirectUrl(userData.role);
      navigate(redirectUrl);
    }
  };

  const legacyLogout = (navigate) => {
    localStorage.removeItem('currentUser');
    setLegacyUser(null);
    
    if (navigate) {
      navigate('/login');
    }
  };

  const getRoleRedirectUrl = (role) => {
    switch (role) {
      case 'professional':
        return '/profesionales/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'patient':
      default:
        return '/';
    }
  };

  const hasRole = (user, requiredRole) => {
    if (!user) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  };

  const authState = getAuthState();

  return {
    ...authState,
    
    // Migration functions
    migrateToClerk,
    clearLegacyData,
    setMigrationMode,
    migrationMode,
    
    // Legacy compatibility
    legacyLogin,
    legacyLogout,
    
    // Helpers
    getRoleRedirectUrl,
    hasRole: (requiredRole) => hasRole(authState.user, requiredRole),
    
    // Debug info
    debug: {
      clerkLoaded,
      userLoaded,
      isLegacyLoaded,
      isSignedIn,
      hasLegacyUser: !!legacyUser,
      hasClerkUser: !!clerkUser
    }
  };
};