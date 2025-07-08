import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/ClerkAuthContext';
import ProfessionalInfo from '@/components/professional/ProfessionalInfo';
import AppointmentCalendar from '@/components/professional/AppointmentCalendar';

import { professionals } from '@/data/professionalsData';

// API Configuration
const API_BASE_URL = 'http://localhost:8001/api';

// API function to get professional details
const getProfessionalDetails = async (professionalId) => {
  try {
    // First try the direct route
    const response = await fetch(`${API_BASE_URL}/professionals/${professionalId}`);
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.warn('Direct professional route failed, trying search API');
  }
  
  // Fallback: use search API to find the professional
  const searchResponse = await fetch(`${API_BASE_URL}/professionals/search?limit=100`);
  if (!searchResponse.ok) {
    throw new Error('Failed to fetch professional details');
  }
  
  const searchData = await searchResponse.json();
  if (searchData.success) {
    const professional = searchData.data.professionals.find(p => p.id === professionalId);
    if (professional) {
      return {
        success: true,
        data: professional
      };
    }
  }
  
  throw new Error('Professional not found');
};

// Transform API data to match component expectations
const transformProfessionalData = (apiData) => {
  const prof = apiData.data;
  
  return {
    id: prof.id,
    name: prof.name,
    specialty: prof.specialty_name || prof.specialty?.name || 'Medicina General',
    specialty_id: prof.specialty_id || prof.specialty?.id,
    city: prof.city || 'No especificada',
    licenseNumber: prof.license_number || 'No especificado',
    rating: prof.rating || 0,
    reviews: prof.total_reviews || 0,
    image: prof.avatar_url || "https://images.unsplash.com/photo-1675270714610-11a5cadcc7b3",
    priceRange: [prof.consultation_fee || 50, prof.consultation_fee ? prof.consultation_fee + 30 : 80],
    services: prof.services || [],
    insurance: {
      worksWithInsurance: true, // Default value, could be from API later
      insuranceCompanies: [] // Default value, could be from API later
    },
    contact: {
      phone: prof.phone || 'No disponible',
      email: prof.email || 'No disponible'
    },
    education: prof.education ? [prof.education] : ['Información no disponible'],
    experience: prof.experience_years ? [`${prof.experience_years} años de experiencia`] : ['Información no disponible'],
    opinions: prof.recent_reviews ? prof.recent_reviews.map(review => ({
      user: review.patient_name || 'Usuario anónimo',
      rating: review.rating || 5,
      comment: review.comment || 'Sin comentario'
    })) : [],
    biography: prof.about || 'Profesional de la salud comprometido con la atención de calidad.',
    verified: prof.verified || false,
    office_hours: prof.office_hours || {},
    languages: prof.languages || []
  };
};

const ProfessionalProfilePage = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [professional, setProfessional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Horarios disponibles simulados
  const availableHours = [
    '09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'
  ];

  useEffect(() => {
    const fetchProfessionalData = async () => {
      if (!id) {
        setError('ID del profesional no encontrado');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Try to fetch from API first
        const apiResponse = await getProfessionalDetails(id);
        if (apiResponse.success) {
          const transformedData = transformProfessionalData(apiResponse);
          
          // If viewing own profile as professional, merge with user insurance data
          if (user && user.role === 'professional' && user.id === id) {
            transformedData.insurance = user.insuranceData || transformedData.insurance;
          }
          
          setProfessional(transformedData);
        } else {
          throw new Error('Professional not found in API');
        }
      } catch (error) {
        console.warn('API fetch failed, falling back to static data:', error);
        
        // Fallback to static data
        const foundProfessional = professionals.find(p => p.id.toString() === id);
        if (foundProfessional) {
          setProfessional(foundProfessional);
        } else {
          setError('Profesional no encontrado');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionalData();
  }, [id, user]);

  const handleBooking = () => {
    if (!selectedTime) {
      toast({ 
        title: "Error", 
        description: "Por favor, selecciona una hora para la cita.", 
        variant: "destructive" 
      });
      return;
    }
    toast({ 
      title: "Cita Solicitada", 
      description: `Tu cita con ${professional.name} el ${selectedDate.toLocaleDateString()} a las ${selectedTime} ha sido solicitada. Recibirás una confirmación pronto.` 
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-md w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded-md w-32 mx-auto"></div>
        </div>
        <p className="mt-4 text-muted-foreground">Cargando perfil del profesional...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.history.back()} 
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Volver atrás
          </button>
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <p className="text-muted-foreground">Profesional no encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Columna izquierda con información del profesional */}
          <div className="lg:w-2/3">
            <ProfessionalInfo professional={professional} />
          </div>

          {/* Columna derecha con calendario */}
          <div className="lg:w-1/3">
            <AppointmentCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              availableHours={availableHours}
              selectedTime={selectedTime}
              onTimeSelect={setSelectedTime}
              onReserve={handleBooking}
              price={professional.priceRange?.[0] || 80}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalProfilePage;
