const isDev = process.env.NODE_ENV !== 'production';

export function debugLog(prefix: string, ...args: any[]) {
  if (isDev) {
    console.log(`[${prefix}]`, ...args);
  }
}
