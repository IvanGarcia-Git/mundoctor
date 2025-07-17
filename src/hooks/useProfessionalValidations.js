import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import clerkApi from '@/lib/clerkApi';

export const useProfessionalValidations = () => {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  // Cargar datos desde el backend
  const loadProfessionals = async () => {
    setLoading(true);
    try {
      // Hacer llamada al backend para obtener las validaciones
      const response = await clerkApi.get('/validation/requests');
      
      // Transformar la respuesta para mantener compatibilidad con el formato existente
      const transformedProfessionals = response.requests?.map(request => ({
        id: request.id,
        clerkId: request.user_id,
        email: request.professional_email,
        fullName: request.professional_name || 'Profesional',
        professionalName: request.professional_name,
        collegiateNumber: request.college_number || 'N/A',
        dni: request.dni || 'N/A',
        status: request.validation_status,
        notes: request.validation_notes,
        submittedAt: request.created_at,
        verifiedAt: request.reviewed_at,
        verifiedBy: request.reviewed_by,
        documentsSubmitted: {
          dniImage: request.dni_document_url || 'dni_document.pdf',
          universityDegree: request.degree_document_url || 'degree_document.pdf',
          collegiationCertificate: request.certification_document_url || 'certificate_document.pdf'
        }
      })) || [];
      
      setProfessionals(transformedProfessionals);
    } catch (error) {
      console.error('Error loading professionals from backend:', error);
      
      // Fallback a localStorage para compatibilidad durante la transición
      const storedData = localStorage.getItem('mundoctor_professionals');
      if (storedData) {
        const localProfessionals = JSON.parse(storedData);
        setProfessionals(localProfessionals);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      // Hacer llamada al backend para actualizar el estado
      const endpoint = status === 'approved' 
        ? `/validation/${professionalId}/approve`
        : `/validation/${professionalId}/reject`;
      
      const payload = {
        reviewNotes: notes
      };

      const response = await clerkApi.post(endpoint, payload);
      
      // Recargar la lista después de la actualización exitosa
      await loadProfessionals();
      
      return true;
    } catch (error) {
      console.error('Error updating verification status in backend:', error);
      
      // Fallback a localStorage para compatibilidad durante transición
      try {
        const storedData = localStorage.getItem('mundoctor_professionals');
        let professionalDatabase = storedData ? JSON.parse(storedData) : [];
        
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

        localStorage.setItem('mundoctor_professionals', JSON.stringify(updatedProfessionals));
        setProfessionals([...updatedProfessionals]);
        
        return true;
      } catch (fallbackError) {
        console.error('Error in localStorage fallback:', fallbackError);
        return false;
      }
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
    refetch: loadProfessionals
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