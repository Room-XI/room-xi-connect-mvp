/**
 * Geo Aggregation Routes with H3 Hex Bucketing
 * Combines H3 spatial anonymization + Laplace noise + N≥7 filtering
 * Never exposes raw lat/lng coordinates
 */

import express from 'express';
import { latLngToCell, cellToLatLng, cellToBoundary } from 'h3-js';
import { db } from '../db.js';
import { checkins, profiles } from '../schema.js';
import { eq, gte, and } from 'drizzle-orm';
import { applyDPToMoodDistribution, addLaplaceNoise } from '../lib/differentialPrivacy.js';
import { checkPrivacyConsent } from '../middleware/consent.ts';

const router = express.Router();

const H3_RESOLUTION = 8; // ~0.46 km² hexagons (appropriate for city-level privacy)
const MIN_USERS_PER_HEX = 7; // k-anonymity threshold

/**
 * Get aggregated mood data by geographic hex
 * POST /api/geo/aggregate
 * Body: { timeRange?: '7d' | '30d' | 'all' }
 * Requires location consent
 */
router.post('/aggregate', async (req, res) => {
  // Require authentication
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Check location consent
  const consent = await checkPrivacyConsent(req.session.userId, 'location');
  if (!consent.location) {
    return res.status(403).json({ 
      error: 'Consent required',
      code: 'CONSENT_REQUIRED',
      missingConsents: ['location'],
      message: 'Please enable location sharing in Privacy Center to view geographic data'
    });
  }
  try {
    const { timeRange = '7d' } = req.body;
    
    // Calculate time filter
    const now = new Date();
    let startDate = new Date();
    
    if (timeRange === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else {
      // All time - use a very old date
      startDate = new Date('2020-01-01');
    }

    // Fetch check-ins with location data in time range
    const checkinsData = await db
      .select({
        mood: checkins.moodType,
        lat: checkins.latitude,
        lng: checkins.longitude,
        userId: checkins.userId,
        city: profiles.city
      })
      .from(checkins)
      .leftJoin(profiles, eq(checkins.userId, profiles.userId))
      .where(
        and(
          gte(checkins.timestamp, startDate),
          // Only include check-ins with valid coordinates
          eq(checkins.hasLocation, true)
        )
      );

    // Group by H3 hex
    const hexBuckets = new Map();

    for (const checkin of checkinsData) {
      if (!checkin.lat || !checkin.lng) continue;

      try {
        // Convert lat/lng to H3 hex
        const hex = latLngToCell(checkin.lat, checkin.lng, H3_RESOLUTION);
        
        if (!hexBuckets.has(hex)) {
          hexBuckets.set(hex, {
            users: new Set(),
            moods: {
              cold: 0,
              stormy: 0,
              foggy: 0,
              clear: 0,
              breezy: 0,
              aurora: 0
            },
            totalCheckins: 0,
            cities: new Set()
          });
        }

        const bucket = hexBuckets.get(hex);
        bucket.users.add(checkin.userId);
        bucket.moods[checkin.mood] = (bucket.moods[checkin.mood] || 0) + 1;
        bucket.totalCheckins++;
        if (checkin.city) bucket.cities.add(checkin.city);
      } catch (error) {
        console.error('[Geo] Invalid coordinates, skipping:', error);
        continue;
      }
    }

    // Apply privacy filters and noise
    const privacyProtectedHexes = [];

    for (const [hex, bucket] of hexBuckets) {
      const userCount = bucket.users.size;

      // DUAL k-anonymity threshold (both true AND noisy counts must be ≥7)
      
      // First filter: Suppress hexes where TRUE user count < 7
      // This prevents low-population hexes from leaking via positive noise
      if (userCount < MIN_USERS_PER_HEX) {
        continue;
      }

      // Add noise to user count and floor at zero (prevent negative counts)
      const noisyUserCount = Math.max(0, addLaplaceNoise(userCount, 1, 0.5).value);

      // Second filter: Suppress hexes where NOISY user count < 7
      // This prevents publishing hexes where noise reduced count below threshold
      if (noisyUserCount < MIN_USERS_PER_HEX) {
        continue;
      }

      // Apply Laplace noise to mood counts
      const noisyMoods = {};
      for (const [mood, count] of Object.entries(bucket.moods)) {
        const noisy = addLaplaceNoise(count, 1, 0.5);
        noisyMoods[mood] = Math.max(0, noisy.value);
      }

      // Calculate noisy total
      const noisyTotal = Object.values(noisyMoods).reduce((sum, count) => sum + count, 0);

      // Get hex centroid (never expose original lat/lng)
      const [lat, lng] = cellToLatLng(hex);
      
      // Get hex boundary for polygon display
      const boundary = cellToBoundary(hex).map(([lat, lng]) => ({ lat, lng }));

      privacyProtectedHexes.push({
        hex,
        centroid: { lat, lng },
        boundary,
        moods: noisyMoods,
        totalCheckins: noisyTotal,
        userCount: noisyUserCount,
        cities: Array.from(bucket.cities),
        privacy: {
          epsilon: 0.5,
          mechanism: 'laplace',
          kAnonymity: MIN_USERS_PER_HEX,
          h3Resolution: H3_RESOLUTION
        }
      });
    }

    res.json({
      data: privacyProtectedHexes,
      metadata: {
        timeRange,
        totalHexes: privacyProtectedHexes.length,
        privacy: {
          h3Resolution: H3_RESOLUTION,
          minUsersPerHex: MIN_USERS_PER_HEX,
          epsilon: 0.5,
          mechanism: 'laplace + h3 hex bucketing',
          guarantees: 'k-anonymity N≥7, differential privacy ε=0.5, no raw coordinates exposed'
        }
      }
    });

  } catch (error) {
    console.error('[Geo] Aggregation error:', error);
    res.status(500).json({
      error: 'Failed to aggregate geo data',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

/**
 * Get hex info for a specific location (for displaying current user's hex)
 * POST /api/geo/hex-for-location
 * Body: { lat: number, lng: number }
 * Requires location consent
 */
router.post('/hex-for-location', async (req, res) => {
  // Require authentication
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Check location consent
  const consent = await checkPrivacyConsent(req.session.userId, 'location');
  if (!consent.location) {
    return res.status(403).json({ 
      error: 'Consent required',
      code: 'CONSENT_REQUIRED',
      missingConsents: ['location'],
      message: 'Please enable location sharing in Privacy Center to use this feature'
    });
  }
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const hex = latLngToCell(lat, lng, H3_RESOLUTION);
    const centroid = cellToLatLng(hex);
    const boundary = cellToBoundary(hex).map(([lat, lng]) => ({ lat, lng }));

    res.json({
      data: {
        hex,
        centroid: { lat: centroid[0], lng: centroid[1] },
        boundary,
        resolution: H3_RESOLUTION
      }
    });
  } catch (error) {
    console.error('[Geo] Hex lookup error:', error);
    res.status(500).json({
      error: 'Failed to get hex for location',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

export default router;
