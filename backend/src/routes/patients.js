import express from 'express';
import patientService from '../services/patientService.js';
import searchService from '../services/searchService.js';
import { requireAuth, attachUser, requireRole } from '../middleware/auth.js';
import { 
  validatePatientProfile, 
  validateProfessionalSearch, 
  validateNearbySearch,
  validateSpecialtyFilter,
  validateEmergencyContact,
  validateUpdateEmergencyContact,
  validateContactId,
  validateProfessionalId
} from '../validators/patientValidator.js';
import { createAuditLog as auditLog } from '../utils/auditLog.js';
import { successResponse, errorResponse } from '../utils/responses.js';

const router = express.Router();

// Middleware para autenticación en todas las rutas
router.use(requireAuth);

// GET /api/patients/profile - Obtener perfil del paciente
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await patientService.getPatientProfile(userId);
    
    if (!profile) {
      return errorResponse(res, 404, 'Perfil de paciente no encontrado');
    }

    await auditLog(userId, 'patient_profile_accessed', { 
      action: 'view_profile',
      ip: req.ip
    });

    successResponse(res, profile, 'Perfil obtenido correctamente');
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// PUT /api/patients/profile - Actualizar perfil del paciente
router.put('/profile', validatePatientProfile, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    const updatedProfile = await patientService.updatePatientProfile(userId, updates);
    
    await auditLog(userId, 'patient_profile_updated', { 
      action: 'update_profile',
      changes: Object.keys(updates),
      ip: req.ip
    });

    successResponse(res, updatedProfile, 'Perfil actualizado correctamente');
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/patients/appointments - Obtener citas del paciente
router.get('/appointments', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, startDate, endDate, limit = 10, offset = 0 } = req.query;
    
    const filters = {
      patientId: userId,
      status,
      startDate,
      endDate
    };

    const appointments = await patientService.getPatientAppointments(filters, { limit, offset });
    
    await auditLog(userId, 'patient_appointments_accessed', { 
      action: 'view_appointments',
      filters,
      ip: req.ip
    });

    successResponse(res, appointments, 'Citas obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener citas:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/patients/history - Obtener historial médico del paciente
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit = 20, offset = 0 } = req.query;
    
    const filters = {
      patientId: userId,
      startDate,
      endDate
    };

    const history = await patientService.getPatientHistory(filters, { limit, offset });
    
    await auditLog(userId, 'patient_history_accessed', { 
      action: 'view_history',
      filters,
      ip: req.ip
    });

    successResponse(res, history, 'Historial médico obtenido correctamente');
  } catch (error) {
    console.error('Error al obtener historial:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/patients/favorite-professionals - Obtener profesionales favoritos
router.get('/favorite-professionals', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;
    
    const favorites = await patientService.getFavoriteProfessionals(userId, { limit, offset });
    
    await auditLog(userId, 'patient_favorites_accessed', { 
      action: 'view_favorites',
      ip: req.ip
    });

    successResponse(res, favorites, 'Profesionales favoritos obtenidos correctamente');
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/patients/favorite-professionals/:professionalId - Agregar profesional a favoritos
router.post('/favorite-professionals/:professionalId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { professionalId } = req.params;
    
    await patientService.addFavoriteProfessional(userId, professionalId);
    
    await auditLog(userId, 'professional_added_to_favorites', { 
      action: 'add_favorite',
      professionalId,
      ip: req.ip
    });

    successResponse(res, null, 'Profesional agregado a favoritos');
  } catch (error) {
    console.error('Error al agregar favorito:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// DELETE /api/patients/favorite-professionals/:professionalId - Quitar profesional de favoritos
router.delete('/favorite-professionals/:professionalId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { professionalId } = req.params;
    
    await patientService.removeFavoriteProfessional(userId, professionalId);
    
    await auditLog(userId, 'professional_removed_from_favorites', { 
      action: 'remove_favorite',
      professionalId,
      ip: req.ip
    });

    successResponse(res, null, 'Profesional removido de favoritos');
  } catch (error) {
    console.error('Error al remover favorito:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/patients/emergency-contacts - Obtener contactos de emergencia
router.get('/emergency-contacts', async (req, res) => {
  try {
    const userId = req.user.id;
    const contacts = await patientService.getEmergencyContacts(userId);
    
    await auditLog(userId, 'emergency_contacts_accessed', { 
      action: 'view_emergency_contacts',
      ip: req.ip
    });

    successResponse(res, contacts, 'Contactos de emergencia obtenidos correctamente');
  } catch (error) {
    console.error('Error al obtener contactos de emergencia:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// POST /api/patients/emergency-contacts - Agregar contacto de emergencia
router.post('/emergency-contacts', async (req, res) => {
  try {
    const userId = req.user.id;
    const contactData = req.body;
    
    const contact = await patientService.addEmergencyContact(userId, contactData);
    
    await auditLog(userId, 'emergency_contact_added', { 
      action: 'add_emergency_contact',
      contactId: contact.id,
      ip: req.ip
    });

    successResponse(res, contact, 'Contacto de emergencia agregado correctamente');
  } catch (error) {
    console.error('Error al agregar contacto de emergencia:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// PUT /api/patients/emergency-contacts/:contactId - Actualizar contacto de emergencia
router.put('/emergency-contacts/:contactId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;
    const updates = req.body;
    
    const contact = await patientService.updateEmergencyContact(userId, contactId, updates);
    
    await auditLog(userId, 'emergency_contact_updated', { 
      action: 'update_emergency_contact',
      contactId,
      changes: Object.keys(updates),
      ip: req.ip
    });

    successResponse(res, contact, 'Contacto de emergencia actualizado correctamente');
  } catch (error) {
    console.error('Error al actualizar contacto de emergencia:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// DELETE /api/patients/emergency-contacts/:contactId - Eliminar contacto de emergencia
router.delete('/emergency-contacts/:contactId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;
    
    await patientService.removeEmergencyContact(userId, contactId);
    
    await auditLog(userId, 'emergency_contact_deleted', { 
      action: 'delete_emergency_contact',
      contactId,
      ip: req.ip
    });

    successResponse(res, null, 'Contacto de emergencia eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar contacto de emergencia:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// ===== RUTAS DE BÚSQUEDA DE PROFESIONALES =====

// GET /api/patients/search/professionals - Búsqueda general de profesionales
router.get('/search/professionals', validateProfessionalSearch, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, specialty, location, minRating, maxPrice, experience, limit = 10, offset = 0 } = req.query;
    
    const searchParams = {
      query,
      specialty,
      location,
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      experience: experience ? parseInt(experience) : undefined
    };
    
    const pagination = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const results = await searchService.searchProfessionals(searchParams, pagination);
    
    await auditLog(userId, 'professional_search', { 
      action: 'search_professionals',
      searchParams,
      resultsCount: results.professionals.length,
      ip: req.ip
    });

    successResponse(res, results, 'Búsqueda de profesionales completada');
  } catch (error) {
    console.error('Error en búsqueda de profesionales:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/patients/search/nearby - Búsqueda de profesionales cercanos
router.get('/search/nearby', validateNearbySearch, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, radius = 10, specialty, minRating, limit = 10, offset = 0 } = req.query;
    
    const filters = {
      specialty,
      minRating: minRating ? parseFloat(minRating) : undefined
    };
    
    const pagination = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const results = await searchService.searchNearbyProfessionals(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      filters,
      pagination
    );
    
    await auditLog(userId, 'nearby_professional_search', { 
      action: 'search_nearby_professionals',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseFloat(radius),
      filters,
      resultsCount: results.professionals.length,
      ip: req.ip
    });

    successResponse(res, results, 'Búsqueda de profesionales cercanos completada');
  } catch (error) {
    console.error('Error en búsqueda de profesionales cercanos:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/patients/search/specialty/:specialty - Filtrar por especialidad
router.get('/search/specialty/:specialty', validateSpecialtyFilter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { specialty } = req.params;
    const { minRating, maxPrice, location, experience, limit = 10, offset = 0 } = req.query;
    
    const additionalFilters = {
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      location,
      experience: experience ? parseInt(experience) : undefined
    };
    
    const pagination = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const results = await searchService.filterProfessionalsBySpecialty(
      specialty,
      additionalFilters,
      pagination
    );
    
    await auditLog(userId, 'specialty_filter_search', { 
      action: 'filter_by_specialty',
      specialty,
      additionalFilters,
      resultsCount: results.professionals.length,
      ip: req.ip
    });

    successResponse(res, results, `Profesionales de ${specialty} encontrados`);
  } catch (error) {
    console.error('Error al filtrar por especialidad:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/patients/search/specialties - Obtener todas las especialidades
router.get('/search/specialties', async (req, res) => {
  try {
    const userId = req.user.id;
    const specialties = await searchService.getAvailableSpecialties();
    
    await auditLog(userId, 'specialties_accessed', { 
      action: 'get_specialties',
      ip: req.ip
    });

    successResponse(res, specialties, 'Especialidades obtenidas correctamente');
  } catch (error) {
    console.error('Error al obtener especialidades:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

// GET /api/patients/search/featured - Obtener profesionales destacados
router.get('/search/featured', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    
    const featured = await searchService.getFeaturedProfessionals(parseInt(limit));
    
    await auditLog(userId, 'featured_professionals_accessed', { 
      action: 'get_featured_professionals',
      limit: parseInt(limit),
      ip: req.ip
    });

    successResponse(res, featured, 'Profesionales destacados obtenidos correctamente');
  } catch (error) {
    console.error('Error al obtener profesionales destacados:', error);
    errorResponse(res, 500, 'Error interno del servidor');
  }
});

export default router;