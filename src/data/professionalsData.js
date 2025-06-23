export const professionals = [
  {
    id: 1,
    name: 'Dra. María García',
    specialty: 'Cardiología',
    city: 'Madrid',
    licenseNumber: '12345',
    rating: 4.8,
    reviews: 132,
    image: "https://res.cloudinary.com/dsvlod4cj/image/upload/v1623456789/mundoctor/doctors/doctora-maria-garcia.jpg",
    imageAlt: "Dra. María García - Cardióloga",
    priceRange: [80, 120],    services: ['ECG', 'Ecocardiograma', 'Prueba de esfuerzo', 'Holter', 'Consulta cardiológica'],
    insurance: {
      worksWithInsurance: true,
      insuranceCompanies: ['sanitas', 'adeslas', 'dkv', 'asisa']
    },
    contact: {
      phone: '+34 912 345 678',
      email: 'maria.garcia@example.com'
    },
    education: [
      'Licenciatura en Medicina - Universidad Complutense de Madrid',
      'Especialidad en Cardiología - Hospital Universitario La Paz',
      'Máster en Arritmias - Universidad Europea de Madrid'
    ],
    experience: [
      'Cardióloga adjunta en Hospital La Paz (5 años)',
      'Jefa de Unidad de Arritmias en Clínica Privada (3 años)',
      'Investigadora principal en estudios clínicos cardiovasculares'
    ],
    opinions: [
      {
        user: 'Ana Martínez',
        rating: 5,
        comment: 'Excelente profesional. Muy atenta y profesional en su trato. Me ayudó mucho con mi problema cardíaco.'
      },
      {
        user: 'Carlos Ruiz',
        rating: 4.8,
        comment: 'Muy buena doctora, muy clara en sus explicaciones. El único inconveniente es que hay que esperar un poco para las citas.'
      }
    ]
  },
  {
    id: 2,
    name: 'Dr. Juan Martínez',
    specialty: 'Dermatología',
    city: 'Barcelona',
    licenseNumber: '23456',
    rating: 4.9,
    reviews: 98,    image: "https://res.cloudinary.com/dsvlod4cj/image/upload/v1623456790/mundoctor/doctors/doctor-juan-martinez.jpg",
    imageAlt: "Dr. Juan Martínez - Dermatólogo",
    insurance: {
      worksWithInsurance: true,
      insuranceCompanies: ['sanitas', 'mapfre', 'axa']
    },
    priceRange: [70, 100],
    services: ['Consulta dermatológica', 'Dermatoscopia digital', 'Biopsia cutánea', 'Tratamientos láser', 'Cirugía dermatológica'],
    contact: {
      phone: '+34 933 456 789',
      email: 'juan.martinez@example.com'
    },
    education: [
      'Licenciatura en Medicina - Universidad de Barcelona',
      'Especialidad en Dermatología - Hospital Clínic',
      'Fellowship en Dermatología Oncológica - Memorial Sloan Kettering Cancer Center'
    ],
    experience: [
      'Dermatólogo en Hospital Clínic de Barcelona (8 años)',
      'Director de Unidad de Melanoma (4 años)',
      'Profesor asociado de Dermatología'
    ],
    opinions: [
      {
        user: 'María López',
        rating: 5,
        comment: 'Gran profesional. Me detectó un melanoma a tiempo y me salvó la vida.'
      },
      {
        user: 'Pedro Sánchez',
        rating: 4.9,
        comment: 'Excelente trato y muy buen diagnóstico. Totalmente recomendable.'
      }
    ]
  },
  {
    id: 3,
    name: 'Dra. Laura Rodríguez',
    specialty: 'Pediatría',
    city: 'Madrid',
    licenseNumber: '34567',
    rating: 4.95,
    reviews: 156,
    image: "https://res.cloudinary.com/dsvlod4cj/image/upload/v1623456791/mundoctor/doctors/doctora-laura-rodriguez.jpg",
    imageAlt: "Dra. Laura Rodríguez - Pediatra",
    priceRange: [60, 90],
    services: ['Consulta pediátrica', 'Seguimiento del desarrollo', 'Vacunación', 'Urgencias pediátricas'],
    contact: {
      phone: '+34 914 567 890',
      email: 'laura.rodriguez@example.com'
    },
    education: [
      'Licenciatura en Medicina - Universidad Autónoma de Madrid',
      'Especialidad en Pediatría - Hospital La Paz',
      'Máster en Urgencias Pediátricas'
    ],
    experience: [
      'Pediatra en Hospital Infantil La Paz (10 años)',
      'Coordinadora de Urgencias Pediátricas (5 años)',
      'Voluntariado médico internacional'
    ],
    opinions: [
      {
        user: 'Elena García',
        rating: 5,
        comment: 'Increíble con los niños. Mi hijo, que siempre tiene miedo al médico, se siente muy cómodo con ella.'
      },
      {
        user: 'David Fernández',
        rating: 4.9,
        comment: 'Muy profesional y cercana. Da mucha confianza y explica todo muy bien.'
      }
    ]
  }
];
