import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ServiceForm = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: initialData || {
      name: '',
      description: '',
      duration: 30,
      price: '',
      patientsPerDay: 8,
      appointmentsPerDay: 16,
    }
  });

  const handleFormSubmit = (data) => {
    onSubmit({
      ...data,
      price: parseFloat(data.price),
      duration: parseInt(data.duration),
      patientsPerDay: parseInt(data.patientsPerDay),
      appointmentsPerDay: parseInt(data.appointmentsPerDay),
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Servicio' : 'Nuevo Servicio'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del servicio</Label>
            <Input
              id="name"
              {...register('name', { required: 'El nombre es requerido' })}
              placeholder="ej. Consulta general"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register('description', { required: 'La descripción es requerida' })}
              placeholder="Describe brevemente el servicio..."
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duración (minutos)</Label>
              <Input
                id="duration"
                type="number"
                {...register('duration', {
                  required: 'La duración es requerida',
                  min: { value: 5, message: 'Mínimo 5 minutos' },
                  max: { value: 240, message: 'Máximo 240 minutos' }
                })}
              />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register('price', {
                  required: 'El precio es requerido',
                  min: { value: 0, message: 'El precio no puede ser negativo' }
                })}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientsPerDay">Pacientes por día</Label>
              <Input
                id="patientsPerDay"
                type="number"
                {...register('patientsPerDay', {
                  required: 'Este campo es requerido',
                  min: { value: 1, message: 'Mínimo 1 paciente' }
                })}
              />
              {errors.patientsPerDay && (
                <p className="text-sm text-destructive">{errors.patientsPerDay.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointmentsPerDay">Citas por día</Label>
              <Input
                id="appointmentsPerDay"
                type="number"
                {...register('appointmentsPerDay', {
                  required: 'Este campo es requerido',
                  min: { value: 1, message: 'Mínimo 1 cita' }
                })}
              />
              {errors.appointmentsPerDay && (
                <p className="text-sm text-destructive">{errors.appointmentsPerDay.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm;
