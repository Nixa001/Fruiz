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
}

/** Helpers UI cartoon partagés entre les scènes. */
export class UIHelpers {
  /** Fond "feuille quadrillée de cahier" (identité du jeu). */
  static drawNotebookBackground(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, scaleK: number): void {
    g.clear();
    const w = scene.scale.width;
    const h = scene.scale.height;
    g.fillStyle(0xf5efdf, 1);
    g.fillRect(0, 0, w, h);
    const step = 44 * scaleK;
    g.lineStyle(1, 0x000000, 0.05);
    for (let x = step; x < w; x += step) {
      g.lineBetween(x, 0, x, h);
    }
    for (let y = step; y < h; y += step) {
      g.lineBetween(0, y, w, y);
    }
    // marge rouge façon cahier
    g.lineStyle(2, 0xe57373, 0.22);
    g.lineBetween(54 * scaleK, 0, 54 * scaleK, h);
  }

  /** Bouton cartoon : ombre portée, contour épais, rebond au tap. */
  static makeButton(scene: Phaser.Scene, opts: ButtonOptions, onClick: () => void): Phaser.GameObjects.Container {
    const { x, y, width, height, label, fill, radius = 20 } = opts;
    const depth = opts.depth ?? 10;
    const fontSize = opts.fontSize ?? Math.round(height * 0.42);
    const container = scene.add.container(x, y).setDepth(depth);

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.18);
    shadow.fillRoundedRect(-width / 2 + 5, -height / 2 + 7, width, height, radius);
    container.add(shadow);

    const body = scene.add.graphics();
    body.fillStyle(fill, 1);
    body.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    body.lineStyle(5, 0x27272f, 1);
    body.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
    body.fillStyle(0xffffff, 0.25);
    body.fillRoundedRect(-width / 2 + 8, -height / 2 + 6, width - 16, height * 0.32, radius * 0.6);
    container.add(body);

    const text = scene.add
      .text(0, 2, label, {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${fontSize}px`,
        color: opts.textColor ?? '#27272f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(text);

    const zone = scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      scene.tweens.add({ targets: container, scale: 0.92, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
      onClick();
    });
    container.add(zone);
    return container;
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
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${fontSize}px`,
        color,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
