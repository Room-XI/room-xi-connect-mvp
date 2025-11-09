import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roomxi.connect',
  appName: 'Room XI Connect',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
