import Phaser from 'phaser';
import { FruitRenderer } from '../entities/FruitRenderer';
import { UIHelpers } from '../ui/UIHelpers';

// Musique + logo externes optionnels : le jeu reste fonctionnel sans eux
const imageAssets = import.meta.glob('../assets/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
const audioAssets = import.meta.glob('../assets/audio/*.mp3', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
// Icônes UI (PNG noir sur transparent) : recolorées à l'usage via setTintFill().
const iconAssets = import.meta.glob('../assets/icons/*.png', {
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
    this.buildLoadingUI();
    for (const [path, url] of Object.entries(imageAssets)) {
      const m = path.match(/\/([^/]+)\.png$/);
      if (m) this.load.image(m[1], url);
    }
    for (const [path, url] of Object.entries(audioAssets)) {
      const m = path.match(/\/([^/]+)\.mp3$/);
      if (m) this.load.audio(m[1], url);
    }
    for (const [path, url] of Object.entries(iconAssets)) {
      const m = path.match(/\/([^/]+)\.png$/);
      if (m) this.load.image(`icon_${m[1]}`, url);
    }
  }

  /** Écran de chargement : fond + pastèque procédurale + barre de progression
   * (tout dessiné en Graphics, aucune dépendance aux assets en cours de chargement). */
  private buildLoadingUI(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const k = h / 1280;
    const cx = w / 2;
    const cy = h / 2;
    const FONT = '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';

    const bg = this.add.graphics().setDepth(0);
    UIHelpers.drawNotebookBackground(this, bg, k);
    const bands = this.add.graphics().setDepth(1);
    UIHelpers.drawWaxBand(bands, 0, 0, w, 26 * k);
    UIHelpers.drawWaxBand(bands, 0, h - 26 * k, w, 26 * k);

    // Pastèque procédurale (rebond) : les vraies textures ne sont pas encore chargées
    const mascot = this.add.container(cx, cy - 90 * k).setDepth(5);
    const r = 90 * k;
    const g = this.add.graphics();
    g.fillStyle(0x27272f, 1);
    g.fillCircle(4 * k, 4 * k, r);
    g.fillStyle(0x2f9e44, 1);
    g.fillCircle(0, 0, r);
    g.lineStyle(4 * k, 0x1b5e20, 1);
    for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
      g.beginPath();
      g.arc(0, 0, r * 0.98, Math.PI * 0.5 + a - 0.16, Math.PI * 0.5 + a + 0.16);
      g.strokePath();
    }
    g.lineStyle(4 * k, 0x27272f, 1);
    g.strokeCircle(0, 0, r);
    g.fillStyle(0xffffff, 0.16);
    g.fillEllipse(-r * 0.32, -r * 0.35, r * 0.5, r * 0.28);
    mascot.add(g);
    this.tweens.add({
      targets: mascot,
      y: mascot.y - 16 * k,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(cx, cy + 30 * k, 'FRUIZ', {
        fontFamily: FONT,
        fontSize: `${Math.round(64 * k)}px`,
        color: '#c94f3d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#ffffff', 6 * k)
      .setDepth(5);

    // Barre de progression
    const barW = Math.min(420 * k, w * 0.72);
    const barH = 34 * k;
    const barY = cy + 100 * k;
    const barX = cx - barW / 2;
    const track = this.add.graphics().setDepth(5);
    track.fillStyle(0xfff9ec, 1);
    track.fillRoundedRect(barX, barY, barW, barH, barH / 2);
    track.lineStyle(3 * k, 0x27272f, 1);
    track.strokeRoundedRect(barX, barY, barW, barH, barH / 2);

    const fill = this.add.graphics().setDepth(6);
    const percentText = this.add
      .text(cx, barY + barH + 26 * k, '0%', {
        fontFamily: FONT,
        fontSize: `${Math.round(24 * k)}px`,
        color: '#58413e',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.load.on('progress', (p: number) => {
      fill.clear();
      fill.fillStyle(0xfdc33b, 1);
      const fw = Math.max(barH, barW * p);
      fill.fillRoundedRect(barX, barY, fw, barH, barH / 2);
      percentText.setText(`${Math.round(p * 100)}%`);
    });
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
