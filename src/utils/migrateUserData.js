// Base API configuration\nconst API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';\n\n// Helper function to make authenticated requests\nconst makeAuthenticatedRequest = async (endpoint, options = {}) => {\n  const token = await window.Clerk?.session?.getToken();\n  if (!token) {\n    throw new Error('No authentication token available');\n  }\n  \n  const response = await fetch(`${API_BASE_URL}${endpoint}`, {\n    headers: {\n      'Authorization': `Bearer ${token}`,\n      'Content-Type': 'application/json',\n      ...options.headers\n    },\n    ...options\n  });\n  \n  if (!response.ok) {\n    const errorData = await response.json().catch(() => ({}));\n    throw new Error(errorData.message || `HTTP ${response.status}`);\n  }\n  \n  return response.json();\n};

/**
 * Utility functions to migrate user data from localStorage to PostgreSQL via API
 */

/**
 * Get all localStorage data for migration
 */
export const getLocalStorageData = () => {
  try {
    const data = {};
    
    // Get user data
    const userData = localStorage.getItem('user');
    if (userData) {
      data.user = JSON.parse(userData);
    }
    
    // Get user preferences
    const preferences = localStorage.getItem('userPreferences');
    if (preferences) {
      data.preferences = JSON.parse(preferences);
    }
    
    // Get professional-specific data
    const professionalData = localStorage.getItem('professionalData');
    if (professionalData) {
      data.professional = JSON.parse(professionalData);
    }
    
    // Get patient-specific data
    const patientData = localStorage.getItem('patientData');
    if (patientData) {
      data.patient = JSON.parse(patientData);
    }
    
    // Get appointments data
    const appointments = localStorage.getItem('appointments');
    if (appointments) {
      data.appointments = JSON.parse(appointments);
    }
    
    // Get theme preference
    const theme = localStorage.getItem('mundoctor-theme');
    if (theme) {
      data.theme = theme;
    }
    
    return data;
  } catch (error) {
    console.error('Error reading localStorage data:', error);
    return {};
  }
};

/**
 * Migrate user profile data to the backend
 */
export const migrateUserProfile = async (localData) => {
  try {
    if (!localData.user) {
      console.log('No user data to migrate');
      return { success: true, message: 'No user data to migrate' };
    }
    
    const { user } = localData;
    const profileData = {
      name: user.name,
      phone: user.phone,
      avatar_url: user.avatar_url || user.avatarUrl,
    };
    
    // Add role-specific data
    if (user.role === 'professional' && localData.professional) {
      profileData.professional = {
        specialty: localData.professional.specialty,
        bio: localData.professional.bio,
        experience_years: localData.professional.experienceYears,
        education: localData.professional.education,
        certifications: localData.professional.certifications,
        consultation_fee: localData.professional.consultationFee,
        available_hours: localData.professional.availableHours,
      };
    }
    
    if (user.role === 'patient' && localData.patient) {
      profileData.patient = {
        date_of_birth: localData.patient.dateOfBirth,
        gender: localData.patient.gender,
        emergency_contact: localData.patient.emergencyContact,
        medical_history: localData.patient.medicalHistory,
        allergies: localData.patient.allergies,
        current_medications: localData.patient.currentMedications,
      };
    }
    
    const result = await makeAuthenticatedRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    console.log('User profile migrated successfully:', result);
    
    return { success: true, message: 'User profile migrated successfully' };
  } catch (error) {
    console.error('Error migrating user profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Migrate user preferences to the backend
 */
export const migrateUserPreferences = async (localData) => {
  try {
    if (!localData.preferences && !localData.theme) {
      console.log('No preferences to migrate');
      return { success: true, message: 'No preferences to migrate' };
    }
    
    const preferences = {
      ...localData.preferences,
      theme: localData.theme || 'light',
    };
    
    const result = await makeAuthenticatedRequest('/users/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
    console.log('User preferences migrated successfully:', result);
    
    return { success: true, message: 'User preferences migrated successfully' };
  } catch (error) {
    console.error('Error migrating user preferences:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete migration process
 */
export const migrateAllUserData = async () => {
  try {
    console.log('Starting user data migration...');
    
    // Get all localStorage data
    const localData = getLocalStorageData();
    
    if (Object.keys(localData).length === 0) {
      console.log('No data found in localStorage to migrate');
      return { 
        success: true, 
        message: 'No data found in localStorage to migrate',
        results: []
      };
    }
    
    const results = [];
    
    // Migrate user profile
    const profileResult = await migrateUserProfile(localData);
    results.push({ type: 'profile', ...profileResult });
    
    // Wait a bit between API calls
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Migrate user preferences
    const preferencesResult = await migrateUserPreferences(localData);
    results.push({ type: 'preferences', ...preferencesResult });
    
    // Check if all migrations were successful
    const allSuccessful = results.every(result => result.success);
    
    if (allSuccessful) {
      console.log('All data migrated successfully');
      return {
        success: true,
        message: 'All user data migrated successfully',
        results
      };
    } else {
      console.log('Some migrations failed:', results);
      return {
        success: false,
        message: 'Some data migrations failed',
        results
      };
    }
  } catch (error) {
    console.error('Error during migration:', error);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
};

/**
 * Clean up localStorage after successful migration
 */
export const cleanupLocalStorage = () => {
  try {
    console.log('Cleaning up localStorage after migration...');
    
    const keysToRemove = [
      'user',
      'userPreferences', 
      'professionalData',
      'patientData',
      'appointments',
      // Keep theme for now as it's still used locally
      // 'mundoctor-theme'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed ${key} from localStorage`);
    });
    
    console.log('localStorage cleanup completed');
    return { success: true, message: 'localStorage cleaned up successfully' };
  } catch (error) {
    console.error('Error cleaning up localStorage:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if migration is needed
 */
export const isMigrationNeeded = () => {
  const localData = getLocalStorageData();
  return Object.keys(localData).length > 0 && (localData.user || localData.preferences);
};

/**
 * Complete migration workflow: migrate data and clean up
 */
export const performMigration = async () => {
  try {
    if (!isMigrationNeeded()) {
      return {
        success: true,
        message: 'No migration needed',
        migrated: false
      };
    }
    
    // Perform migration
    const migrationResult = await migrateAllUserData();
    
    if (migrationResult.success) {
      // Clean up localStorage only if migration was successful
      const cleanupResult = cleanupLocalStorage();
      
      return {
        success: true,
        message: 'Migration completed successfully',
        migrated: true,
        migrationResult,
        cleanupResult
      };
    } else {
      return {
        success: false,
        message: 'Migration failed, localStorage not cleaned',
        migrated: false,
        migrationResult
      };
    }
  } catch (error) {
    console.error('Error in migration workflow:', error);
    return {
      success: false,
      error: error.message,
      migrated: false
    };
  }
};