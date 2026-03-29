import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.infinitecrafted.app',
  appName: 'Infinite Crafted',
  webDir: 'out',
  server: {
    url: 'https://infinite-crafted.vercel.app',
    cleartext: true,
  },
};

export default config;
