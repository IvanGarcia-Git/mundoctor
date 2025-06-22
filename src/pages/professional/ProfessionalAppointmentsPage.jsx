import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, Clock, User, Stethoscope } from 'lucide-react';
import GoogleStyleCalendar from '@/components/professional/appointments/GoogleStyleCalendar';
import { sampleAppointmentsData } from '@/data/appointmentsData';
import { useToast } from '@/components/ui/use-toast';
import { servicesApi } from '@/lib/servicesApi';
import { useAuth } from '@/contexts/AuthContext';
import { emailService } from '@/lib/emailService';

// Datos de ejemplo de pacientes
const samplePatients = [
  { id: 'p1', name: 'Elena Navarro', email: 'elena.n@example.com', phone: '600112233' },
  { id: 'p2', name: 'Roberto Sanz', email: 'roberto.s@example.com', phone: '611223344' },
  { id: 'p3', name: 'Lucía Jimenez', email: 'lucia.j@example.com', phone: '622334455' },
  { id: 'p4', name: 'Marcos Alonso', email: 'marcos.a@example.com', phone: '633445566' },
  { id: 'p5', name: 'Ana Pérez', email: 'ana.p@example.com', phone: '644556677' },
  { id: 'p6', name: 'Carlos López', email: 'carlos.l@example.com', phone: '655667788' },
  { id: 'p7', name: 'Sofía Martín', email: 'sofia.m@example.com', phone: '666778899' },
];

