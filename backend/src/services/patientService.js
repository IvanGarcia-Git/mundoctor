import { query, withTransaction } from '../config/database.js';
import { logInfo, logError } from '../utils/logger.js';

class PatientService {
  // Obtener perfil del paciente
  async getPatientProfile(userId) {
    try {
      const profileQuery = `
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
      
      const result = await query(profileQuery, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logError('Error al obtener perfil del paciente:', error);
      throw error;
    }
  }

  // Actualizar perfil del paciente
  async updatePatientProfile(userId, profileData) {
    const client = await withTransaction();
    
    try {
      await client.query('BEGIN');
      
      const {
        first_name, last_name, phone, profile_image,
        date_of_birth, gender, blood_type, allergies,
        medical_conditions, medications, emergency_contact_name,
        emergency_contact_phone, insurance_provider, insurance_policy_number,
        address, city, state, zip_code, country
      } = profileData;
      
      // Actualizar datos básicos del usuario
      if (first_name || last_name || phone || profile_image) {
        const updateUserQuery = `
          UPDATE users 
          SET first_name = COALESCE($2, first_name),
              last_name = COALESCE($3, last_name),
              phone = COALESCE($4, phone),
              profile_image = COALESCE($5, profile_image),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
        
        await client.query(updateUserQuery, [userId, first_name, last_name, phone, profile_image]);
      }
      
      // Verificar si existe perfil de paciente
      const checkProfileQuery = `SELECT id FROM patient_profiles WHERE user_id = $1`;
      const profileExists = await client.query(checkProfileQuery, [userId]);
      
      if (profileExists.rows.length === 0) {
        // Crear perfil de paciente
        const createProfileQuery = `
          INSERT INTO patient_profiles (
            user_id, date_of_birth, gender, blood_type, allergies,
            medical_conditions, medications, emergency_contact_name,
            emergency_contact_phone, insurance_provider, insurance_policy_number,
            address, city, state, zip_code, country
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `;
        
        await client.query(createProfileQuery, [
          userId, date_of_birth, gender, blood_type, allergies,
          medical_conditions, medications, emergency_contact_name,
          emergency_contact_phone, insurance_provider, insurance_policy_number,
          address, city, state, zip_code, country
        ]);
      } else {
        // Actualizar perfil de paciente
        const updateProfileQuery = `
          UPDATE patient_profiles 
          SET date_of_birth = COALESCE($2, date_of_birth),
              gender = COALESCE($3, gender),
              blood_type = COALESCE($4, blood_type),
              allergies = COALESCE($5, allergies),
              medical_conditions = COALESCE($6, medical_conditions),
              medications = COALESCE($7, medications),
              emergency_contact_name = COALESCE($8, emergency_contact_name),
              emergency_contact_phone = COALESCE($9, emergency_contact_phone),
              insurance_provider = COALESCE($10, insurance_provider),
              insurance_policy_number = COALESCE($11, insurance_policy_number),
              address = COALESCE($12, address),
              city = COALESCE($13, city),
              state = COALESCE($14, state),
              zip_code = COALESCE($15, zip_code),
              country = COALESCE($16, country),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
        `;
        
        await client.query(updateProfileQuery, [
          userId, date_of_birth, gender, blood_type, allergies,
          medical_conditions, medications, emergency_contact_name,
          emergency_contact_phone, insurance_provider, insurance_policy_number,
          address, city, state, zip_code, country
        ]);
      }
      
      await client.query('COMMIT');
      
      // Retornar perfil actualizado
      return await this.getPatientProfile(userId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Error al actualizar perfil del paciente:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener citas del paciente
  async getPatientAppointments(userId, filters = {}, pagination = {}) {
    try {
      const { status, dateFrom, dateTo } = filters;
      const { limit = 10, offset = 0 } = pagination;
      
      let whereConditions = ['a.patient_id = $1'];
      let queryParams = [userId];
      let paramIndex = 2;
      
      if (status) {
        whereConditions.push(`a.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }
      
      if (dateFrom) {
        whereConditions.push(`a.appointment_date >= $${paramIndex}`);
        queryParams.push(dateFrom);
        paramIndex++;
      }
      
      if (dateTo) {
        whereConditions.push(`a.appointment_date <= $${paramIndex}`);
        queryParams.push(dateTo);
        paramIndex++;
      }
      
      const appointmentsQuery = `
        SELECT 
          a.*,
          u.first_name || ' ' || u.last_name as professional_name,
          u.profile_image as professional_image,
          pp.specialty,
          pp.office_address,
          pp.office_phone,
          s.name as service_name,
          s.price as service_price,
          s.duration as service_duration
        FROM appointments a
        JOIN users u ON a.professional_id = u.id
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN services s ON a.service_id = s.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY a.appointment_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await query(appointmentsQuery, queryParams);
      
      return {
        appointments: result.rows,
        total: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logError('Error al obtener citas del paciente:', error);
      throw error;
    }
  }

  // Obtener historial médico del paciente
  async getPatientHistory(userId) {
    try {
      const historyQuery = `
        SELECT 
          a.id,
          a.appointment_date,
          a.status,
          a.notes as appointment_notes,
          a.diagnosis,
          a.treatment,
          a.prescription,
          u.first_name || ' ' || u.last_name as professional_name,
          pp.specialty,
          s.name as service_name
        FROM appointments a
        JOIN users u ON a.professional_id = u.id
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN services s ON a.service_id = s.id
        WHERE a.patient_id = $1 AND a.status = 'completed'
        ORDER BY a.appointment_date DESC
      `;
      
      const result = await query(historyQuery, [userId]);
      return result.rows;
      
    } catch (error) {
      logError('Error al obtener historial médico:', error);
      throw error;
    }
  }

  // Gestión de profesionales favoritos
  async getFavoriteProfessionals(userId) {
    try {
      const favoritesQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          u.profile_image,
          pp.specialty,
          pp.office_address,
          pp.office_city,
          pp.consultation_fee,
          AVG(r.rating) as average_rating,
          COUNT(r.id) as review_count,
          fp.created_at as favorited_at
        FROM favorite_professionals fp
        JOIN users u ON fp.professional_id = u.id
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        WHERE fp.patient_id = $1
        GROUP BY u.id, u.first_name, u.last_name, u.profile_image,
                 pp.specialty, pp.office_address, pp.office_city, 
                 pp.consultation_fee, fp.created_at
        ORDER BY fp.created_at DESC
      `;
      
      const result = await query(favoritesQuery, [userId]);
      return result.rows;
      
    } catch (error) {
      logError('Error al obtener profesionales favoritos:', error);
      throw error;
    }
  }

  async addFavoriteProfessional(userId, professionalId) {
    try {
      // Verificar que el profesional existe
      const profCheck = await query(
        'SELECT id FROM users WHERE id = $1 AND role = \'professional\'',
        [professionalId]
      );
      
      if (profCheck.rows.length === 0) {
        throw new Error('Profesional no encontrado');
      }
      
      // Verificar si ya está en favoritos
      const existingFavorite = await query(
        'SELECT id FROM favorite_professionals WHERE patient_id = $1 AND professional_id = $2',
        [userId, professionalId]
      );
      
      if (existingFavorite.rows.length > 0) {
        throw new Error('Profesional ya está en favoritos');
      }
      
      const insertQuery = `
        INSERT INTO favorite_professionals (patient_id, professional_id)
        VALUES ($1, $2)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [userId, professionalId]);
      return result.rows[0];
      
    } catch (error) {
      logError('Error al agregar profesional favorito:', error);
      throw error;
    }
  }

  async removeFavoriteProfessional(userId, professionalId) {
    try {
      const deleteQuery = `
        DELETE FROM favorite_professionals 
        WHERE patient_id = $1 AND professional_id = $2
        RETURNING *
      `;
      
      const result = await query(deleteQuery, [userId, professionalId]);
      
      if (result.rows.length === 0) {
        throw new Error('Profesional no encontrado en favoritos');
      }
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al remover profesional favorito:', error);
      throw error;
    }
  }

  // Gestión de contactos de emergencia
  async getEmergencyContacts(userId) {
    try {
      const contactsQuery = `
        SELECT * FROM emergency_contacts 
        WHERE patient_id = $1 
        ORDER BY is_primary DESC, created_at ASC
      `;
      
      const result = await query(contactsQuery, [userId]);
      return result.rows;
      
    } catch (error) {
      logError('Error al obtener contactos de emergencia:', error);
      throw error;
    }
  }

  async addEmergencyContact(userId, contactData) {
    try {
      const { name, relationship, phone, email, is_primary = false } = contactData;
      
      // Si es contacto primario, actualizar otros para que no sean primarios
      if (is_primary) {
        await query(
          'UPDATE emergency_contacts SET is_primary = false WHERE patient_id = $1',
          [userId]
        );
      }
      
      const insertQuery = `
        INSERT INTO emergency_contacts (patient_id, name, relationship, phone, email, is_primary)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [userId, name, relationship, phone, email, is_primary]);
      return result.rows[0];
      
    } catch (error) {
      logError('Error al agregar contacto de emergencia:', error);
      throw error;
    }
  }

  async updateEmergencyContact(userId, contactId, contactData) {
    try {
      const { name, relationship, phone, email, is_primary } = contactData;
      
      // Verificar que el contacto pertenece al usuario
      const contactCheck = await query(
        'SELECT id FROM emergency_contacts WHERE id = $1 AND patient_id = $2',
        [contactId, userId]
      );
      
      if (contactCheck.rows.length === 0) {
        throw new Error('Contacto de emergencia no encontrado');
      }
      
      // Si es contacto primario, actualizar otros para que no sean primarios
      if (is_primary) {
        await query(
          'UPDATE emergency_contacts SET is_primary = false WHERE patient_id = $1 AND id != $2',
          [userId, contactId]
        );
      }
      
      const updateQuery = `
        UPDATE emergency_contacts 
        SET name = COALESCE($3, name),
            relationship = COALESCE($4, relationship),
            phone = COALESCE($5, phone),
            email = COALESCE($6, email),
            is_primary = COALESCE($7, is_primary),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND patient_id = $2
        RETURNING *
      `;
      
      const result = await query(updateQuery, [contactId, userId, name, relationship, phone, email, is_primary]);
      return result.rows[0];
      
    } catch (error) {
      logError('Error al actualizar contacto de emergencia:', error);
      throw error;
    }
  }

  async deleteEmergencyContact(userId, contactId) {
    try {
      const deleteQuery = `
        DELETE FROM emergency_contacts 
        WHERE id = $1 AND patient_id = $2
        RETURNING *
      `;
      
      const result = await query(deleteQuery, [contactId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Contacto de emergencia no encontrado');
      }
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al eliminar contacto de emergencia:', error);
      throw error;
    }
  }
}

export default new PatientService();