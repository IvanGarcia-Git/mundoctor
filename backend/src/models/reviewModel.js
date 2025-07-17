// Review Data Models and Types for Mundoctor Backend
// This file defines the data structures and interfaces for the review system

export const ReviewStatus = {
  ACTIVE: 'active',
  FLAGGED: 'flagged',
  DELETED: 'deleted',
  HIDDEN: 'hidden'
};

export const ReviewType = {
  APPOINTMENT: 'appointment',
  SERVICE: 'service',
  GENERAL: 'general'
};

export const RatingScale = {
  MIN: 1,
  MAX: 5
};

export const ModerationStatus = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
  FLAGGED: 'flagged'
};

// Review Entity Model
export class ReviewModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.patientId = data.patientId || data.patient_id || null;
    this.professionalId = data.professionalId || data.professional_id || null;
    this.appointmentId = data.appointmentId || data.appointment_id || null;
    this.rating = data.rating || null;
    this.comment = data.comment || null;
    this.status = data.status || ReviewStatus.ACTIVE;
    this.type = data.type || ReviewType.APPOINTMENT;
    this.moderationStatus = data.moderationStatus || data.moderation_status || ModerationStatus.APPROVED;
    this.helpfulCount = data.helpfulCount || data.helpful_count || 0;
    this.reportCount = data.reportCount || data.report_count || 0;
    this.createdAt = data.createdAt || data.created_at || null;
    this.updatedAt = data.updatedAt || data.updated_at || null;
    
    // Related data
    this.patient = data.patient || null;
    this.professional = data.professional || null;
    this.appointment = data.appointment || null;
  }

  // Validation methods
  isValid() {
    return this.patientId && 
           this.professionalId && 
           this.rating && 
           this.rating >= RatingScale.MIN && 
           this.rating <= RatingScale.MAX;
  }

  hasComment() {
    return this.comment && this.comment.trim().length > 0;
  }

  isActive() {
    return this.status === ReviewStatus.ACTIVE;
  }

  isApproved() {
    return this.moderationStatus === ModerationStatus.APPROVED;
  }

  // Formatting methods
  toJSON() {
    return {
      id: this.id,
      patientId: this.patientId,
      professionalId: this.professionalId,
      appointmentId: this.appointmentId,
      rating: this.rating,
      comment: this.comment,
      status: this.status,
      type: this.type,
      moderationStatus: this.moderationStatus,
      helpfulCount: this.helpfulCount,
      reportCount: this.reportCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      patient: this.patient,
      professional: this.professional,
      appointment: this.appointment
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      rating: this.rating,
      comment: this.comment,
      helpfulCount: this.helpfulCount,
      createdAt: this.createdAt,
      patient: this.patient ? {
        name: this.patient.name,
        image: this.patient.image
      } : null,
      appointment: this.appointment ? {
        date: this.appointment.date,
        service: this.appointment.service
      } : null
    };
  }
}

// Review Statistics Model
export class ReviewStatisticsModel {
  constructor(data = {}) {
    this.totalReviews = data.totalReviews || data.total_reviews || 0;
    this.averageRating = data.averageRating || data.average_rating || 0;
    this.ratingDistribution = data.ratingDistribution || data.rating_distribution || {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    this.reviewsWithComments = data.reviewsWithComments || data.reviews_with_comments || 0;
    this.commentPercentage = data.commentPercentage || data.comment_percentage || 0;
    this.recentReviewsCount = data.recentReviewsCount || data.recent_reviews_count || 0;
    this.monthlyGrowth = data.monthlyGrowth || data.monthly_growth || 0;
  }

  getRatingPercentage(rating) {
    if (this.totalReviews === 0) return 0;
    return Math.round((this.ratingDistribution[rating] / this.totalReviews) * 100);
  }

  getQualityScore() {
    // Calculate a quality score based on distribution
    const weights = { 1: -2, 2: -1, 3: 0, 4: 1, 5: 2 };
    let weightedSum = 0;
    
    for (let rating = 1; rating <= 5; rating++) {
      weightedSum += this.ratingDistribution[rating] * weights[rating];
    }
    
    if (this.totalReviews === 0) return 0;
    return Math.max(0, Math.min(100, 50 + (weightedSum / this.totalReviews) * 25));
  }

  toJSON() {
    return {
      totalReviews: this.totalReviews,
      averageRating: Math.round(this.averageRating * 10) / 10, // Round to 1 decimal
      ratingDistribution: this.ratingDistribution,
      reviewsWithComments: this.reviewsWithComments,
      commentPercentage: this.commentPercentage,
      recentReviewsCount: this.recentReviewsCount,
      monthlyGrowth: this.monthlyGrowth,
      qualityScore: Math.round(this.getQualityScore())
    };
  }
}

// Professional Rating Summary Model
export class ProfessionalRatingModel {
  constructor(data = {}) {
    this.professionalId = data.professionalId || data.professional_id || null;
    this.totalReviews = data.totalReviews || data.total_reviews || 0;
    this.averageRating = data.averageRating || data.average_rating || 0;
    this.ratingDistribution = data.ratingDistribution || data.rating_distribution || {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    this.recentReviews = data.recentReviews || data.recent_reviews || [];
    this.badges = data.badges || [];
    this.lastUpdated = data.lastUpdated || data.last_updated || null;
  }

  getBadges() {
    const badges = [];
    
    if (this.totalReviews >= 100) {
      badges.push({ type: 'popular', label: 'Popular', icon: 'star' });
    }
    
    if (this.averageRating >= 4.8) {
      badges.push({ type: 'excellent', label: 'Excelente', icon: 'award' });
    } else if (this.averageRating >= 4.5) {
      badges.push({ type: 'great', label: 'Muy Bueno', icon: 'thumbs-up' });
    }
    
    const recentRating = this.getRecentAverageRating();
    if (recentRating >= 4.7 && this.totalReviews >= 20) {
      badges.push({ type: 'trending', label: 'En Tendencia', icon: 'trending-up' });
    }
    
    return badges;
  }

  getRecentAverageRating(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentReviews = this.recentReviews.filter(review => 
      new Date(review.createdAt) >= cutoffDate
    );
    
    if (recentReviews.length === 0) return 0;
    
    const sum = recentReviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / recentReviews.length;
  }

  toJSON() {
    return {
      professionalId: this.professionalId,
      totalReviews: this.totalReviews,
      averageRating: Math.round(this.averageRating * 10) / 10,
      ratingDistribution: this.ratingDistribution,
      badges: this.getBadges(),
      recentAverageRating: Math.round(this.getRecentAverageRating() * 10) / 10,
      lastUpdated: this.lastUpdated
    };
  }
}

// Review Filter Model
export class ReviewFiltersModel {
  constructor(data = {}) {
    this.professionalId = data.professionalId || null;
    this.patientId = data.patientId || null;
    this.minRating = data.minRating || null;
    this.maxRating = data.maxRating || null;
    this.hasComment = data.hasComment || null;
    this.dateFrom = data.dateFrom || null;
    this.dateTo = data.dateTo || null;
    this.status = data.status || ReviewStatus.ACTIVE;
    this.moderationStatus = data.moderationStatus || ModerationStatus.APPROVED;
    this.sortBy = data.sortBy || 'created_at';
    this.sortOrder = data.sortOrder || 'DESC';
    this.limit = data.limit || 10;
    this.offset = data.offset || 0;
  }

