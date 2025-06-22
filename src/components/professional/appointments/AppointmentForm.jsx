import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const AppointmentForm = ({ onSubmit, currentAppointment }) => {
  const [formData, setFormData] = useState(currentAppointment || {
    patientName: '',
    date: new Date(),
    time: '',
    type: '',
    status: 'Pendiente',
    details: '',
    link: '',
    address: ''
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormDateChange = (date) => {
    setFormData(prev => ({ ...prev, date }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="patientName" className="text-foreground dark:text-gray-300">
          Nombre del Paciente
        </Label>
        <Input 
          id="patientName" 
          name="patientName" 
          value={formData.patientName} 
          onChange={handleFormChange} 
          required 
          className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white" 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date" className="text-foreground dark:text-gray-300">
            Fecha
          </Label>
          <Calendar 
            mode="single" 
            selected={formData.date} 
            onSelect={handleFormDateChange} 
            className="rounded-md border bg-background dark:bg-slate-700 dark:border-gray-600 p-2 w-full text-sm" 
            locale={es}
          />
        </div>

        <div>
          <Label htmlFor="time" className="text-foreground dark:text-gray-300">
            Hora
          </Label>
          <Input 
            id="time" 
            name="time" 
            type="time" 
            value={formData.time} 
            onChange={handleFormChange} 
            required 
            className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white" 
          />
        </div>
      </div>

      <div>
        <Label htmlFor="type" className="text-foreground dark:text-gray-300">
          Tipo de Cita
        </Label>
        <Select 
          name="type" 
          value={formData.type} 
          onValueChange={(value) => handleFormChange({ target: { name: 'type', value }})}
        >
          <SelectTrigger className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white">
            <SelectValue placeholder="Selecciona tipo" />
          </SelectTrigger>
          <SelectContent className="bg-popover dark:bg-slate-700 border-border dark:border-gray-600 text-popover-foreground dark:text-white">
            <SelectItem value="Presencial">Presencial</SelectItem>
            <SelectItem value="Videoconsulta">Videoconsulta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence>
        {formData.type === 'Videoconsulta' && (
          <motion.div
            key="videoconsulta-link"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Label htmlFor="link" className="text-foreground dark:text-gray-300">
              Enlace Videoconsulta
            </Label>
            <Input 
              id="link" 
              name="link" 
              value={formData.link || ''} 
              onChange={handleFormChange} 
              className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white" 
            />
          </motion.div>
        )}

        {formData.type === 'Presencial' && (
          <motion.div
            key="presencial-address"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Label htmlFor="address" className="text-foreground dark:text-gray-300">
              Dirección/Sala
            </Label>
            <Input 
              id="address" 
              name="address" 
              value={formData.address || ''} 
              onChange={handleFormChange} 
              className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <Label htmlFor="details" className="text-foreground dark:text-gray-300">
          Detalles
        </Label>
        <Textarea 
          id="details" 
          name="details" 
          value={formData.details} 
          onChange={handleFormChange} 
          className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white min-h-[100px]" 
        />
      </div>

      <div>
        <Label htmlFor="status" className="text-foreground dark:text-gray-300">
          Estado
        </Label>
        <Select 
          name="status" 
          value={formData.status} 
          onValueChange={(value) => handleFormChange({ target: { name: 'status', value }})}
        >
          <SelectTrigger className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white">
            <SelectValue placeholder="Selecciona estado" />
          </SelectTrigger>
          <SelectContent className="bg-popover dark:bg-slate-700 border-border dark:border-gray-600 text-popover-foreground dark:text-white">
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="Confirmada">Confirmada</SelectItem>
            <SelectItem value="Cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <DialogClose asChild>
          <Button 
            type="button" 
            variant="outline" 
            className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancelar
          </Button>
        </DialogClose>
        <Button 
          type="submit" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {currentAppointment ? 'Guardar Cambios' : 'Crear Cita'}
        </Button>
      </div>
    </form>
  );
};

export default AppointmentForm;
