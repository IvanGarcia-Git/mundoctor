import { query } from '../config/database.js';
import { logInfo, logError } from '../utils/logger.js';

class StatsService {
  // ===== ESTADÍSTICAS GENERALES =====
  
  // Obtener resumen general del sistema
  async getGeneralStats(filters = {}) {
    try {
      const { dateFrom, dateTo } = filters;
      
      // Estadísticas básicas
      const basicStatsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'patient' AND status = 'active') as total_patients,
          (SELECT COUNT(*) FROM users WHERE role = 'professional' AND status = 'active') as total_professionals,
          (SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active') as total_admins,
          (SELECT COUNT(*) FROM appointments) as total_appointments,
          (SELECT COUNT(*) FROM appointments WHERE status = 'completed') as completed_appointments,
          (SELECT COUNT(*) FROM reviews) as total_reviews,
          (SELECT COALESCE(AVG(rating), 0) FROM reviews) as average_rating,
          (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions
      `;
      
      const basicStats = await query(basicStatsQuery);
      
      // Estadísticas por periodo si se especifica
      let periodStats = null;
      if (dateFrom && dateTo) {
        const periodStatsQuery = `
          SELECT 
            COUNT(CASE WHEN u.role = 'patient' THEN 1 END) as new_patients,
            COUNT(CASE WHEN u.role = 'professional' THEN 1 END) as new_professionals,
            (SELECT COUNT(*) FROM appointments 
             WHERE created_at BETWEEN $1 AND $2) as period_appointments,
            (SELECT COUNT(*) FROM reviews 
             WHERE created_at BETWEEN $1 AND $2) as period_reviews
          FROM users u
          WHERE u.created_at BETWEEN $1 AND $2
        `;
        
        const periodResult = await query(periodStatsQuery, [dateFrom, dateTo]);
        periodStats = periodResult.rows[0];
      }
      
      // Crecimiento mes a mes (últimos 6 meses)
      const growthQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(CASE WHEN role = 'patient' THEN 1 END) as patients,
          COUNT(CASE WHEN role = 'professional' THEN 1 END) as professionals
        FROM users
        WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `;
      
      const growthResult = await query(growthQuery);
      
      return {
        basic: basicStats.rows[0],
        period: periodStats,
        growth: growthResult.rows
      };
      
    } catch (error) {
      logError('Error al obtener estadísticas generales:', error);
      throw error;
    }
  }
  
  // ===== ESTADÍSTICAS DE USUARIOS =====
  
  // Obtener estadísticas detalladas de usuarios
  async getUserStats(filters = {}) {
    try {
      const { dateFrom, dateTo, role } = filters;
      
      let dateFilter = '';
      let roleFilter = '';
      const queryParams = [];
      let paramIndex = 1;
      
      if (dateFrom && dateTo) {
        dateFilter = `AND u.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        queryParams.push(dateFrom, dateTo);
        paramIndex += 2;
      }
      
      if (role) {
        roleFilter = `AND u.role = $${paramIndex}`;
        queryParams.push(role);
        paramIndex++;
      }
      
      // Distribución por rol
      const roleDistributionQuery = `
        SELECT 
          role,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_count,
          COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted_count
        FROM users u
        WHERE 1=1 ${dateFilter} ${roleFilter}
        GROUP BY role
      `;
      
      const roleDistribution = await query(roleDistributionQuery, queryParams);
      
      // Registro por mes (últimos 12 meses)
      const registrationTrendQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          role,
          COUNT(*) as registrations
        FROM users
        WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
        GROUP BY DATE_TRUNC('month', created_at), role
        ORDER BY month, role
      `;
      
      const registrationTrend = await query(registrationTrendQuery);
      
      // Usuarios más activos (por citas)
      const activeUsersQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          u.email,
          u.role,
          COUNT(DISTINCT a.id) as appointment_count,
          MAX(a.appointment_date) as last_appointment
        FROM users u
        LEFT JOIN appointments a ON u.id = a.patient_id OR u.id = a.professional_id
        WHERE u.status = 'active' ${roleFilter}
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
        HAVING COUNT(DISTINCT a.id) > 0
        ORDER BY appointment_count DESC
        LIMIT 20
      `;
      
      const activeUsers = await query(activeUsersQuery, role ? [role] : []);
      
      // Estadísticas de verificación
      const verificationStatsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
          COUNT(CASE WHEN phone_verified = true THEN 1 END) as phone_verified_users,
          ROUND(
            COUNT(CASE WHEN email_verified = true THEN 1 END) * 100.0 / COUNT(*), 
            2
          ) as verification_rate
        FROM users
        WHERE status = 'active' ${roleFilter}
      `;
      
      const verificationStats = await query(verificationStatsQuery, role ? [role] : []);
      
      return {
        roleDistribution: roleDistribution.rows,
        registrationTrend: registrationTrend.rows,
        activeUsers: activeUsers.rows,
        verification: verificationStats.rows[0]
      };
      
    } catch (error) {
      logError('Error al obtener estadísticas de usuarios:', error);
      throw error;
    }
  }
  
  // ===== ESTADÍSTICAS DE CITAS =====
  
  // Obtener estadísticas de citas
  async getAppointmentStats(filters = {}) {
    try {
      const { dateFrom, dateTo, professionalId, status } = filters;
      
      let whereConditions = ['1=1'];
      let queryParams = [];
      let paramIndex = 1;
      
      if (dateFrom && dateTo) {
        whereConditions.push(`a.appointment_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        queryParams.push(dateFrom, dateTo);
        paramIndex += 2;
      }
      
      if (professionalId) {
        whereConditions.push(`a.professional_id = $${paramIndex}`);
        queryParams.push(professionalId);
        paramIndex++;
      }
      
      if (status) {
        whereConditions.push(`a.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Resumen por estado
      const statusSummaryQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM appointments WHERE ${whereClause}), 2) as percentage
        FROM appointments a
        WHERE ${whereClause}
        GROUP BY status
        ORDER BY count DESC
      `;
      
      const statusSummary = await query(statusSummaryQuery, queryParams);
      
      // Tendencia diaria (últimos 30 días)
      const dailyTrendQuery = `
        SELECT 
          DATE(appointment_date) as date,
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows
        FROM appointments
        WHERE appointment_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(appointment_date)
        ORDER BY date
      `;
      
      const dailyTrend = await query(dailyTrendQuery);
      
      // Horarios más populares
      const popularTimesQuery = `
        SELECT 
          EXTRACT(HOUR FROM start_time) as hour,
          COUNT(*) as appointment_count
        FROM appointments a
        WHERE ${whereClause}
        GROUP BY EXTRACT(HOUR FROM start_time)
        ORDER BY appointment_count DESC
        LIMIT 10
      `;
      
      const popularTimes = await query(popularTimesQuery, queryParams);
      
      // Profesionales más activos
      const activeProfessionalsQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          pp.specialty,
          COUNT(a.id) as total_appointments,
          COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
          ROUND(
            COUNT(CASE WHEN a.status = 'completed' THEN 1 END) * 100.0 / COUNT(a.id), 
            2
          ) as completion_rate,
          AVG(r.rating) as average_rating
        FROM users u
        JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN appointments a ON u.id = a.professional_id
        LEFT JOIN reviews r ON u.id = r.professional_id
        WHERE u.role = 'professional' AND u.status = 'active'
        GROUP BY u.id, u.first_name, u.last_name, pp.specialty
        HAVING COUNT(a.id) > 0
        ORDER BY total_appointments DESC
        LIMIT 20
      `;
      
      const activeProfessionals = await query(activeProfessionalsQuery);
      
      // Duración promedio de citas
      const durationStatsQuery = `
        SELECT 
          AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) as avg_duration_minutes,
          MIN(EXTRACT(EPOCH FROM (end_time - start_time))/60) as min_duration_minutes,
          MAX(EXTRACT(EPOCH FROM (end_time - start_time))/60) as max_duration_minutes
        FROM appointments a
        WHERE ${whereClause} AND start_time IS NOT NULL AND end_time IS NOT NULL
      `;
      
      const durationStats = await query(durationStatsQuery, queryParams);
      
      return {
        statusSummary: statusSummary.rows,
        dailyTrend: dailyTrend.rows,
        popularTimes: popularTimes.rows,
        activeProfessionals: activeProfessionals.rows,
        durationStats: durationStats.rows[0]
      };
      
    } catch (error) {
      logError('Error al obtener estadísticas de citas:', error);
      throw error;
    }
  }
  
  // ===== ESTADÍSTICAS DE INGRESOS =====
  
  // Obtener estadísticas de ingresos
  async getRevenueStats(filters = {}) {
    try {
      const { dateFrom, dateTo, professionalId } = filters;
      
      let whereConditions = ['p.status = \'completed\''];
      let queryParams = [];
      let paramIndex = 1;
      
      if (dateFrom && dateTo) {
        whereConditions.push(`p.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        queryParams.push(dateFrom, dateTo);
        paramIndex += 2;
      }
      
      if (professionalId) {
        whereConditions.push(`a.professional_id = $${paramIndex}`);
        queryParams.push(professionalId);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Resumen total de ingresos
      const revenueSummaryQuery = `
        SELECT 
          COUNT(p.id) as total_payments,
          SUM(p.amount) as total_revenue,
          AVG(p.amount) as average_payment,
          COUNT(DISTINCT a.professional_id) as earning_professionals,
          COUNT(DISTINCT a.patient_id) as paying_patients
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        WHERE ${whereClause}
      `;
      
      const revenueSummary = await query(revenueSummaryQuery, queryParams);
      
      // Ingresos por mes (últimos 12 meses)
      const monthlyRevenueQuery = `
        SELECT 
          DATE_TRUNC('month', p.created_at) as month,
          COUNT(p.id) as payment_count,
          SUM(p.amount) as total_amount,
          AVG(p.amount) as average_amount
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        WHERE p.status = 'completed' 
          AND p.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
        GROUP BY DATE_TRUNC('month', p.created_at)
        ORDER BY month
      `;
      
      const monthlyRevenue = await query(monthlyRevenueQuery);
      
      // Top profesionales por ingresos
      const topEarnersQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          pp.specialty,
          COUNT(p.id) as payment_count,
          SUM(p.amount) as total_earnings,
          AVG(p.amount) as average_payment,
          pp.consultation_fee as current_fee
        FROM users u
        JOIN professional_profiles pp ON u.id = pp.user_id
        JOIN appointments a ON u.id = a.professional_id
        JOIN payments p ON a.id = p.appointment_id
        WHERE ${whereClause}
        GROUP BY u.id, u.first_name, u.last_name, pp.specialty, pp.consultation_fee
        ORDER BY total_earnings DESC
        LIMIT 20
      `;
      
      const topEarners = await query(topEarnersQuery, queryParams);
      
      // Métodos de pago más populares
      const paymentMethodsQuery = `
        SELECT 
          payment_method,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM payments WHERE ${whereClause}), 2) as percentage
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        WHERE ${whereClause}
        GROUP BY payment_method
        ORDER BY transaction_count DESC
      `;
      
      const paymentMethods = await query(paymentMethodsQuery, queryParams);
      
      // Análisis de comisiones de la plataforma
      const commissionAnalysisQuery = `
        SELECT 
          SUM(p.amount) as total_revenue,
          SUM(p.platform_fee) as total_platform_fees,
          ROUND(AVG(p.platform_fee_percentage), 2) as avg_commission_rate,
          SUM(p.amount - p.platform_fee) as total_professional_earnings
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        WHERE ${whereClause}
      `;
      
      const commissionAnalysis = await query(commissionAnalysisQuery, queryParams);
      
      return {
        summary: revenueSummary.rows[0],
        monthlyTrend: monthlyRevenue.rows,
        topEarners: topEarners.rows,
        paymentMethods: paymentMethods.rows,
        commission: commissionAnalysis.rows[0]
      };
      
    } catch (error) {
      logError('Error al obtener estadísticas de ingresos:', error);
      throw error;
    }
  }
  
  // ===== ESTADÍSTICAS DE RESEÑAS =====
  
  // Obtener estadísticas de reseñas y satisfacción
  async getReviewStats(filters = {}) {
    try {
      const { dateFrom, dateTo, professionalId } = filters;
      
      let whereConditions = ['r.status = \'active\''];
      let queryParams = [];
      let paramIndex = 1;
      
      if (dateFrom && dateTo) {
        whereConditions.push(`r.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        queryParams.push(dateFrom, dateTo);
        paramIndex += 2;
      }
      
      if (professionalId) {
        whereConditions.push(`r.professional_id = $${paramIndex}`);
        queryParams.push(professionalId);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Resumen general de reseñas
      const reviewSummaryQuery = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 END) as reviews_with_comments,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
        FROM reviews r
        WHERE ${whereClause}
      `;
      
      const reviewSummary = await query(reviewSummaryQuery, queryParams);
      
      // Tendencia de satisfacción por mes
      const satisfactionTrendQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as review_count,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews
        FROM reviews
        WHERE status = 'active' 
          AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `;
      
      const satisfactionTrend = await query(satisfactionTrendQuery);
      
      // Profesionales mejor calificados
      const topRatedQuery = `
        SELECT 
          u.id,
          u.first_name || ' ' || u.last_name as name,
          pp.specialty,
          COUNT(r.id) as review_count,
          AVG(r.rating) as average_rating,
          COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star_count
        FROM users u
        JOIN professional_profiles pp ON u.id = pp.user_id
        LEFT JOIN reviews r ON u.id = r.professional_id AND r.status = 'active'
        WHERE u.role = 'professional' AND u.status = 'active'
        GROUP BY u.id, u.first_name, u.last_name, pp.specialty
        HAVING COUNT(r.id) >= 5
        ORDER BY average_rating DESC, review_count DESC
        LIMIT 20
      `;
      
      const topRated = await query(topRatedQuery);
      
      return {
        summary: reviewSummary.rows[0],
        satisfactionTrend: satisfactionTrend.rows,
        topRated: topRated.rows
      };
      
    } catch (error) {
      logError('Error al obtener estadísticas de reseñas:', error);
      throw error;
    }
  }
  
  // ===== MÉTRICAS DE RENDIMIENTO =====
  
  // Obtener métricas de rendimiento del sistema
  async getPerformanceMetrics() {
    try {
      // Tiempo de respuesta promedio de la API (simulado)
      const apiMetrics = {
        averageResponseTime: '125ms',
        uptime: '99.8%',
        requestsPerMinute: 150,
        errorRate: '0.2%'
      };
      
      // Métricas de la base de datos
      const dbMetricsQuery = `
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
        LIMIT 10
      `;
      
      const dbMetrics = await query(dbMetricsQuery);
      
      return {
        api: apiMetrics,
        database: dbMetrics.rows
      };
      
    } catch (error) {
      logError('Error al obtener métricas de rendimiento:', error);
      throw error;
    }
  }
}

export default new StatsService();