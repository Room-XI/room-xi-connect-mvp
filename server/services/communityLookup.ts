/**
 * IMPORTANT: FSA (Forward Sortation Area) to Ward mapping is APPROXIMATE.
 * 
 * FSAs don't align perfectly with Edmonton's 12 ward boundaries.
 * For accurate ward assignment, the City of Edmonton Open Data API should be used:
 * https://data.edmonton.ca/
 * 
 * TODO: Replace with authoritative City of Edmonton geocoding API or GIS boundary data
 * 
 * Current approach: Map FSAs to the most likely ward based on geographic center.
 * For FSAs that span multiple wards, we default to "Pending Verification" to avoid
 * incorrect assignments. Staff can update these during onboarding.
 */
const EDMONTON_FSA_TO_WARD: Record<string, { ward: string; community: string }> = {
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

export function lookupCommunity(postalCode: string): { ward: string; community: string } | null {
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
