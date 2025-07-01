import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuthHook, useUser as useClerkUser } from '@clerk/clerk-react';

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
      // TODO: Replace with actual API call to our backend
      // const response = await fetch(`/api/users/profile`, {
      //   headers: {
      //     'Authorization': `Bearer ${await getToken()}`
      //   }
      // });
      // const userData = await response.json();
      
      // For now, create user object from Clerk data
      const userData = {
        id: clerkUser?.id,
        clerk_id: clerkUserId,
        name: `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || 
               clerkUser?.emailAddresses?.[0]?.emailAddress?.split('@')[0],
        email: clerkUser?.emailAddresses?.[0]?.emailAddress,
        phone: clerkUser?.phoneNumbers?.[0]?.phoneNumber,
        avatar_url: clerkUser?.imageUrl,
        role: clerkUser?.publicMetadata?.role || 'patient', // Default role
        verified: clerkUser?.emailAddresses?.[0]?.verification?.status === 'verified'
      };
      
      setBackendUser(userData);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching backend user:', error);
      return null;
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

      // Update local state
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      setBackendUser(updatedUser);

      // TODO: Also update in backend database
      // await fetch('/api/users/profile', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${await getToken()}`
      //   },
      //   body: JSON.stringify(userData)
      // });

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