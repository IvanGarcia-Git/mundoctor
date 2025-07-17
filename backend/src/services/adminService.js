import { query, withTransaction } from '../config/database.js';
import { logInfo, logError } from '../utils/logger.js';

class AdminService {
  // ===== GESTIÓN DE USUARIOS =====
  
  // Obtener lista de usuarios con filtros y paginación
  async getUsers(filters = {}, pagination = {}) {
    try {
      const { role, status, search, dateFrom, dateTo } = filters;
      const { limit = 20, offset = 0, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;
      
      let whereConditions = ['1=1'];
      let queryParams = [];
      let paramIndex = 1;
      
      // Filtro por rol
      if (role) {
        whereConditions.push(`u.role = $${paramIndex}`);
        queryParams.push(role);
        paramIndex++;
      }
      
      // Filtro por estado (activo/suspendido)
      if (status !== undefined) {
        whereConditions.push(`u.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }
      
      // Búsqueda por nombre o email
      if (search) {
        whereConditions.push(`(
          u.first_name ILIKE $${paramIndex} OR 
          u.last_name ILIKE $${paramIndex} OR 
          u.email ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      // Filtro por fecha de registro
      if (dateFrom) {
        whereConditions.push(`u.created_at >= $${paramIndex}`);
        queryParams.push(dateFrom);
        paramIndex++;
      }
      
      if (dateTo) {
        whereConditions.push(`u.created_at <= $${paramIndex}`);
        queryParams.push(dateTo);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const usersQuery = `
        SELECT 
          u.id,
          u.clerk_id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.role,
          u.status,
          u.profile_image,
          u.email_verified,
          u.created_at,
          u.updated_at,
          u.last_login,
          COUNT(DISTINCT a.id) as appointment_count,
          CASE 
            WHEN u.role = 'professional' THEN pp.specialty
            ELSE NULL
          END as specialty,
          CASE 
            WHEN u.role = 'professional' THEN pp.license_number
            ELSE NULL
          END as license_number
        FROM users u
        LEFT JOIN appointments a ON u.id = a.patient_id OR u.id = a.professional_id
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        WHERE ${whereClause}
        GROUP BY u.id, pp.specialty, pp.license_number
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await query(usersQuery, queryParams);
      
      // Obtener total de registros
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        WHERE ${whereClause}
      `;
      
      const countResult = await query(countQuery, queryParams.slice(0, -2));
      
      return {
        users: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logError('Error al obtener usuarios:', error);
      throw error;
    }
  }
  
  // Obtener usuario específico por ID
  async getUserById(userId) {
    try {
      const userQuery = `
        SELECT 
          u.*,
          pp.specialty,
          pp.license_number,
          pp.years_of_experience,
          pp.office_address,
          pp.office_phone,
          pp.about,
          pp.consultation_fee,
          COUNT(DISTINCT a.id) as total_appointments,
          COUNT(DISTINCT r.id) as total_reviews,
          AVG(r.rating) as average_rating
        FROM users u
        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN appointments a ON u.id = a.patient_id OR u.id = a.professional_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        WHERE u.id = $1
        GROUP BY u.id, pp.specialty, pp.license_number, pp.years_of_experience, 
                 pp.office_address, pp.office_phone, pp.about, pp.consultation_fee
      `;
      
      const result = await query(userQuery, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al obtener usuario por ID:', error);
      throw error;
    }
  }
  
  // Actualizar usuario
  async updateUser(userId, updates) {
    const client = await withTransaction();
    
    try {
      await client.query('BEGIN');
      
      // Campos permitidos para actualizar en la tabla users
      const allowedUserFields = [
        'first_name', 'last_name', 'phone', 'role', 'status', 'email_verified'
      ];
      
      const userUpdates = {};
      allowedUserFields.forEach(field => {
        if (updates[field] !== undefined) {
          userUpdates[field] = updates[field];
        }
      });
      
      if (Object.keys(userUpdates).length > 0) {
        const setClause = Object.keys(userUpdates)
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ');
        
        const updateQuery = `
          UPDATE users 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `;
        
        await client.query(updateQuery, [userId, ...Object.values(userUpdates)]);
      }
      
      await client.query('COMMIT');
      
      // Retornar el usuario actualizado
      return await this.getUserById(userId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Error al actualizar usuario:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Suspender/reactivar usuario
  async suspendUser(userId, suspend = true, reason = null) {
    try {
      const status = suspend ? 'suspended' : 'active';
      
      const updateQuery = `
        UPDATE users 
        SET status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await query(updateQuery, [userId, status]);
      
      if (result.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }
      
      // Log de la acción de suspensión
      if (suspend && reason) {
        const logQuery = `
          INSERT INTO admin_actions (admin_id, action_type, target_user_id, details)
          VALUES ($1, 'user_suspended', $2, $3)
        `;
        
        await query(logQuery, [null, userId, JSON.stringify({ reason })]);
      }
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al suspender/reactivar usuario:', error);
      throw error;
    }
  }
  
  // Eliminar usuario (soft delete)
  async deleteUser(userId, adminId) {
    const client = await withTransaction();
    
    try {
      await client.query('BEGIN');
      
      // Verificar que el usuario existe
      const userCheck = await client.query('SELECT id, role FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw new Error('Usuario no encontrado');
      }
      
      const user = userCheck.rows[0];
      
      // No permitir eliminar otros administradores
      if (user.role === 'admin') {
        throw new Error('No se puede eliminar un administrador');
      }
      
      // Marcar como eliminado en lugar de eliminar físicamente
      await client.query(`
        UPDATE users 
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [userId]);
      
      // Cancelar citas futuras si es profesional o paciente
      await client.query(`
        UPDATE appointments 
        SET status = 'cancelled', 
            cancellation_reason = 'Usuario eliminado por administrador',
            updated_at = CURRENT_TIMESTAMP
        WHERE (patient_id = $1 OR professional_id = $1) 
          AND status IN ('scheduled', 'confirmed')
          AND appointment_date > NOW()
      `, [userId]);
      
      // Log de la acción
      await client.query(`
        INSERT INTO admin_actions (admin_id, action_type, target_user_id, details)
        VALUES ($1, 'user_deleted', $2, $3)
      `, [adminId, userId, JSON.stringify({ deletedAt: new Date() })]);
      
      await client.query('COMMIT');
      
      return { success: true, message: 'Usuario eliminado correctamente' };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Error al eliminar usuario:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // ===== GESTIÓN DE SUSCRIPCIONES =====
  
  // Obtener lista de suscripciones
  async getSubscriptions(filters = {}, pagination = {}) {
    try {
      const { status, plan, userId } = filters;
      const { limit = 20, offset = 0 } = pagination;
      
      let whereConditions = ['1=1'];
      let queryParams = [];
      let paramIndex = 1;
      
      if (status) {
        whereConditions.push(`s.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }
      
      if (plan) {
        whereConditions.push(`s.plan = $${paramIndex}`);
        queryParams.push(plan);
        paramIndex++;
      }
      
      if (userId) {
        whereConditions.push(`s.user_id = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const subscriptionsQuery = `
        SELECT 
          s.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email,
          u.role
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await query(subscriptionsQuery, queryParams);
      
      // Obtener total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM subscriptions s
        WHERE ${whereClause}
      `;
      
      const countResult = await query(countQuery, queryParams.slice(0, -2));
      
      return {
        subscriptions: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logError('Error al obtener suscripciones:', error);
      throw error;
    }
  }
  
  // Crear suscripción
  async createSubscription(subscriptionData) {
    try {
      const {
        userId,
        plan,
        price,
        billingCycle,
        startDate,
        endDate,
        paymentMethod
      } = subscriptionData;
      
      const insertQuery = `
        INSERT INTO subscriptions (
          user_id, plan, price, billing_cycle, 
          start_date, end_date, payment_method, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        RETURNING *
      `;
      
      const result = await query(insertQuery, [
        userId, plan, price, billingCycle,
        startDate, endDate, paymentMethod
      ]);
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al crear suscripción:', error);
      throw error;
    }
  }
  
  // Actualizar suscripción
  async updateSubscription(subscriptionId, updates) {
    try {
      const allowedFields = [
        'plan', 'price', 'billing_cycle', 'status',
        'start_date', 'end_date', 'payment_method'
      ];
      
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
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const updateQuery = `
        UPDATE subscriptions 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await query(updateQuery, [subscriptionId, ...Object.values(updateFields)]);
      
      if (result.rows.length === 0) {
        throw new Error('Suscripción no encontrada');
      }
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al actualizar suscripción:', error);
      throw error;
    }
  }
  
  // ===== ACCIONES ADMINISTRATIVAS =====
  
  // Obtener historial de acciones administrativas
  async getAdminActions(filters = {}, pagination = {}) {
    try {
      const { adminId, actionType, targetUserId, dateFrom, dateTo } = filters;
      const { limit = 50, offset = 0 } = pagination;
      
      let whereConditions = ['1=1'];
      let queryParams = [];
      let paramIndex = 1;
      
      if (adminId) {
        whereConditions.push(`aa.admin_id = $${paramIndex}`);
        queryParams.push(adminId);
        paramIndex++;
      }
      
      if (actionType) {
        whereConditions.push(`aa.action_type = $${paramIndex}`);
        queryParams.push(actionType);
        paramIndex++;
      }
      
      if (targetUserId) {
        whereConditions.push(`aa.target_user_id = $${paramIndex}`);
        queryParams.push(targetUserId);
        paramIndex++;
      }
      
      if (dateFrom) {
        whereConditions.push(`aa.created_at >= $${paramIndex}`);
        queryParams.push(dateFrom);
        paramIndex++;
      }
      
      if (dateTo) {
        whereConditions.push(`aa.created_at <= $${paramIndex}`);
        queryParams.push(dateTo);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const actionsQuery = `
        SELECT 
          aa.*,
          admin_u.first_name || ' ' || admin_u.last_name as admin_name,
          target_u.first_name || ' ' || target_u.last_name as target_user_name,
          target_u.email as target_user_email
        FROM admin_actions aa
        LEFT JOIN users admin_u ON aa.admin_id = admin_u.id
        LEFT JOIN users target_u ON aa.target_user_id = target_u.id
        WHERE ${whereClause}
        ORDER BY aa.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await query(actionsQuery, queryParams);
      
      return {
        actions: result.rows,
        total: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logError('Error al obtener acciones administrativas:', error);
      throw error;
    }
  }
  
  // Registrar acción administrativa
  async logAdminAction(adminId, actionType, targetUserId = null, details = {}) {
    try {
      const logQuery = `
        INSERT INTO admin_actions (admin_id, action_type, target_user_id, details)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const result = await query(logQuery, [
        adminId,
        actionType,
        targetUserId,
        JSON.stringify(details)
      ]);
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al registrar acción administrativa:', error);
      throw error;
    }
  }
  
  // ===== CONFIGURACIÓN DEL SISTEMA =====
  
  // Obtener configuración del sistema
  async getSystemSettings() {
    try {
      const settingsQuery = `
        SELECT key, value, description, type
        FROM system_settings
        ORDER BY category, key
      `;
      
      const result = await query(settingsQuery);
      
      // Convertir a objeto para facilidad de uso
      const settings = {};
      result.rows.forEach(row => {
        settings[row.key] = {
          value: row.value,
          description: row.description,
          type: row.type
        };
      });
      
      return settings;
      
    } catch (error) {
      logError('Error al obtener configuración del sistema:', error);
      throw error;
    }
  }
  
  // Actualizar configuración del sistema
  async updateSystemSetting(key, value, adminId) {
    try {
      const updateQuery = `
        UPDATE system_settings 
        SET value = $2, updated_at = CURRENT_TIMESTAMP
        WHERE key = $1
        RETURNING *
      `;
      
      const result = await query(updateQuery, [key, value]);
      
      if (result.rows.length === 0) {
        throw new Error('Configuración no encontrada');
      }
      
      // Log de la acción
      await this.logAdminAction(adminId, 'system_setting_updated', null, {
        setting: key,
        newValue: value
      });
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al actualizar configuración:', error);
      throw error;
    }
  }
}

export default new AdminService();