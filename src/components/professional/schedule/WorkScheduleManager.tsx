import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DaySchedule from './DaySchedule';
import { SaveIcon, PlusCircle, Calendar } from 'lucide-react';
import TimeBlockDialog from './TimeBlockDialog';

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface WorkScheduleManagerProps {
  schedule: WeekSchedule;
  onScheduleChange: (schedule: WeekSchedule) => void;
  appointmentDuration: number;
  onAppointmentDurationChange: (duration: number) => void;
}

const WorkScheduleManager: React.FC<WorkScheduleManagerProps> = ({
  schedule,
  onScheduleChange,
  appointmentDuration,
  onAppointmentDurationChange,
}) => {
  const [isTimeBlockDialogOpen, setIsTimeBlockDialogOpen] = useState(false);

  const handleDayToggle = (day: keyof WeekSchedule) => {
    onScheduleChange({
      ...schedule,
      [day]: {
        ...schedule[day],
        enabled: !schedule[day].enabled,
      },
    });
  };

  const handleSlotChange = (day: keyof WeekSchedule, slots: TimeSlot[]) => {
    onScheduleChange({
      ...schedule,
      [day]: {
        ...schedule[day],
        slots,
      },
    });
  };

  const daysOfWeek = [
    { key: 'monday' as keyof WeekSchedule, label: 'Lunes' },
    { key: 'tuesday' as keyof WeekSchedule, label: 'Martes' },
    { key: 'wednesday' as keyof WeekSchedule, label: 'Miércoles' },
    { key: 'thursday' as keyof WeekSchedule, label: 'Jueves' },
    { key: 'friday' as keyof WeekSchedule, label: 'Viernes' },
    { key: 'saturday' as keyof WeekSchedule, label: 'Sábado' },
    { key: 'sunday' as keyof WeekSchedule, label: 'Domingo' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Horario Laboral</CardTitle>
          <CardDescription>
            Establece tus horarios de trabajo para cada día de la semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <Label>Duración de citas:</Label>
              <Select
                value={appointmentDuration.toString()}
                onValueChange={(value) => onAppointmentDurationChange(parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecciona duración" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1 hora 30 minutos</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-6">
              {daysOfWeek.map(({ key, label }) => (
                <div key={key} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`enable-${key}`}
                        checked={schedule[key].enabled}
                        onCheckedChange={() => handleDayToggle(key)}
                      />
                      <Label htmlFor={`enable-${key}`}>{label}</Label>
                    </div>
                  </div>
                  
                  {schedule[key].enabled && (
                    <DaySchedule
                      slots={schedule[key].slots}
                      onSlotsChange={(slots) => handleSlotChange(key, slots)}
                      appointmentDuration={appointmentDuration}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bloqueos de Calendario</CardTitle>
              <CardDescription>
                Gestiona periodos de vacaciones y otros bloqueos
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => setIsTimeBlockDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nuevo Bloqueo
            </Button>
          </div>
        </CardHeader>
      </Card>

      <TimeBlockDialog
        open={isTimeBlockDialogOpen}
        onOpenChange={setIsTimeBlockDialogOpen}
      />
    </div>
  );
};

export default WorkScheduleManager;
