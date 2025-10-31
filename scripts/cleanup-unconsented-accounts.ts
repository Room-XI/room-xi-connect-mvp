/**
 * 30-Day Auto-Deletion Script for Unconsented Accounts
 * 
 * PIPA Compliance: Accounts that haven't completed consent within 30 days are deleted
 * 
 * Run manually: npm run cleanup:unconsented
 * Or via cron: 0 2 * * * # Daily at 2 AM
 */

import { Pool } from '@neondatabase/serverless';
import * as ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface UnconsentedAccount {
  id: string;
  email: string;
  created_at: Date;
  age_days: number;
}

async function findUnconsentedAccounts(): Promise<UnconsentedAccount[]> {
  const query = `
    SELECT 
      u.id,
      u.email,
      u.created_at,
      EXTRACT(DAY FROM NOW() - u.created_at) as age_days
    FROM users u
    LEFT JOIN consents c ON c.user_id = u.id AND c.consent_type = 'terms_of_use'
    WHERE c.user_id IS NULL
      AND u.created_at < NOW() - INTERVAL '30 days'
    ORDER BY u.created_at ASC
  `;

  const result = await pool.query<UnconsentedAccount>(query);
  return result.rows;
}

async function deleteAccount(userId: string): Promise<void> {
  // Log deletion event first
  await pool.query(
    `INSERT INTO consent_events (user_id, actor, event_type, notes)
     VALUES ($1, 'system', 'revoked', '30-day auto-deletion - no consent granted')`,
    [userId]
  );

  // Delete user (CASCADE will delete related records)
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

async function cleanup(dryRun: boolean = true): Promise<void> {
  console.log('🔍 Finding unconsented accounts older than 30 days...');

  const accounts = await findUnconsentedAccounts();

  console.log(`Found ${accounts.length} accounts to delete:`);

  if (accounts.length === 0) {
    console.log('✅ No accounts to delete');
    await pool.end();
    return;
  }

  for (const account of accounts) {
    console.log(
      `  - ${account.email} (created ${account.age_days} days ago)`
    );
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No accounts were deleted');
    console.log('Run with --execute to actually delete accounts');
  } else {
    console.log('\n🗑️  Deleting accounts...');
    
    let deleted = 0;
    for (const account of accounts) {
      try {
        await deleteAccount(account.id);
        deleted++;
        console.log(`  ✓ Deleted ${account.email}`);
      } catch (error) {
        console.error(`  ✗ Failed to delete ${account.email}:`, error);
      }
    }

    console.log(`\n✅ Deleted ${deleted}/${accounts.length} accounts`);
  }

  await pool.end();
}

// Main execution
const args = process.argv.slice(2);
const execute = args.includes('--execute');

cleanup(!execute)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error running cleanup:', error);
    process.exit(1);
  });
