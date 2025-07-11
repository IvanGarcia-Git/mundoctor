import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getSimulatedVerificationStatus } from '@/utils/clerkSimulation';

export const useVerificationStatus = () => {
  const { user } = useUser();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Primero verificar el metadata real de Clerk
      const clerkVerificationStatus = user.unsafeMetadata?.professionalData?.verificationStatus;
      
      // Si no hay estado en Clerk, verificar la simulación
      const simulatedStatus = getSimulatedVerificationStatus(user.id);
      
      // Priorizar Clerk metadata sobre simulación local
      const currentStatus = clerkVerificationStatus || simulatedStatus || 'pending';
      
      console.log('Verification status check:', {
        clerkStatus: clerkVerificationStatus,
        simulatedStatus: simulatedStatus,
        finalStatus: currentStatus,
        userMetadata: user.unsafeMetadata
      });
      
      setVerificationStatus(currentStatus);
    }
    setLoading(false);
  }, [user]);

  // Función para refrescar el estado de verificación
  const refreshVerificationStatus = () => {
    if (user) {
      const clerkVerificationStatus = user.unsafeMetadata?.professionalData?.verificationStatus;
      const simulatedStatus = getSimulatedVerificationStatus(user.id);
      const currentStatus = clerkVerificationStatus || simulatedStatus || 'pending';
      setVerificationStatus(currentStatus);
    }
  };

  return {
    verificationStatus,
    loading,
    refreshVerificationStatus
  };
};