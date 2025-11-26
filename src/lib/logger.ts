/**
 * Configurable logger for Room XI Connect
 * Respects LOG_LEVEL and FEATURE_SUPPRESS_WARNINGS settings
 */

import { FEATURE_SUPPRESS_WARNINGS, LOG_LEVEL } from './featureFlags';

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const levelRank: Record<LogLevel, number> = {
  silent: 99,
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = FEATURE_SUPPRESS_WARNINGS 
  ? levelRank.error 
  : levelRank[LOG_LEVEL] ?? levelRank.info;

function shouldLog(level: LogLevel): boolean {
  return levelRank[level] <= currentLevel;
}

function formatMessage(level: string, args: unknown[]): unknown[] {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  return [`[${timestamp}] [${level.toUpperCase()}]`, ...args];
}

export const logger = {
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(...formatMessage('error', args));
    }
  },
  
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(...formatMessage('warn', args));
    }
  },
  
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.log(...formatMessage('info', args));
    }
  },
  
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log(...formatMessage('debug', args));
    }
  },
  
  // Special method for API errors that always logs
  apiError: (endpoint: string, status: number, message: string) => {
    if (shouldLog('error')) {
      console.error(`[API ERROR] ${endpoint} - ${status}: ${message}`);
    }
  },
  
  // Group logging for related messages
  group: (label: string, fn: () => void) => {
    if (shouldLog('debug')) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },
};

export default logger;
