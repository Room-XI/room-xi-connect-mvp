import crypto from 'crypto';
import { db } from '../db.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';

const WORDS = [
  'STAR', 'MOON', 'SUN', 'FIRE', 'WAVE', 'TREE', 'WIND', 'RAIN',
  'BIRD', 'BEAR', 'WOLF', 'HAWK', 'SAGE', 'JADE', 'RUBY', 'OPAL',
  'BOLT', 'GLOW', 'BLOOM', 'DRIFT', 'SPARK', 'FROST', 'LIGHT', 'SHADE',
  'CLOUD', 'LEAF', 'PEAK', 'VALE', 'COVE', 'REEF', 'DUSK', 'DAWN',
  'ECHO', 'MIST', 'SURF', 'FERN', 'PINE', 'WING', 'NEST', 'TIDE',
];

function randomWord(): string {
  const idx = crypto.randomInt(0, WORDS.length);
  return WORDS[idx];
}

function randomNumber(): string {
  return String(crypto.randomInt(10, 100));
}

function generateCode(): string {
  return `${randomWord()}-${randomWord()}-${randomNumber()}`;
}

export async function generateUniqueLoginCode(maxRetries = 10): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateCode();
    const existing = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.loginCode, code))
      .limit(1);

    if (existing.length === 0) {
      return code;
    }
  }
  throw new Error('Failed to generate unique login code after maximum retries');
}
