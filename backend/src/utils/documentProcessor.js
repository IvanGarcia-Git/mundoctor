import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logInfo, logError, logWarning } from './logger.js';
import { ValidationError, AppError } from '../middleware/errorHandler.js';

// Allowed file types for validation documents
const ALLOWED_MIME_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Minimum file size (1KB)
const MIN_FILE_SIZE = 1024;

// Upload directory
const UPLOAD_DIR = process.env.VALIDATION_UPLOADS_DIR || 'uploads/validation';

// Ensure upload directory exists
export const ensureUploadDirectory = async () => {
  try {
    await fs.access(UPLOAD_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    logInfo('Created validation uploads directory', { directory: UPLOAD_DIR });
  }
};

// Validate file type and size
export const validateFile = (file, documentType) => {
  const errors = [];

  // Check if file exists and has required properties
  if (!file || !file.buffer || !file.originalname || !file.mimetype) {
    throw new ValidationError('Invalid file format');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`);
  }

  if (file.size < MIN_FILE_SIZE) {
    errors.push(`File size (${file.size} bytes) is too small. Minimum size is ${MIN_FILE_SIZE} bytes`);
  }

  // Check file type
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    errors.push(`File type '${file.mimetype}' is not allowed. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`);
  }

  // Check file extension matches mime type
  const expectedExtension = ALLOWED_MIME_TYPES[file.mimetype];
  const actualExtension = path.extname(file.originalname).toLowerCase();
  
  if (expectedExtension && actualExtension !== expectedExtension) {
    logWarning('File extension mismatch', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      expectedExtension,
      actualExtension
    });
  }

  // Document type specific validations
  if (documentType === 'medical_license' || documentType === 'specialty_certificate') {
    if (!file.mimetype.includes('pdf') && !file.mimetype.includes('image')) {
      errors.push('Medical licenses and certificates should be in PDF or image format');
    }
  }

  if (documentType === 'cv') {
    if (!file.mimetype.includes('pdf') && !file.mimetype.includes('doc')) {
      errors.push('CV should be in PDF or Word document format');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`File validation failed: ${errors.join(', ')}`);
  }

  return true;
};

// Generate secure filename
export const generateSecureFilename = (originalFilename, documentType, professionalId) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalFilename).toLowerCase() || '.unknown';
  
  // Remove special characters from original filename
  const sanitizedName = path.basename(originalFilename, extension)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);
  
  return `${documentType}_${professionalId}_${timestamp}_${random}_${sanitizedName}${extension}`;
};

// Save file to disk
export const saveFile = async (file, filename) => {
  try {
    await ensureUploadDirectory();
    
    const filepath = path.join(UPLOAD_DIR, filename);
    
    // Write file to disk
    await fs.writeFile(filepath, file.buffer);
    
    // Verify file was written correctly
    const stats = await fs.stat(filepath);
    if (stats.size !== file.size) {
      throw new AppError('File size mismatch after saving');
    }
    
    logInfo('File saved successfully', {
      filename,
      originalSize: file.size,
      savedSize: stats.size,
      filepath
    });
    
    return filepath;
    
  } catch (error) {
    logError(error, {
      event: 'file_save_failed',
      filename,
      originalSize: file.size
    });
    throw new AppError(`Failed to save file: ${error.message}`);
  }
};

// Delete file from disk
export const deleteFile = async (filepath) => {
  try {
    if (!filepath) return;
    
    // Check if file exists
    await fs.access(filepath);
    
    // Delete file
    await fs.unlink(filepath);
    
    logInfo('File deleted successfully', { filepath });
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      logWarning('Attempted to delete non-existent file', { filepath });
    } else {
      logError(error, {
        event: 'file_deletion_failed',
        filepath
      });
      throw new AppError(`Failed to delete file: ${error.message}`);
    }
  }
};

// Process uploaded file for validation
export const processValidationDocument = async (file, documentType, professionalId) => {
  try {
    logInfo('Processing validation document', {
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      documentType,
      professionalId
    });
    
    // Validate file
    validateFile(file, documentType);
    
    // Generate secure filename
    const filename = generateSecureFilename(file.originalname, documentType, professionalId);
    
    // Save file
    const filepath = await saveFile(file, filename);
    
    // Return file information
    const fileInfo = {
      filename,
      originalFilename: file.originalname,
      filePath: filepath,
      fileSize: file.size,
      mimeType: file.mimetype,
      documentType
    };
    
    logInfo('Validation document processed successfully', {
      ...fileInfo,
      professionalId
    });
    
    return fileInfo;
    
  } catch (error) {
    logError(error, {
      event: 'document_processing_failed',
      originalname: file.originalname,
      documentType,
      professionalId
    });
    throw error;
  }
};

// Get file metadata
export const getFileMetadata = async (filepath) => {
  try {
    const stats = await fs.stat(filepath);
    
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      exists: true
    };
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        exists: false
      };
    }
    throw error;
  }
};

// Sanitize filename for download
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
};

// Get file stream for download
export const getFileStream = async (filepath) => {
  try {
    // Check if file exists
    await fs.access(filepath);
    
    const { createReadStream } = await import('fs');
    return createReadStream(filepath);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new AppError('File not found', 404);
    }
    throw new AppError(`Failed to access file: ${error.message}`);
  }
};

// Validate document completeness for a validation request
export const validateDocumentCompleteness = (documents, requiredDocuments) => {
  const providedTypes = new Set(documents.map(doc => doc.document_type));
  const missingTypes = requiredDocuments.filter(type => !providedTypes.has(type));
  
  return {
    isComplete: missingTypes.length === 0,
    missingDocuments: missingTypes,
    providedDocuments: Array.from(providedTypes)
  };
};

// Get document type display name
export const getDocumentTypeDisplayName = (documentType) => {
  const displayNames = {
    'medical_license': 'Medical License',
    'cedula': 'Professional ID (Cédula)',
    'specialty_certificate': 'Specialty Certificate',
    'cv': 'Curriculum Vitae',
    'other': 'Other Document'
  };
  
  return displayNames[documentType] || documentType;
};

// Clean up old files (utility for maintenance)
export const cleanupOldFiles = async (daysOld = 30) => {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    let errors = 0;
    
    for (const file of files) {
      try {
        const filepath = path.join(UPLOAD_DIR, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      } catch (error) {
        errors++;
        logError(error, {
          event: 'cleanup_file_error',
          file
        });
      }
    }
    
    logInfo('File cleanup completed', {
      totalFiles: files.length,
      deletedCount,
      errors,
      daysOld
    });
    
    return { deletedCount, errors };
    
  } catch (error) {
    logError(error, {
      event: 'cleanup_failed',
      daysOld
    });
    throw error;
  }
};

export default {
  validateFile,
  generateSecureFilename,
  saveFile,
  deleteFile,
  processValidationDocument,
  getFileMetadata,
  sanitizeFilename,
  getFileStream,
  validateDocumentCompleteness,
  getDocumentTypeDisplayName,
  cleanupOldFiles,
  ensureUploadDirectory,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MIN_FILE_SIZE
};