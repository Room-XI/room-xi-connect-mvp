import crypto from 'crypto';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  const tokenHashBuffer = Buffer.from(tokenHash, 'hex');
  const storedHashBuffer = Buffer.from(hash, 'hex');
  
  if (tokenHashBuffer.length !== storedHashBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(tokenHashBuffer, storedHashBuffer);
}
