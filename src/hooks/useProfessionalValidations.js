import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

// Simulamos una base de datos local para demostración
// En producción, esto vendría del backend
let professionalDatabase = [];

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

      // En una implementación real, también actualizarías el metadata del usuario en Clerk
      // Para demostración, no lo haremos aquí ya que requeriría backend
      
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