/**
 * Utilidades para paginación en APIs
 */

/**
 * Calcula los parámetros de paginación
 * @param {number} page - Página actual (1-indexed)
 * @param {number} limit - Elementos por página
 * @param {number} total - Total de elementos
 * @returns {Object} - Objeto con información de paginación
 */
function calculatePagination(page = 1, limit = 20, total = 0) {
  // Validar y normalizar parámetros
  const normalizedPage = Math.max(1, parseInt(page) || 1);
  const normalizedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Máximo 100 elementos por página
  const normalizedTotal = Math.max(0, parseInt(total) || 0);

  // Calcular valores de paginación
  const totalPages = Math.ceil(normalizedTotal / normalizedLimit);
  const offset = (normalizedPage - 1) * normalizedLimit;
  const hasNextPage = normalizedPage < totalPages;
  const hasPrevPage = normalizedPage > 1;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    total: normalizedTotal,
    totalPages,
    offset,
    hasNextPage,
    hasPrevPage,
    startIndex: offset + 1,
    endIndex: Math.min(offset + normalizedLimit, normalizedTotal)
  };
}

/**
 * Middleware para validar parámetros de paginación en requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
function validatePaginationParams(req, res, next) {
  const { page, limit } = req.query;

  // Validar página
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      error: 'El parámetro "page" debe ser un número entero mayor a 0'
    });
  }

  // Validar límite
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      error: 'El parámetro "limit" debe ser un número entero entre 1 y 100'
    });
  }

  // Normalizar parámetros
  req.pagination = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20
  };

  next();
}

/**
 * Genera links de navegación para paginación
 * @param {Object} req - Request object
 * @param {Object} pagination - Información de paginación
 * @returns {Object} - Links de navegación
 */
function generatePaginationLinks(req, pagination) {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
  const queryParams = { ...req.query };

  const links = {};

  // Link a la primera página
  if (pagination.hasPrevPage) {
    const firstPageParams = { ...queryParams, page: 1 };
    links.first = `${baseUrl}?${new URLSearchParams(firstPageParams).toString()}`;
  }

  // Link a la página anterior
  if (pagination.hasPrevPage) {
    const prevPageParams = { ...queryParams, page: pagination.page - 1 };
    links.prev = `${baseUrl}?${new URLSearchParams(prevPageParams).toString()}`;
  }

  // Link a la página actual
  const currentPageParams = { ...queryParams, page: pagination.page };
  links.self = `${baseUrl}?${new URLSearchParams(currentPageParams).toString()}`;

  // Link a la página siguiente
  if (pagination.hasNextPage) {
    const nextPageParams = { ...queryParams, page: pagination.page + 1 };
    links.next = `${baseUrl}?${new URLSearchParams(nextPageParams).toString()}`;
  }

  // Link a la última página
  if (pagination.hasNextPage) {
    const lastPageParams = { ...queryParams, page: pagination.totalPages };
    links.last = `${baseUrl}?${new URLSearchParams(lastPageParams).toString()}`;
  }

  return links;
}

/**
 * Formatea la respuesta con paginación
 * @param {Array} data - Datos de la página actual
 * @param {Object} pagination - Información de paginación
 * @param {Object} req - Request object (opcional, para generar links)
 * @returns {Object} - Respuesta formateada
 */
function formatPaginatedResponse(data, pagination, req = null) {
  const response = {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.hasNextPage,
      hasPrevPage: pagination.hasPrevPage,
      startIndex: pagination.startIndex,
      endIndex: pagination.endIndex
    }
  };

  // Agregar links si se proporciona el request
  if (req) {
    response.links = generatePaginationLinks(req, pagination);
  }

  return response;
}

/**
 * Aplica paginación a un array en memoria
 * @param {Array} data - Array de datos
 * @param {number} page - Página actual
 * @param {number} limit - Elementos por página
 * @returns {Object} - Datos paginados y información de paginación
 */
function paginateArray(data, page = 1, limit = 20) {
  const total = data.length;
  const pagination = calculatePagination(page, limit, total);
  
  const startIndex = pagination.offset;
  const endIndex = startIndex + pagination.limit;
  const paginatedData = data.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    pagination
  };
}

/**
 * Genera query SQL para paginación
 * @param {number} page - Página actual
 * @param {number} limit - Elementos por página
 * @returns {Object} - Parámetros LIMIT y OFFSET para SQL
 */
function getSQLPaginationParams(page = 1, limit = 20) {
  const pagination = calculatePagination(page, limit);
  return {
    limit: pagination.limit,
    offset: pagination.offset
  };
}

/**
 * Middleware completo de paginación que combina validación y cálculo
 * @param {Object} defaultLimit - Límite por defecto
 * @returns {Function} - Middleware function
 */
function paginationMiddleware(defaultLimit = 20) {
  return (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || defaultLimit;

    // Validar parámetros
    if (page < 1) {
      return res.status(400).json({
        success: false,
        error: 'El parámetro "page" debe ser mayor a 0'
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'El parámetro "limit" debe estar entre 1 y 100'
      });
    }

    // Agregar utilidades al request
    req.pagination = {
      page,
      limit,
      calculate: (total) => calculatePagination(page, limit, total),
      getSQLParams: () => getSQLPaginationParams(page, limit),
      formatResponse: (data, total) => {
        const pagination = calculatePagination(page, limit, total);
        return formatPaginatedResponse(data, pagination, req);
      }
    };

    next();
  };
}

/**
 * Clase para manejo avanzado de paginación
 */
class PaginationBuilder {
  constructor(page = 1, limit = 20) {
    this.page = Math.max(1, parseInt(page) || 1);
    this.limit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    this.total = 0;
    this.sortBy = null;
    this.sortOrder = 'ASC';
    this.filters = {};
  }

  setTotal(total) {
    this.total = Math.max(0, parseInt(total) || 0);
    return this;
  }

  setSort(sortBy, sortOrder = 'ASC') {
    this.sortBy = sortBy;
    this.sortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';
    return this;
  }

  setFilters(filters) {
    this.filters = filters || {};
    return this;
  }

  getPagination() {
    return calculatePagination(this.page, this.limit, this.total);
  }

  getSQLQuery() {
    const pagination = this.getPagination();
    let query = `LIMIT ${pagination.limit} OFFSET ${pagination.offset}`;
    
    if (this.sortBy) {
      query = `ORDER BY ${this.sortBy} ${this.sortOrder} ${query}`;
    }
    
    return query;
  }

  formatResponse(data, req = null) {
    const pagination = this.getPagination();
    return formatPaginatedResponse(data, pagination, req);
  }
}

module.exports = {
  calculatePagination,
  validatePaginationParams,
  generatePaginationLinks,
  formatPaginatedResponse,
  paginateArray,
  getSQLPaginationParams,
  paginationMiddleware,
  PaginationBuilder
};