import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { simulateClerkMetadataUpdate, forceUpdateVerificationStatus } from '@/utils/verificationUtils';

// Simulamos una base de datos local para demostración
// En producción, esto vendría del backend
let professionalDatabase = [];

// Función para actualizar el metadata del usuario en Clerk
const updateUserClerkMetadata = async (clerkId, verificationStatus) => {
  try {
    // En una implementación real, esto sería una llamada a tu backend
    // que a su vez haría una llamada al Clerk Backend API
    
    // Para demostración, usamos la simulación
    simulateClerkMetadataUpdate(clerkId, verificationStatus);
    
    console.log(`Simulated Clerk metadata update for user ${clerkId} with verification status: ${verificationStatus}`);
    
    // Simular que la actualización fue exitosa
    return true;
  } catch (error) {
    console.error('Error updating Clerk metadata:', error);
    return false;
  }
};

// Función para actualizar el metadata de Clerk del usuario actual si coincide
const updateCurrentUserIfMatch = async (clerkId, verificationStatus, currentUser) => {
  console.log(`=== CHECKING IF USER MATCHES ===`);
  console.log(`Target Clerk ID: ${clerkId}`);
  console.log(`Current User ID: ${currentUser?.id}`);
  console.log(`User match: ${currentUser && currentUser.id === clerkId}`);
  
  if (currentUser && currentUser.id === clerkId) {
    try {
      console.log(`=== UPDATING CURRENT USER METADATA ===`);
      console.log(`Current user metadata before update:`, currentUser.unsafeMetadata);
      
      const currentProfessionalData = currentUser.unsafeMetadata?.professionalData || {};
      const newMetadata = {
        ...currentUser.unsafeMetadata,
        professionalData: {
          ...currentProfessionalData,
          verificationStatus: verificationStatus,
          verifiedAt: verificationStatus === 'approved' ? new Date().toISOString() : null,
          verifiedBy: verificationStatus === 'approved' ? 'admin_verification' : null
        }
      };
      
      console.log(`New metadata to update:`, newMetadata);
      
      await currentUser.update({
        unsafeMetadata: newMetadata
      });
      
      console.log(`Successfully updated current user metadata`);
      
      // Force a refresh of the user object to get updated metadata
      await currentUser.reload();
      console.log(`User reloaded, new metadata:`, currentUser.unsafeMetadata);
      
      return true;
    } catch (error) {
      console.error('Error updating current user metadata:', error);
      console.error('Error details:', error);
      return false;
    }
  }
  console.log(`User does not match, skipping current user update`);
  return false;
};

