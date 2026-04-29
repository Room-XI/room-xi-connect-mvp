/**
 * Unified Demo Seed Script
 * Creates an integrated demo ecosystem showing how all portals work together:
 * - 1 Demo Youth with mood history, Ximi chats, consent settings
 * - 1 Demo Parent linked as guardian
 * - 1 Demo Organization with programs
 * - 1 Demo Youth Worker assigned to the youth
 * - Program attendance and audit trail
 */

import { db } from './db.js';
import { 
  users, 
  profiles, 
  consents, 
  privacyConsents,
  checkins, 
  programs, 
  organizations, 
  savedPrograms,
  ximiConversations,
  auditTrail,
  xids,
  attendance,
  guardianVerifications,
  youthPrivacySettings,
  orgMembers,
  announcements,
} from './schema.js';
import { parents, parentLinks } from './schema.extras.js';
import { 
  youthWorkers, 
  youthWorkerAssignments, 
  aiInterventions,
  parentYouthConsent,
} from './schema-extensions.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { eq, or, like, inArray } from 'drizzle-orm';
import { DateTime } from 'luxon';

const DEMO_PASSWORD = 'TestPassword123!';

async function clearDemoData() {
  console.log('🧹 Clearing existing demo data...');
  
  try {
    // First, get demo user IDs and org IDs for FK cleanup
    const demoUsers = await db.select({ id: users.id }).from(users).where(like(users.email, '%demo%'));
    const demoOrgs = await db.select({ id: organizations.id }).from(organizations).where(like(organizations.name, '%Demo%'));
    
    const demoUserIds = demoUsers.map(u => u.id);
    const demoOrgIds = demoOrgs.map(o => o.id);
    
    // Delete audit trail entries for demo users/orgs first (FK constraint)
    if (demoUserIds.length > 0) {
      await db.delete(auditTrail).where(inArray(auditTrail.userId, demoUserIds));
    }
    if (demoOrgIds.length > 0) {
      await db.delete(auditTrail).where(inArray(auditTrail.orgId, demoOrgIds));
    }
    
    // T043: tournament demo cleanup removed — tournaments + tournament_*
    // tables were dropped (zero pilot consumers).

    // Delete demo programs (by organizer name or orgId)
    await db.delete(programs).where(like(programs.organizer, '%Demo%'));
    if (demoOrgIds.length > 0) {
      await db.delete(programs).where(inArray(programs.orgId, demoOrgIds));
    }
    
    // Delete demo youth workers
    await db.delete(youthWorkers).where(
      like(youthWorkers.email, '%demo%')
    );
    
    // Delete demo parents
    await db.delete(parents).where(
      like(parents.email, '%demo%')
    );
    
    // Delete demo org members (before deleting users to avoid FK issues)
    if (demoUserIds.length > 0) {
      await db.delete(orgMembers).where(inArray(orgMembers.userId, demoUserIds));
    }
    
    // Delete demo users (youth) - cascades to profiles, checkins, etc.
    await db.delete(users).where(
      like(users.email, '%demo%')
    );
    
    // Delete demo organizations
    await db.delete(organizations).where(
      like(organizations.name, '%Demo%')
    );
    
    console.log('✅ Demo data cleared');
  } catch (error) {
    console.log('⚠️ Cleanup error (may not exist yet):', error.message);
  }
}

