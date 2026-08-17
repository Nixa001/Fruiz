import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sn.merge.fruits',
  appName: 'Fruiz',
  webDir: 'dist',
  // Orientation portrait verrouillée au niveau natif
  // (déclarée aussi dans AndroidManifest.xml / Info.plist générés par Capacitor)
};

export default config;
