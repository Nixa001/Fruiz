import { defineConfig } from 'vite';

export default defineConfig({
  // base relative : indispensable pour Capacitor (file:// sur Android/iOS)
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // phaser isolé : le cache navigateur reste efficace entre les mises à jour du jeu
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  server: {
    host: true,
    port: 5175,
  },
});
