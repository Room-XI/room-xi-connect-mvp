/**
 * Differential Privacy Implementation
 * Implements Laplace mechanism for privacy-preserving data aggregation
 * As per Room XI Connect Privacy Specification
 */

import logger from '../logger.ts';

// Simple-statistics doesn't have randomLaplace, so we implement it ourselves

// Configuration as per dp_noise_spec.md
const DP_CONFIG = {
  epsilon: 0.5, // Annual review required
  minThreshold: 7, // Minimum N to render
  mechanism: 'laplace',
  enabled: process.env.NODE_ENV === 'production'
};

/**
 * Generate random Laplace noise
 * @param {number} mu - Location parameter (usually 0)
 * @param {number} b - Scale parameter (sensitivity/epsilon)
 * @returns {number} - Laplace distributed random value
 */
function randomLaplace(mu, b) {
  const u = Math.random() - 0.5;
  return mu - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Add Laplace noise to a single value
 * @param {number} value - The true value
 * @param {number} sensitivity - Query sensitivity (max change from single user)
 * @param {number} epsilon - Privacy budget (default 0.5)
 * @returns {object} - Value with noise and metadata
 */
export function addLaplaceNoise(value, sensitivity = 1, epsilon = DP_CONFIG.epsilon) {
  if (!DP_CONFIG.enabled) {
    return {
      value,
      noiseAdded: false,
      mechanism: 'none',
      epsilon: null
    };
  }

  // Calculate scale parameter for Laplace distribution
  const scale = sensitivity / epsilon;
  
  // Generate Laplace noise
  const noise = randomLaplace(0, scale);
  const noisyValue = Math.round(value + noise);
  
  // Ensure non-negative for counts
  const finalValue = Math.max(0, noisyValue);
  
  return {
    value: finalValue,
    noiseAdded: true,
    mechanism: DP_CONFIG.mechanism,
    epsilon,
    originalCount: value
  };
}

/**
 * Apply differential privacy to aggregate statistics
 * @param {object} stats - Object containing statistical values
 * @param {number} count - Number of users in aggregate
 * @returns {object} - Stats with DP applied, or null if below threshold
 */
export function applyDPToStats(stats, count) {
  // Check threshold - don't render if below minimum N
  if (count < DP_CONFIG.minThreshold) {
    return {
      suppressed: true,
      reason: `Count below threshold (N=${count}, min=${DP_CONFIG.minThreshold})`,
      noiseAdded: false
    };
  }

  const noisyStats = {};
  
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value === 'number') {
      noisyStats[key] = addLaplaceNoise(value, 1, DP_CONFIG.epsilon).value;
    } else {
      noisyStats[key] = value;
    }
  }
  
  return {
    ...noisyStats,
    noiseAdded: true,
    nCount: count,
    dpEpsilon: DP_CONFIG.epsilon,
    mechanism: DP_CONFIG.mechanism
  };
}

/**
 * Apply DP to mood distribution (7-day ratios)
 * @param {object} moodCounts - Counts for each mood level
 * @param {number} totalCheckins - Total check-ins
 * @returns {object} - Noisy ratios with metadata
 */
export function applyDPToMoodDistribution(moodCounts, totalCheckins) {
  if (totalCheckins < DP_CONFIG.minThreshold) {
    return {
      suppressed: true,
      reason: `Insufficient data (N=${totalCheckins})`,
      noiseAdded: false
    };
  }

  const noisyDistribution = {};
  let noisyTotal = 0;
  
  // Add noise to each mood count
  for (const [mood, count] of Object.entries(moodCounts)) {
    const noisy = addLaplaceNoise(count, 1, DP_CONFIG.epsilon);
    noisyDistribution[mood] = noisy.value;
    noisyTotal += noisy.value;
  }
  
  // Calculate ratios from noisy counts
  const ratios = {};
  for (const [mood, noisyCount] of Object.entries(noisyDistribution)) {
    ratios[mood] = noisyTotal > 0 ? noisyCount / noisyTotal : 0;
  }
  
  return {
    ratios,
    noisyCounts: noisyDistribution,
    totalCount: noisyTotal,
    originalTotal: totalCheckins,
    noiseAdded: true,
    dpEpsilon: DP_CONFIG.epsilon,
    mechanism: DP_CONFIG.mechanism
  };
}

/**
 * Log DP application for audit purposes
 * @param {string} operation - Type of operation
 * @param {object} metadata - Additional context
 */
export function logDPApplication(operation, metadata) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    noiseAdded: metadata.noiseAdded || false,
    nCount: metadata.nCount || null,
    epsilon: metadata.epsilon || DP_CONFIG.epsilon,
    suppressed: metadata.suppressed || false,
    ...metadata
  };
  
  // In production, this would go to audit log
  if (process.env.NODE_ENV === 'production') {
    logger.info({ context: 'dp-audit', ...logEntry }, 'Differential privacy applied');
  }
  
  return logEntry;
}

/**
 * Apply differential privacy to aggregate statistics (for transparency dashboard)
 * @param {object} stats - Object containing statistical values
 * @param {number} sensitivity - Query sensitivity (default 1)
 * @returns {object} - Stats with differential privacy applied
 */
export function applyDifferentialPrivacy(stats, sensitivity = 1) {
  const noisyStats = {};
  
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value === 'number') {
      const result = addLaplaceNoise(value, sensitivity, DP_CONFIG.epsilon);
      noisyStats[key] = result.value;
    } else {
      noisyStats[key] = value;
    }
  }
  
  return noisyStats;
}

// Configuration getter for transparency
export function getDPConfig() {
  return {
    ...DP_CONFIG,
    lastReview: '2025-01-01',
    nextReview: '2026-01-01'
  };
}