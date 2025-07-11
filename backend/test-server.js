import express from 'express';
import cors from 'cors';
import { query } from './src/config/database.js';

const app = express();
const PORT = 8001;

// CORS configuration to allow frontend requests
const corsOptions = {
  origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Professionals search endpoint (simplified)
app.get('/api/professionals/search', async (req, res) => {
  try {
    const { limit = 20, q = '', specialty_id = null } = req.query;
    
    let whereConditions = [
      'u.role = $1',
      'u.status IN ($2, $3)'
    ];
    
    let queryParams = ['professional', 'active', 'pending_validation'];
    let paramIndex = 4;

    // Search by name if provided
    if (q && q.trim()) {
      whereConditions.push(`LOWER(u.name) LIKE $${paramIndex}`);
      queryParams.push(`%${q.toLowerCase()}%`);
      paramIndex++;
    }

    // Filter by specialty
    if (specialty_id) {
      whereConditions.push(`p.specialty_id = $${paramIndex}`);
      queryParams.push(specialty_id);
      paramIndex++;
    }

    const searchQuery = `
      SELECT 
        p.id,
        p.user_id,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        p.specialty_id,
        s.name as specialty_name,
        s.icon as specialty_icon,
        p.consultation_fee,
        p.city,
        p.address,
        p.rating,
        p.total_reviews,
        p.about,
        p.experience_years,
        p.languages,
        p.verified,
        u.status as user_status,
        p.created_at
      FROM professionals p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN specialties s ON p.specialty_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY p.rating DESC, p.total_reviews DESC
      LIMIT $${paramIndex}
    `;

    queryParams.push(parseInt(limit));

    const result = await query(searchQuery, queryParams);
    
    const professionals = result.rows.map(prof => ({
      id: prof.id,
      user_id: prof.user_id,
      name: prof.name,
      email: prof.email,
      phone: prof.phone,
      avatar_url: prof.avatar_url,
      specialty: {
        id: prof.specialty_id,
        name: prof.specialty_name,
        icon: prof.specialty_icon
      },
      consultation_fee: parseFloat(prof.consultation_fee) || 0,
      city: prof.city,
      address: prof.address,
      rating: parseFloat(prof.rating) || 0,
      total_reviews: parseInt(prof.total_reviews) || 0,
      about: prof.about,
      experience_years: parseInt(prof.experience_years) || 0,
      languages: prof.languages || [],
      verified: prof.verified || false,
      user_status: prof.user_status,
      created_at: prof.created_at
    }));

    res.json({
      success: true,
      data: {
        professionals,
        total: professionals.length,
        filters: { q, specialty_id, limit: parseInt(limit) }
      }
    });

  } catch (error) {
    console.error('Error searching professionals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search professionals',
      details: error.message
    });
  }
});

// Get specialties
app.get('/api/professionals/specialties', async (req, res) => {
  try {
    const specialtiesQuery = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.icon,
        COUNT(p.id) as professionals_count
      FROM specialties s
      LEFT JOIN professionals p ON s.id = p.specialty_id
      LEFT JOIN users u ON p.user_id = u.id AND u.role = 'professional' AND u.status IN ('active', 'pending_validation')
      GROUP BY s.id, s.name, s.description, s.icon
      ORDER BY s.name ASC
    `;

    const result = await query(specialtiesQuery);
    
    const specialties = result.rows.map(specialty => ({
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      icon: specialty.icon,
      professionals_count: parseInt(specialty.professionals_count) || 0
    }));

    res.json({
      success: true,
      data: specialties
    });

  } catch (error) {
    console.error('Error getting specialties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get specialties'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/professionals/search`);
  console.log(`Try: http://localhost:${PORT}/api/professionals/specialties`);
});