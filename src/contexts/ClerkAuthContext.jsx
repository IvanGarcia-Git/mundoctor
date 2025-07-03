import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuthHook, useUser as useClerkUser } from '@clerk/clerk-react';
// Note: API calls will be handled directly with fetch + window.Clerk.session.getToken()
import { isMigrationNeeded, performMigration } from '@/utils/migrateUserData';

const ClerkAuthContext = createContext(null);

export const ClerkAuthProvider = ({ children }) => {
  const { isLoaded: clerkLoaded, isSignedIn, userId, signOut: clerkSignOut } = useClerkAuthHook();
  const { user: clerkUser, isLoaded: userLoaded } = useClerkUser();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendUser, setBackendUser] = useState(null);

  // Fetch user data from our backend when Clerk user is available
  const fetchBackendUser = async (clerkUserId) => {
    try {
      // Try to fetch user from backend API first
      const token = await window.Clerk?.session?.getToken();
      if (token) {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const userData = await response.json();
        
        if (response.ok && userData && userData.data) {
          setBackendUser(userData.data);
          setUser(userData.data);
          return userData.data;
        }
      }
      
      // If no backend data, check for migration
      if (isMigrationNeeded()) {
        console.log('Migration needed, performing automatic migration...');
        const migrationResult = await performMigration();
        if (migrationResult.success) {
          console.log('Migration completed, fetching updated user data...');
          const token = await window.Clerk?.session?.getToken();
          if (token) {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/users/profile`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            const updatedUser = await response.json();
            if (response.ok && updatedUser && updatedUser.data) {
              setBackendUser(updatedUser.data);
              setUser(updatedUser.data);
              return updatedUser.data;
            }
          }
        }
      }
      
      // Fallback: create user object from Clerk data
      const fallbackUser = {
        id: clerkUser?.id,
        clerk_id: clerkUserId,
        name: `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || 
               clerkUser?.emailAddresses?.[0]?.emailAddress?.split('@')[0],
        email: clerkUser?.emailAddresses?.[0]?.emailAddress,
        phone: clerkUser?.phoneNumbers?.[0]?.phoneNumber,
        avatar_url: clerkUser?.imageUrl,
        role: clerkUser?.publicMetadata?.role || 'patient',
        verified: clerkUser?.emailAddresses?.[0]?.verification?.status === 'verified'
      };
      
      setBackendUser(fallbackUser);
      setUser(fallbackUser);
      return fallbackUser;
    } catch (error) {
      console.error('Error fetching backend user:', error);
      
      // On API error, still provide Clerk user data
      const fallbackUser = {
        id: clerkUser?.id,
        clerk_id: clerkUserId,
        name: `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || 
               clerkUser?.emailAddresses?.[0]?.emailAddress?.split('@')[0],
        email: clerkUser?.emailAddresses?.[0]?.emailAddress,
        phone: clerkUser?.phoneNumbers?.[0]?.phoneNumber,
        avatar_url: clerkUser?.imageUrl,
        role: clerkUser?.publicMetadata?.role || 'patient',
        verified: clerkUser?.emailAddresses?.[0]?.verification?.status === 'verified'
      };
      
      setBackendUser(fallbackUser);
      setUser(fallbackUser);
      return fallbackUser;
    }
  };

  // Update loading state and user data when Clerk state changes
  useEffect(() => {
    const updateUserState = async () => {
      if (!clerkLoaded || !userLoaded) {
        setLoading(true);
        return;
      }

      if (isSignedIn && clerkUser && userId) {
        // User is signed in with Clerk
        await fetchBackendUser(userId);
        setLoading(false);
      } else {
        // User is not signed in
        setUser(null);
        setBackendUser(null);
        setLoading(false);
      }
    };

    updateUserState();
  }, [clerkLoaded, userLoaded, isSignedIn, clerkUser, userId]);

  // Compatible login function (for backward compatibility)
  const login = (userData, navigate) => {
    console.warn('login() function is deprecated when using Clerk. Use Clerk SignIn component instead.');
    // For backward compatibility, we could redirect to sign-in
    if (navigate) {
      navigate('/login');
    }
  };

  // Compatible logout function
  const logout = async (navigate) => {
    try {
      await clerkSignOut();
      setUser(null);
      setBackendUser(null);
      
      if (navigate) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Update user function
  const updateUser = async (userData) => {
    if (!clerkUser) {
      console.warn('Cannot update user: not signed in with Clerk');
      return;
    }

    try {
      // Update Clerk user if needed
      if (userData.firstName || userData.lastName) {
        await clerkUser.update({
          firstName: userData.firstName || clerkUser.firstName,
          lastName: userData.lastName || clerkUser.lastName,
        });
      }

      // Update in backend database first
      const token = await window.Clerk?.session?.getToken();
      let updatedBackendUser = null;
      
      if (token) {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/users/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });
        
        if (response.ok) {
          updatedBackendUser = await response.json();
        }
      }
      
      if (updatedBackendUser && updatedBackendUser.data) {
        // Update local state with backend response
        setUser(updatedBackendUser.data);
        setBackendUser(updatedBackendUser.data);
      } else {
        // Fallback: update local state only
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        setBackendUser(updatedUser);
      }

    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  // Helper function to get role-based redirect URL
  const getRoleRedirectUrl = (userRole) => {
    switch (userRole) {
      case 'professional':
        return '/profesionales/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'patient':
      default:
        return '/';
    }
  };

  // Helper function to check if user has specific role
  const hasRole = (requiredRole) => {
    if (!user) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  };

  // Helper function to check if user is authenticated
  const isAuthenticated = () => {
    return isSignedIn && !!user;
  };

  const contextValue = {
    // Backward compatibility
    user,
    loading,
    login,
    logout,
    updateUser,
    setUser,
    setLoading,
    
    // Clerk-specific data
    clerkUser,
    backendUser,
    isSignedIn,
    userId,
    
    // Helper functions
    hasRole,
    isAuthenticated,
    getRoleRedirectUrl,
    fetchBackendUser,
    
    // Clerk auth state
    clerkLoaded,
    userLoaded
  };

  return (
    <ClerkAuthContext.Provider value={contextValue}>
      {children}
    </ClerkAuthContext.Provider>
  );
};

// Hook to use the auth context
export const useClerkAuth = () => {
  const context = useContext(ClerkAuthContext);
  if (context === undefined) {
    throw new Error('useClerkAuth must be used within a ClerkAuthProvider');
  }
  return context;
};

// Backward compatible hook (maintains same interface as original useAuth)
export const useAuth = () => {
  const context = useContext(ClerkAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a ClerkAuthProvider');
  }
  
  // Return only the backward-compatible interface
  return {
    user: context.user,
    loading: context.loading,
    login: context.login,
    logout: context.logout,
    updateUser: context.updateUser,
    setUser: context.setUser,
    setLoading: context.setLoading,
    isAuthenticated: context.isAuthenticated,
    hasRole: context.hasRole
  };
};