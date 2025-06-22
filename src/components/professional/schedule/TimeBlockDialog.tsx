import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

interface TimeBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TimeBlockDialog: React.FC<TimeBlockDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [reason, setReason] = React.useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos',
        variant: 'destructive',
      });
      return;
    }

    // TODO: Save time block
    toast({
      title: 'Bloqueo creado',
      description: 'El bloqueo de calendario ha sido creado correctamente.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Bloqueo de Calendario</DialogTitle>
          <DialogDescription>
            Selecciona el periodo y la razón del bloqueo (ej: vacaciones, formación, etc.)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Calendar
                mode="range"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo del bloqueo</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ej: Vacaciones de verano"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Bloqueo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TimeBlockDialog;
