import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import ProfessionalInfo from '@/components/professional/ProfessionalInfo';
import AppointmentCalendar from '@/components/professional/AppointmentCalendar';

import { professionals } from '@/data/professionalsData';

const ProfessionalProfilePage = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [professional, setProfessional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  
  // Horarios disponibles simulados
  const availableHours = [
    '09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'
  ];

  useEffect(() => {
    // En un caso real, aquí se haría una llamada a la API
    // Por ahora usamos datos de ejemplo
    const foundProfessional = professionals.find(p => p.id.toString() === id);
    const baseProfessional = foundProfessional || professionals[0];
    
    // Si el profesional que se está viendo es el usuario actual, usar sus datos de configuración
    if (user && user.role === 'professional' && (!id || user.id === id)) {
      setProfessional({
        ...baseProfessional,
        insurance: user.insuranceData || baseProfessional.insurance
      });
    } else {
      setProfessional(baseProfessional);
    }
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

  if (!professional) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        Cargando perfil del profesional...
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
