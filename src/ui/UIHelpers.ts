import Phaser from 'phaser';

export interface ButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  fill: number;
  textColor?: string;
  fontSize?: number;
  radius?: number;
  depth?: number;
  /** Ombre portée "brutale" (décalage plein, pas de flou). */
  shadowColor?: number;
  /** Icône optionnelle (dessinée en Graphics). */
  icon?: 'play' | 'pause' | 'leaf' | 'gear' | 'lock' | 'volume' | 'music';
  iconPosition?: 'left' | 'top';
}

/** Helpers UI cartoon partagés entre les scènes. */
export class UIHelpers {
  /** Fond "feuille quadrillée de cahier" + ciel dégradé chaud (arcade douce). */
  static drawNotebookBackground(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, scaleK: number): void {
    g.clear();
    const w = scene.scale.width;
    const h = scene.scale.height;
    // ciel dégradé pêche → crème
    const topC = 0xfff3d6;
    const bottomC = 0xf5efdf;
    const bands = 8;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const r = Math.round(((topC >> 16) & 0xff) + (((bottomC >> 16) & 0xff) - ((topC >> 16) & 0xff)) * t);
      const gg = Math.round(((topC >> 8) & 0xff) + (((bottomC >> 8) & 0xff) - ((topC >> 8) & 0xff)) * t);
      const b = Math.round((topC & 0xff) + ((bottomC & 0xff) - (topC & 0xff)) * t);
      g.fillStyle((r << 16) | (gg << 8) | b, 1);
      g.fillRect(0, Math.floor((h * i) / bands), w, Math.ceil(h / bands) + 1);
    }
    const step = 44 * scaleK;
    g.lineStyle(1, 0x000000, 0.045);
    for (let x = step; x < w; x += step) {
      g.lineBetween(x, 0, x, h);
    }
    for (let y = step; y < h; y += step) {
      g.lineBetween(0, y, w, y);
    }
    // marge rouge façon cahier
    g.lineStyle(2, 0xe57373, 0.2);
    g.lineBetween(54 * scaleK, 0, 54 * scaleK, h);
  }

  /** Bouton cartoon "brutal" : ombre décalée pleine, contour épais, icône, rebond. */
  static makeButton(scene: Phaser.Scene, opts: ButtonOptions, onClick: () => void): Phaser.GameObjects.Container {
    const { x, y, width, height, label, fill, radius = 20 } = opts;
    const depth = opts.depth ?? 10;
    const fontSize = opts.fontSize ?? Math.round(height * 0.42);
    const container = scene.add.container(x, y).setDepth(depth);
    const off = Math.max(4, Math.round(height * 0.07));

    // Ombre "brutale" : bloc plein décalé
    const shadow = scene.add.graphics();
    shadow.fillStyle(opts.shadowColor ?? 0x000000, 1);
    shadow.fillRoundedRect(-width / 2 + off, -height / 2 + off, width, height, radius);
    container.add(shadow);

    const body = scene.add.graphics();
    body.fillStyle(fill, 1);
    body.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    body.lineStyle(4, 0x27272f, 1);
    body.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
    body.fillStyle(0xffffff, 0.22);
    body.fillRoundedRect(-width / 2 + 8, -height / 2 + 6, width - 16, height * 0.3, radius * 0.6);
    container.add(body);

    // Icône éventuelle
    const iconPos = opts.iconPosition ?? 'left';
    let textY = 2;
    if (opts.icon) {
      const ig = scene.add.graphics();
      if (iconPos === 'left') {
        const ix = label ? -width / 2 + height * 0.62 : 0;
        UIHelpers.drawIcon(ig, ix, 0, height * 0.28, opts.icon);
      } else {
        UIHelpers.drawIcon(ig, 0, -height * 0.2, height * 0.26, opts.icon);
        textY = height * 0.16;
      }
      container.add(ig);
    }

    const text = scene.add
      .text(0, textY, label, {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${fontSize}px`,
        color: opts.textColor ?? '#27272f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(text);

    const zone = scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
    // Anti double-tap : ignore les clics répétés à moins de 250 ms
    let lastClickAt = 0;
    zone.on('pointerdown', () => {
      const now = performance.now();
      if (now - lastClickAt < 250) return;
      lastClickAt = now;
      scene.tweens.add({ targets: container, scale: 0.93, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
      onClick();
    });
    container.add(zone);
    return container;
  }

  /** Icônes simples dessinées (play, pause, feuille, engrenage, cadenas, son, note). */
  static drawIcon(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    s: number,
    type: 'play' | 'pause' | 'leaf' | 'gear' | 'lock' | 'volume' | 'music',
  ): void {
    if (type === 'play') {
      g.fillStyle(0x27272f, 1);
      g.fillTriangle(x - s * 0.45, y - s * 0.6, x - s * 0.45, y + s * 0.6, x + s * 0.7, y);
    } else if (type === 'pause') {
      g.fillStyle(0x27272f, 1);
      g.fillRect(x - s * 0.45, y - s * 0.6, s * 0.34, s * 1.2);
      g.fillRect(x + s * 0.11, y - s * 0.6, s * 0.34, s * 1.2);
    } else if (type === 'lock') {
      g.fillStyle(0x27272f, 1);
      g.fillRoundedRect(x - s * 0.5, y - s * 0.1, s, s * 0.75, s * 0.12);
      g.lineStyle(s * 0.16, 0x27272f, 1);
      g.beginPath();
      g.arc(x, y - s * 0.05, s * 0.3, Math.PI, 0, false);
      g.strokePath();
    } else if (type === 'volume') {
      g.fillStyle(0x27272f, 1);
      g.fillTriangle(x - s * 0.5, y - s * 0.25, x - s * 0.5, y + s * 0.25, x - s * 0.1, y);
      g.lineStyle(s * 0.14, 0x27272f, 1);
      g.beginPath();
      g.arc(x - s * 0.1, y, s * 0.4, -0.9, 0.9, false);
      g.strokePath();
      g.beginPath();
      g.arc(x - s * 0.1, y, s * 0.7, -0.7, 0.7, false);
      g.strokePath();
    } else if (type === 'music') {
      g.fillStyle(0x27272f, 1);
      g.fillCircle(x - s * 0.35, y + s * 0.3, s * 0.22);
      g.fillRect(x - s * 0.15, y - s * 0.6, s * 0.14, s * 0.9);
      g.fillTriangle(x - s * 0.15, y - s * 0.55, x + s * 0.4, y - s * 0.35, x - s * 0.02, y - s * 0.1);
    } else if (type === 'leaf') {
      g.fillStyle(0x2f9e44, 1);
      g.fillEllipse(x + s * 0.2, y, s * 0.55, s * 0.3);
      g.lineStyle(2, 0x27272f, 1);
      g.lineBetween(x + s * 0.6, y - s * 0.25, x + s * 0.85, y - s * 0.55);
    } else {
      g.lineStyle(3, 0x3d599e, 1);
      g.strokeCircle(x, y, s * 0.55);
      g.fillStyle(0x3d599e, 1);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        g.fillRect(x + Math.cos(a) * s * 0.45 - 1.5, y + Math.sin(a) * s * 0.45 - 1.5, 3, 3);
      }
      g.fillStyle(0xfff9ec, 1);
      g.fillCircle(x, y, s * 0.18);
    }
  }

  /**
   * Bande "tissu wax" sénégalaise : zigzag indigo / or / terracotta / vert.
   * Élément signature de l'identité visuelle du jeu.
   */
  static drawWaxBand(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    const colors = [0x2d4a8e, 0xffc53d, 0xc94f3d, 0x2f9e44];
    // Triangles tous égaux : bande découpée en parts entières (pas de débordement)
    const count = Math.max(1, Math.ceil(w / (h * 2)));
    const triW = w / count;
    let ci = 0;
    for (let i = 0; i < count; i++) {
      const px = x + i * triW;
      g.fillStyle(colors[ci % colors.length], 1);
      g.fillTriangle(px, y, px + triW, y, px + triW / 2, y + h);
      ci++;
    }
    g.lineStyle(2, 0x27272f, 0.25);
    g.lineBetween(x, y + h, x + w, y + h);
  }

  /** Natte secko (paillasson tressé) : base + rayures + trames. */
  static drawSeckoMat(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    const stripeH = h / 9;
    g.fillStyle(0xd9b98a, 1);
    g.fillRoundedRect(x, y, w, h, 18);
    for (let i = 0; i < 9; i++) {
      g.fillStyle(i % 2 === 0 ? 0xc9a56a : 0xd9b98a, 1);
      g.fillRect(x, y + i * stripeH, w, stripeH + 1);
    }
    // trame : petits tirets verticaux
    g.lineStyle(2, 0x8d6e63, 0.3);
    for (let px = x + 10; px < x + w; px += 14) {
      g.lineBetween(px, y + 4, px, y + h - 4);
    }
    g.lineStyle(4, 0x27272f, 1);
    g.strokeRoundedRect(x, y, w, h, 18);
  }

  /** Texte cartoon avec contour épais. */
  static makeText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    fontSize: number,
    color = '#27272f',
  ): Phaser.GameObjects.Text {
    return scene.add
      .text(x, y, text, {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${fontSize}px`,
        color,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
