import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { es } from 'date-fns/locale';

const AppointmentCalendar = ({ className }) => {
  const events = [
    { id: 1, title: 'Juan Pérez', time: '09:00', type: 'consulta', status: 'confirmed' },
    { id: 2, title: 'Ana Martínez', time: '09:30', type: 'revision', status: 'confirmed' },
    { id: 3, title: 'Pedro Sánchez', time: '11:00', type: 'consulta', status: 'pending' },
    { id: 4, title: 'Laura Rodríguez', time: '15:00', type: 'consulta', status: 'confirmed' },
    { id: 5, title: 'Miguel Fernández', time: '16:00', type: 'revision', status: 'confirmed' },
    { id: 6, title: 'Carmen Ruiz', time: '10:00', type: 'consulta', status: 'confirmed' },
    { id: 7, title: 'David González', time: '12:00', type: 'urgencia', status: 'pending' },
    { id: 8, title: 'Isabel Torres', time: '09:00', type: 'primera', status: 'confirmed' },
  ];

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'consulta': return 'bg-blue-100 text-blue-600';
      case 'revision': return 'bg-green-100 text-green-600';
      case 'urgencia': return 'bg-red-100 text-red-600';
      case 'primera': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <Calendar
      mode="single"
      className={cn("p-3", className)}
      locale={es}
      selected={new Date(2025, 5, 9)}
      modifiers={{
        appointment: (date) => {
          // Simulamos los días que tienen citas
          return [8, 9, 10, 16, 28].includes(date.getDate());
        }
      }}
      modifiersStyles={{
        appointment: {
          color: 'var(--primary)',
          fontWeight: '600'
        }
      }}
      components={{
        DayContent: ({ date, ...props }) => {
          const hasAppointments = [8, 9, 10, 16, 28].includes(date.getDate());
          const isSelected = date.getDate() === 9; // Día actual seleccionado

          return (
            <div {...props} className="relative">
              {date.getDate()}
              {hasAppointments && (
                <div className={cn(
                  "absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                  isSelected ? "bg-background" : "bg-primary"
                )} />
              )}
            </div>
          );
        }
      }}
    />
  );
};

export default AppointmentCalendar;
