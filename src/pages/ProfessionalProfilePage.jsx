import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Star, Phone, Mail, Calendar, Clock, Shield } from 'lucide-react';
import ProfessionalAvatar from '@/components/ui/professional-avatar';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';
import { format, isBefore, startOfDay, isWeekend } from 'date-fns';
import BookingModal from '@/components/patient/BookingModal';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const ProfessionalProfilePage = () => {
  const { id } = useParams();
  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Generate time slots for selected date
  const generateTimeSlots = (date) => {
    if (!date) {
      setAvailableSlots([]);
      return;
    }

    // Default available time slots
    const morningSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
    const afternoonSlots = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];
    
    // Simulate some booked slots
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const currentHour = today.getHours();
    
    let availableSlots = [...morningSlots, ...afternoonSlots];
    
    // If it's today, remove past time slots
    if (isToday) {
      availableSlots = availableSlots.filter(slot => {
        const [hour] = slot.split(':').map(Number);
        return hour > currentHour;
      });
    }
    
    // Simulate some random booked slots
    const bookedSlots = ['10:00', '16:30']; // Some example booked slots
    availableSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));
    
    setAvailableSlots(availableSlots);
  };

  useEffect(() => {
    const fetchProfessional = async () => {
      if (!id) {
        setError('ID del profesional no encontrado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Intentar obtener datos del profesional desde la API
        const response = await fetch(`${API_BASE_URL}/professionals/${id}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setProfessional(data.data);
          } else {
            throw new Error('Profesional no encontrado');
          }
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error fetching professional:', err);
        setError('No se pudo cargar la información del profesional');
      } finally {
        setLoading(false);
      }
    };

    fetchProfessional();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando información del profesional...</p>
        </div>
      </div>
    );
  }

  if (error || !professional) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error || 'Profesional no encontrado'}</p>
            <Link to="/buscar">
              <Button variant="outline" className="mr-2">
                <ArrowLeft size={16} className="mr-2" />
                Volver a la búsqueda
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const defaultProfessional = {
    id: professional.id || id, // Add the professional ID - use from API or URL param
    name: professional.name || 'Profesional',
    specialty_name: professional.specialty_name || 'Medicina General',
    city: professional.city || 'No especificado',
    avatar_url: professional.avatar_url,
    rating: professional.rating || 0,
    total_reviews: professional.total_reviews || 0,
    consultation_fee: professional.consultation_fee || 50,
    about: professional.about || 'Profesional de la salud comprometido con brindar atención de calidad.',
    verified: professional.verified || false,
    experience_years: professional.experience_years || 0,
    phone: professional.phone || 'No disponible',
    email: professional.email || 'No disponible',
    office_hours: professional.office_hours || {},
    languages: professional.languages || [],
    services: professional.services || [],
    education: professional.education || null,
    address: professional.address || 'Dirección no especificada',
    license_number: professional.license_number || null
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to="/buscar">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft size={16} className="mr-2" />
              Volver a la búsqueda
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal - Información del profesional */}
          <div className="lg:col-span-2">
            {/* Tarjeta principal del profesional */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <ProfessionalAvatar
                    imageUrl={defaultProfessional.avatar_url}
                    name={defaultProfessional.name}
                    size="xl"
                    className="mx-auto sm:mx-0"
                  />
                </div>

                {/* Información básica */}
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                      {defaultProfessional.name}
                    </h1>
                    {defaultProfessional.verified && defaultProfessional.license_number && (
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Shield size={14} />
                        Colegiado: {defaultProfessional.license_number}
                      </div>
                    )}
                  </div>

                  <p className="text-lg text-primary font-semibold mb-4">
                    {defaultProfessional.specialty_name}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center mb-3">
                    <div className="flex items-center text-yellow-500 mr-3">
                      <Star size={16} className="mr-1 fill-current" />
                      <span className="font-semibold">
                        {defaultProfessional.rating > 0 ? defaultProfessional.rating.toFixed(1) : 'Nuevo'}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      ({defaultProfessional.total_reviews} {defaultProfessional.total_reviews === 1 ? 'opinión' : 'opiniones'})
                    </span>
                  </div>

                  {/* Experiencia */}
                  {defaultProfessional.experience_years > 0 && (
                    <p className="text-muted-foreground mb-4">
                      {defaultProfessional.experience_years} años de experiencia
                    </p>
                  )}

                  {/* Precio */}
                  <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg inline-block">
                    <span className="text-sm font-medium">Consulta desde </span>
                    <span className="text-lg font-bold">{defaultProfessional.consultation_fee}€</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Información de contacto</h2>
              <div className="space-y-3">
                <div className="flex items-start text-muted-foreground">
                  <MapPin size={16} className="mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{defaultProfessional.city}</p>
                    <p className="text-sm">{defaultProfessional.address}</p>
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Phone size={16} className="mr-3" />
                  <span>{defaultProfessional.phone}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Mail size={16} className="mr-3" />
                  <span>{defaultProfessional.email}</span>
                </div>
              </div>
            </div>

            {/* Aseguradoras */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Aseguradoras</h2>
              <div className="flex flex-wrap gap-2">
                {['Sanitas', 'Adeslas', 'DKV', 'Asisa'].map((insurance) => (
                  <span
                    key={insurance}
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {insurance}
                  </span>
                ))}
              </div>
            </div>

            {/* Servicios */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Servicios</h2>
              <div className="flex flex-wrap gap-2">
                {defaultProfessional.services && defaultProfessional.services.length > 0 ? (
                  defaultProfessional.services.map((service, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {service}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">No hay servicios definidos</span>
                )}
              </div>
            </div>

            {/* Formación */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Formación</h2>
              <div className="space-y-3">
                {defaultProfessional.education ? (
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium">{defaultProfessional.education}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No hay información de formación disponible</span>
                )}
              </div>
            </div>

            {/* Descripción */}
            {defaultProfessional.about && (
              <div className="bg-card rounded-xl border border-border p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Sobre el profesional</h2>
                <p className="text-muted-foreground leading-relaxed">{defaultProfessional.about}</p>
              </div>
            )}

            {/* Reseñas de Pacientes */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Reseñas de Pacientes</h2>
                <div className="flex items-center">
                  <Star size={16} className="text-yellow-500 fill-current mr-1" />
                  <span className="font-bold text-lg">
                    {defaultProfessional.rating > 0 ? defaultProfessional.rating.toFixed(1) : 'Nuevo'}
                  </span>
                  <span className="text-muted-foreground text-sm ml-1">
                    ({defaultProfessional.total_reviews} {defaultProfessional.total_reviews === 1 ? 'reseña' : 'reseñas'})
                  </span>
                </div>
              </div>
              
              {defaultProfessional.total_reviews > 0 ? (
                <div className="space-y-4">
                  <div className="text-center text-muted-foreground py-8">
                    <p>Las reseñas se mostrarán aquí cuando estén disponibles</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>Este profesional aún no tiene reseñas</p>
                </div>
              )}
            </div>
          </div>

          {/* Columna lateral - Disponibilidad */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Disponibilidad</h2>
              
              <div className="flex items-center text-muted-foreground mb-4">
                <Clock size={16} className="mr-2" />
                <span className="text-sm">Horario de atención</span>
              </div>
              
              {Object.keys(defaultProfessional.office_hours).length > 0 ? (
                <div className="mb-6">
                  {Object.entries(defaultProfessional.office_hours).map(([day, hours]) => {
                    const dayNames = {
                      monday: 'Lunes',
                      tuesday: 'Martes', 
                      wednesday: 'Miércoles',
                      thursday: 'Jueves',
                      friday: 'Viernes',
                      saturday: 'Sábado',
                      sunday: 'Domingo'
                    };
                    
                    return (
                      <div key={day} className="flex justify-between text-sm mb-1">
                        <span>{dayNames[day]}</span>
                        <span>{hours.start} - {hours.end}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-sm mb-6 text-muted-foreground">Horario no disponible</p>
              )}

              {/* Full Calendar */}
              <div className="bg-secondary/30 rounded-lg p-4 mb-6">
                <h3 className="text-center font-medium mb-3">Seleccionar fecha</h3>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedTime(''); // Reset time when date changes
                    generateTimeSlots(date);
                  }}
                  locale={es}
                  disabled={(date) => {
                    // Disable past dates
                    if (isBefore(date, startOfDay(new Date()))) return true;
                    // Disable weekends (simulate professional not available)
                    if (isWeekend(date)) return true;
                    // Simulate some random unavailable dates
                    const day = date.getDate();
                    if ([6, 13, 20, 27].includes(day)) return true;
                    return false;
                  }}
                  className="w-full"
                  modifiers={{
                    available: (date) => {
                      if (isBefore(date, startOfDay(new Date()))) return false;
                      if (isWeekend(date)) return false;
                      const day = date.getDate();
                      return ![6, 13, 20, 27].includes(day);
                    }
                  }}
                  modifiersStyles={{
                    available: {
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      fontWeight: '600'
                    }
                  }}
                />
                <div className="mt-3 text-xs text-muted-foreground text-center">
                  <p>Los fines de semana y algunos días específicos no están disponibles</p>
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">
                    Horarios para {format(selectedDate, 'EEEE, d MMMM', { locale: es })}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                  {availableSlots.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No hay horarios disponibles para esta fecha
                    </p>
                  )}
                </div>
              )}
              
              {!selectedDate && (
                <div className="mb-6 text-center text-sm text-muted-foreground py-4">
                  Selecciona una fecha para ver los horarios disponibles
                </div>
              )}

              <Button 
                className="w-full" 
                size="lg"
                disabled={!selectedDate || !selectedTime}
                onClick={() => setShowBookingModal(true)}
              >
                {selectedDate && selectedTime ? 'Reservar cita' : 'Selecciona fecha y hora'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Booking Modal */}
      {showBookingModal && (
        <BookingModal
          professional={defaultProfessional}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onBookingSuccess={(appointment) => {
            setShowBookingModal(false);
            setSelectedDate(null);
            setSelectedTime('');
            alert('¡Cita reservada exitosamente!');
          }}
          onCancel={() => setShowBookingModal(false)}
        />
      )}
    </div>
  );
};

export default ProfessionalProfilePage;