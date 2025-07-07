/**
 * Data models and types for support ticket system
 * Defines interfaces and types for ticket management
 */

// Ticket status types
export const TICKET_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned', 
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

// Ticket priority levels
export const TICKET_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Ticket categories
export const TICKET_CATEGORY = {
  TECHNICAL: 'technical',
  BILLING: 'billing',
  ACCOUNT: 'account',
  GENERAL: 'general'
};

// Valid status transitions
export const STATUS_TRANSITIONS = {
  [TICKET_STATUS.OPEN]: [TICKET_STATUS.ASSIGNED, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.CLOSED],
  [TICKET_STATUS.ASSIGNED]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.OPEN, TICKET_STATUS.CLOSED],
  [TICKET_STATUS.IN_PROGRESS]: [TICKET_STATUS.RESOLVED, TICKET_STATUS.OPEN, TICKET_STATUS.CLOSED],
  [TICKET_STATUS.RESOLVED]: [TICKET_STATUS.CLOSED, TICKET_STATUS.OPEN],
  [TICKET_STATUS.CLOSED]: [TICKET_STATUS.OPEN]
};

// Ticket data structure
export class TicketModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.user_id = data.user_id || null;
    this.assigned_admin_id = data.assigned_admin_id || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.category = data.category || TICKET_CATEGORY.GENERAL;
    this.priority = data.priority || TICKET_PRIORITY.MEDIUM;
    this.status = data.status || TICKET_STATUS.OPEN;
    this.resolution = data.resolution || null;
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.resolved_at = data.resolved_at || null;
    
    // Related data
    this.user_name = data.user_name || null;
    this.user_email = data.user_email || null;
    this.user_image = data.user_image || null;
    this.assigned_admin_name = data.assigned_admin_name || null;
    this.message_count = data.message_count || 0;
    this.last_message_at = data.last_message_at || null;
    this.messages = data.messages || [];
  }

  // Validate ticket data
  validate() {
    const errors = [];

    if (!this.title || this.title.trim().length < 5) {
      errors.push('El título debe tener al menos 5 caracteres');
    }

    if (!this.description || this.description.trim().length < 10) {
      errors.push('La descripción debe tener al menos 10 caracteres');
    }

    if (!Object.values(TICKET_CATEGORY).includes(this.category)) {
      errors.push('Categoría de ticket no válida');
    }

    if (!Object.values(TICKET_PRIORITY).includes(this.priority)) {
      errors.push('Prioridad de ticket no válida');
    }

    if (!Object.values(TICKET_STATUS).includes(this.status)) {
      errors.push('Estado de ticket no válido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if status transition is valid
  canTransitionTo(newStatus) {
    return STATUS_TRANSITIONS[this.status]?.includes(newStatus) || false;
  }

  // Get ticket summary for lists
  getSummary() {
    return {
      id: this.id,
      title: this.title,
      category: this.category,
      priority: this.priority,
      status: this.status,
      user_name: this.user_name,
      assigned_admin_name: this.assigned_admin_name,
      message_count: this.message_count,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_message_at: this.last_message_at
    };
  }

  // Get full ticket details
  getDetails() {
    return {
      id: this.id,
      user_id: this.user_id,
      assigned_admin_id: this.assigned_admin_id,
      title: this.title,
      description: this.description,
      category: this.category,
      priority: this.priority,
      status: this.status,
      resolution: this.resolution,
      created_at: this.created_at,
      updated_at: this.updated_at,
      resolved_at: this.resolved_at,
      user_name: this.user_name,
      user_email: this.user_email,
      user_image: this.user_image,
      assigned_admin_name: this.assigned_admin_name,
      messages: this.messages
    };
  }
}

// Ticket message data structure
export class TicketMessageModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.ticket_id = data.ticket_id || null;
    this.user_id = data.user_id || null;
    this.message = data.message || '';
    this.is_internal = data.is_internal || false;
    this.attachments = data.attachments || [];
    this.created_at = data.created_at || new Date();
    
    // Related data
    this.user_name = data.user_name || null;
    this.user_email = data.user_email || null;
    this.user_image = data.user_image || null;
    this.user_role = data.user_role || null;
  }

  // Validate message data
  validate() {
    const errors = [];

    if (!this.message || this.message.trim().length < 1) {
      errors.push('El mensaje no puede estar vacío');
    }

    if (this.message && this.message.length > 2000) {
      errors.push('El mensaje no puede exceder 2000 caracteres');
    }

    if (!this.ticket_id) {
      errors.push('ID de ticket requerido');
    }

    if (!this.user_id) {
      errors.push('ID de usuario requerido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get message summary
  getSummary() {
    return {
      id: this.id,
      message: this.message,
      is_internal: this.is_internal,
      user_name: this.user_name,
      user_role: this.user_role,
      created_at: this.created_at,
      attachments: this.attachments?.length || 0
    };
  }

  // Get full message details
  getDetails() {
    return {
      id: this.id,
      ticket_id: this.ticket_id,
      user_id: this.user_id,
      message: this.message,
      is_internal: this.is_internal,
      attachments: this.attachments,
      created_at: this.created_at,
      user_name: this.user_name,
      user_email: this.user_email,
      user_image: this.user_image,
      user_role: this.user_role
    };
  }
}

// Ticket statistics model
export class TicketStatsModel {
  constructor(data = {}) {
    // General stats
    this.total_tickets = data.total_tickets || 0;
    this.open_tickets = data.open_tickets || 0;
    this.assigned_tickets = data.assigned_tickets || 0;
    this.in_progress_tickets = data.in_progress_tickets || 0;
    this.resolved_tickets = data.resolved_tickets || 0;
    this.closed_tickets = data.closed_tickets || 0;
    this.urgent_tickets = data.urgent_tickets || 0;
    this.high_tickets = data.high_tickets || 0;
    this.avg_resolution_time_hours = data.avg_resolution_time_hours || 0;
    
    // Category breakdown
    this.byCategory = data.byCategory || [];
    
    // Admin performance
    this.byAdmin = data.byAdmin || [];
  }

  // Get overview percentages
  getOverview() {
    if (this.total_tickets === 0) {
      return {
        total: 0,
        open_percentage: 0,
        resolved_percentage: 0,
        urgent_percentage: 0,
        avg_resolution_hours: 0
      };
    }

    return {
      total: this.total_tickets,
      open_percentage: Math.round((this.open_tickets / this.total_tickets) * 100),
      resolved_percentage: Math.round((this.resolved_tickets / this.total_tickets) * 100),
      urgent_percentage: Math.round((this.urgent_tickets / this.total_tickets) * 100),
      avg_resolution_hours: Math.round(this.avg_resolution_time_hours * 10) / 10
    };
  }

  // Get status distribution
  getStatusDistribution() {
    return {
      open: this.open_tickets,
      assigned: this.assigned_tickets,
      in_progress: this.in_progress_tickets,
      resolved: this.resolved_tickets,
      closed: this.closed_tickets
    };
  }

  // Get priority distribution
  getPriorityDistribution() {
    return {
      urgent: this.urgent_tickets,
      high: this.high_tickets,
      medium: this.total_tickets - this.urgent_tickets - this.high_tickets,
      low: 0 // Calculated if needed
    };
  }

  // Get top performing admins
  getTopAdmins(limit = 5) {
    return this.byAdmin
      .sort((a, b) => b.resolved_tickets - a.resolved_tickets)
      .slice(0, limit)
      .map(admin => ({
        name: admin.name,
        resolved: admin.resolved_tickets,
        avg_time: Math.round(admin.avg_resolution_time * 10) / 10
      }));
  }

  // Get category breakdown
  getCategoryBreakdown() {
    return this.byCategory.map(cat => ({
      category: cat.category,
      count: cat.count,
      resolved: cat.resolved_count,
      resolution_rate: cat.count > 0 ? Math.round((cat.resolved_count / cat.count) * 100) : 0,
      avg_time: Math.round(cat.avg_resolution_time * 10) / 10
    }));
  }
}

// Utility functions
export const TicketUtils = {
  // Check if priority needs escalation based on time
  shouldEscalatePriority(ticket, escalationRules) {
    const now = new Date();
    const createdAt = new Date(ticket.created_at);
    const hoursOld = (now - createdAt) / (1000 * 60 * 60);
    
    const rule = escalationRules[ticket.priority];
    if (!rule) return false;
    
    return hoursOld > rule.hours && ticket.status !== 'resolved' && ticket.status !== 'closed';
  },

  // Get next priority level for escalation
  getEscalatedPriority(currentPriority, escalationRules) {
    const rule = escalationRules[currentPriority];
    return rule?.escalate_to || currentPriority;
  },

  // Calculate SLA deadline
  calculateSlaDeadline(ticket, slaRules) {
    const createdAt = new Date(ticket.created_at);
    const sla = slaRules[ticket.priority];
    if (!sla) return null;
    
    return new Date(createdAt.getTime() + (sla.hours * 60 * 60 * 1000));
  },

  // Check if ticket is overdue
  isOverdue(ticket, slaRules) {
    const deadline = this.calculateSlaDeadline(ticket, slaRules);
    if (!deadline) return false;
    
    return new Date() > deadline && ticket.status !== 'resolved' && ticket.status !== 'closed';
  },

  // Get ticket age in hours
  getTicketAge(ticket) {
    const now = new Date();
    const createdAt = new Date(ticket.created_at);
    return Math.round((now - createdAt) / (1000 * 60 * 60));
  },

  // Get priority color for UI
  getPriorityColor(priority) {
    const colors = {
      [TICKET_PRIORITY.LOW]: '#6B7280',
      [TICKET_PRIORITY.MEDIUM]: '#F59E0B',
      [TICKET_PRIORITY.HIGH]: '#EF4444',
      [TICKET_PRIORITY.URGENT]: '#DC2626'
    };
    return colors[priority] || colors[TICKET_PRIORITY.MEDIUM];
  },

  // Get status color for UI
  getStatusColor(status) {
    const colors = {
      [TICKET_STATUS.OPEN]: '#EF4444',
      [TICKET_STATUS.ASSIGNED]: '#F59E0B',
      [TICKET_STATUS.IN_PROGRESS]: '#3B82F6',
      [TICKET_STATUS.RESOLVED]: '#10B981',
      [TICKET_STATUS.CLOSED]: '#6B7280'
    };
    return colors[status] || colors[TICKET_STATUS.OPEN];
  }
};

export default {
  TicketModel,
  TicketMessageModel,
  TicketStatsModel,
  TicketUtils,
  TICKET_STATUS,
  TICKET_PRIORITY,
  TICKET_CATEGORY,
  STATUS_TRANSITIONS
};