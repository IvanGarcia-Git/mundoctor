import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, attachUser } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId_timestamp_fieldname.extension
    const { userId } = req.auth;
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const fieldName = file.fieldname;
    const filename = `${userId}_${timestamp}_${fieldName}${extension}`;
    cb(null, filename);
  }
});

// File filter for validation documents
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos JPG, PNG o PDF'), false);
  }
};

// File filter for avatar images only
const avatarFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG o PNG para el avatar'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

const avatarUpload = multer({
  storage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
  }
});

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * POST /api/uploads/professional-documents
 * Upload professional validation documents
 */
router.post('/professional-documents', 
  upload.fields([
    { name: 'dniImage', maxCount: 1 },
    { name: 'universityDegree', maxCount: 1 },
    { name: 'collegiationCertificate', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { userId } = req.auth;
      const files = req.files;
      
      if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // Process uploaded files and generate URLs
      const uploadedFiles = {};
      
      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          const file = fileArray[0];
          const fileUrl = `/uploads/${file.filename}`;
          uploadedFiles[fieldName] = {
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            url: fileUrl,
            size: file.size,
            mimetype: file.mimetype
          };
        }
      }

      res.json({
        success: true,
        data: uploadedFiles,
        message: 'Files uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      
      // Clean up any uploaded files if there was an error
      if (req.files) {
        Object.values(req.files).flat().forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      res.status(500).json({
        success: false,
        message: error.message || 'Error uploading files'
      });
    }
  }
);

/**
 * POST /api/uploads/avatar
 * Upload user avatar image
 */
router.post('/avatar', 
  avatarUpload.single('avatar'),
  async (req, res) => {
    try {
      const { userId } = req.auth;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No avatar image uploaded'
        });
      }

      const file = req.file;
      const fileUrl = `/api/uploads/${file.filename}`;
      
      // Update user's avatar_url in database
      const { query } = await import('../config/database.js');
      
      await query(
        'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [fileUrl, userId]
      );

      res.json({
        success: true,
        data: {
          originalName: file.originalname,
          filename: file.filename,
          url: fileUrl,
          size: file.size,
          mimetype: file.mimetype
        },
        message: 'Avatar uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      
      // Clean up uploaded file if there was an error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        message: error.message || 'Error uploading avatar'
      });
    }
  }
);

/**
 * GET /api/uploads/:filename
 * Serve uploaded files
 */
router.get('/:filename', requireAuth, attachUser, (req, res) => {
  try {
    const { filename } = req.params;
    const { userId } = req.auth;
    
    // Security check: ensure the file belongs to the user or user is admin
    if (!filename.startsWith(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  }
});

/**
 * DELETE /api/uploads/:filename
 * Delete uploaded file
 */
router.delete('/:filename', requireAuth, attachUser, (req, res) => {
  try {
    const { filename } = req.params;
    const { userId } = req.auth;
    
    // Security check: ensure the file belongs to the user or user is admin
    if (!filename.startsWith(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file'
    });
  }
});

export default router;