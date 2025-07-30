import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';
import { format, addDays, startOfWeek, isToday, isFuture, parseISO } from 'date-fns';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useAuth } from '@clerk/clerk-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const BookingForm = ({ professional, onBookingSuccess, onCancel }) => {
  const { getToken, isSignedIn } = useAuth();
  const patientApi = usePatientApi();
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [appointmentType, setAppointmentType] = useState('presencial');
  const [reason, setReason] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);

  // Fetch professional availability
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!professional?.id || !isSignedIn) return;
      
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/appointments/availability/${professional.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAvailability(data.data || {});
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
      }
    };

    fetchAvailability();
  }, [professional?.id, isSignedIn, getToken]);

  // Generate available time slots for selected date
  useEffect(() => {
    if (!selectedDate || !availability[format(selectedDate, 'yyyy-MM-dd')]) {
      setAvailableSlots([]);
      return;
    }

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const dayAvailability = availability[dateKey];
    
    if (dayAvailability && dayAvailability.slots) {
      setAvailableSlots(dayAvailability.slots);
    } else {
      // Generate default slots if no specific availability
      const defaultSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
      ];
      setAvailableSlots(defaultSlots);
    }
  }, [selectedDate, availability]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime(''); // Reset time selection when date changes
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || !selectedService || !reason.trim()) {
      alert('Por favor, complete todos los campos obligatorios');
      return;
    }

    setLoading(true);
    
    try {
      const appointmentData = {
        professional_id: professional.id,
        service_id: selectedService,
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        appointment_time: selectedTime,
        appointment_type: appointmentType,
        reason: reason.trim(),
        patient_notes: patientNotes.trim(),
        status: 'scheduled'
      };

      const result = await patientApi.createAppointment(appointmentData);
      
      if (result.success) {
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

  // Get available dates (next 30 days, excluding weekends if needed)
  const availableDates = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i + 1))
    .filter(date => isFuture(date) || isToday(date));

  const isDateAvailable = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    if (availability[dateKey]) {
      return availability[dateKey].available === true;
    }
    // Default: available on weekdays
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  };

  return (
    <div className="max-w-2xl mx-auto bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Reservar Cita</h2>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>

      {/* Professional Info Summary */}
      <div className="bg-primary/5 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <User size={24} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{professional?.name}</h3>
            <p className="text-muted-foreground">{professional?.specialty_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <MapPin size={14} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{professional?.city}</span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Selection */}
        <div>
          <Label htmlFor="service" className="text-base font-medium">
            Tipo de Consulta *
          </Label>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Seleccione el tipo de consulta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Consulta General - {professional?.consultation_fee}€</SelectItem>
              <SelectItem value="follow-up">Consulta de Seguimiento - {Math.round(professional?.consultation_fee * 0.8)}€</SelectItem>
              <SelectItem value="urgent">Consulta Urgente - {Math.round(professional?.consultation_fee * 1.5)}€</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                value="virtual"
                checked={appointmentType === 'virtual'}
                onChange={(e) => setAppointmentType(e.target.value)}
                className="text-primary"
              />
              <span>Videoconsulta</span>
            </label>
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <Label className="text-base font-medium flex items-center gap-2">
            <Calendar size={16} />
            Fecha de la Cita *
          </Label>
          <div className="mt-2 border rounded-lg p-4">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={es}
              disabled={(date) => !isDateAvailable(date) || date < new Date()}
              className="rounded-md"
              modifiers={{
                available: (date) => isDateAvailable(date)
              }}
              modifiersStyles={{
                available: {
                  color: 'var(--primary)',
                  fontWeight: '600'
                }
              }}
            />
          </div>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div>
            <Label className="text-base font-medium flex items-center gap-2">
              <Clock size={16} />
              Hora de la Cita *
            </Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {availableSlots.map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTime(time)}
                  className="text-sm"
                >
                  {time}
                </Button>
              ))}
            </div>
            {availableSlots.length === 0 && (
              <p className="text-muted-foreground text-sm mt-2">
                No hay horarios disponibles para esta fecha
              </p>
            )}
          </div>
        )}

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

        {/* Additional Notes */}
        <div>
          <Label htmlFor="notes" className="text-base font-medium flex items-center gap-2">
            <MessageSquare size={16} />
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

        {/* Summary */}
        {selectedDate && selectedTime && selectedService && (
          <div className="bg-secondary/20 rounded-lg p-4">
            <h4 className="font-medium mb-2">Resumen de la Cita</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Fecha:</strong> {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}</p>
              <p><strong>Hora:</strong> {selectedTime}</p>
              <p><strong>Modalidad:</strong> {appointmentType === 'presencial' ? 'Presencial' : 'Videoconsulta'}</p>
              <p><strong>Precio:</strong> {professional?.consultation_fee}€</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={loading || !selectedDate || !selectedTime || !selectedService || !reason.trim()}
          >
            {loading ? 'Procesando...' : 'Confirmar Reserva'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;