import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./schema";
import * as schemaExtras from "./schema.extras";
import * as schemaExtensions from "./schema-extensions";
import logger from './logger';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle({ 
  client: pool, 
  schema: { ...schema, ...schemaExtras, ...schemaExtensions } 
});

/**
 * Retry wrapper for database queries with exponential backoff
 * Use this for critical operations that need resilience against temporary connection issues
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on application errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (
          message.includes('unique constraint') ||
          message.includes('foreign key') ||
          message.includes('not null constraint') ||
          message.includes('permission denied')
        ) {
          throw error; // These are application errors, not connection issues
        }
      }
      
      // Calculate delay with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      
      console.warn(
        `Database query failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${Math.round(delay + jitter)}ms...`,
        error
      );
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }
  
  console.error('Database query failed after all retries');
  throw lastError!;
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info({ context: 'db' }, 'SIGTERM received, closing database pool');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info({ context: 'db' }, 'SIGINT received, closing database pool');
  await pool.end();
  process.exit(0);
});
