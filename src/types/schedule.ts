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

export interface TimeBlock {
  id: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  createdAt: Date;
}

export interface WorkSchedule {
  appointmentDuration: number; // en minutos
  schedule: WeekSchedule;
  timeBlocks: TimeBlock[];
}

// Función helper para verificar si una fecha está bloqueada
export const isDateBlocked = (date: Date, timeBlocks: TimeBlock[]): boolean => {
  const dateTime = date.getTime();
  return timeBlocks.some(
    block => 
      dateTime >= block.startDate.getTime() && 
      dateTime <= block.endDate.getTime()
  );
};

// Función helper para verificar si una hora está dentro del horario laboral
export const isTimeInSchedule = (
  date: Date,
  schedule: WeekSchedule,
  appointmentDuration: number
): boolean => {
  const dayOfWeek = date.getDay();
  const days: (keyof WeekSchedule)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  const daySchedule = schedule[days[dayOfWeek]];

  if (!daySchedule.enabled) return false;

  const time = date.getHours() * 60 + date.getMinutes();
  return daySchedule.slots.some(slot => {
    const [startHour, startMinute] = slot.start.split(':').map(Number);
    const [endHour, endMinute] = slot.end.split(':').map(Number);
    const slotStart = startHour * 60 + startMinute;
    const slotEnd = endHour * 60 + endMinute;
    
    return time >= slotStart && (time + appointmentDuration) <= slotEnd;
  });
};
