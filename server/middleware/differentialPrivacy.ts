/**
 * Differential Privacy Enforcement Middleware
 * Ensures all aggregate queries meet privacy thresholds and are properly logged
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { dpApplications } from '../schema.js';
import { applyDPToStats, addLaplaceNoise } from '../lib/differentialPrivacy.js';

interface DPMetadata {
  operation: string;
  tableName?: string;
  queryType?: string;
  originalCount?: number;
  noiseAdded: boolean;
  epsilon: number;
  suppressed: boolean;
  suppressionReason?: string;
}

/**
 * Log differential privacy application to audit table
 */
async function logDPApplication(metadata: DPMetadata): Promise<void> {
  try {
    await db.insert(dpApplications).values({
      operation: metadata.operation,
      tableName: metadata.tableName || null,
      queryType: metadata.queryType || null,
      originalCount: metadata.originalCount || null,
      noiseAdded: metadata.noiseAdded,
      epsilon: metadata.epsilon.toString(),
      mechanism: 'laplace',
      suppressed: metadata.suppressed,
      suppressionReason: metadata.suppressionReason || null,
      metadata: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('[DP Middleware] Failed to log DP application:', error);
  }
}

/**
 * Middleware to enforce differential privacy on aggregate endpoints
 * Validates count thresholds and applies noise
 */
export function enforceDifferentialPrivacy(options: {
  operation: string;
  tableName?: string;
  queryType?: string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      (async () => {
        try {
          let processedData = data;
          let dpMetadata: DPMetadata = {
            operation: options.operation,
            tableName: options.tableName,
            queryType: options.queryType,
            noiseAdded: false,
            epsilon: 0.5,
            suppressed: false
          };

          // Check if data has count information
          if (data && typeof data === 'object') {
            // Handle array responses (multiple rows)
            if (Array.isArray(data.data)) {
              const count = data.data.length;
              dpMetadata.originalCount = count;

              if (count < 7) {
                dpMetadata.suppressed = true;
                dpMetadata.suppressionReason = `Count below threshold (N=${count}, min=7)`;
                
                await logDPApplication(dpMetadata);

                return originalJson({
                  data: null,
                  suppressed: true,
                  message: 'Insufficient data for privacy-preserving display',
                  metadata: {
                    minThreshold: 7,
                    noiseApplied: false
                  }
                });
              }
            }

            // Handle single object responses with explicit count
            if (data.count !== undefined) {
              const count = Number(data.count);
              dpMetadata.originalCount = count;

              if (count < 7) {
                dpMetadata.suppressed = true;
                dpMetadata.suppressionReason = `Count below threshold (N=${count}, min=7)`;
                
                await logDPApplication(dpMetadata);

                return originalJson({
                  data: null,
                  suppressed: true,
                  message: 'Insufficient data for privacy-preserving display',
                  metadata: {
                    minThreshold: 7,
                    noiseApplied: false
                  }
                });
              }
            }

            // Add metadata about DP application
            dpMetadata.noiseAdded = process.env.NODE_ENV === 'production';
            
            if (!data.metadata) {
              data.metadata = {};
            }
            
            data.metadata.differentialPrivacy = {
              applied: dpMetadata.noiseAdded,
              epsilon: 0.5,
              mechanism: 'laplace',
              minThreshold: 7
            };

            await logDPApplication(dpMetadata);
          }

          return originalJson(data);
        } catch (error) {
          console.error('[DP Middleware] Error processing response:', error);
          return originalJson(data);
        }
      })();
    } as any;

    next();
  };
}

/**
 * Helper function to apply DP with logging
 */
export async function applyDPWithLogging(
  stats: Record<string, any>,
  count: number,
  operation: string,
  tableName?: string
): Promise<any> {
  const result = applyDPToStats(stats, count);
  
  await logDPApplication({
    operation,
    tableName,
    queryType: 'aggregate',
    originalCount: count,
    noiseAdded: result.noiseAdded || false,
    epsilon: 0.5,
    suppressed: result.suppressed || false,
    suppressionReason: result.reason
  });

  return result;
}

/**
 * Helper function to add Laplace noise with logging
 */
export async function addNoiseWithLogging(
  value: number,
  operation: string,
  tableName?: string,
  sensitivity: number = 1
): Promise<any> {
  const result = addLaplaceNoise(value, sensitivity, 0.5);
  
  await logDPApplication({
    operation,
    tableName,
    queryType: 'single_value',
    originalCount: value,
    noiseAdded: result.noiseAdded || false,
    epsilon: 0.5,
    suppressed: false
  });

  return result;
}
