import fetch from 'node-fetch';

/**
 * City of Edmonton GIS Integration for Ward Boundary Lookups
 * 
 * This module provides accurate ward lookups using the City of Edmonton Open Data API.
 * Falls back to FSA (Forward Sortation Area) mapping when GIS lookup fails.
 * 
 * API Documentation: https://data.edmonton.ca/
 * Ward Boundaries Dataset: https://data.edmonton.ca/resource/9ek6-35at.json
 */

// TypeScript types for API responses
export interface WardLookupResult {
  ward: string;
  community: string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface EdmontonWardFeature {
  ward_name?: string;
  ward_number?: string;
  the_geom?: {
    type: string;
    coordinates: number[][][];
  };
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface GeocodedCoordinates {
  lat: number;
  lng: number;
}

// Cache configuration
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const coordinatesCache = new Map<string, CacheEntry<WardLookupResult | null>>();
const geocodeCache = new Map<string, CacheEntry<GeocodedCoordinates | null>>();

// Edmonton Open Data API endpoint for ward boundaries
const EDMONTON_WARDS_API = 'https://data.edmonton.ca/resource/9ek6-35at.json';

// Nominatim API for geocoding (free OpenStreetMap service)
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

/**
 * IMPORTANT: FSA (Forward Sortation Area) to Ward mapping is APPROXIMATE.
 * 
 * FSAs don't align perfectly with Edmonton's 12 ward boundaries.
 * For accurate ward assignment, the City of Edmonton Open Data API should be used.
 * 
 * Current approach: Map FSAs to the most likely ward based on geographic center.
 * For FSAs that span multiple wards, we default to "Pending Verification" to avoid
 * incorrect assignments. Staff can update these during onboarding.
 */
const EDMONTON_FSA_TO_WARD: Record<string, WardLookupResult> = {
  // Downtown/Central - confirmed mappings
  T5H: { ward: "O-day'min", community: 'Downtown' },
  T5J: { ward: "O-day'min", community: 'Downtown Core' },
  T5K: { ward: "O-day'min", community: 'Oliver' },
  T5G: { ward: "O-day'min", community: 'McCauley' },

  // Central East - high confidence
  T5E: { ward: 'Papastew', community: 'Alberta Avenue' },
  T5A: { ward: 'Dene', community: 'Northlands' },
  T5B: { ward: 'Dene', community: 'Belvedere' },

  // Northeast - high confidence
  T5Y: { ward: 'Anirniq', community: 'Clareview' },
  T5Z: { ward: 'Anirniq', community: 'Pilot Sound' },

  // North/Northwest
  T5N: { ward: 'Nakota Isga', community: 'Glenora' },
  
  // South - high confidence
  T6E: { ward: 'pihêsiwin', community: 'Bonnie Doon' },
  T6G: { ward: 'pihêsiwin', community: 'University' },
  T6H: { ward: 'pihêsiwin', community: 'Parkallen' },

  // Southeast/Mill Woods - high confidence  
  T6K: { ward: 'Ipiihkoohkanipiaohtsi', community: 'Mill Woods' },
  T6L: { ward: 'tastawiyiniwak', community: 'South East Edmonton' },
  T6M: { ward: 'tastawiyiniwak', community: 'The Meadows' },

  // Far South - high confidence
  T6N: { ward: 'Sspomitapi', community: 'Ellerslie' },
  T6W: { ward: 'Ipiihkoohkanipiaohtsi', community: 'Heritage Valley' },
  T6X: { ward: 'Ipiihkoohkanipiaohtsi', community: 'Blackmud Creek' },
};

const CANADIAN_POSTAL_CODE_REGEX = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;

export function normalizePostalCode(postalCode: string): string {
  const cleaned = postalCode.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return cleaned;
}

export function isValidCanadianPostalCode(postalCode: string): boolean {
  return CANADIAN_POSTAL_CODE_REGEX.test(postalCode.trim());
}

export function extractFSA(postalCode: string): string {
  const normalized = normalizePostalCode(postalCode);
  return normalized.slice(0, 3).toUpperCase();
}

/**
 * Original FSA-based community lookup (used as fallback)
 */
export function lookupCommunity(postalCode: string): WardLookupResult | null {
  if (!isValidCanadianPostalCode(postalCode)) {
    return null;
  }

  const fsa = extractFSA(postalCode);
  const wardInfo = EDMONTON_FSA_TO_WARD[fsa];

  if (wardInfo) {
    return wardInfo;
  }

  // For Edmonton postal codes not in our verified mapping, return "Pending Verification"
  // Staff can update these during onboarding based on exact address
  if (fsa.startsWith('T5') || fsa.startsWith('T6')) {
    return { ward: 'Pending Verification', community: 'Edmonton Area' };
  }

  // Non-Edmonton postal codes
  return null;
}

/**
 * Helper function to check if cache entry is valid
 */
function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return entry !== undefined && entry.expiresAt > Date.now();
}

/**
 * Helper function to create cache entry with TTL
 */
function createCacheEntry<T>(data: T): CacheEntry<T> {
  return {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

/**
 * Generate cache key for coordinates (rounded to 4 decimal places for reasonable precision)
 */
function getCoordinatesCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Lookup ward by coordinates using City of Edmonton Open Data API
 * Uses Socrata's $where clause for spatial query (point-in-polygon)
 * 
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @returns Ward and community info, or null if not found
 */
export async function lookupWardByCoordinates(
  lat: number,
  lng: number
): Promise<WardLookupResult | null> {
  const cacheKey = getCoordinatesCacheKey(lat, lng);
  
  // Check cache first
  const cachedEntry = coordinatesCache.get(cacheKey);
  if (isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  try {
    // Validate coordinates are within Edmonton bounds (approximate)
    // Edmonton is roughly between lat 53.2-53.8 and lng -113.8 to -113.2
    if (lat < 53.0 || lat > 54.0 || lng < -114.0 || lng > -113.0) {
      const result = null;
      coordinatesCache.set(cacheKey, createCacheEntry(result));
      return result;
    }

    // Query the City of Edmonton API using Socrata's spatial query
    // The API supports within_polygon queries using SoQL
    const query = `$where=within_polygon(the_geom, 'POINT(${lng} ${lat})')`;
    const url = `${EDMONTON_WARDS_API}?${query}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RoomXI-Connect/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Edmonton API error: ${response.status} ${response.statusText}`);
      coordinatesCache.set(cacheKey, createCacheEntry(null));
      return null;
    }

    const data = await response.json() as EdmontonWardFeature[];

    if (!data || data.length === 0) {
      coordinatesCache.set(cacheKey, createCacheEntry(null));
      return null;
    }

    // Extract ward information from the response
    const feature = data[0];
    const wardName = feature.ward_name || feature.ward_number || 'Unknown Ward';
    
    const result: WardLookupResult = {
      ward: wardName,
      community: `Ward ${feature.ward_number || wardName}`,
    };

    coordinatesCache.set(cacheKey, createCacheEntry(result));
    return result;
  } catch (error) {
    console.error('Error querying Edmonton ward API:', error);
    coordinatesCache.set(cacheKey, createCacheEntry(null));
    return null;
  }
}

/**
 * Geocode a postal code to lat/lng coordinates using Nominatim (OpenStreetMap)
 * 
 * @param postalCode - Canadian postal code
 * @returns Coordinates or null if geocoding fails
 */
export async function geocodePostalCode(
  postalCode: string
): Promise<GeocodedCoordinates | null> {
  if (!isValidCanadianPostalCode(postalCode)) {
    return null;
  }

  const normalized = normalizePostalCode(postalCode);
  
  // Check cache first
  const cachedEntry = geocodeCache.get(normalized);
  if (isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  try {
    // Query Nominatim with postal code and country restriction
    const params = new URLSearchParams({
      q: normalized,
      countrycodes: 'ca',
      format: 'json',
      limit: '1',
      addressdetails: '1',
    });

    const url = `${NOMINATIM_API}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RoomXI-Connect/1.0 (youth-services-app)',
      },
    });

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
      geocodeCache.set(normalized, createCacheEntry(null));
      return null;
    }

    const data = await response.json() as NominatimResult[];

    if (!data || data.length === 0) {
      geocodeCache.set(normalized, createCacheEntry(null));
      return null;
    }

    const result: GeocodedCoordinates = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };

    // Validate parsed coordinates
    if (isNaN(result.lat) || isNaN(result.lng)) {
      geocodeCache.set(normalized, createCacheEntry(null));
      return null;
    }

    geocodeCache.set(normalized, createCacheEntry(result));
    return result;
  } catch (error) {
    console.error('Error geocoding postal code:', error);
    geocodeCache.set(normalized, createCacheEntry(null));
    return null;
  }
}

/**
 * Enhanced community lookup that tries GIS API first, then falls back to FSA mapping
 * 
 * Flow:
 * 1. Geocode postal code to coordinates
 * 2. Query City of Edmonton API with coordinates for accurate ward
 * 3. Fall back to FSA-based lookup if API fails
 * 
 * @param postalCode - Canadian postal code
 * @returns Ward and community info, or null if not in Edmonton
 */
export async function lookupCommunityEnhanced(
  postalCode: string
): Promise<WardLookupResult | null> {
  if (!isValidCanadianPostalCode(postalCode)) {
    return null;
  }

  try {
    // Step 1: Geocode the postal code
    const coordinates = await geocodePostalCode(postalCode);

    if (coordinates) {
      // Step 2: Query Edmonton API with coordinates
      const gisResult = await lookupWardByCoordinates(coordinates.lat, coordinates.lng);
      
      if (gisResult) {
        return gisResult;
      }
    }
  } catch (error) {
    console.error('Enhanced lookup failed, falling back to FSA:', error);
  }

  // Step 3: Fall back to FSA-based lookup
  return lookupCommunity(postalCode);
}

/**
 * Clear all caches (useful for testing or cache invalidation)
 */
export function clearCaches(): void {
  coordinatesCache.clear();
  geocodeCache.clear();
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getCacheStats(): {
  coordinatesCacheSize: number;
  geocodeCacheSize: number;
} {
  return {
    coordinatesCacheSize: coordinatesCache.size,
    geocodeCacheSize: geocodeCache.size,
  };
}
