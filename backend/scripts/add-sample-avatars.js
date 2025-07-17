import { query } from '../src/config/database.js';
import logger from '../src/utils/logger.js';

const sampleAvatars = [
  {
    userId: 'user_2zYBoAmnloDtmUNNMrI7Vv2pCFv',
    name: 'Vers Productions',
    avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  },
  {
    userId: 'user_2zYAl61ljdbioQ308yyfaLwNZJg',
    name: 'Coworking Vibe',
    avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  },
  {
    userId: 'user_2zXvZl0IV7PUZ4G0s3j1KKFBLoQ',
    name: 'LAST BEFORE',
    avatarUrl: 'https://images.unsplash.com/photo-1594824375802-d78b97e8b4f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  }
];

async function addSampleAvatars() {
  try {
    console.log('🚀 Adding sample avatars to users...');
    
    for (const user of sampleAvatars) {
      console.log(`📸 Adding avatar for ${user.name} (${user.userId})`);
      
      const result = await query(
        'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, avatar_url',
        [user.avatarUrl, user.userId]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Successfully updated avatar for ${result.rows[0].name}`);
        console.log(`   Avatar URL: ${result.rows[0].avatar_url}`);
      } else {
        console.log(`❌ User ${user.userId} not found in database`);
      }
    }
    
    console.log('\n🎉 Sample avatars added successfully!');
    console.log('📋 You can now test the avatar display by:');
    console.log('   1. Going to /buscar to see avatars in search results');
    console.log('   2. Clicking "Ver Perfil" to see individual professional profiles');
    console.log('   3. Using the avatar upload feature in professional settings');
    
  } catch (error) {
    logger.error('❌ Error adding sample avatars:', error);
    throw error;
  }
}

// Run the script
addSampleAvatars()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });