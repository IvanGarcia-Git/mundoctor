
import React from 'react';
import { CalendarDays, UserCircle, FileText, BarChart3, MessageSquare, ShieldCheck } from 'lucide-react';

export const statsData = [
  { value: 10000, suffix: '+', label: 'Profesionales confían en nosotros' },
  { value: 500000, suffix: '+', label: 'Citas gestionadas al mes' },
  { value: 98, suffix: '%', label: 'Satisfacción de usuarios' },
  { value: '24/7', label: 'Soporte técnico' }
];

export const featuresData = [
  {
    icon: <CalendarDays className="w-8 h-8 text-blue-500 dark:text-blue-400" />,
    title: 'Gestión de Citas Avanzada',
    description: 'Optimiza tu agenda con un calendario inteligente. Configura disponibilidad, tipos de consulta, y recibe notificaciones automáticas.',
    details: ['Agenda online 24/7 personalizable', 'Recordatorios automáticos (email/SMS)', 'Gestión de ausencias y festivos', 'Sincronización con calendarios externos'],
    imageAlt: 'Interfaz de calendario de citas online para doctores',
    imageDesc: 'Un calendario digital interactivo mostrando citas de pacientes y disponibilidad de un profesional médico.',
    imageSrc: 'https://marketingparaclinicas.info/wp-content/uploads/2023/08/4BF064E5-2695-484A-94E7-84C21F8C909F-1024x576.png'
  },
  {
    icon: <UserCircle className="w-8 h-8 text-green-500 dark:text-green-400" />,
    title: 'Perfil Profesional Impactante',
    description: 'Destaca en nuestro directorio. Muestra tu experiencia, especialidades, servicios, y recoge opiniones verificadas para atraer más pacientes.',
    details: ['Perfil público personalizable y optimizado', 'Gestión de opiniones y respuestas', 'Posicionamiento destacado en búsquedas', 'Integración de video-consulta'],
    imageAlt: 'Ejemplo de perfil profesional de un médico en la plataforma',
    imageDesc: 'Vista detallada del perfil de un doctor, incluyendo foto, especialidad, biografía y valoraciones de pacientes.',
    imageSrc: 'https://www.cvmaker.es/static/9db09b0d35d483b56177a1d722c8b9ab/c0398/personal-profile-cv.webp'
  },
  {
    icon: <FileText className="w-8 h-8 text-purple-500 dark:text-purple-400" />,
    title: 'Historiales Clínicos Digitales',
    description: 'Registra de forma segura y accesible la información de tus pacientes. Historiales, notas, y documentos, todo encriptado y conforme a normativas.',
    details: ['Historial clínico digital completo y seguro', 'Plantillas personalizables por especialidad', 'Adjunta documentos y resultados de pruebas', 'Cumplimiento RGPD/LOPD'],
    imageAlt: 'Sistema de gestión de historiales clínicos digitales',
    imageDesc: 'Pantalla de un software médico mostrando el historial clínico electrónico de un paciente con notas y documentos.',
    imageSrc: 'https://img.freepik.com/vector-premium/historia-clinica-diagnostico-tarjeta-paciente_176411-1406.jpg'
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />,
    title: 'Facturación y Finanzas Simplificadas',
    description: 'Genera facturas automáticamente, gestiona pagos online y lleva un control detallado de tus ingresos y gastos con nuestro sistema integrado.',
    details: ['Creación y envío automático de facturas', 'Integración con pasarelas de pago (Stripe)', 'Informes financieros detallados', 'Gestión de cobros y recordatorios de pago'],
    imageAlt: 'Panel de control de facturación para consultas médicas',
    imageDesc: 'Dashboard de un sistema de facturación mostrando ingresos, facturas pendientes y gráficos financieros.',
    imageSrc: 'https://quaderno-cms.s3.eu-west-1.amazonaws.com/Mejores_10_programas_de_facturacion_ddd02affb5.png'
  },
  {
    icon: <MessageSquare className="w-8 h-8 text-pink-500 dark:text-pink-400" />,
    title: 'Comunicación Directa con Pacientes',
    description: 'Facilita la comunicación segura con tus pacientes a través de mensajería integrada, ideal para seguimientos y consultas rápidas.',
    details: ['Chat seguro y encriptado', 'Notificaciones de nuevos mensajes', 'Plantillas de respuestas rápidas', 'Historial de conversaciones'],
    imageAlt: 'Interfaz de chat entre médico y paciente',
    imageDesc: 'Aplicación de mensajería mostrando una conversación entre un doctor y un paciente sobre su tratamiento.',
    imageSrc: 'https://sinch.com/wp-content/uploads/2025/04/SI-Blog-RCS-no-setor_hero_image_1400x830-2.png'
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-teal-500 dark:text-teal-400" />,
    title: 'Seguridad y Cumplimiento Normativo',
    description: 'Tu tranquilidad es nuestra prioridad. Cumplimos con los más altos estándares de seguridad y normativas de protección de datos.',
    details: ['Encriptación de datos en reposo y tránsito', 'Copias de seguridad automáticas', 'Acceso basado en roles', 'Auditorías de seguridad periódicas', 'Cumplimiento RGPD'],
    imageAlt: 'Iconos de seguridad y cumplimiento normativo en protección de datos',
    imageDesc: 'Representación gráfica de un escudo y un candado simbolizando la seguridad de los datos médicos.',
    imageSrc: 'https://cdn.aicad.es/asset/img/3/cumplimiento-normativo.svg'
  }
];

