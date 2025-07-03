import { useAuth } from '@clerk/clerk-react';
import { useMemo } from 'react';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * React hook that provides an authenticated API client using Clerk
 * This is the preferred way to make API calls from React components
 */
export const useClerkApi = () => {
  const { getToken, isSignedIn } = useAuth();

  const apiClient = useMemo(() => {
    /**
     * Make an authenticated request to our backend
     */
    const request = async (endpoint, options = {}) => {
      try {
        if (!isSignedIn) {
          throw new Error('User not signed in');
        }

        const token = await getToken();
        
        if (!token) {
          throw new Error('Failed to get authentication token');
        }
        
        const config = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
          },
          ...options,
        };

        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, config);

        // Handle different response types
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Return JSON if possible, otherwise return text
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return await response.text();
      } catch (error) {
        console.error(`API Request failed (${endpoint}):`, error);
        throw error;
      }
    };

    // HTTP Methods
    const get = async (endpoint, params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;
      return request(url, { method: 'GET' });
    };

    const post = async (endpoint, data = {}) => {
      return request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    };

    const put = async (endpoint, data = {}) => {
      return request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    };

    const patch = async (endpoint, data = {}) => {
      return request(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    };

    const del = async (endpoint) => {
      return request(endpoint, { method: 'DELETE' });
    };

    return {
      request,
      get,
      post,
      put,
      patch,
      delete: del,
      
      // User API endpoints
      getUserProfile: () => get('/users/profile'),
      updateUserProfile: (userData) => put('/users/profile', userData),
      getUserPreferences: () => get('/users/preferences'),
      updateUserPreferences: (preferences) => put('/users/preferences', preferences),
      getDashboardStats: () => get('/users/dashboard-stats'),

      // Professional API endpoints
      getProfessionalProfile: () => get('/professionals/profile'),
      updateProfessionalProfile: (profileData) => put('/professionals/profile', profileData),
      getProfessionalAppointments: (params) => get('/professionals/appointments', params),
      getProfessionalPatients: (params) => get('/professionals/patients', params),

      // Admin API endpoints
      getAdminStats: () => get('/admin/stats'),
      getAdminUsers: (params) => get('/admin/users', params),
      updateUserRole: (userId, role) => patch(`/admin/users/${userId}/role`, { role }),

      // Patient API endpoints
      getPatientAppointments: (params) => get('/patients/appointments', params),
      createAppointment: (appointmentData) => post('/patients/appointments', appointmentData),
      updateAppointment: (appointmentId, updates) => put(`/patients/appointments/${appointmentId}`, updates),
      cancelAppointment: (appointmentId) => del(`/patients/appointments/${appointmentId}`),
    };
  }, [getToken, isSignedIn]);

  return {
    api: apiClient,
    isAuthenticated: isSignedIn,
  };
};

// Individual API hooks for specific functionality
export const useUserApi = () => {
  const { api, isAuthenticated } = useClerkApi();
  return {
    getProfile: api.getUserProfile,
    updateProfile: api.updateUserProfile,
    getPreferences: api.getUserPreferences,
    updatePreferences: api.updateUserPreferences,
    getDashboardStats: api.getDashboardStats,
    isAuthenticated,
  };
};

export const useProfessionalApi = () => {
  const { api, isAuthenticated } = useClerkApi();
  return {
    getProfile: api.getProfessionalProfile,
    updateProfile: api.updateProfessionalProfile,
    getAppointments: api.getProfessionalAppointments,
    getPatients: api.getProfessionalPatients,
    isAuthenticated,
  };
};

export const usePatientApi = () => {
  const { api, isAuthenticated } = useClerkApi();
  return {
    getAppointments: api.getPatientAppointments,
    createAppointment: api.createAppointment,
    updateAppointment: api.updateAppointment,
    cancelAppointment: api.cancelAppointment,
    isAuthenticated,
  };
};

export const useAdminApi = () => {
  const { api, isAuthenticated } = useClerkApi();
  return {
    getStats: api.getAdminStats,
    getUsers: api.getAdminUsers,
    updateUserRole: api.updateUserRole,
    isAuthenticated,
  };
};