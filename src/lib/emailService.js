// Servicio de email para envío de notificaciones
export const emailService = {
  // Simular envío de email para completar perfil de paciente
  sendPatientSetupEmail: async (patientData, professionalData) => {
    try {
      // Generar token temporal para completar perfil
      const setupToken = btoa(`${patientData.id}_${Date.now()}_setup`);
      const setupUrl = `${window.location.origin}/completar-perfil?token=${setupToken}`;
      
      console.log('📧 EMAIL ENVIADO - Completar perfil de paciente:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📨 Para: ${patientData.email}`);
      console.log(`📋 Asunto: Complete su perfil en Mundoctor - Invitación de ${professionalData.name}`);
      console.log('💬 Mensaje:');
      console.log(`
      Estimado/a ${patientData.name},

      El Dr. ${professionalData.name} le ha dado de alta como paciente en Mundoctor.

      Para acceder a su área de paciente y gestionar sus citas, debe completar su perfil:

      🔗 Complete su perfil aquí: ${setupUrl}

      Datos de su cuenta:
      • Nombre: ${patientData.name}
      • Email: ${patientData.email}
      • Teléfono: ${patientData.phone}

      Una vez complete su perfil con una contraseña, podrá:
      ✅ Ver sus citas programadas
      ✅ Gestionar su información personal
      ✅ Dejar valoraciones
      ✅ Comunicarse con su médico

      Este enlace es válido por 7 días.

      Saludos,
      Equipo Mundoctor
      `);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Simular delay de envío
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        messageId: `setup_${Date.now()}`,
        setupToken
      };
    } catch (error) {
      console.error('Error enviando email de setup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Simular envío de confirmación de cita
  sendAppointmentConfirmation: async (appointmentData, patientData, professionalData) => {
    try {
      console.log('📧 EMAIL ENVIADO - Confirmación de cita:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📨 Para: ${patientData.email}`);
      console.log(`📋 Asunto: Confirmación de cita - ${professionalData.name}`);
      console.log('💬 Mensaje:');
      console.log(`
      Estimado/a ${patientData.name},

      Su cita ha sido programada exitosamente.

      📅 DETALLES DE SU CITA:
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      👨‍⚕️ Profesional: ${professionalData.name}
      🏥 Servicio: ${appointmentData.service}
      📅 Fecha: ${new Date(appointmentData.date).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
      🕒 Horario: ${appointmentData.time} - ${appointmentData.endTime}
      📍 Modalidad: ${appointmentData.type}
      ${appointmentData.type === 'Videoconsulta' ? `🔗 Enlace: ${appointmentData.link}` : ''}
      ${appointmentData.type === 'Presencial' ? `📍 Dirección: ${appointmentData.address || 'Por confirmar'}` : ''}
      ${appointmentData.notes ? `📝 Notas: ${appointmentData.notes}` : ''}

      INSTRUCCIONES:
      ${appointmentData.type === 'Videoconsulta' ? 
        `• Asegúrese de tener una conexión estable a internet
        • Pruebe su cámara y micrófono antes de la cita
        • Acceda al enlace 5 minutos antes de la hora programada` :
        `• Llegue 10 minutos antes de su cita
        • Traiga su documento de identidad
        • Traiga informes médicos previos si los tiene`
      }

      Para reagendar o cancelar su cita, puede hacerlo desde su área de paciente en Mundoctor.

      Saludos,
      ${professionalData.name}
      ${professionalData.specialty || 'Profesional de la salud'}
      `);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Simular delay de envío
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        messageId: `appointment_${Date.now()}`
      };
    } catch (error) {
      console.error('Error enviando confirmación de cita:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Simular envío de recordatorio de cita
  sendAppointmentReminder: async (appointmentData, patientData, professionalData) => {
    try {
      console.log('📧 EMAIL ENVIADO - Recordatorio de cita:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📨 Para: ${patientData.email}`);
      console.log(`📋 Asunto: Recordatorio: Su cita es mañana - ${professionalData.name}`);
      console.log('💬 Mensaje:');
      console.log(`
      Estimado/a ${patientData.name},

      Este es un recordatorio de su cita programada para mañana.

      📅 RECORDATORIO DE CITA:
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      👨‍⚕️ ${professionalData.name}
      🏥 ${appointmentData.service}
      📅 ${new Date(appointmentData.date).toLocaleDateString('es-ES')}
      🕒 ${appointmentData.time} - ${appointmentData.endTime}
      📍 ${appointmentData.type}

      ${appointmentData.type === 'Videoconsulta' ? 
        `🔗 Enlace de videoconsulta: ${appointmentData.link}` : 
        `📍 Dirección: ${appointmentData.address || 'Consulte con el profesional'}`
      }

      Si necesita cancelar o reagendar, por favor hágalo con al menos 24 horas de anticipación.

      ¡Le esperamos!
      
      Saludos,
      ${professionalData.name}
      `);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      await new Promise(resolve => setTimeout(resolve, 600));
      
      return {
        success: true,
        messageId: `reminder_${Date.now()}`
      };
    } catch (error) {
      console.error('Error enviando recordatorio:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};