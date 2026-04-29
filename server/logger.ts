import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'token',
      '*.token',
      'secret',
      '*.secret',
      'pin',
      '*.pin',
      'loginCode',
      '*.loginCode',
      'magicLink',
      '*.magicLink',
      'magicLinkUrl',
      '*.magicLinkUrl',
      'tokenHash',
      '*.tokenHash',
      'passToken',
      '*.passToken',
      'sessionToken',
      '*.sessionToken',
      'accessToken',
      '*.accessToken',
      'refreshToken',
      '*.refreshToken',
      'csrfToken',
      '*.csrfToken',
      'SESSION_SECRET',
      'JWT_SECRET',
      'ENCRYPTION_SECRET',
      'XID_PEPPER',
      'SAFETY_PLAN_TOKEN_PEPPER',
      'GMAIL_APP_PASSWORD',
      'SENDGRID_API_KEY',
      'VAPID_PRIVATE_KEY',
      'AI_INTEGRATIONS_OPENAI_API_KEY',
      'ADMIN_PASSWORD',
      'ADMIN_ACCESS_CODE',
    ],
    remove: true,
  },
});

/**
 * Sanitize URL to remove sensitive tokens from path segments
 * Tokens typically appear as long alphanumeric strings in URL paths
 */
function sanitizeUrl(url: string): string {
  if (!url) return url;
  
  // Remove query string entirely (may contain tokens)
  const urlWithoutQuery = url.split('?')[0];
  
  // Redact long token-like path segments (UUIDs, JWT segments, hex tokens)
  // Matches: UUIDs, 20+ char alphanumeric strings, base64-like tokens
  return urlWithoutQuery.replace(
    /\/([a-f0-9-]{36}|[a-zA-Z0-9_-]{20,})/g,
    '/[REDACTED]'
  );
}

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
  customProps: (req) => ({
    userId: (req as any).session?.userId ?? null,
  }),
  customSuccessMessage: (req, res) => {
    // Log sanitized URL path only (not full URL with tokens)
    const safePath = sanitizeUrl(req.url || '').split('/').pop() || req.url;
    return `${req.method} ${safePath} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    const safePath = sanitizeUrl(req.url || '').split('/').pop() || req.url;
    return `${req.method} ${safePath} ${res.statusCode} - ${err.message}`;
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: sanitizeUrl(req.url),
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

export default logger;
