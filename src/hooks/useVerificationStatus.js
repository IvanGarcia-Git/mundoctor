import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getSimulatedVerificationStatus } from '@/utils/verificationUtils';
import { getCompleteVerificationStatus } from '@/services/verificationService';

export const useVerificationStatus = () => {
  const { user } = useUser();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusSource, setStatusSource] = useState('unknown');

  const updateVerificationStatus = async () => {
    if (user) {
      setLoading(true);
      
      try {
        // Prioridad 1: Consultar base de datos real
        const dbStatus = await getCompleteVerificationStatus(user.id);
        console.log('Database verification status:', dbStatus);
        
        if (dbStatus && dbStatus.source === 'database') {
          setVerificationStatus(dbStatus.status);
          setStatusSource('database');
          console.log('Using database status:', dbStatus.status);
          setLoading(false);
          return;
        }
        
        // Prioridad 2: Metadata de Clerk
        const clerkVerificationStatus = user.unsafeMetadata?.professionalData?.verificationStatus;
        
        // Prioridad 3: Simulación local
        const simulatedStatus = getSimulatedVerificationStatus(user.id);
        
        // Usar el mejor disponible
        const currentStatus = clerkVerificationStatus || simulatedStatus || 'pending';
        const source = clerkVerificationStatus ? 'clerk' : (simulatedStatus ? 'simulation' : 'default');
        
        console.log('Verification status check:', {
          clerkStatus: clerkVerificationStatus,
          simulatedStatus: simulatedStatus,
          finalStatus: currentStatus,
          source: source,
          userMetadata: user.unsafeMetadata
        });
        
        setVerificationStatus(currentStatus);
        setStatusSource(source);
        
      } catch (error) {
        console.error('Error updating verification status:', error);
        setVerificationStatus('pending');
        setStatusSource('error');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    updateVerificationStatus();
  }, [user]);

  // Escuchar eventos de actualización de verificación
  useEffect(() => {
    const handleVerificationStatusChanged = (event) => {
      console.log('Verification status change event received:', event.detail);
      if (user && event.detail.clerkId === user.id) {
        console.log('Event matches current user, updating status');
        updateVerificationStatus();
      }
    };

    window.addEventListener('verificationStatusChanged', handleVerificationStatusChanged);
    
    return () => {
      window.removeEventListener('verificationStatusChanged', handleVerificationStatusChanged);
    };
  }, [user]);

  // Función para refrescar el estado de verificación
  const refreshVerificationStatus = () => {
    updateVerificationStatus();
  };

  return {
    verificationStatus,
    loading,
    statusSource,
    refreshVerificationStatus
  };
};