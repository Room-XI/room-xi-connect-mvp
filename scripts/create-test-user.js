import bcrypt from 'bcrypt';
import { db } from '../server/db.js';
import { users, profiles } from '../server/schema.js';
import { eq } from 'drizzle-orm';

async function createTestUser() {
  const testEmail = 'test@roomxi.org';
  const testPassword = 'Test1234!';
  
  try {
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, testEmail));
    
    if (existing.length > 0) {
      console.log('✅ Test user already exists!');
      console.log('Email:', testEmail);
      console.log('Password:', testPassword);
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(testPassword, 10);
    
    // Create user
    const [newUser] = await db.insert(users).values({
      email: testEmail,
      passwordHash: passwordHash,
    }).returning();
    
    console.log('✅ Created user:', newUser.id);
    
    // Create profile
    await db.insert(profiles).values({
      userId: newUser.id,
      name: 'Test User',
      age: 18,
      city: 'Edmonton',
      timezone: 'America/Edmonton',
    });
    
    console.log('✅ Created profile');
    console.log('\n🎉 Test account ready!');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
}

createTestUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
