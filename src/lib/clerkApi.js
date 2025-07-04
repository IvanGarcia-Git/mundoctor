// No imports needed - we'll access Clerk instance from window

import apiCache, { CACHE_STRATEGIES } from './cache.js';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Clerk API Client - Handles authenticated requests to our backend
 * Automatically includes Clerk authentication tokens
 */
class ClerkApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get the current authentication token from Clerk
   */
  async getAuthToken() {
    try {
      // Check if Clerk is loaded and user is signed in
      if (!window.Clerk) {
        throw new Error('Clerk not loaded');
      }
      
      if (!window.Clerk.session) {
        throw new Error('No active session');
      }
      
      // Get the session token from Clerk
      const token = await window.Clerk.session.getToken();
      
      if (!token) {
        throw new Error('Failed to get token');
      }
      
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Authentication required');
    }
  }

  /**
   * Make an authenticated request to our backend
   */
  async request(endpoint, options = {}, retries = 1) {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const token = await this.getAuthToken();
        
        const config = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
          },
          ...options,
        };

        const url = `${this.baseURL}${endpoint}`;
        const response = await fetch(url, config);

        // Handle different response types
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.data = errorData;
          error.endpoint = endpoint;
          
          // Don't retry for client errors (4xx) except 401
          if (response.status >= 400 && response.status < 500 && response.status !== 401) {
            throw error;
          }
          
          // For 401, clear token and retry once
          if (response.status === 401 && attempt === 0) {
            console.warn('Authentication failed, retrying...');
            continue;
          }
          
          throw error;
        }

        // Return JSON if possible, otherwise return text
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return await response.text();
        
      } catch (error) {
        lastError = error;
        
        // Don't retry for network errors if this is the last attempt
        if (attempt === retries) {
          break;
        }
        
        // Wait before retrying (exponential backoff with jitter)
        if (attempt < retries) {
          const baseDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
          const jitter = Math.random() * 500; // Add up to 500ms jitter
          const delay = baseDelay + jitter;
          console.warn(`API request failed (attempt ${attempt + 1}), retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`API Request failed after ${retries + 1} attempts (${endpoint}):`, lastError);
    
    // Enhance error with user-friendly message and additional context
    lastError.endpoint = endpoint;
    lastError.attempts = retries + 1;
    lastError.timestamp = new Date().toISOString();
    
    if (lastError.name === 'TypeError' && lastError.message.includes('fetch')) {
      lastError.userMessage = 'Error de conexión. Verifica tu conexión a internet.';
      lastError.category = 'network';
    } else if (lastError.status === 401) {
      lastError.userMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      lastError.category = 'auth';
    } else if (lastError.status === 403) {
      lastError.userMessage = 'No tienes permisos para realizar esta acción.';
      lastError.category = 'permission';
    } else if (lastError.status === 404) {
      lastError.userMessage = 'Recurso no encontrado.';
      lastError.category = 'not_found';
    } else if (lastError.status === 429) {
      lastError.userMessage = 'Demasiadas solicitudes. Intenta más tarde.';
      lastError.category = 'rate_limit';
    } else if (lastError.status >= 500) {
      lastError.userMessage = 'Error del servidor. Intenta nuevamente más tarde.';
      lastError.category = 'server';
    } else {
      lastError.userMessage = 'Ha ocurrido un error inesperado.';
      lastError.category = 'unknown';
    }
    
    throw lastError;
  }

  // HTTP Methods
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // User API endpoints
  async getUserProfile() {
    const cacheKey = 'user_profile';
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.get('/users/profile');
    apiCache.set(cacheKey, result, CACHE_STRATEGIES.USER_PROFILE);
    return result;
  }

  async updateUserProfile(userData) {
    // Clear cache when updating
    apiCache.delete('user_profile');
    return this.put('/users/profile', userData);
  }

  async getUserPreferences() {
    return this.get('/users/preferences');
  }

  async updateUserPreferences(preferences) {
    return this.put('/users/preferences', preferences);
  }

  async getDashboardStats() {
    const cacheKey = 'dashboard_stats';
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.get('/users/dashboard-stats');
    apiCache.set(cacheKey, result, CACHE_STRATEGIES.DASHBOARD_STATS);
    return result;
  }

  async getDashboardAppointments(limit = 5) {
    const cacheKey = `dashboard_appointments_${limit}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.get('/users/dashboard-appointments', { limit });
    apiCache.set(cacheKey, result, CACHE_STRATEGIES.APPOINTMENTS);
    return result;
  }

  async getDashboardReviews(limit = 3) {
    const cacheKey = `dashboard_reviews_${limit}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const result = await this.get('/users/dashboard-reviews', { limit });
    apiCache.set(cacheKey, result, CACHE_STRATEGIES.REVIEWS);
    return result;
  }

  // Professional API endpoints
  async getProfessionalProfile() {
    return this.get('/professionals/profile');
  }

  async updateProfessionalProfile(profileData) {
    return this.put('/professionals/profile', profileData);
  }

  async getProfessionalAppointments(params = {}) {
    return this.get('/professionals/appointments', params);
  }

  async getProfessionalPatients(params = {}) {
    return this.get('/professionals/patients', params);
  }

  // Admin API endpoints
  async getAdminStats() {
    return this.get('/admin/stats');
  }

  async getAdminUsers(params = {}) {
    return this.get('/admin/users', params);
  }

  async updateUserRole(userId, role) {
    return this.patch(`/admin/users/${userId}/role`, { role });
  }

  // Patient API endpoints
  async getPatientAppointments(params = {}) {
    return this.get('/patients/appointments', params);
  }

  async createAppointment(appointmentData) {
    return this.post('/patients/appointments', appointmentData);
  }

  async updateAppointment(appointmentId, updates) {
    return this.put(`/patients/appointments/${appointmentId}`, updates);
  }

  async cancelAppointment(appointmentId) {
    return this.delete(`/patients/appointments/${appointmentId}`);
  }
}

// Create and export a singleton instance
const clerkApi = new ClerkApiClient();
export default clerkApi;

// Also export the class for testing or multiple instances
export { ClerkApiClient };

// Export specific API groups for easier imports
export const userApi = {
  getProfile: () => clerkApi.getUserProfile(),
  updateProfile: (data) => clerkApi.updateUserProfile(data),
  getPreferences: () => clerkApi.getUserPreferences(),
  updatePreferences: (prefs) => clerkApi.updateUserPreferences(prefs),
  getDashboardStats: () => clerkApi.getDashboardStats(),
  getDashboardAppointments: (limit) => clerkApi.getDashboardAppointments(limit),
  getDashboardReviews: (limit) => clerkApi.getDashboardReviews(limit),
};

export const professionalApi = {
  getProfile: () => clerkApi.getProfessionalProfile(),
  updateProfile: (data) => clerkApi.updateProfessionalProfile(data),
  getAppointments: (params) => clerkApi.getProfessionalAppointments(params),
  getPatients: (params) => clerkApi.getProfessionalPatients(params),
};

export const adminApi = {
  getStats: () => clerkApi.getAdminStats(),
  getUsers: (params) => clerkApi.getAdminUsers(params),
  updateUserRole: (userId, role) => clerkApi.updateUserRole(userId, role),
};

export const patientApi = {
  getAppointments: (params) => clerkApi.getPatientAppointments(params),
  createAppointment: (data) => clerkApi.createAppointment(data),
  updateAppointment: (id, updates) => clerkApi.updateAppointment(id, updates),
  cancelAppointment: (id) => clerkApi.cancelAppointment(id),
};