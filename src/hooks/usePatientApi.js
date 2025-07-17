import { patientApi } from '@/lib/clerkApi';

/**
 * Custom hook for patient-related API operations
 * Provides easy access to patient API methods with consistent error handling
 */
export const usePatientApi = () => {
  return {
    // Get patient appointments with optional filtering
    getAppointments: async (params = {}) => {
      try {
        const result = await patientApi.getAppointments(params);
        return result;
      } catch (error) {
        console.error('Error fetching patient appointments:', error);
        throw error;
      }
    },

    // Create a new appointment
    createAppointment: async (appointmentData) => {
      try {
        const result = await patientApi.createAppointment(appointmentData);
        return result;
      } catch (error) {
        console.error('Error creating appointment:', error);
        throw error;
      }
    },

    // Update an existing appointment
    updateAppointment: async (appointmentId, updates) => {
      try {
        const result = await patientApi.updateAppointment(appointmentId, updates);
        return result;
      } catch (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }
    },

    // Cancel an appointment
    cancelAppointment: async (appointmentId) => {
      try {
        const result = await patientApi.cancelAppointment(appointmentId);
        return result;
      } catch (error) {
        console.error('Error canceling appointment:', error);
        throw error;
      }
    }
  };
};

export default usePatientApi;