const ProfessionalAppointmentsPage = () => {
  const [appointments, setAppointments] = useState(sampleAppointmentsData);
  const [services, setServices] = useState([]);
  const [patients] = useState(samplePatients);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Estado del formulario
  const [formData, setFormData] = useState({
    serviceId: '',
    patientId: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'Presencial',
    notes: ''
  });

  // Cargar servicios al montar el componente
  useEffect(() => {
    loadServices();
  }, [user?.id]);

  const loadServices = async () => {
    try {
      if (user?.id) {
        const loadedServices = await servicesApi.getServices(user.id);
        setServices(loadedServices);
      }
    } catch (error) {
      console.error('Error cargando servicios:', error);
      // Usar servicios de ejemplo si falla la carga
      const fallbackServices = [
        { id: '1', name: 'Consulta General', duration: 30, price: 50 },
        { id: '2', name: 'Revisión Cardiológica', duration: 45, price: 80 },
        { id: '3', name: 'Videoconsulta', duration: 30, price: 40 },
        { id: '4', name: 'Seguimiento', duration: 20, price: 30 }
      ];
      setServices(fallbackServices);
    }
  };

  const handleInputChange = (field, value) => {
    console.log(`Campo ${field} cambiado a:`, value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('FormData actualizado:', newData);
      return newData;
    });
  };

  const resetForm = () => {
    setFormData({
      serviceId: '',
      patientId: '',
      date: '',
      startTime: '',
      endTime: '',
      type: 'Presencial',
      notes: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validaciones
      if (!formData.serviceId || !formData.patientId || !formData.date || !formData.startTime || !formData.endTime) {
        throw new Error('Todos los campos obligatorios deben ser completados');
      }

      if (formData.startTime >= formData.endTime) {
        throw new Error('La hora de inicio debe ser anterior a la hora de fin');
      }

      // Buscar datos del servicio y paciente
      console.log('Buscando servicio con ID:', formData.serviceId);
      console.log('Servicios disponibles:', services);
      console.log('Buscando paciente con ID:', formData.patientId);
      console.log('Pacientes disponibles:', patients);
      
      const selectedService = services.find(s => s.id.toString() === formData.serviceId.toString());
      const selectedPatient = patients.find(p => p.id.toString() === formData.patientId.toString());
      
      console.log('Servicio encontrado:', selectedService);
      console.log('Paciente encontrado:', selectedPatient);

      if (!selectedService || !selectedPatient) {
        throw new Error('Servicio o paciente no válido');
      }

      // Crear nueva cita
      const newAppointment = {
        id: `apt_${Date.now()}`,
        patientName: selectedPatient.name,
        patientEmail: selectedPatient.email,
        service: selectedService.name,
        time: formData.startTime,
        endTime: formData.endTime,
        date: new Date(formData.date),
        type: formData.type,
        status: 'Pendiente',
        details: formData.notes || `${selectedService.name} - ${selectedPatient.name}`,
        ...(formData.type === 'Videoconsulta' && {
          link: `https://meet.example.com/session_${Date.now()}`
        }),
        ...(formData.type === 'Presencial' && {
          address: 'Consultorio - Por confirmar'
        })
      };

      // Agregar la nueva cita
      setAppointments(prev => [...prev, newAppointment]);
      
      // Enviar email de confirmación al paciente
      const professionalData = {
        name: user?.name || 'Dr. Usuario',
        specialty: 'Profesional de la salud'
      };
      
      try {
        const emailResult = await emailService.sendAppointmentConfirmation(
          newAppointment, 
          selectedPatient, 
          professionalData
        );
        
        toast({
          title: "Cita creada exitosamente",
          description: emailResult.success 
            ? `Cita programada para ${selectedPatient.name}. Se ha enviado confirmación por email.`
            : `Cita programada para ${selectedPatient.name}. No se pudo enviar el email de confirmación.`
        });
      } catch (emailError) {
        console.error('Error enviando confirmación:', emailError);
        toast({
          title: "Cita creada exitosamente",
          description: `Cita programada para ${selectedPatient.name}. Error al enviar email de confirmación.`
        });
      }
      
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error al crear la cita",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">Gestión de Citas</h1>
            <p className="text-muted-foreground dark:text-gray-400">Organiza y gestiona todas tus citas programadas.</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="lg" onClick={() => {
                console.log('Abriendo modal. Servicios actuales:', services);
                setIsFormOpen(true);
                // Asegurar que los servicios se cargan al abrir el modal
                if (services.length === 0) {
                  console.log('Cargando servicios...');
                  loadServices();
                }
              }}>
                <Plus size={18} className="mr-2" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card dark:bg-gray-800 border-border dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-foreground dark:text-white">Agendar Nueva Cita</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                {/* Servicio */}
                <div className="space-y-2">
                  <Label htmlFor="service" className="text-foreground dark:text-gray-300 flex items-center gap-2">
                    <Stethoscope size={16} />
                    Servicio *
                  </Label>
                  <select
                    id="service"
                    value={formData.serviceId}
                    onChange={(e) => handleInputChange('serviceId', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="" disabled>Seleccionar servicio</option>
                    {services.length === 0 ? (
                      <option disabled>Cargando servicios...</option>
                    ) : (
                      services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - {service.duration}min - €{service.price}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Paciente */}
                <div className="space-y-2">
                  <Label htmlFor="patient" className="text-foreground dark:text-gray-300 flex items-center gap-2">
                    <User size={16} />
                    Paciente *
                  </Label>
                  <select
                    id="patient"
                    value={formData.patientId}
                    onChange={(e) => handleInputChange('patientId', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:border-gray-600 dark:text-white"
                    required
                  >
                    <option value="" disabled>Seleccionar paciente</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} - {patient.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-foreground dark:text-gray-300 flex items-center gap-2">
                    <Calendar size={16} />
                    Fecha *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                    required
                  />
                </div>

                {/* Horario */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-foreground dark:text-gray-300 flex items-center gap-2">
                      <Clock size={16} />
                      Hora inicio *
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-foreground dark:text-gray-300 flex items-center gap-2">
                      <Clock size={16} />
                      Hora fin *
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Tipo de consulta */}
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-foreground dark:text-gray-300">Tipo de consulta</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Videoconsulta">Videoconsulta</option>
                  </select>
                </div>

                {/* Notas */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-foreground dark:text-gray-300">Notas adicionales</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Notas sobre la cita (opcional)"
                    className="bg-background dark:bg-slate-700 border-border dark:border-gray-600 text-foreground dark:text-white"
                    rows={3}
                  />
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-2 pt-4">
                  <DialogClose asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isLoading ? 'Creando...' : 'Crear Cita'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <GoogleStyleCalendar appointments={appointments} />
    </>
  );
};

export default ProfessionalAppointmentsPage;
