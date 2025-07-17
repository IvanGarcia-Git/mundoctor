// Simulación de actualización de metadata de Clerk
// En producción, esto sería manejado por el backend

// Función para simular la actualización del metadata del usuario
export const simulateClerkMetadataUpdate = (clerkId, verificationStatus) => {
  // En una implementación real, esto actualizaría el metadata del usuario en Clerk
  // Por ahora, solo simulamos el comportamiento
  
  // Guardar el estado de verificación en localStorage para simular la persistencia
  const verificationData = {
    clerkId,
    verificationStatus,
    updatedAt: new Date().toISOString()
  };
  
  localStorage.setItem(`clerk_verification_${clerkId}`, JSON.stringify(verificationData));
  
  console.log(`Simulated Clerk metadata update for user ${clerkId}:`, verificationData);
  
  return verificationData;
};

// Función para obtener el estado de verificación simulado
export const getSimulatedVerificationStatus = (clerkId) => {
  const storedData = localStorage.getItem(`clerk_verification_${clerkId}`);
  if (storedData) {
    const verificationData = JSON.parse(storedData);
    return verificationData.verificationStatus;
  }
  return null;
};

// Función para limpiar los datos de verificación simulados
export const clearSimulatedVerificationData = (clerkId) => {
  localStorage.removeItem(`clerk_verification_${clerkId}`);
};

// Función para forzar una actualización del estado de verificación
export const forceUpdateVerificationStatus = (clerkId, verificationStatus) => {
  // Actualizar simulación local
  simulateClerkMetadataUpdate(clerkId, verificationStatus);
  
  // Disparar evento personalizado para notificar a los hooks
  const event = new CustomEvent('verificationStatusChanged', {
    detail: { clerkId, verificationStatus }
  });
  window.dispatchEvent(event);
  
  console.log(`Forced verification status update for ${clerkId} to ${verificationStatus}`);
};