export const useProfessionalValidations = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  // Simular carga de datos desde el backend
  useEffect(() => {
    const loadProfessionals = async () => {
      setLoading(true);
      try {
        // En una implementación real, esto sería una llamada al backend
        // que obtendría todos los usuarios con rol 'professional'
        
        // Por ahora usamos datos locales simulados
        const storedData = localStorage.getItem('mundoctor_professionals');
        if (storedData) {
          professionalDatabase = JSON.parse(storedData);
        }
        
        setProfessionals(professionalDatabase);
      } catch (error) {
        console.error('Error loading professionals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfessionals();
  }, []);

  // Función para agregar un nuevo profesional
  const addProfessional = (professionalData) => {
    const newProfessional = {
      id: `prof_${Date.now()}`,
      ...professionalData,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    
    professionalDatabase.push(newProfessional);
    localStorage.setItem('mundoctor_professionals', JSON.stringify(professionalDatabase));
    setProfessionals([...professionalDatabase]);
    
    return newProfessional;
  };

  // Función para actualizar el estado de verificación
  const updateVerificationStatus = async (professionalId, status, notes = '') => {
    try {
      console.log(`=== STARTING VERIFICATION UPDATE ===`);
      console.log(`Professional ID: ${professionalId}`);
      console.log(`New Status: ${status}`);
      console.log(`Current User ID: ${user?.id}`);
      
      // Encontrar el profesional en la base de datos local
      const professionalToUpdate = professionalDatabase.find(prof => prof.id === professionalId);
      if (!professionalToUpdate) {
        console.error('Professional not found with ID:', professionalId);
        return false;
      }

      console.log(`Professional found:`, professionalToUpdate);
      console.log(`Professional Clerk ID: ${professionalToUpdate.clerkId}`);
      console.log(`Is current user? ${professionalToUpdate.clerkId === user?.id}`);

      // Actualizar la base de datos local
      const updatedProfessionals = professionalDatabase.map(prof => {
        if (prof.id === professionalId) {
          return {
            ...prof,
            status,
            notes,
            verifiedAt: status === 'approved' ? new Date().toISOString() : null,
            verifiedBy: user?.id || 'admin'
          };
        }
        return prof;
      });

      professionalDatabase = updatedProfessionals;
      localStorage.setItem('mundoctor_professionals', JSON.stringify(professionalDatabase));
      setProfessionals([...professionalDatabase]);
      console.log(`Local database updated successfully`);

      // Actualizar el metadata del usuario en Clerk
      const clerkUpdateResult = await updateUserClerkMetadata(professionalToUpdate.clerkId, status);
      console.log(`Clerk metadata update result: ${clerkUpdateResult}`);
      
      // Si el usuario que está siendo verificado es el usuario actual, actualizar su metadata directamente
      const currentUserUpdateResult = await updateCurrentUserIfMatch(professionalToUpdate.clerkId, status, user);
      console.log(`Current user metadata update result: ${currentUserUpdateResult}`);
      
      // Forzar actualización del estado de verificación (para todos los casos)
      forceUpdateVerificationStatus(professionalToUpdate.clerkId, status);
      
      console.log(`=== VERIFICATION UPDATE COMPLETED ===`);
      return true;
    } catch (error) {
      console.error('Error updating verification status:', error);
      return false;
    }
  };

  // Filtrar por estado
  const getProfessionalsByStatus = (status) => {
    return professionals.filter(prof => prof.status === status);
  };

  // Obtener estadísticas
  const getStats = () => {
    const pending = professionals.filter(p => p.status === 'pending').length;
    const approved = professionals.filter(p => p.status === 'approved').length;
    const rejected = professionals.filter(p => p.status === 'rejected').length;
    
    return { pending, approved, rejected, total: professionals.length };
  };

  return {
    professionals,
    loading,
    addProfessional,
    updateVerificationStatus,
    getProfessionalsByStatus,
    getStats,
    refetch: () => {
      const storedData = localStorage.getItem('mundoctor_professionals');
      if (storedData) {
        setProfessionals(JSON.parse(storedData));
      }
    }
  };
};

// Función de utilidad para registrar un profesional cuando se envía el formulario
export const registerProfessional = (userClerkData, formData) => {
  const professionalData = {
    clerkId: userClerkData.id,
    email: userClerkData.emailAddresses[0]?.emailAddress,
    firstName: userClerkData.firstName,
    lastName: userClerkData.lastName,
    fullName: `${userClerkData.firstName} ${userClerkData.lastName}`,
    collegiateNumber: formData.collegiateNumber,
    dni: formData.dni,
    documentsSubmitted: {
      dniImage: formData.dniImage?.name || 'dni_document.pdf',
      universityDegree: formData.universityDegree?.name || 'degree_document.pdf',
      collegiationCertificate: formData.collegiationCertificate?.name || 'certificate_document.pdf'
    },
    status: 'pending'
  };

  // Agregar a la base de datos local
  const storedData = localStorage.getItem('mundoctor_professionals');
  let professionals = storedData ? JSON.parse(storedData) : [];
  
  // Verificar si ya existe
  const existingIndex = professionals.findIndex(p => p.clerkId === userClerkData.id);
  if (existingIndex >= 0) {
    professionals[existingIndex] = { ...professionals[existingIndex], ...professionalData };
  } else {
    professionals.push({
      id: `prof_${Date.now()}`,
      ...professionalData,
      submittedAt: new Date().toISOString()
    });
  }
  
  localStorage.setItem('mundoctor_professionals', JSON.stringify(professionals));
  
  return professionalData;
};