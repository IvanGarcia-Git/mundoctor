import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import WeeklyCalendarView from '@/components/professional/appointments/WeeklyCalendarView';
import { sampleAppointmentsData } from '@/data/appointmentsData';
import AppointmentForm from '@/components/professional/appointments/AppointmentForm';

const ProfessionalCalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [appointments, setAppointments] = useState(sampleAppointmentsData);

  const appointmentTypes = [
    { name: 'Presencial', color: 'bg-blue-100 border-blue-200 dark:bg-blue-900/50 dark:border-blue-700' },
    { name: 'Videoconsulta', color: 'bg-purple-100 border-purple-200 dark:bg-purple-900/50 dark:border-purple-700' },
  ];

  const handleFormSubmit = (data) => {
    const newAppointment = {
      ...data,
      id: `apt${Date.now()}`,
    };
    setAppointments(prev => [...prev, newAppointment]);
    setIsFormOpen(false);
  };

  const handleAppointmentUpdate = (updatedAppointment) => {
    setAppointments(prev => 
      prev.map(app => 
        app.id === updatedAppointment.id ? updatedAppointment : app
      )
    );
  };

  return (
    <>
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Calendario de Citas</h1>
          <p className="text-muted-foreground dark:text-gray-400">Vista detallada y gestión de tus citas semanales.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() - 7);
            setSelectedDate(newDate);
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() + 7);
            setSelectedDate(newDate);
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar Nueva Cita</DialogTitle>
              </DialogHeader>
              <AppointmentForm onSubmit={handleFormSubmit} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="space-y-6">
        <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <WeeklyCalendarView 
              appointments={appointments}
              currentDate={selectedDate}
              onAppointmentUpdate={handleAppointmentUpdate}
            />
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-gray-800/60 border-border dark:border-gray-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white">Leyenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {appointmentTypes.map((type) => (
                <div key={type.name} className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-2 ${type.color}`} />
                  <span className="text-sm text-muted-foreground dark:text-gray-300">{type.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ProfessionalCalendarPage;
