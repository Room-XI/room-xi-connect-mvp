import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roomxi.connect',
  appName: 'Room XI Connect',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e293b',
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Default',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#60a5fa'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e293b'
    }
  }
};

export default config;
