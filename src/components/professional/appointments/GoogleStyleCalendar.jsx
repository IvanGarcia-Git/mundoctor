import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const GoogleStyleCalendar = ({ appointments = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getAppointmentsForDay = (date) => {
    return appointments.filter(appointment => 
      isSameDay(new Date(appointment.date), date)
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmada':
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
      case 'Pendiente':
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200';
      case 'Cancelada':
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
      case 'Completada':
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200';
    }
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDialog(true);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-6 p-4">
        <h2 className="text-3xl font-bold text-foreground dark:text-white">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevMonth}
            className="h-10 w-10 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="px-4"
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            className="h-10 w-10 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendario */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-0">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);

              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[120px] p-2 border-r border-b border-gray-200 dark:border-gray-700",
                    !isCurrentMonth && "bg-gray-50 dark:bg-gray-900",
                    index % 7 === 6 && "border-r-0"
                  )}
                >
                  <div className="flex flex-col h-full">
                    {/* Número del día */}
                    <div className="mb-2">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-full",
                          isDayToday
                            ? "bg-blue-600 text-white"
                            : isCurrentMonth
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-400 dark:text-gray-600"
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Citas del día */}
                    <div className="flex-1 space-y-1">
                      {dayAppointments.slice(0, 3).map((appointment, appointmentIndex) => (
                        <div
                          key={appointmentIndex}
                          onClick={() => handleAppointmentClick(appointment)}
                          className={cn(
                            "px-2 py-1 rounded text-xs cursor-pointer border transition-colors",
                            getStatusColor(appointment.status)
                          )}
                        >
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">{appointment.time}</span>
                          </div>
                          <div className="truncate mt-1">
                            {appointment.patientName}
                          </div>
                        </div>
                      ))}
                      
                      {/* Mostrar "+X más" si hay más citas */}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                          +{dayAppointments.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalles de cita */}
      <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de la Cita</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-foreground dark:text-white">
                    {selectedAppointment.patientName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Paciente</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-foreground dark:text-white">
                    {selectedAppointment.time}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(selectedAppointment.date), 'PPP', { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className={getStatusColor(selectedAppointment.status)}
                >
                  {selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'Confirmada' 
                    ? 'Confirmada' 
                    : selectedAppointment.status === 'pending' || selectedAppointment.status === 'Pendiente'
                    ? 'Pendiente'
                    : selectedAppointment.status}
                </Badge>
              </div>

              {selectedAppointment.type && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tipo de consulta</p>
                  <p className="font-medium text-foreground dark:text-white">
                    {selectedAppointment.type}
                  </p>
                </div>
              )}

              {selectedAppointment.details && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Detalles</p>
                  <p className="text-sm text-foreground dark:text-white">
                    {selectedAppointment.details}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAppointmentDialog(false)}
                >
                  Cerrar
                </Button>
                <Button>
                  Editar cita
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoogleStyleCalendar;