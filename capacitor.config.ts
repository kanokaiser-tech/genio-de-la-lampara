import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.genio.revendedores',
  appName: 'Genio Revendedores',
  webDir: 'dist/public',
  server: {
    url: 'https://geniorevendedores.geniodelalampara.com',
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#18181b',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
