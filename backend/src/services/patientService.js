import { query, withTransaction } from '../config/database.js';
import { logInfo, logError } from '../utils/logger.js';

class PatientService {
  // Obtener perfil del paciente
  async getPatientProfile(userId) {
    try {
      const query = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.profile_image,
          p.date_of_birth,
          p.gender,
          p.blood_type,
          p.allergies,
          p.medical_conditions,
          p.medications,
          p.emergency_contact_name,
          p.emergency_contact_phone,
          p.insurance_provider,
          p.insurance_policy_number,
          p.address,
          p.city,
          p.state,
          p.zip_code,
          p.country,
          p.created_at,
          p.updated_at
        FROM users u
        LEFT JOIN patient_profiles p ON u.id = p.user_id
        WHERE u.id = $1 AND u.role = 'patient'
      `;
      
      const result = await db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error al obtener perfil del paciente:', error);
      throw error;
    }
  }

  // Actualizar perfil del paciente
  async updatePatientProfile(userId, updates) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Actualizar tabla users
      const userFields = ['first_name', 'last_name', 'phone', 'profile_image'];
      const userUpdates = {};
      
      userFields.forEach(field => {
        if (updates[field] !== undefined) {
          userUpdates[field] = updates[field];
        }
      });
      
      if (Object.keys(userUpdates).length > 0) {
        const userSetClause = Object.keys(userUpdates)
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ');
        
        const userQuery = `
          UPDATE users 
          SET ${userSetClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
        
        await client.query(userQuery, [userId, ...Object.values(userUpdates)]);
      }
      
      // Actualizar tabla patient_profiles
      const patientFields = [
        'date_of_birth', 'gender', 'blood_type', 'allergies', 'medical_conditions',
        'medications', 'emergency_contact_name', 'emergency_contact_phone',
        'insurance_provider', 'insurance_policy_number', 'address', 'city',
        'state', 'zip_code', 'country'
      ];
      
      const patientUpdates = {};
      patientFields.forEach(field => {
        if (updates[field] !== undefined) {
          patientUpdates[field] = updates[field];
        }
      });
      
      if (Object.keys(patientUpdates).length > 0) {
        // Verificar si existe el perfil
        const checkQuery = 'SELECT id FROM patient_profiles WHERE user_id = $1';
        const checkResult = await client.query(checkQuery, [userId]);
        
        if (checkResult.rows.length === 0) {
          // Crear perfil si no existe
          const createQuery = `
            INSERT INTO patient_profiles (user_id, ${Object.keys(patientUpdates).join(', ')})
            VALUES ($1, ${Object.keys(patientUpdates).map((_, index) => `$${index + 2}`).join(', ')})
          `;
          await client.query(createQuery, [userId, ...Object.values(patientUpdates)]);
        } else {
          // Actualizar perfil existente
          const patientSetClause = Object.keys(patientUpdates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
          
          const patientQuery = `
            UPDATE patient_profiles 
            SET ${patientSetClause}, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
          `;
          
          await client.query(patientQuery, [userId, ...Object.values(patientUpdates)]);
        }
      }
      
      await client.query('COMMIT');
      
      // Retornar el perfil actualizado
      return await this.getPatientProfile(userId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error al actualizar perfil del paciente:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener citas del paciente
  async getPatientAppointments(filters, pagination) {
    try {
      const { patientId, status, startDate, endDate } = filters;
      const { limit, offset } = pagination;
      
      let whereClause = 'WHERE a.patient_id = $1';
      let queryParams = [patientId];
      let paramIndex = 2;
      
      if (status) {
        whereClause += ` AND a.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      
      if (startDate) {
        whereClause += ` AND a.appointment_date >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        whereClause += ` AND a.appointment_date <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }
      
      const query = `
        SELECT 
          a.id,
          a.appointment_date,
          a.start_time,
          a.end_time,
          a.status,
          a.appointment_type,
          a.notes,
          a.cancellation_reason,
          s.name as service_name,
          s.duration,
          s.price,
          u.first_name || ' ' || u.last_name as professional_name,
          u.profile_image as professional_image,
          pp.specialty,
          pp.office_address,
          a.created_at,
          a.updated_at
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN users u ON a.professional_id = u.id
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        ${whereClause}
        ORDER BY a.appointment_date DESC, a.start_time DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await db.query(query, queryParams);
      
      // Obtener el total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM appointments a
        ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      
      return {
        appointments: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logger.error('Error al obtener citas del paciente:', error);
      throw error;
    }
  }

  // Obtener historial médico del paciente
  async getPatientHistory(filters, pagination) {
    try {
      const { patientId, startDate, endDate } = filters;
      const { limit, offset } = pagination;
      
      let whereClause = 'WHERE a.patient_id = $1 AND a.status = \'completed\'';
      let queryParams = [patientId];
      let paramIndex = 2;
      
      if (startDate) {
        whereClause += ` AND a.appointment_date >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        whereClause += ` AND a.appointment_date <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }
      
      const query = `
        SELECT 
          a.id,
          a.appointment_date,
          a.start_time,
          a.end_time,
          a.notes,
          a.diagnosis,
          a.treatment_plan,
          a.prescriptions,
          s.name as service_name,
          u.first_name || ' ' || u.last_name as professional_name,
          pp.specialty,
          pp.license_number,
          a.created_at
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN users u ON a.professional_id = u.id
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        ${whereClause}
        ORDER BY a.appointment_date DESC, a.start_time DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await db.query(query, queryParams);
      
      // Obtener el total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM appointments a
        ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, queryParams.slice(0, -2));
      
      return {
        history: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logger.error('Error al obtener historial médico:', error);
      throw error;
    }
  }

  // Obtener profesionales favoritos
  async getFavoriteProfessionals(userId, pagination) {
    try {
      const { limit, offset } = pagination;
      
      const query = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          u.profile_image,
          pp.specialty,
          pp.office_address,
          pp.office_phone,
          pp.about,
          AVG(r.rating) as average_rating,
          COUNT(r.id) as review_count,
          pf.created_at as favorited_at
        FROM patient_favorites pf
        JOIN users u ON pf.professional_id = u.id
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        WHERE pf.patient_id = $1
        GROUP BY u.id, u.first_name, u.last_name, u.profile_image, 
                 pp.specialty, pp.office_address, pp.office_phone, pp.about, pf.created_at
        ORDER BY pf.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await db.query(query, [userId, limit, offset]);
      
      // Obtener el total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM patient_favorites pf
        WHERE pf.patient_id = $1
      `;
      
      const countResult = await db.query(countQuery, [userId]);
      
      return {
        favorites: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logger.error('Error al obtener profesionales favoritos:', error);
      throw error;
    }
  }

  // Agregar profesional a favoritos
  async addFavoriteProfessional(userId, professionalId) {
    try {
      // Verificar que el profesional existe
      const professionalQuery = 'SELECT id FROM users WHERE id = $1 AND role = \'professional\'';
      const professionalResult = await db.query(professionalQuery, [professionalId]);
      
      if (professionalResult.rows.length === 0) {
        throw new Error('Profesional no encontrado');
      }
      
      // Verificar que no está ya en favoritos
      const existsQuery = 'SELECT id FROM patient_favorites WHERE patient_id = $1 AND professional_id = $2';
      const existsResult = await db.query(existsQuery, [userId, professionalId]);
      
      if (existsResult.rows.length > 0) {
        throw new Error('El profesional ya está en favoritos');
      }
      
      const query = `
        INSERT INTO patient_favorites (patient_id, professional_id)
        VALUES ($1, $2)
      `;
      
      await db.query(query, [userId, professionalId]);
      
    } catch (error) {
      logger.error('Error al agregar profesional a favoritos:', error);
      throw error;
    }
  }

  // Remover profesional de favoritos
  async removeFavoriteProfessional(userId, professionalId) {
    try {
      const query = `
        DELETE FROM patient_favorites
        WHERE patient_id = $1 AND professional_id = $2
      `;
      
      const result = await db.query(query, [userId, professionalId]);
      
      if (result.rowCount === 0) {
        throw new Error('Profesional no encontrado en favoritos');
      }
      
    } catch (error) {
      logger.error('Error al remover profesional de favoritos:', error);
      throw error;
    }
  }

  // Obtener contactos de emergencia
  async getEmergencyContacts(userId) {
    try {
      const query = `
        SELECT 
          id,
          name,
          relationship,
          phone,
          email,
          address,
          is_primary,
          created_at,
          updated_at
        FROM emergency_contacts
        WHERE patient_id = $1
        ORDER BY is_primary DESC, name ASC
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows;
      
    } catch (error) {
      logger.error('Error al obtener contactos de emergencia:', error);
      throw error;
    }
  }

  // Agregar contacto de emergencia
  async addEmergencyContact(userId, contactData) {
    try {
      const { name, relationship, phone, email, address, is_primary } = contactData;
      
      const query = `
        INSERT INTO emergency_contacts (patient_id, name, relationship, phone, email, address, is_primary)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await db.query(query, [userId, name, relationship, phone, email, address, is_primary]);
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error al agregar contacto de emergencia:', error);
      throw error;
    }
  }

  // Actualizar contacto de emergencia
  async updateEmergencyContact(userId, contactId, updates) {
    try {
      const allowedFields = ['name', 'relationship', 'phone', 'email', 'address', 'is_primary'];
      const updateFields = {};
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          updateFields[field] = updates[field];
        }
      });
      
      if (Object.keys(updateFields).length === 0) {
        throw new Error('No hay campos para actualizar');
      }
      
      const setClause = Object.keys(updateFields)
        .map((key, index) => `${key} = $${index + 3}`)
        .join(', ');
      
      const query = `
        UPDATE emergency_contacts 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND patient_id = $2
        RETURNING *
      `;
      
      const result = await db.query(query, [contactId, userId, ...Object.values(updateFields)]);
      
      if (result.rows.length === 0) {
        throw new Error('Contacto de emergencia no encontrado');
      }
      
      return result.rows[0];
      
    } catch (error) {
      logger.error('Error al actualizar contacto de emergencia:', error);
      throw error;
    }
  }

  // Eliminar contacto de emergencia
  async removeEmergencyContact(userId, contactId) {
    try {
      const query = `
        DELETE FROM emergency_contacts
        WHERE id = $1 AND patient_id = $2
      `;
      
      const result = await db.query(query, [contactId, userId]);
      
      if (result.rowCount === 0) {
        throw new Error('Contacto de emergencia no encontrado');
      }
      
    } catch (error) {
      logger.error('Error al eliminar contacto de emergencia:', error);
      throw error;
    }
  }
}

export default new PatientService();