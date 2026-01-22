import { db } from './db.js';
import { programs, crisisSupports, organizations } from './schema.js';
import { parents } from './schema.extras.js';
import { youthWorkers, aiInterventions } from './schema-extensions.js';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Seed organizations
    const [org1, org2, org3] = await db.insert(organizations).values([
      {
        name: 'Room XI Connect',
        type: 'nonprofit',
        contactEmail: 'hello@roomxiconnect.ca',
        contactPhone: '780-555-0100',
        website: 'https://roomxiconnect.ca',
        active: true,
      },
      {
        name: 'YESS Edmonton',
        type: 'nonprofit',
        contactEmail: 'info@yess.org',
        contactPhone: '780-555-0200',
        website: 'https://yess.org',
        active: true,
      },
      {
        name: 'iHuman Youth Society',
        type: 'nonprofit',
        contactEmail: 'contact@ihuman.org',
        contactPhone: '780-555-0300',
        website: 'https://ihuman.org',
        active: true,
      },
    ]).returning();
    console.log('✅ Organizations seeded');

    // Seed youth workers (staff members)
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);
    await db.insert(youthWorkers).values([
      {
        organizationId: org1.id,
        email: 'sarah.worker@roomxiconnect.ca',
        passwordHash,
        firstName: 'Sarah',
        lastName: 'Chen',
        role: 'worker',
        active: true,
      },
      {
        organizationId: org1.id,
        email: 'michael.admin@roomxiconnect.ca',
        passwordHash,
        firstName: 'Michael',
        lastName: 'Thompson',
        role: 'admin',
        active: true,
      },
      {
        organizationId: org2.id,
        email: 'jamie.worker@yess.org',
        passwordHash,
        firstName: 'Jamie',
        lastName: 'Rodriguez',
        role: 'worker',
        active: true,
      },
      {
        organizationId: org3.id,
        email: 'alex.worker@ihuman.org',
        passwordHash,
        firstName: 'Alex',
        lastName: 'Kim',
        role: 'worker',
        active: true,
      },
    ]);
    console.log('✅ Youth workers seeded');

    // Seed parent accounts
    await db.insert(parents).values([
      {
        email: 'parent1@example.com',
        passwordHash,
        firstName: 'Jennifer',
        lastName: 'Smith',
        phone: '780-555-1001',
      },
      {
        email: 'parent2@example.com',
        passwordHash,
        firstName: 'David',
        lastName: 'Johnson',
        phone: '780-555-1002',
      },
      {
        email: 'guardian@example.com',
        passwordHash,
        firstName: 'Maria',
        lastName: 'Garcia',
        phone: '780-555-1003',
      },
    ]);
    console.log('✅ Parent accounts seeded');

    // Seed AI interventions (default templates)
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
      {
        interventionType: 'crisis_keyword',
        content: "I'm here for you. It sounds like you might be going through something really difficult. Remember, you're not alone. Would you like to see some crisis resources?",
        triggerConditions: { keywords: ['hopeless', 'can\'t go on', 'end it', 'give up'] },
        deliveryChannel: 'in_app_notification',
        cooldownPeriodHours: 24,
        active: true,
      },
      {
        interventionType: 'low_engagement',
        content: "Hey there! Ximi here. Have you checked out any programs lately? There might be something new that matches your interests.",
        triggerConditions: { daysSinceLastProgramView: 14 },
        deliveryChannel: 'in_app_notification',
        cooldownPeriodHours: 168,
        active: true,
      },
      {
        interventionType: 'streak_encouragement',
        content: "Amazing work on your check-in streak! Consistency like this shows real self-awareness. Keep it up!",
        triggerConditions: { streakMilestones: [7, 14, 30] },
        deliveryChannel: 'in_app_notification',
        cooldownPeriodHours: 168,
        active: false,
      },
    ]);
    console.log('✅ AI interventions seeded');

    // Seed programs
    await db.insert(programs).values([
      {
        title: 'iHuman Youth Society – Arts Drop-In',
        description: 'Creative drop-in for youth with arts, music, and mentorship.',
        tags: ['arts', 'drop-in', 'community', 'indoor', 'free'],
        free: true,
        indoor: true,
        outdoor: false,
        organizer: 'iHuman Youth Society',
        locationName: 'iHuman Studio',
      },
      {
        title: 'Boyle Street – Youth Drop-In',
        description: 'Youth-friendly daytime drop-in with support workers and snacks.',
        tags: ['community', 'drop-in', 'free', 'indoor', 'quiet'],
        free: true,
        indoor: true,
        outdoor: false,
        organizer: 'Boyle Street Community Services',
        locationName: 'Drop-in Centre',
      },
      {
        title: 'YESS – Resource Navigation',
        description: 'Support with housing, food, and wellbeing. Trauma-informed.',
        tags: ['community', 'free', 'quiet', 'indoor', 'small-group'],
        free: true,
        indoor: true,
        outdoor: false,
        organizer: 'YESS',
        locationName: 'Resource Centre',
      },
      {
        title: 'The Family Centre – Walk-In Counselling',
        description: 'Single-session, solution-focused counselling. Pay-what-you-can options.',
        tags: ['mental-health', 'indoor', 'routine'],
        free: false,
        indoor: true,
        outdoor: false,
        organizer: 'The Family Centre',
        locationName: 'Counselling',
      },
      {
        title: 'City of Edmonton – Youth Recreation Drop-In',
        description: 'Supervised sports and games. Good for routine and gentle activity.',
        tags: ['sports', 'drop-in', 'community', 'free', 'indoor'],
        free: true,
        indoor: true,
        outdoor: false,
        organizer: 'City of Edmonton',
        locationName: 'Recreation Centre',
      },
      {
        title: 'CMHA Edmonton – Peer Support / Groups',
        description: 'Peer-based mental health support groups (themes vary).',
        tags: ['mental-health', 'community', 'quiet', 'indoor'],
        free: true,
        indoor: true,
        outdoor: false,
        organizer: 'CMHA Edmonton',
        locationName: 'Community Space',
      },
      {
        title: 'Bent Arrow – Cultural & Youth Programs',
        description: 'Programs connecting Indigenous youth with culture and community.',
        tags: ['community', 'indoor', 'creative', 'leadership'],
        free: true,
        indoor: true,
        outdoor: false,
        organizer: 'Bent Arrow Traditional Healing Society',
        locationName: 'Program Site',
      },
      {
        title: 'Edmonton Public Library – Teen Space',
        description: 'Study, makerspace tools, and teen events. Calm indoor time.',
        tags: ['indoor', 'free', 'quiet', 'learning'],
        free: true,
        indoor: true,
        outdoor: false,
        organizer: 'Edmonton Public Library',
        locationName: 'Branch Teen Area',
      },
      {
        title: 'Community Skate / Movement Hour',
        description: 'Gentle outdoor movement. Low-pressure and friendly.',
        tags: ['outdoor', 'free', 'gentle-activity'],
        free: true,
        indoor: false,
        outdoor: true,
        organizer: 'Community Partners',
        locationName: 'Local Park',
      },
      {
        title: 'Youth Maker & Tech Club',
        description: 'Beginner-friendly coding, 3D printing, and creative tech with mentors.',
        tags: ['tech', 'creative', 'learning', 'indoor'],
        free: true,
        indoor: true,
        outdoor: false,
        organizer: 'Community Lab',
        locationName: 'Makerspace',
      },
    ]);
    console.log('✅ Programs seeded');

    // Seed crisis supports
    await db.insert(crisisSupports).values([
      {
        region: 'Canada',
        category: 'call',
        name: 'Emergency (Police/Fire/Ambulance)',
        phone: '911',
        hours: '24/7',
        notes: 'Immediate danger',
        verifiedAt: new Date(),
      },
      {
        region: 'Canada',
        category: 'call',
        name: '988 Suicide Crisis Helpline',
        phone: '988',
        hours: '24/7',
        notes: 'Call or text 988',
        verifiedAt: new Date(),
      },
      {
        region: 'Canada',
        category: 'textchat',
        name: 'Kids Help Phone',
        phone: '1-800-668-6868',
        textCode: 'CONNECT to 686868',
        chatUrl: 'https://kidshelpphone.ca/live-chat',
        hours: '24/7',
        notes: 'Youth-focused',
        verifiedAt: new Date(),
      },
      {
        region: 'Alberta',
        category: 'call',
        name: 'Alberta Mental Health Help Line',
        phone: '1-877-303-2642',
        hours: '24/7',
        notes: 'Info & referral',
        verifiedAt: new Date(),
      },
      {
        region: 'Alberta',
        category: 'call',
        name: 'Health Link',
        phone: '811',
        hours: '24/7',
        notes: 'Nurse advice',
        verifiedAt: new Date(),
      },
      {
        region: 'Alberta',
        category: 'call',
        name: '211 Alberta',
        phone: '211',
        chatUrl: 'https://ab.211.ca/',
        hours: '24/7',
        notes: 'Community services navigation',
        verifiedAt: new Date(),
      },
      {
        region: 'Edmonton',
        category: 'call',
        name: 'CMHA Edmonton Distress Line',
        phone: '780-482-4357',
        hours: '24/7',
        notes: 'Distress Line (HELP)',
        verifiedAt: new Date(),
      },
      {
        region: 'Edmonton',
        category: 'call',
        name: 'Alberta One Line for Sexual Violence',
        phone: '1-866-403-8000',
        chatUrl: 'https://aasas.ca/',
        hours: '24/7',
        notes: 'Information & support',
        verifiedAt: new Date(),
      },
      {
        region: 'Edmonton',
        category: 'inperson',
        name: 'Nearest Emergency Department',
        address: null,
        hours: '24/7',
        notes: 'Go to your nearest ER or call 911',
        verifiedAt: new Date(),
      },
    ]);
    console.log('✅ Crisis supports seeded');

    console.log('');
    console.log('✨ Database seeded successfully!');
    console.log('');
    console.log('📋 Test Accounts Created:');
    console.log('   Youth Workers:');
    console.log('     - sarah.worker@roomxiconnect.ca (worker)');
    console.log('     - michael.admin@roomxiconnect.ca (admin)');
    console.log('     - jamie.worker@yess.org (worker)');
    console.log('     - alex.worker@ihuman.org (worker)');
    console.log('   Parents:');
    console.log('     - parent1@example.com');
    console.log('     - parent2@example.com');
    console.log('     - guardian@example.com');
    console.log('   Password for all: TestPassword123!');
    console.log('');
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
