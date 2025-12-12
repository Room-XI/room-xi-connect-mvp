const EDMONTON_FSA_TO_WARD: Record<string, { ward: string; community: string }> = {
  // Northeast wards - Dene, Anirniq
  T5A: { ward: 'Dene', community: 'Northlands' },
  T5B: { ward: 'Dene', community: 'Belvedere' },
  T5C: { ward: 'Anirniq', community: 'Beacon Heights' },
  T5Y: { ward: 'Anirniq', community: 'Clareview' },
  T5Z: { ward: 'Anirniq', community: 'Pilot Sound' },

  // Central/Downtown - O-day'min, Papastew
  T5E: { ward: 'Papastew', community: 'Alberta Avenue' },
  T5G: { ward: "O-day'min", community: 'McCauley' },
  T5H: { ward: "O-day'min", community: 'Downtown' },
  T5J: { ward: "O-day'min", community: 'Downtown Core' },
  T5K: { ward: "O-day'min", community: 'Oliver' },

  // Northwest - Nakota Isga, Sipiwiyiniwak
  T5L: { ward: 'Sipiwiyiniwak', community: 'Calder' },
  T5M: { ward: 'Sipiwiyiniwak', community: 'Inglewood' },
  T5N: { ward: 'Nakota Isga', community: 'Glenora' },
  T5P: { ward: 'Nakota Isga', community: 'Woodcroft' },

  // West - Métis, Nakota Isga
  T5R: { ward: 'Nakota Isga', community: 'West Jasper Place' },
  T5S: { ward: 'Métis', community: 'Winterburn' },
  T5T: { ward: 'Métis', community: 'Lewis Estates' },

  // Southeast - Karhiio, pihêsiwin, tastawiyiniwak
  T5W: { ward: 'Karhiio', community: 'Forest Heights' },
  T5X: { ward: 'pihêsiwin', community: 'Millbourne' },

  // East/Mill Woods - Karhiio, Ipiihkoohkanipiaohtsi
  T6A: { ward: 'Karhiio', community: 'Holyrood' },
  T6B: { ward: 'Karhiio', community: 'Ottewell' },
  T6C: { ward: 'Ipiihkoohkanipiaohtsi', community: 'Mill Woods' },

  // South - pihêsiwin, Ipiihkoohkanipiaohtsi
  T6E: { ward: 'pihêsiwin', community: 'Bonnie Doon' },
  T6G: { ward: 'pihêsiwin', community: 'University' },
  T6H: { ward: 'pihêsiwin', community: 'Parkallen' },
  T6J: { ward: 'Ipiihkoohkanipiaohtsi', community: 'Greenfield' },
  T6K: { ward: 'Ipiihkoohkanipiaohtsi', community: 'Terwillegar' },

  // South/Southeast - tastawiyiniwak, Sspomitapi
  T6L: { ward: 'tastawiyiniwak', community: 'South East Edmonton' },
  T6M: { ward: 'tastawiyiniwak', community: 'The Meadows' },
  T6N: { ward: 'Sspomitapi', community: 'Ellerslie' },
  T6P: { ward: 'Sspomitapi', community: 'Summerside' },

  // Far South - Sspomitapi
  T6R: { ward: 'Sspomitapi', community: 'Windermere' },
  T6S: { ward: 'Sspomitapi', community: 'Orchards' },
  T6T: { ward: 'Sspomitapi', community: 'Charlesworth' },

  // Southwest - Ipiihkoohkanipiaohtsi
  T6V: { ward: 'Ipiihkoohkanipiaohtsi', community: 'Riverbend' },
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

  if (fsa.startsWith('T5') || fsa.startsWith('T6')) {
    return { ward: 'Unknown', community: 'Edmonton' };
  }

  return null;
}