async function seedDemo() {
  console.log('🌱 Creating unified demo ecosystem...\n');

  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    console.error('Refusing to seed demo data in production.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const now = DateTime.now().setZone('America/Edmonton');

  // ==================================================================
  // 1. CREATE DEMO ORGANIZATION
  // ==================================================================
  console.log('📍 Creating demo organization...');
  const [demoOrg] = await db.insert(organizations).values({
    name: 'Demo Youth Services',
    type: 'nonprofit',
    contactEmail: 'info@demoyouthservices.ca',
    contactPhone: '780-555-DEMO',
    website: 'https://demoyouthservices.ca',
    active: true,
  }).returning();
  console.log(`   ✅ Created org: ${demoOrg.name}`);

  // ==================================================================
  // 2. CREATE DEMO PROGRAMS (under demo org)
  // ==================================================================
  console.log('📚 Creating demo programs...');
  const [prog1, prog2, prog3] = await db.insert(programs).values([
    {
      title: 'Youth Wellness Circle',
      description: 'Weekly peer support group focused on mental wellness and coping strategies. Safe space to share and connect.',
      tags: ['mental-health', 'peer-support', 'community', 'indoor', 'free'],
      wellnessDimensions: ['emotional', 'social'],
      free: true,
      dropIn: true,
      indoor: true,
      organizer: 'Demo Youth Services',
      orgId: demoOrg.id,
      locationName: 'Community Center - Room B',
      address: '10230 107 St NW',
      city: 'Edmonton',
      postalCode: 'T5J 1K5',
      ageMin: 13,
      ageMax: 25,
    },
    {
      title: 'Creative Arts Drop-In',
      description: 'Express yourself through art, music, and creative projects. All skill levels welcome.',
      tags: ['arts', 'creative', 'drop-in', 'indoor', 'free'],
      wellnessDimensions: ['emotional', 'occupational'],
      free: true,
      dropIn: true,
      indoor: true,
      organizer: 'Demo Youth Services',
      orgId: demoOrg.id,
      locationName: 'Demo Youth Services Studio',
      address: '10180 104 St NW',
      city: 'Edmonton',
      postalCode: 'T5J 0Z5',
      ageMin: 13,
      ageMax: 25,
    },
    {
      title: 'Career Exploration Workshop',
      description: 'Discover career paths, build resume skills, and connect with mentors.',
      tags: ['career', 'learning', 'mentorship', 'indoor'],
      wellnessDimensions: ['occupational', 'intellectual'],
      free: true,
      indoor: true,
      organizer: 'Demo Youth Services',
      orgId: demoOrg.id,
      locationName: 'Employment Centre',
      address: '10025 102A Ave NW',
      city: 'Edmonton',
      postalCode: 'T5J 2Y9',
      ageMin: 16,
      ageMax: 25,
    },
  ]).returning();
  console.log(`   ✅ Created ${3} demo programs`);

  // ==================================================================
  // 3. CREATE DEMO YOUTH ACCOUNT
  // ==================================================================
  console.log('👤 Creating demo youth account...');
  const [demoYouth] = await db.insert(users).values({
    email: 'demo.youth@roomxiconnect.ca',
    passwordHash,
    emailVerified: true,
  }).returning();

  // Create profile with realistic data
  await db.insert(profiles).values({
    userId: demoYouth.id,
    firstName: 'Alex',
    lastName: 'Demo',
    preferredName: 'Alex',
    age: 17,
    city: 'Edmonton',
    postalCode: 'T5J 1K5',
    timezone: 'America/Edmonton',
    communityName: 'Downtown',
    wardName: 'O-day\'min',
    streakCount: 5,
    lastCheckinDate: now.toISODate(),
    accountComplete: true,
    ximiConsent: true,
    ximiMode: 'sibling',
  });

  // Add required consents
  await db.insert(consents).values([
    { userId: demoYouth.id, consentType: 'terms_of_use', value: true },
    { userId: demoYouth.id, consentType: 'privacy_notice', value: true },
    { userId: demoYouth.id, consentType: 'data_collection', value: true },
  ]);

  // Add privacy consents
  await db.insert(privacyConsents).values({
    userId: demoYouth.id,
    locationSharing: true,
    orbSharing: true,
    reflectionsSharing: false,
    notificationsEnabled: true,
    researchParticipation: true,
  });

  console.log(`   ✅ Created youth: ${demoYouth.email}`);

  // ==================================================================
  // 4. ADD MOOD CHECK-IN HISTORY (7 days)
  // ==================================================================
  console.log('📊 Creating mood check-in history...');
  const moodHistory = [
    { daysAgo: 6, mood: 4, dimension: 'emotional', tags: ['calm', 'hopeful'], note: 'Started the week feeling okay.' },
    { daysAgo: 5, mood: 3, dimension: 'social', tags: ['lonely', 'tired'], note: 'Felt a bit down today.' },
    { daysAgo: 4, mood: 4, dimension: 'physical', tags: ['rested', 'energetic'], note: 'Better after good sleep.' },
    { daysAgo: 3, mood: 5, dimension: 'emotional', tags: ['happy', 'grateful'], note: 'Had a great day with friends!' },
    { daysAgo: 2, mood: 4, dimension: 'intellectual', tags: ['focused', 'curious'], note: 'Learned something new today.' },
    { daysAgo: 1, mood: 3, dimension: 'emotional', tags: ['anxious', 'overwhelmed'], note: 'Feeling stressed about things.' },
    { daysAgo: 0, mood: 4, dimension: 'social', tags: ['connected', 'supported'], note: 'Talked to my youth worker, feeling better.' },
  ];

  for (const entry of moodHistory) {
    const checkinDate = now.minus({ days: entry.daysAgo });
    await db.insert(checkins).values({
      userId: demoYouth.id,
      timestamp: checkinDate.toJSDate(),
      checkinDate: checkinDate.toISODate(),
      dimension: entry.dimension,
      moodLevel16: entry.mood,
      affectTags: entry.tags,
      note: entry.note,
      localTz: 'America/Edmonton',
    });
  }
  console.log(`   ✅ Created ${moodHistory.length} mood check-ins`);

  // ==================================================================
  // 5. ADD XIMI CHAT HISTORY
  // ==================================================================
  console.log('💬 Creating Ximi chat history...');
  const ximiChats = [
    {
      daysAgo: 5,
      userMessage: "I'm feeling kind of lonely today",
      ximiResponse: "Hey, I hear you. Loneliness can be really tough. Would you like to talk about what's going on? Sometimes just sharing can help a little.",
      moodContext: 'lonely',
    },
    {
      daysAgo: 3,
      userMessage: "Had an amazing day with my friends!",
      ximiResponse: "That's so great to hear! 🌟 Connection with friends can be such a mood booster. What made it special?",
      moodContext: 'happy',
    },
    {
      daysAgo: 1,
      userMessage: "Feeling stressed about school",
      ximiResponse: "School stress is real. What's weighing on you the most right now? Sometimes breaking things down into smaller pieces can help.",
      moodContext: 'anxious',
    },
    {
      daysAgo: 0,
      userMessage: "My youth worker helped me today",
      ximiResponse: "That's wonderful! Having support from caring adults makes such a difference. It sounds like you're building some good connections. 💙",
      moodContext: 'supported',
    },
  ];

  for (const chat of ximiChats) {
    const chatDate = now.minus({ days: chat.daysAgo });
    await db.insert(ximiConversations).values({
      userId: demoYouth.id,
      mode: 'sibling',
      userMessage: chat.userMessage,
      ximiResponse: chat.ximiResponse,
      moodContext: chat.moodContext,
      createdAt: chatDate.toJSDate(),
    });
  }
  console.log(`   ✅ Created ${ximiChats.length} Ximi conversations`);

  // ==================================================================
  // 6. CREATE XID FOR ATTENDANCE
  // ==================================================================
  console.log('🎫 Creating XID for attendance tracking...');
  const xidHash = crypto.createHash('sha256').update(`demo-${demoYouth.id}`).digest('hex').slice(0, 16);
  const [demoXid] = await db.insert(xids).values({
    userId: demoYouth.id,
    xidHash: `DM${xidHash.toUpperCase()}`,
    checksum: xidHash.slice(0, 4),
  }).returning();

  // Add attendance records
  const attendanceRecords = [
    { daysAgo: 5, programId: prog1.id, method: 'qr_scan' },
    { daysAgo: 3, programId: prog2.id, method: 'qr_scan' },
    { daysAgo: 1, programId: prog1.id, method: 'manual' },
  ];

  for (const record of attendanceRecords) {
    const attendDate = now.minus({ days: record.daysAgo });
    await db.insert(attendance).values({
      xidId: demoXid.id,
      programId: record.programId,
      timestamp: attendDate.toJSDate(),
      method: record.method,
      site: 'Demo Youth Services',
    });
  }
  console.log(`   ✅ Created ${attendanceRecords.length} attendance records`);

  // Save a program for the youth
  await db.insert(savedPrograms).values({
    userId: demoYouth.id,
    programId: prog3.id,
  });
  console.log(`   ✅ Saved program: Career Exploration Workshop`);

  // ==================================================================
  // 7. CREATE DEMO PARENT ACCOUNT (linked to youth)
  // ==================================================================
  console.log('👨‍👩‍👧 Creating demo parent account...');
  
  // First create guardian verification
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const [guardianVerification] = await db.insert(guardianVerifications).values({
    userId: demoYouth.id,
    guardianContactType: 'email',
    guardianContactValue: 'demo.parent@example.com',
    guardianContactHash: crypto.createHash('sha256').update('demo.parent@example.com').digest('hex'),
    guardianName: 'Jordan Demo',
    verificationToken,
    status: 'confirmed',
    verifiedAt: now.minus({ days: 10 }).toJSDate(),
    verifiedByName: 'Jordan Demo',
    expiresAt: now.plus({ years: 1 }).toJSDate(),
    confirmedAt: now.minus({ days: 10 }).toJSDate(),
  }).returning();

  const [demoParent] = await db.insert(parents).values({
    email: 'demo.parent@example.com',
    passwordHash,
    firstName: 'Jordan',
    lastName: 'Demo',
    phone: '780-555-0101',
    guardianVerificationId: guardianVerification.id,
  }).returning();

  // Link parent to youth
  await db.insert(parentLinks).values({
    parentId: demoParent.id,
    userId: demoYouth.id,
    relation: 'parent',
    guardianRole: 'primary',
    verifiedAt: now.minus({ days: 10 }).toJSDate(),
  });

  // Add parent consent settings
  await db.insert(parentYouthConsent).values({
    parentId: demoParent.id,
    youthId: demoYouth.id,
    consentLevel: {
      canViewMoodHistory: true,
      canViewProgramAttendance: true,
      canViewXimiChats: false,
      canExportData: true,
    },
  });

  console.log(`   ✅ Created parent: ${demoParent.email} (linked to Alex)`);

  // ==================================================================
  // 8. CREATE DEMO YOUTH WORKER (assigned to youth)
  // ==================================================================
  console.log('👷 Creating demo youth worker...');
  const [demoWorker] = await db.insert(youthWorkers).values({
    organizationId: demoOrg.id,
    email: 'demo.worker@demoyouthservices.ca',
    passwordHash,
    firstName: 'Sam',
    lastName: 'Supportive',
    role: 'worker',
    active: true,
  }).returning();

  // Create assignment with granted consent. organizationId is required
  // (NOT NULL FK after the org-pin migration) — pin to the worker's org
  // so cross-org isolation works end-to-end in the demo.
  await db.insert(youthWorkerAssignments).values({
    youthWorkerId: demoWorker.id,
    youthId: demoYouth.id,
    organizationId: demoOrg.id,
    consentStatus: 'granted',
    consentLevel: {
      share_mood_timeline: true,
      share_program_engagement: true,
      share_checkin_streak: true,
    },
    requestedAt: now.minus({ days: 7 }).toJSDate(),
    respondedAt: now.minus({ days: 6 }).toJSDate(),
  });

  console.log(`   ✅ Created youth worker: ${demoWorker.email} (assigned to Alex)`);

  // Create youth privacy settings with all permissions enabled for demo purposes
  await db.insert(youthPrivacySettings).values({
    userId: demoYouth.id,
    parentCanSeeMood: true,
    parentCanSeeDemographics: true,
    parentCanSeeAttendance: true,
    parentCanSeeXimiChats: true,
    hiddenProgramIds: [],
    lastReviewedAt: now.toJSDate(),
  });
  console.log('   ✅ Created youth privacy settings (all permissions enabled)');

  // Also create an org admin worker
  const [demoOrgAdmin] = await db.insert(youthWorkers).values({
    organizationId: demoOrg.id,
    email: 'demo.admin@demoyouthservices.ca',
    passwordHash,
    firstName: 'Morgan',
    lastName: 'Manager',
    role: 'admin',
    active: true,
  }).returning();
  console.log(`   ✅ Created org admin: ${demoOrgAdmin.email}`);

  // ==================================================================
  // 8b. CREATE DEMO ORG STAFF USER (for Org Portal login)
  // ==================================================================
  console.log('👔 Creating demo org staff user...');
  const [demoOrgStaff] = await db.insert(users).values({
    email: 'demo.orgstaff@demoyouthservices.ca',
    passwordHash,
    firstName: 'Demo',
    lastName: 'OrgStaff',
    role: 'org_staff',
    emailVerified: true,
    birthDate: DateTime.now().minus({ years: 30 }).toJSDate(),
    createdAt: now.toJSDate(),
    updatedAt: now.toJSDate(),
  }).returning();
  console.log(`   ✅ Created org staff user: ${demoOrgStaff.email}`);

  // Link org staff to demo organization
  await db.insert(orgMembers).values({
    userId: demoOrgStaff.id,
    orgId: demoOrg.id,
    role: 'admin',
    permissions: { view_referrals: true, create_referrals: true, manage_programs: true },
    active: true,
  });
  console.log(`   ✅ Linked org staff to ${demoOrg.name}`);

  // ==================================================================
  // 9. ADD AUDIT TRAIL ENTRIES
  // ==================================================================
  console.log('📝 Creating audit trail entries...');
  const auditEntries = [
    { daysAgo: 10, action: 'guardian_consent_confirmed', tableName: 'guardian_verifications', userId: demoYouth.id },
    { daysAgo: 7, action: 'youth_worker_assignment_requested', tableName: 'youth_worker_assignments', userId: demoYouth.id },
    { daysAgo: 6, action: 'youth_worker_assignment_approved', tableName: 'youth_worker_assignments', userId: demoYouth.id },
    { daysAgo: 5, action: 'program_attendance_recorded', tableName: 'attendance', userId: demoYouth.id },
    { daysAgo: 3, action: 'program_attendance_recorded', tableName: 'attendance', userId: demoYouth.id },
    { daysAgo: 1, action: 'mood_checkin_created', tableName: 'checkins', userId: demoYouth.id },
    { daysAgo: 0, action: 'ximi_conversation_created', tableName: 'ximi_conversations', userId: demoYouth.id },
  ];

  for (const entry of auditEntries) {
    const entryDate = now.minus({ days: entry.daysAgo });
    await db.insert(auditTrail).values({
      timestamp: entryDate.toJSDate(),
      userId: entry.userId,
      orgId: demoOrg.id,
      action: entry.action,
      tableName: entry.tableName,
      result: 'success',
    });
  }
  console.log(`   ✅ Created ${auditEntries.length} audit entries`);

  // ==================================================================
  // 10. SEED AI INTERVENTIONS (if not already present)
  // ==================================================================
  console.log('🤖 Ensuring AI interventions are seeded...');
  const existingInterventions = await db.select().from(aiInterventions).limit(1);
  if (existingInterventions.length === 0) {
    await db.insert(aiInterventions).values([
      {
        interventionType: 'mood_decline',
        content: "Hey, Ximi here. I noticed your mood has been lower lately. Would you like to talk, or maybe explore some coping strategies together?",
        triggerConditions: { moodDeclineThreshold: 2, windowDays: 7 },
        deliveryChannel: 'in_app_notification',
        cooldownPeriodHours: 48,
        active: true,
      },
      {
        interventionType: 'inactivity',
        content: "Hi! Ximi checking in. It's been a while since we connected. No pressure, but I'm here whenever you want to chat or check in.",
        triggerConditions: { inactiveDays: 7 },
        deliveryChannel: 'in_app_notification',
        cooldownPeriodHours: 72,
        active: true,
      },
    ]);
    console.log('   ✅ AI interventions seeded');
  } else {
    console.log('   ⏭️ AI interventions already exist');
  }

  // ==================================================================

  // ==================================================================
  // SUMMARY
  // ==================================================================
  console.log('\n' + '='.repeat(60));
  console.log('✨ DEMO ECOSYSTEM CREATED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n📋 DEMO ACCOUNTS:');
  console.log('');
  console.log('   YOUTH PORTAL (/)');
  console.log('   └─ demo.youth@roomxiconnect.ca');
  console.log('      • Name: Alex Demo, Age: 17');
  console.log('      • 7 days of mood check-ins (5-day streak)');
  console.log('      • 4 Ximi conversations');
  console.log('      • 3 program attendance records');
  console.log('');
  console.log('   PARENT PORTAL (/parent)');
  console.log('   └─ demo.parent@example.com');
  console.log('      • Name: Jordan Demo');
  console.log('      • Linked as parent of Alex Demo');
  console.log('      • Can view mood history & attendance');
  console.log('');
  console.log('   ORG PORTAL (/org)');
  console.log('   └─ demo.admin@demoyouthservices.ca (youth worker portal org admin)');
  console.log('   └─ demo.orgstaff@demoyouthservices.ca (org portal staff login)');
  console.log('      • Organization: Demo Youth Services');
  console.log('      • 3 programs created');
  console.log('      • Attendance & outcomes data visible');
  console.log('');
  console.log('   YOUTH WORKER PORTAL (/youth-worker)');
  console.log('   └─ demo.worker@demoyouthservices.ca');
  console.log('      • Name: Sam Supportive');
  console.log('      • Assigned to Alex Demo (approved consent)');
  console.log('      • Can view mood timeline & engagement');
  console.log('');
  console.log('   ADMIN PORTAL (/admin)');
  console.log('   └─ Use ADMIN_USERNAME / ADMIN_PASSWORD secrets');
  console.log('      • All demo data visible in audit logs');
  console.log('');
  console.log('   TOURNAMENT: Room XI Spring Basketball League');
  console.log('   └─ Public ID: demo-spring-basketball-2026');
  console.log('      • 2 teams: Thunder Hawks (approved), Northern Lights (pending)');
  console.log('      • 5 registrations (4 team members + 1 free agent)');
  console.log('      • 3 announcements, 3 scheduled games');
  console.log('      • Free agent: demo.freeagent@roomxiconnect.ca (Riley Chen)');
  console.log('');
  console.log('   🔑 Password for all demo accounts: TestPassword123!');
  console.log('');
  console.log('='.repeat(60));
}

async function main() {
  try {
    await clearDemoData();
    await seedDemo();
    process.exit(0);
  } catch (error) {
    console.error('❌ Demo seed error:', error);
    process.exit(1);
  }
}

main();
