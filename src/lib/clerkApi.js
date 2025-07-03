// No imports needed - we'll access Clerk instance from window

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
  async request(endpoint, options = {}) {
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
    return this.get('/users/profile');
  }

  async updateUserProfile(userData) {
    return this.put('/users/profile', userData);
  }

  async getUserPreferences() {
    return this.get('/users/preferences');
  }

  async updateUserPreferences(preferences) {
    return this.put('/users/preferences', preferences);
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