
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const sampleAppointmentsData = [
  { id: '1', patientName: 'Ana Pérez', time: '10:00', date: new Date(2025, 5, 27), type: 'Videoconsulta', status: 'Confirmada', details: 'Consulta de seguimiento cardiología.', link: 'https://meet.example.com/session1' },
  { id: '2', patientName: 'Carlos López', time: '11:30', date: new Date(2025, 5, 27), type: 'Presencial', status: 'Pendiente', details: 'Primera consulta dermatología.', address: 'Clínica Central, Sala 3' },
  { id: '3', patientName: 'Sofía Martín', time: '16:00', date: new Date(2025, 5, 28), type: 'Videoconsulta', status: 'Confirmada', details: 'Revisión resultados analítica.', link: 'https://meet.example.com/session2' },
  { id: '4', patientName: 'Luis Fernández', time: '09:00', date: new Date(2025, 5, 29), type: 'Presencial', status: 'Cancelada', details: 'Consulta general.', address: 'Consultorio Local, Despacho 1' },
  { id: '5', patientName: 'Elena Navarro', time: '14:00', date: new Date(2025, 5, 27), type: 'Videoconsulta', status: 'Confirmada', details: 'Consulta nutricional.', link: 'https://meet.example.com/session3' },
  { id: '6', patientName: 'Javier Ruiz', time: '17:30', date: new Date(2025, 5, 28), type: 'Presencial', status: 'Pendiente', details: 'Terapia física.', address: 'Centro de Rehabilitación, Box 5' },
  { id: '7', patientName: 'Isabel Jiménez', time: '12:00', date: new Date(2025, 5, 29), type: 'Videoconsulta', status: 'Completada', details: 'Consulta psicológica de seguimiento.', link: 'https://meet.example.com/session4' },
  { id: '8', patientName: 'Marcos Alonso', time: '10:30', date: new Date(new Date().setDate(new Date().getDate() + 1)), type: 'Presencial', status: 'Confirmada', details: 'Revisión dental.', address: 'Clínica Dental Sonrisa Feliz, Gabinete 2' },
  { id: '9', patientName: 'Lucía Vidal', time: '15:00', date: new Date(new Date().setDate(new Date().getDate() + 1)), type: 'Videoconsulta', status: 'Pendiente', details: 'Consulta pediatría.', link: 'https://meet.example.com/session5' },
  { id: '10', patientName: 'David García', time: '09:30', date: new Date(new Date().setDate(new Date().getDate() + 2)), type: 'Presencial', status: 'Confirmada', details: 'Análisis de sangre.', address: 'Laboratorio Clínico Avanzado' },
];

export const getStatusColor = (status) => {
  switch (status) {
    case 'Confirmada': return 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300';
    case 'Pendiente': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300';
    case 'Cancelada': return 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300';
    case 'Completada': return 'bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300';
  }
};

export const formatDateForDisplay = (date) => {
    return format(date, "PPP", { locale: es });
};

export const formatDateForComparison = (date) => {
    return format(date, 'yyyy-MM-dd');
};
