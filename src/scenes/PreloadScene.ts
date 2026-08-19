import Phaser from 'phaser';
import { FruitRenderer } from '../entities/FruitRenderer';

// Musique + logo externes optionnels : le jeu reste fonctionnel sans eux
const imageAssets = import.meta.glob('../assets/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
const audioAssets = import.meta.glob('../assets/audio/*.mp3', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

/**
 * Charge les assets externes, puis génère les textures procédurales
 * (fruits, particules). Le jeu démarre même sans aucun fichier externe.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    for (const [path, url] of Object.entries(imageAssets)) {
      const m = path.match(/\/([^/]+)\.png$/);
      if (m) this.load.image(m[1], url);
    }
    for (const [path, url] of Object.entries(audioAssets)) {
      const m = path.match(/\/([^/]+)\.mp3$/);
      if (m) this.load.audio(m[1], url);
    }
  }

  create(): void {
    FruitRenderer.generateAllTextures(this);
    PreloadScene.generateParticleTextures(this);
    this.scene.stop();
    this.scene.start('Menu');
  }

  private static generateParticleTextures(scene: Phaser.Scene): void {
    // point blanc (teintable)
    if (!scene.textures.exists('p_dot')) {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 16;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(8, 8, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      scene.textures.addCanvas('p_dot', c);
    }
    // étoile blanche (teintable)
    if (!scene.textures.exists('p_star')) {
      const c = document.createElement('canvas');
      c.width = 28;
      c.height = 28;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 === 0 ? 13 : 5.5;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const px = 14 + Math.cos(a) * rad;
          const py = 14 + Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      scene.textures.addCanvas('p_star', c);
    }
    // confetti (teintable)
    if (!scene.textures.exists('p_confetti')) {
      const c = document.createElement('canvas');
      c.width = 12;
      c.height = 8;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 12, 8);
      }
      scene.textures.addCanvas('p_confetti', c);
    }
  }
}
