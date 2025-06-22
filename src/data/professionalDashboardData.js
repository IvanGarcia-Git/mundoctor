
import React from 'react';

export const professionalData = {
  name: "Dr. Alejandro Pérez",
  specialty: "Cardiología",
  upcomingAppointments: 5,
  profileCompleteness: 85, 
  activeSubscription: "Profesional" 
};

export const quickLinksData = [
  { name: 'Gestionar Citas', path: '/profesionales/citas', iconName: 'CalendarDays' },
  { name: 'Ver Pacientes', path: '/profesionales/pacientes', iconName: 'Users' },
  { name: 'Editar Perfil Público', path: '/profesionales/perfil', iconName: 'UserCircle' },
  { name: 'Gestionar Suscripción', path: '/profesionales/suscripcion', iconName: 'CreditCard' },
  { name: 'Estadísticas', path: '/profesionales/estadisticas', iconName: 'BarChart2' },
  { name: 'Configuración Cuenta', path: '/profesionales/configuracion', iconName: 'Settings' },
];
