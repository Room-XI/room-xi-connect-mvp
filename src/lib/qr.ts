/**
 * Parse a program ID from various QR code formats
 * Supports:
 * - Custom scheme: rx:program:<uuid>
 * - Raw UUID string
 * - URL with program_id parameter
 */
export function parseProgramId(code: string): string | null {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const trimmedCode = code.trim();

  // UUID regex pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // 1. Check for custom scheme: rx:program:<uuid>
  const customSchemeMatch = trimmedCode.match(/^rx:program:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
  if (customSchemeMatch) {
    return customSchemeMatch[1];
  }

  // 2. Check if it's a raw UUID
  if (uuidPattern.test(trimmedCode)) {
    return trimmedCode;
  }

  // 3. Check if it's a URL with program_id parameter
  try {
    const url = new URL(trimmedCode);
    const programId = url.searchParams.get('program_id');
    if (programId && uuidPattern.test(programId)) {
      return programId;
    }
  } catch {
    // Not a valid URL, continue
  }

  // 4. Check if it's a URL path ending with a UUID
  const pathUuidMatch = trimmedCode.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/|$)/i);
  if (pathUuidMatch) {
    return pathUuidMatch[1];
  }

  return null;
}

/**
 * Generate a QR code URL for a program
 */
export function generateProgramQRCode(programId: string): string {
  return `rx:program:${programId}`;
}

/**
 * Validate if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
}