  toQueryParams() {
    const params = {};
    
    if (this.professionalId) params.professionalId = this.professionalId;
    if (this.patientId) params.patientId = this.patientId;
    if (this.minRating) params.minRating = this.minRating;
    if (this.maxRating) params.maxRating = this.maxRating;
    if (this.hasComment !== null) params.hasComment = this.hasComment;
    if (this.dateFrom) params.dateFrom = this.dateFrom;
    if (this.dateTo) params.dateTo = this.dateTo;
    if (this.status) params.status = this.status;
    if (this.moderationStatus) params.moderationStatus = this.moderationStatus;
    
    params.sortBy = this.sortBy;
    params.sortOrder = this.sortOrder;
    params.limit = this.limit;
    params.offset = this.offset;
    
    return params;
  }

  isValid() {
    if (this.minRating && (this.minRating < RatingScale.MIN || this.minRating > RatingScale.MAX)) {
      return false;
    }
    
    if (this.maxRating && (this.maxRating < RatingScale.MIN || this.maxRating > RatingScale.MAX)) {
      return false;
    }
    
    if (this.minRating && this.maxRating && this.minRating > this.maxRating) {
      return false;
    }
    
    if (this.dateFrom && this.dateTo && new Date(this.dateFrom) > new Date(this.dateTo)) {
      return false;
    }
    
    return true;
  }
}

// Review Response Model for API responses
export class ReviewResponseModel {
  constructor(reviews = [], total = 0, pagination = {}) {
    this.reviews = reviews.map(review => 
      review instanceof ReviewModel ? review : new ReviewModel(review)
    );
    this.total = total;
    this.pagination = {
      limit: pagination.limit || 10,
      offset: pagination.offset || 0,
      hasMore: total > (pagination.offset || 0) + (pagination.limit || 10),
      totalPages: Math.ceil(total / (pagination.limit || 10)),
      currentPage: Math.floor((pagination.offset || 0) / (pagination.limit || 10)) + 1
    };
  }

  toJSON() {
    return {
      reviews: this.reviews.map(review => review.toPublicJSON()),
      total: this.total,
      pagination: this.pagination
    };
  }
}

// Constants and helpers
export const REVIEW_CONSTANTS = {
  MAX_COMMENT_LENGTH: 1000,
  MIN_COMMENT_LENGTH: 10,
  MAX_REVIEWS_PER_APPOINTMENT: 1,
  MODERATION_KEYWORDS: [
    'idiota', 'estúpido', 'imbécil', 'tonto', 'pendejo', 'cabrón',
    'mierda', 'puto', 'puta', 'joder', 'coño', 'hijo de puta'
  ],
  RATING_LABELS: {
    1: 'Muy malo',
    2: 'Malo', 
    3: 'Regular',
    4: 'Bueno',
    5: 'Excelente'
  }
};

// Helper functions
export const validateRating = (rating) => {
  return rating && 
         Number.isInteger(rating) && 
         rating >= RatingScale.MIN && 
         rating <= RatingScale.MAX;
};

export const sanitizeComment = (comment) => {
  if (!comment) return null;
  return comment.trim().substring(0, REVIEW_CONSTANTS.MAX_COMMENT_LENGTH);
};

export const calculateAverageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
};

export const groupReviewsByRating = (reviews) => {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  reviews.forEach(review => {
    if (review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating]++;
    }
  });
  
  return distribution;
};