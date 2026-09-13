import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fruiz.game',
  appName: 'Fruiz',
  webDir: 'dist',
  // MainActivity protège la WebView avec les insets natifs sur toutes les
  // versions Android ; désactiver leur application CSS pour éviter un doublon.
  plugins: {
    SystemBars: { insetsHandling: 'disable', style: 'LIGHT' },
  },
};

export default config;
