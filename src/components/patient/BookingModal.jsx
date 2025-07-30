import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, MapPin, User, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@clerk/clerk-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const BookingModal = ({ professional, selectedDate, selectedTime, onBookingSuccess, onCancel }) => {
  const { getToken, isSignedIn } = useAuth();
  const [appointmentType, setAppointmentType] = useState('presencial');
  const [reason, setReason] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Por favor, ingrese el motivo de la consulta');
      return;
    }

    if (!isSignedIn) {
      alert('Debe iniciar sesión para reservar una cita');
      return;
    }

    setLoading(true);
    
    try {
      // Validate professional ID before proceeding
      if (!professional?.id) {
        alert('Error: ID del profesional no disponible. Por favor, recargue la página.');
        return;
      }

      // Calculate end time (assuming 30-minute appointments)
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate.getTime() + 30 * 60000); // Add 30 minutes
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

      const appointmentData = {
        professionalId: professional.id,
        scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedTime,
        endTime: endTime,
        appointmentType: appointmentType === 'presencial' ? 'consultation' : 'teleconsultation',
        isVirtual: appointmentType === 'videoconsulta',
        title: reason.trim(),
        description: patientNotes.trim() || undefined,
        notes: patientNotes.trim() || undefined,
        fee: professional.consultation_fee || 50,
        currency: 'EUR'
      };

      console.log('Sending appointment data:', appointmentData);

      const response = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify(appointmentData)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        onBookingSuccess && onBookingSuccess(result.data);
      } else {
        throw new Error(result.message || 'Error creating appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error al crear la cita. Por favor, inténtelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Confirmar Reserva</h2>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X size={16} />
            </Button>
          </div>

          {/* Appointment Summary */}
          <div className="bg-primary/5 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <User size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{professional?.name}</h3>
                <p className="text-sm text-muted-foreground">{professional?.specialty_name}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <span>{format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                <span>{selectedTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground" />
                <span>{professional?.city}</span>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Appointment Type */}
            <div>
              <Label className="text-base font-medium">Modalidad de Consulta *</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="appointmentType"
                    value="presencial"
                    checked={appointmentType === 'presencial'}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    className="text-primary"
                  />
                  <span>Presencial</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="appointmentType"
                    value="videoconsulta"
                    checked={appointmentType === 'videoconsulta'}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    className="text-primary"
                  />
                  <span>Videoconsulta</span>
                </label>
              </div>
            </div>

            {/* Reason for Appointment */}
            <div>
              <Label htmlFor="reason" className="text-base font-medium">
                Motivo de la Consulta *
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Dolor de cabeza, chequeo general, etc."
                className="mt-2"
                required
              />
            </div>

            {/* Additional Information */}
            <div>
              <Label htmlFor="notes" className="text-base font-medium">
                Información Adicional
              </Label>
              <Textarea
                id="notes"
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="Síntomas adicionales, medicamentos actuales, alergias, etc. (opcional)"
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Price Info */}
            <div className="bg-secondary/20 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Precio de la consulta:</span>
                <span className="text-lg font-bold text-primary">
                  {professional?.consultation_fee || 50}€
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={loading || !reason.trim()}
              >
                {loading ? 'Reservando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;