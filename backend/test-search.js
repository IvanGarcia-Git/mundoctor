import { query } from './src/config/database.js';

async function testProfessionalsSearch() {
  try {
    console.log('Testing professionals search...');
    
    // Test basic query
    const searchQuery = `
      SELECT 
        p.id,
        p.user_id,
        u.name,
        u.email,
        p.specialty_id,
        s.name as specialty_name,
        p.consultation_fee,
        p.city,
        p.rating,
        p.total_reviews,
        p.about,
        p.verified
      FROM professionals p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN specialties s ON p.specialty_id = s.id
      WHERE u.role = 'professional' 
        AND u.status IN ('active', 'pending_validation')
      LIMIT 5
    `;

    const result = await query(searchQuery);
    
    console.log(`Found ${result.rows.length} professionals:`);
    result.rows.forEach(prof => {
      console.log(`- ${prof.name} (${prof.specialty_name || 'No specialty'}) - ${prof.city || 'No city'}`);
      console.log(`  Rating: ${prof.rating || 0}, Fee: ${prof.consultation_fee || 0}`);
    });
    
    // Test specialties
    console.log('\n--- Specialties ---');
    const specialtiesResult = await query('SELECT id, name FROM specialties LIMIT 5');
    specialtiesResult.rows.forEach(spec => {
      console.log(`- ${spec.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testProfessionalsSearch();