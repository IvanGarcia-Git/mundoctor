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
  
  console.log('🔍 useClerkApi hook initialized - isSignedIn:', isSignedIn);

  const apiClient = useMemo(() => {
    /**
     * Make an authenticated request to our backend
     */
    const request = async (endpoint, options = {}) => {
      try {
        console.log('🔍 Making API request to:', endpoint);
        console.log('🔍 isSignedIn:', isSignedIn);
        
        if (!isSignedIn) {
          throw new Error('User not signed in');
        }

        const token = await getToken();
        console.log('🔍 Token obtained:', token ? 'Yes' : 'No');
        
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
        console.log('🔍 Full URL:', url);
        console.log('🔍 Request config:', config);

        // Add timeout to prevent hanging
        const controller = new AbortController();
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error('Request timeout - the server took too long to respond'));
          }, 30000); // 30 second timeout
        });
        
        config.signal = controller.signal;
        
        const fetchPromise = fetch(url, config);
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        clearTimeout(timeoutId); // Clear timeout on successful response
        console.log('🔍 Response received:', response.status, response.statusText);

        // Handle different response types
        if (!response.ok) {
          console.log('🔍 Response not OK, getting error data...');
          const errorData = await response.json().catch(() => ({}));
          console.log('🔍 Error data:', errorData);
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Return JSON if possible, otherwise return text
        const contentType = response.headers.get('content-type');
        console.log('🔍 Content type:', contentType);
        if (contentType && contentType.includes('application/json')) {
          const jsonData = await response.json();
          console.log('🔍 JSON response data:', jsonData);
          return jsonData;
        }
        const textData = await response.text();
        console.log('🔍 Text response data:', textData);
        return textData;
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId); // Clear timeout on error too
        }
        console.error(`API Request failed (${endpoint}):`, error);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - the server took too long to respond');
        }
        
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