export const pricingPlansData = [
  {
    id: 'free',
    name: 'Gratis',
    price: '0€',
    period: '/mes',
    description: 'Perfil básico y contacto vía email para darte a conocer.',
    features: [
      'Perfil básico profesional', 
      'Contacto vía email',
      'Visibilidad limitada en búsquedas'
    ],
    buttonText: 'Empezar gratis',
    bgColor: 'bg-background dark:bg-gray-800/70',
    textColor: 'text-foreground dark:text-white',
    borderColor: 'border-border dark:border-gray-700',
    buttonClass: 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500'
  },
  {
    id: 'basic',
    name: 'Básico',
    price: '24.95€',
    originalPrice: '44.95€',
    period: '/mes',
    annualPrice: '249.50€', // 10 meses en lugar de 12 (2 meses gratis)
    annualOriginalPrice: '539.40€', // Precio anual original
    description: 'Gestiona tus citas y comunícate eficazmente.',
    features: [
      'Todo lo del plan Gratuito', 
      'Gestión de citas y calendario online', 
      'Mensajería interna con pacientes',
      'Mayor visibilidad en búsquedas'
    ],
    buttonText: 'Elegir Básico',
    popular: true,
    bgColor: 'bg-primary/10 dark:bg-blue-600/80',
    textColor: 'text-foreground dark:text-white',
    borderColor: 'border-primary dark:border-blue-500',
    buttonClass: 'bg-primary hover:bg-primary/90 dark:bg-blue-500 dark:hover:bg-blue-600 text-primary-foreground dark:text-white'
  },
  {
    id: 'professional',
    name: 'Profesional',
    price: '39.95€',
    originalPrice: '59.95€',
    period: '/mes',
    annualPrice: '399.50€', // 10 meses en lugar de 12 (2 meses gratis)
    annualOriginalPrice: '719.40€', // Precio anual original
    description: 'La solución completa para digitalizar tu consulta.',
    features: [
      'Todo lo del plan Básico', 
      'Pagos online integrados (Stripe)', 
      'Widget de reservas para tu web', 
      'Soporte prioritario',
      'Máxima visibilidad y SEO optimizado'
    ],
    buttonText: 'Elegir Profesional',
    bgColor: 'bg-background dark:bg-gray-800/70',
    textColor: 'text-foreground dark:text-white',
    borderColor: 'border-border dark:border-gray-700',
    buttonClass: 'bg-green-500 hover:bg-green-600 text-white'
  }
];
