import i18n from '../i18n/config';

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CSRF = 'INVALID_CSRF',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  originalError?: any;
}

const ERROR_MAP: Record<number | string, ErrorCode> = {
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  429: ErrorCode.RATE_LIMITED,
  500: ErrorCode.SERVER_ERROR,
  'Invalid CSRF token': ErrorCode.INVALID_CSRF,
  'Missing consent': ErrorCode.CONSENT_REQUIRED,
  'Session expired': ErrorCode.SESSION_EXPIRED,
};

/**
 * Maps status codes or error messages to user-friendly translated messages
 */
export function getFriendlyErrorMessage(error: any): string {
  let code = ErrorCode.SERVER_ERROR;

  if (typeof error === 'number') {
    code = ERROR_MAP[error] || ErrorCode.SERVER_ERROR;
  } else if (typeof error === 'string') {
    // Check for specific error strings from API
    for (const [key, val] of Object.entries(ERROR_MAP)) {
      if (typeof key === 'string' && error.includes(key)) {
        code = val;
        break;
      }
    }
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
      code = ErrorCode.NETWORK_ERROR;
    }
  }

  // Use i18next for translations
  const translationKey = `errors.${code.toLowerCase()}`;
  const message = i18n.t(translationKey);

  // Fallback if translation is missing
  if (message === translationKey) {
    switch (code) {
      case ErrorCode.UNAUTHORIZED:
        return 'Please sign in to continue.';
      case ErrorCode.FORBIDDEN:
        return 'You do not have permission to perform this action.';
      case ErrorCode.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorCode.RATE_LIMITED:
        return 'Too many requests. Please try again later.';
      case ErrorCode.NETWORK_ERROR:
        return 'Network error. Please check your internet connection.';
      case ErrorCode.CONSENT_REQUIRED:
        return 'Your consent is required to access this feature.';
      case ErrorCode.SESSION_EXPIRED:
        return 'Your session has expired. Please sign in again.';
      case ErrorCode.INVALID_CSRF:
        return 'Security token expired. Please refresh the page.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }

  return message;
}

export function isAppError(error: any): error is AppError {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
}
