import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { TimeSlot } from './WorkScheduleManager';

interface DayScheduleProps {
  slots: TimeSlot[];
  onSlotsChange: (slots: TimeSlot[]) => void;
  appointmentDuration: number;
}

const DaySchedule: React.FC<DayScheduleProps> = ({
  slots,
  onSlotsChange,
  appointmentDuration,
}) => {
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  const addSlot = () => {
    const newSlot = {
      start: '09:00',
      end: '14:00',
    };
    onSlotsChange([...slots, newSlot]);
  };

  const removeSlot = (index: number) => {
    const newSlots = slots.filter((_, i) => i !== index);
    onSlotsChange(newSlots);
  };

  const updateSlot = (index: number, field: keyof TimeSlot, value: string) => {
    const newSlots = slots.map((slot, i) => {
      if (i === index) {
        return { ...slot, [field]: value };
      }
      return slot;
    });
    onSlotsChange(newSlots);
  };

  return (
    <div className="space-y-4 pl-8">
      {slots.map((slot, index) => (
        <div key={index} className="flex items-center space-x-4">
          <Select
            value={slot.start}
            onValueChange={(value) => updateSlot(index, 'start', value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Inicio" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span>a</span>

          <Select
            value={slot.end}
            onValueChange={(value) => updateSlot(index, 'end', value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Fin" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeSlot(index)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addSlot}
        className="mt-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Añadir Horario
      </Button>
    </div>
  );
};

export default DaySchedule;
