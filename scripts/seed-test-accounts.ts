import { db } from '../server/db.js';
import { users, profiles, guardianVerifications } from '../server/schema.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

interface TestAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  age: number;
  description: string;
}

async function seedTestAccounts() {
  console.log('🌱 Seeding test accounts...\n');

  const testAccounts: TestAccount[] = [
    {
      email: 'youth17@roomxi.test',
      password: 'TestPassword123!',
      firstName: 'Alex',
      lastName: 'Senior',
      age: 17,
      description: 'Youth 17+ (no guardian verification needed)',
    },
    {
      email: 'youth15unverified@roomxi.test',
      password: 'TestPassword123!',
      firstName: 'Jordan',
      lastName: 'Pending',
      age: 15,
      description: 'Youth under 16 (requires guardian verification, pending state)',
    },
    {
      email: 'youth15verified@roomxi.test',
      password: 'TestPassword123!',
      firstName: 'Taylor',
      lastName: 'Verified',
      age: 15,
      description: 'Youth under 16 (guardian verified, full access)',
    },
  ];

  const createdAccounts: Array<{
    email: string;
    password: string;
    description: string;
    guardianStatus?: string;
  }> = [];

  for (const account of testAccounts) {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(account.password, 10);

      // Calculate date of birth
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - account.age);
      const dateOfBirth = dob.toISOString().split('T')[0];

      // Create user
      const [newUser] = await db.insert(users).values({
        email: account.email,
        passwordHash,
      }).returning();

      console.log(`✓ Created user: ${account.email}`);

      // Create profile
      await db.insert(profiles).values({
        userId: newUser.id,
        firstName: account.firstName,
        lastName: account.lastName,
        age: account.age,
        dateOfBirth: dateOfBirth,
        ximiConsent: true, // Enable Ximi for testing
      });

      console.log(`  └─ Created profile for ${account.firstName} ${account.lastName}`);

      let guardianStatus = 'Not required (age 16+)';

      // Handle guardian verification for users under 16
      if (account.age < 16) {
        const guardianEmail = `guardian.${account.firstName.toLowerCase()}@roomxi.test`;
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const contactHash = await bcrypt.hash(guardianEmail.toLowerCase(), 10);

        // Set expiration to 30 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Create guardian verification record
        const [verification] = await db.insert(guardianVerifications).values({
          userId: newUser.id,
          guardianContactType: 'email',
          guardianContactValue: guardianEmail,
          guardianContactHash: contactHash,
          verificationToken: verificationToken,
          verificationMethod: 'email_link',
          expiresAt: expiresAt,
        }).returning();

        console.log(`  └─ Created guardian verification for ${guardianEmail}`);

        // If this is the "verified" account, mark it as verified
        if (account.email.includes('verified')) {
          await db.update(guardianVerifications)
            .set({ 
              verifiedAt: new Date(),
              verifiedByName: `Guardian of ${account.firstName}`,
            })
            .where(db.$with('id').as(verification.id));

          await db.update(profiles)
            .set({ guardianVerifiedAt: new Date() })
            .where(db.$with('userId').as(newUser.id));

          guardianStatus = `Verified by ${guardianEmail}`;
          console.log(`  └─ Marked guardian verification as verified`);
        } else {
          guardianStatus = `Pending verification from ${guardianEmail}`;
          console.log(`  └─ Verification token: ${verificationToken}`);
        }
      }

      createdAccounts.push({
        email: account.email,
        password: account.password,
        description: account.description,
        guardianStatus,
      });

      console.log('');
    } catch (error) {
      console.error(`✗ Error creating account ${account.email}:`, error);
    }
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📋 TEST ACCOUNTS CREATED');
  console.log('═══════════════════════════════════════════════════════\n');

  createdAccounts.forEach((account, index) => {
    console.log(`${index + 1}. ${account.description}`);
    console.log(`   Email:    ${account.email}`);
    console.log(`   Password: ${account.password}`);
    console.log(`   Guardian: ${account.guardianStatus}`);
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Test account seeding complete!');
  console.log('═══════════════════════════════════════════════════════\n');
}

seedTestAccounts()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding test accounts:', error);
    process.exit(1);
  });
