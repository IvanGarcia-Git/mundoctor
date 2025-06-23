// Simulación de API para servicios profesionales
import { ProfessionalService, ServiceFormData } from '@/types/services';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simular base de datos en memoria
let servicesDB: ProfessionalService[] = [
  {
    id: 1,
    name: 'Consulta general',
    description: 'Consulta médica general para diagnóstico y tratamiento',
    duration: 30,
    price: 50,
    patientsPerDay: 8,
    appointmentsPerDay: 16,
    professionalId: 'prof1',
    isActive: true
  },
  {
    id: 2,
    name: 'Seguimiento',
    description: 'Consulta de seguimiento para pacientes en tratamiento',
    duration: 20,
    price: 30,
    patientsPerDay: 12,
    appointmentsPerDay: 24,
    professionalId: 'prof1',
    isActive: true
  },
  {
    id: 3,
    name: 'Primera consulta',
    description: 'Consulta inicial con historia clínica completa',
    duration: 45,
    price: 70,
    patientsPerDay: 6,
    appointmentsPerDay: 10,
    professionalId: 'prof1',
    isActive: true
  }
];

export const servicesApi = {
  // Obtener todos los servicios de un profesional
  getServices: async (professionalId: string): Promise<ProfessionalService[]> => {
    await delay(500); // Simular latencia de red
    return servicesDB.filter(s => s.professionalId === professionalId && s.isActive);
  },

  // Obtener un servicio específico
  getService: async (serviceId: number): Promise<ProfessionalService | null> => {
    await delay(500);
    return servicesDB.find(s => s.id === serviceId && s.isActive) || null;
  },

  // Crear un nuevo servicio
  createService: async (professionalId: string, data: ServiceFormData): Promise<ProfessionalService> => {
    await delay(500);
    const newService: ProfessionalService = {
      ...data,
      id: Math.max(...servicesDB.map(s => s.id), 0) + 1,
      professionalId,
      isActive: true
    };
    servicesDB.push(newService);
    return newService;
  },

  // Actualizar un servicio existente
  updateService: async (serviceId: number, data: Partial<ServiceFormData>): Promise<ProfessionalService> => {
    await delay(500);
    const index = servicesDB.findIndex(s => s.id === serviceId);
    if (index === -1) throw new Error('Servicio no encontrado');
    
    servicesDB[index] = {
      ...servicesDB[index],
      ...data
    };
    return servicesDB[index];
  },

  // Eliminar un servicio (soft delete)
  deleteService: async (serviceId: number): Promise<void> => {
    await delay(500);
    const index = servicesDB.findIndex(s => s.id === serviceId);
    if (index === -1) throw new Error('Servicio no encontrado');
    
    servicesDB[index].isActive = false;
  }
};
