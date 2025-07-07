import { query, withTransaction } from '../config/database.js';
import { logInfo, logError } from '../utils/logger.js';

class TicketService {
  // ===== GESTIÓN DE TICKETS =====
  
  // Crear un nuevo ticket de soporte
  async createTicket(ticketData) {
    const client = await withTransaction();
    
    try {
      await client.query('BEGIN');
      
      const { userId, title, description, category, priority = 'medium' } = ticketData;
      
      // Crear el ticket
      const ticketQuery = `
        INSERT INTO support_tickets (user_id, title, description, category, priority, status)
        VALUES ($1, $2, $3, $4, $5, 'open')
        RETURNING *
      `;
      
      const ticketResult = await client.query(ticketQuery, [
        userId, title, description, category, priority
      ]);
      
      const ticket = ticketResult.rows[0];
      
      // Agregar mensaje inicial del usuario
      const messageQuery = `
        INSERT INTO support_ticket_messages (ticket_id, user_id, message)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      await client.query(messageQuery, [ticket.id, userId, description]);
      
      // Asignar automáticamente si hay reglas configuradas
      const assignedAdmin = await this.autoAssignTicket(ticket, client);
      if (assignedAdmin) {
        await client.query(`
          UPDATE support_tickets 
          SET assigned_admin_id = $2, status = 'assigned'
          WHERE id = $1
        `, [ticket.id, assignedAdmin.id]);
        
        ticket.assigned_admin_id = assignedAdmin.id;
        ticket.status = 'assigned';
      }
      
      await client.query('COMMIT');
      
      // Enviar notificación
      await this.sendTicketNotification(ticket, 'created');
      
      return await this.getTicketById(ticket.id);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Error al crear ticket:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Obtener tickets con filtros y paginación
  async getTickets(filters = {}, pagination = {}) {
    try {
      const { 
        userId, 
        assignedAdminId, 
        category, 
        priority, 
        status, 
        search,
        dateFrom,
        dateTo
      } = filters;
      
      const { limit = 20, offset = 0, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;
      
      let whereConditions = ['1=1'];
      let queryParams = [];
      let paramIndex = 1;
      
      if (userId) {
        whereConditions.push(`st.user_id = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }
      
      if (assignedAdminId) {
        whereConditions.push(`st.assigned_admin_id = $${paramIndex}`);
        queryParams.push(assignedAdminId);
        paramIndex++;
      }
      
      if (category) {
        whereConditions.push(`st.category = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }
      
      if (priority) {
        whereConditions.push(`st.priority = $${paramIndex}`);
        queryParams.push(priority);
        paramIndex++;
      }
      
      if (status) {
        whereConditions.push(`st.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }
      
      if (search) {
        whereConditions.push(`(
          st.title ILIKE $${paramIndex} OR 
          st.description ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      if (dateFrom) {
        whereConditions.push(`st.created_at >= $${paramIndex}`);
        queryParams.push(dateFrom);
        paramIndex++;
      }
      
      if (dateTo) {
        whereConditions.push(`st.created_at <= $${paramIndex}`);
        queryParams.push(dateTo);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const ticketsQuery = `
        SELECT 
          st.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          u.profile_image as user_image,
          admin_u.first_name || ' ' || admin_u.last_name as assigned_admin_name,
          COUNT(stm.id) as message_count,
          MAX(stm.created_at) as last_message_at
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        LEFT JOIN users admin_u ON st.assigned_admin_id = admin_u.id
        LEFT JOIN support_ticket_messages stm ON st.id = stm.ticket_id
        WHERE ${whereClause}
        GROUP BY st.id, u.first_name, u.last_name, u.email, u.profile_image,
                 admin_u.first_name, admin_u.last_name
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await query(ticketsQuery, queryParams);
      
      // Obtener total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM support_tickets st
        WHERE ${whereClause}
      `;
      
      const countResult = await query(countQuery, queryParams.slice(0, -2));
      
      return {
        tickets: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
    } catch (error) {
      logError('Error al obtener tickets:', error);
      throw error;
    }
  }
  
  // Obtener ticket específico por ID
  async getTicketById(ticketId) {
    try {
      const ticketQuery = `
        SELECT 
          st.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          u.profile_image as user_image,
          u.phone as user_phone,
          admin_u.first_name || ' ' || admin_u.last_name as assigned_admin_name,
          admin_u.email as assigned_admin_email
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        LEFT JOIN users admin_u ON st.assigned_admin_id = admin_u.id
        WHERE st.id = $1
      `;
      
      const result = await query(ticketQuery, [ticketId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const ticket = result.rows[0];
      
      // Obtener mensajes del ticket
      const messagesQuery = `
        SELECT 
          stm.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          u.profile_image as user_image,
          u.role as user_role
        FROM support_ticket_messages stm
        JOIN users u ON stm.user_id = u.id
        WHERE stm.ticket_id = $1
        ORDER BY stm.created_at ASC
      `;
      
      const messagesResult = await query(messagesQuery, [ticketId]);
      
      ticket.messages = messagesResult.rows;
      
      return ticket;
      
    } catch (error) {
      logError('Error al obtener ticket por ID:', error);
      throw error;
    }
  }
  
  // Actualizar ticket
  async updateTicket(ticketId, updates, updatedBy) {
    const client = await withTransaction();
    
    try {
      await client.query('BEGIN');
      
      // Verificar que el ticket existe
      const ticketCheck = await client.query(
        'SELECT * FROM support_tickets WHERE id = $1',
        [ticketId]
      );
      
      if (ticketCheck.rows.length === 0) {
        throw new Error('Ticket no encontrado');
      }
      
      const currentTicket = ticketCheck.rows[0];
      
      // Campos permitidos para actualizar
      const allowedFields = [
        'title', 'description', 'category', 'priority', 'status', 
        'assigned_admin_id', 'resolution'
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
      
      // Si se está resolviendo el ticket, agregar fecha de resolución
      if (updates.status === 'resolved' && currentTicket.status !== 'resolved') {
        updateFields.resolved_at = new Date();
      }
      
      const setClause = Object.keys(updateFields)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const updateQuery = `
        UPDATE support_tickets 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [ticketId, ...Object.values(updateFields)]);
      
      const updatedTicket = result.rows[0];
      
      // Log de cambios importantes
      if (updates.status && updates.status !== currentTicket.status) {
        await this.addSystemMessage(
          ticketId, 
          updatedBy,
          `Estado cambiado de "${currentTicket.status}" a "${updates.status}"`,
          client
        );
      }
      
      if (updates.assigned_admin_id && updates.assigned_admin_id !== currentTicket.assigned_admin_id) {
        const adminQuery = `
          SELECT first_name || ' ' || last_name as name 
          FROM users 
          WHERE id = $1
        `;
        const adminResult = await client.query(adminQuery, [updates.assigned_admin_id]);
        const adminName = adminResult.rows[0]?.name || 'Administrador';
        
        await this.addSystemMessage(
          ticketId,
          updatedBy,
          `Ticket asignado a ${adminName}`,
          client
        );
      }
      
      await client.query('COMMIT');
      
      // Enviar notificación
      await this.sendTicketNotification(updatedTicket, 'updated', updates);
      
      return await this.getTicketById(ticketId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Error al actualizar ticket:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Agregar mensaje a un ticket
  async addMessage(ticketId, messageData) {
    const client = await withTransaction();
    
    try {
      await client.query('BEGIN');
      
      const { userId, message, isInternal = false, attachments = [] } = messageData;
      
      // Verificar que el ticket existe
      const ticketCheck = await client.query(
        'SELECT * FROM support_tickets WHERE id = $1',
        [ticketId]
      );
      
      if (ticketCheck.rows.length === 0) {
        throw new Error('Ticket no encontrado');
      }
      
      const ticket = ticketCheck.rows[0];
      
      // Agregar el mensaje
      const messageQuery = `
        INSERT INTO support_ticket_messages (ticket_id, user_id, message, is_internal, attachments)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const messageResult = await client.query(messageQuery, [
        ticketId, userId, message, isInternal, JSON.stringify(attachments)
      ]);
      
      const newMessage = messageResult.rows[0];
      
      // Si el ticket estaba cerrado, reabrirlo
      if (ticket.status === 'closed') {
        await client.query(`
          UPDATE support_tickets 
          SET status = 'open', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [ticketId]);
      }
      
      // Si es respuesta del cliente y el ticket estaba en progreso, marcarlo como pendiente
      const userCheck = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
      const userRole = userCheck.rows[0]?.role;
      
      if (userRole !== 'admin' && ticket.status === 'in_progress') {
        await client.query(`
          UPDATE support_tickets 
          SET status = 'open', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [ticketId]);
      }
      
      await client.query('COMMIT');
      
      // Enviar notificación
      await this.sendTicketNotification(ticket, 'message_added', { message: newMessage });
      
      // Obtener el mensaje completo con datos del usuario
      const fullMessageQuery = `
        SELECT 
          stm.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email,
          u.profile_image as user_image,
          u.role as user_role
        FROM support_ticket_messages stm
        JOIN users u ON stm.user_id = u.id
        WHERE stm.id = $1
      `;
      
      const fullMessageResult = await query(fullMessageQuery, [newMessage.id]);
      
      return fullMessageResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      logError('Error al agregar mensaje:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // ===== SISTEMA DE ASIGNACIÓN AUTOMÁTICA =====
  
  // Asignar ticket automáticamente basado en categoría y disponibilidad
  async autoAssignTicket(ticket, client = null) {
    const queryClient = client || { query: query };
    
    try {
      // Obtener administradores disponibles por categoría
      const assignmentRules = {
        'technical': ['admin', 'tech_support'],
        'billing': ['admin', 'billing_support'],
        'account': ['admin', 'account_manager'],
        'general': ['admin']
      };
      
      const roles = assignmentRules[ticket.category] || ['admin'];
      
      // Buscar admin con menos tickets asignados en la categoría
      const adminQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          COUNT(st.id) as active_tickets
        FROM users u
        LEFT JOIN support_tickets st ON u.id = st.assigned_admin_id 
          AND st.status IN ('open', 'assigned', 'in_progress')
        WHERE u.role = 'admin' 
          AND u.status = 'active'
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY active_tickets ASC, RANDOM()
        LIMIT 1
      `;
      
      const result = await queryClient.query(adminQuery);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      return null;
      
    } catch (error) {
      logError('Error en asignación automática:', error);
      return null;
    }
  }
  
  // Escalar ticket basado en tiempo y prioridad
  async escalateTickets() {
    try {
      const escalationRules = {
        'urgent': { hours: 1, escalate_to: 'high' },
        'high': { hours: 4, escalate_to: 'urgent' },
        'medium': { hours: 24, escalate_to: 'high' },
        'low': { hours: 72, escalate_to: 'medium' }
      };
      
      const escalatedTickets = [];
      
      for (const [priority, rule] of Object.entries(escalationRules)) {
        const escalateQuery = `
          UPDATE support_tickets 
          SET priority = $2, updated_at = CURRENT_TIMESTAMP
          WHERE priority = $1 
            AND status IN ('open', 'assigned')
            AND created_at < NOW() - INTERVAL '${rule.hours} hours'
            AND resolved_at IS NULL
          RETURNING *
        `;
        
        const result = await query(escalateQuery, [priority, rule.escalate_to]);
        
        for (const ticket of result.rows) {
          escalatedTickets.push(ticket);
          
          // Agregar mensaje del sistema sobre escalamiento
          await this.addSystemMessage(
            ticket.id,
            null,
            `Ticket escalado automáticamente de "${priority}" a "${rule.escalate_to}" por tiempo de respuesta`
          );
          
          // Enviar notificación
          await this.sendTicketNotification(ticket, 'escalated');
        }
      }
      
      return escalatedTickets;
      
    } catch (error) {
      logError('Error al escalar tickets:', error);
      throw error;
    }
  }
  
  // ===== MENSAJES DEL SISTEMA =====
  
  // Agregar mensaje automático del sistema
  async addSystemMessage(ticketId, userId = null, message, client = null) {
    const queryClient = client || { query: query };
    
    try {
      const messageQuery = `
        INSERT INTO support_ticket_messages (ticket_id, user_id, message, is_internal)
        VALUES ($1, $2, $3, true)
        RETURNING *
      `;
      
      const result = await queryClient.query(messageQuery, [
        ticketId, userId, `[SISTEMA] ${message}`
      ]);
      
      return result.rows[0];
      
    } catch (error) {
      logError('Error al agregar mensaje del sistema:', error);
      throw error;
    }
  }
  
  // ===== ESTADÍSTICAS DE SOPORTE =====
  
  // Obtener estadísticas de tickets
  async getTicketStats(filters = {}) {
    try {
      const { dateFrom, dateTo, adminId } = filters;
      
      let whereConditions = ['1=1'];
      let queryParams = [];
      let paramIndex = 1;
      
      if (dateFrom && dateTo) {
        whereConditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        queryParams.push(dateFrom, dateTo);
        paramIndex += 2;
      }
      
      if (adminId) {
        whereConditions.push(`assigned_admin_id = $${paramIndex}`);
        queryParams.push(adminId);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Estadísticas generales
      const generalStatsQuery = `
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_tickets,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_tickets,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_time_hours
        FROM support_tickets
        WHERE ${whereClause}
      `;
      
      const generalStats = await query(generalStatsQuery, queryParams);
      
      // Estadísticas por categoría
      const categoryStatsQuery = `
        SELECT 
          category,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_time
        FROM support_tickets
        WHERE ${whereClause}
        GROUP BY category
        ORDER BY count DESC
      `;
      
      const categoryStats = await query(categoryStatsQuery, queryParams);
      
      // Rendimiento de administradores
      const adminStatsQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          COUNT(st.id) as assigned_tickets,
          COUNT(CASE WHEN st.status = 'resolved' THEN 1 END) as resolved_tickets,
          AVG(EXTRACT(EPOCH FROM (st.resolved_at - st.created_at))/3600) as avg_resolution_time
        FROM users u
        LEFT JOIN support_tickets st ON u.id = st.assigned_admin_id
        WHERE u.role = 'admin' AND u.status = 'active'
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY resolved_tickets DESC
      `;
      
      const adminStats = await query(adminStatsQuery);
      
      return {
        general: generalStats.rows[0],
        byCategory: categoryStats.rows,
        byAdmin: adminStats.rows
      };
      
    } catch (error) {
      logError('Error al obtener estadísticas de tickets:', error);
      throw error;
    }
  }
  
  // ===== NOTIFICACIONES =====
  
  // Enviar notificación de ticket
  async sendTicketNotification(ticket, eventType, additionalData = {}) {
    try {
      // Esta función se puede expandir para integrar con sistemas de email/SMS
      const notificationData = {
        ticketId: ticket.id,
        eventType,
        ticket,
        additionalData,
        timestamp: new Date()
      };
      
      logInfo('Notificación de ticket enviada:', notificationData);
      
      // Aquí se podría integrar con servicios como SendGrid, Twilio, etc.
      
    } catch (error) {
      logError('Error al enviar notificación:', error);
      // No hacer throw para no afectar el flujo principal
    }
  }
  
  // ===== UTILIDADES =====
  
  // Cerrar tickets inactivos automáticamente
  async closeInactiveTickets(daysInactive = 30) {
    try {
      const closeQuery = `
        UPDATE support_tickets 
        SET status = 'closed', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'resolved' 
          AND resolved_at < NOW() - INTERVAL '${daysInactive} days'
        RETURNING *
      `;
      
      const result = await query(closeQuery);
      
      for (const ticket of result.rows) {
        await this.addSystemMessage(
          ticket.id,
          null,
          `Ticket cerrado automáticamente por inactividad de ${daysInactive} días`
        );
      }
      
      return result.rows;
      
    } catch (error) {
      logError('Error al cerrar tickets inactivos:', error);
      throw error;
    }
  }
}

export default new TicketService();