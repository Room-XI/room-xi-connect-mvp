import { db } from './db.js';
import { programs, crisisSupports } from './schema.js';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
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

    console.log('✨ Database seeded successfully!');
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
