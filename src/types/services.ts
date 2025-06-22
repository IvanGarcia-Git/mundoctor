// Este archivo contiene las interfaces y tipos relacionados con los servicios profesionales
export interface ProfessionalService {
  id: number;
  name: string;
  description: string;
  duration: number; // en minutos
  price: number;
  patientsPerDay: number;
  appointmentsPerDay: number;
  professionalId: string; // ID del profesional que ofrece el servicio
  isActive: boolean;
}

export interface ServiceFormData {
  name: string;
  description: string;
  duration: number;
  price: number;
  patientsPerDay: number;
  appointmentsPerDay: number;
}

// Función para validar el formulario de servicio
export const validateServiceData = (data: ServiceFormData): string[] => {
  const errors: string[] = [];

  if (!data.name?.trim()) errors.push('El nombre es requerido');
  if (!data.description?.trim()) errors.push('La descripción es requerida');
  if (!data.duration || data.duration < 5 || data.duration > 240) {
    errors.push('La duración debe estar entre 5 y 240 minutos');
  }
  if (data.price < 0) errors.push('El precio no puede ser negativo');
  if (data.patientsPerDay < 1) errors.push('Debe atender al menos 1 paciente por día');
  if (data.appointmentsPerDay < data.patientsPerDay) {
    errors.push('El número de citas debe ser mayor o igual al número de pacientes');
  }

  return errors;
};
