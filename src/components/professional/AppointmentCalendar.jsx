import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const AppointmentCalendar = ({ 
  selectedDate, 
  onDateSelect, 
  availableHours,
  selectedTime,
  onTimeSelect,
  onReserve,
  price 
}) => {
  return (    <Card className="p-6 sticky top-6 flex flex-col items-center">
      <div className="mb-6 w-full">
        <h3 className="text-lg font-semibold mb-2 text-center">Disponibilidad</h3>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
          <Clock size={16} />
          <span>Lunes a Viernes</span>
        </div>
        <div className="text-sm text-gray-600 ml-6">9:00 - 20:00</div>
      </div>      <div className="mb-6 flex justify-center w-full">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          className="rounded-md border bg-white dark:bg-gray-800 shadow-sm"
          disabled={(date) => 
            date < new Date() || 
            date.getDay() === 0 || 
            date.getDay() === 6
          }
        />
      </div>      {selectedDate && (
        <>
          <div className="mb-6 w-full">
            <h4 className="font-medium mb-3 text-center">
              Horas disponibles para el {selectedDate.toLocaleDateString()}
            </h4>
            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
              {availableHours.map((hour) => (
                <Button
                  key={hour}
                  variant={selectedTime === hour ? "default" : "outline"}
                  onClick={() => onTimeSelect(hour)}
                  className="w-full hover:scale-105 transition-transform"
                >
                  {hour}
                </Button>
              ))}
            </div>
          </div>

          {selectedTime && (
            <div className="w-full max-w-sm">
              <div className="flex justify-between items-center mb-4 p-3 bg-blue-50 dark:bg-gray-800 rounded-lg">
                <span className="font-medium text-blue-900 dark:text-blue-100">Precio consulta:</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{price}€</span>
              </div>
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all" 
                onClick={onReserve}
              >
                Reservar Cita
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default AppointmentCalendar;
