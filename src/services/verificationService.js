// Servicio para consultar el estado de verificación real desde la base de datos

const API_BASE_URL = 'http://localhost:8001/api';

// Función para obtener el estado de verificación desde la base de datos
export const getVerificationStatusFromDB = async (clerkId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${clerkId}/verification-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching verification status from DB:', error);
    return null;
  }
};

// Función para convertir el estado de la base de datos al formato esperado por la UI
export const mapDatabaseStatusToUI = (dbStatus, userStatus) => {
  console.log('Mapping database status:', { dbStatus, userStatus });
  
  // Si el usuario está activo en la base de datos, está verificado
  if (userStatus === 'active') {
    return 'approved';
  }
  
  // Si hay un estado específico de validación, usarlo
  if (dbStatus) {
    switch (dbStatus) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'pending':
      case 'under_review':
      case 'requires_more_info':
        return 'pending';
      default:
        return 'pending';
    }
  }
  
  // Si el usuario está pending_validation, está pendiente
  if (userStatus === 'pending_validation') {
    return 'pending';
  }
  
  // Por defecto, pendiente
  return 'pending';
};

// Función para obtener el estado completo de verificación
export const getCompleteVerificationStatus = async (clerkId) => {
  try {
    const dbResult = await getVerificationStatusFromDB(clerkId);
    
    if (dbResult && dbResult.success) {
      const uiStatus = mapDatabaseStatusToUI(
        dbResult.data.validation_status,
        dbResult.data.user_status
      );
      
      return {
        status: uiStatus,
        source: 'database',
        rawData: dbResult.data,
        lastUpdated: new Date().toISOString()
      };
    }
    
    return {
      status: 'pending',
      source: 'default',
      rawData: null,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting complete verification status:', error);
    return {
      status: 'pending',
      source: 'error',
      rawData: null,
      lastUpdated: new Date().toISOString()
    };
  }
};