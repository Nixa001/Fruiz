import Phaser from 'phaser';
import { UIHelpers } from '../ui/UIHelpers';
import { audioManager } from '../managers/AudioManager';
import { FRUITS } from '../data/FruitData';
import { FaceController } from '../entities/FaceController';
import { FruitExpression } from '../types/GameTypes';

/**
 * Menu principal animé : logo, mascotte vivante, écrans FRUITS et PARAMÈTRES.
 */
export class MenuScene extends Phaser.Scene {
  private k = 1;
  private panel?: Phaser.GameObjects.Container;
  private closeBtn?: Phaser.GameObjects.Container;
  private mascotFace?: FaceController;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.k = this.scale.height / 1280;
    const k = this.k;
    const w = this.scale.width;

    // Déblocage audio au premier geste (mobile)
    this.input.once('pointerdown', () => {
      audioManager.unlock();
      audioManager.startMusic();
    });

    const bg = this.add.graphics().setDepth(0);
    UIHelpers.drawNotebookBackground(this, bg, k);

    this.buildDoodles();
    this.buildLogo();
    this.buildButtons();

    this.cameras.main.fadeIn(300, 245, 239, 223);

    // La mascotte réagit au tap
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.mascotFace) return;
      const mascotY = 760 * k;
      if (Math.abs(pointer.x - w / 2) < 150 * k && Math.abs(pointer.y - mascotY) < 150 * k) {
        this.mascotFace.setExpression(FruitExpression.CELEBRATING);
        this.time.delayedCall(1200, () => this.mascotFace?.setExpression(FruitExpression.IDLE));
        audioManager.playMerge(4);
      }
    });
  }

  private buildDoodles(): void {
    const k = this.k;
    const w = this.scale.width;
    const doodleSpecs: [string, number, number, number][] = [
      ['fruit_2', 0.55, 90 * k, 250 * k],
      ['fruit_5', 0.5, w - 80 * k, 330 * k],
      ['fruit_3', 0.5, 70 * k, 1120 * k],
      ['fruit_6', 0.45, w - 70 * k, 1080 * k],
    ];
    for (const [tex, alpha, x, y] of doodleSpecs) {
      const img = this.add.image(x, y, tex).setScale(k * 0.4).setAlpha(alpha).setDepth(1);
      this.tweens.add({
        targets: img,
        y: y + 14 * k,
        angle: 8,
        duration: 1600 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private buildLogo(): void {
    const k = this.k;
    const w = this.scale.width;

    const title = UIHelpers.makeText(this, w / 2, 160 * k, 'MERGE', 110 * k, '#27272f');
    title.setStroke('#ffffff', 10 * k);
    const title2 = UIHelpers.makeText(this, w / 2, 300 * k, 'FRUITS', 110 * k, '#2f8f46');
    title2.setStroke('#ffffff', 10 * k);
    const sub = UIHelpers.makeText(this, w / 2, 425 * k, '✦ SÉNÉGAL ✦', 52 * k, '#c94f3d');
    sub.setStroke('#ffffff', 7 * k);

    // Titre vivant : balancement arcade
    this.tweens.add({
      targets: [title, title2],
      angle: { from: -1.6, to: 1.6 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Étincelles ambiantes qui montent
    this.add
      .particles(0, 0, 'p_dot', {
        x: { min: 0, max: w },
        y: this.scale.height + 12,
        lifespan: 7000,
        speedY: { min: -45, max: -90 },
        speedX: { min: -16, max: 16 },
        scale: { start: 0.55 * k, end: 0 },
        alpha: { start: 0.35, end: 0 },
        frequency: 480,
        quantity: 2,
        tint: [0xffd54f, 0xffecb3, 0xa5d6a7, 0xffab91],
      })
      .setDepth(2);

    // Mascotte pastèque vivante
    const mascotY = 670 * k;
    const mascot = this.add.container(w / 2, mascotY).setDepth(5);
    const img = this.add.image(0, 0, 'fruit_12').setScale(k);
    mascot.add(img);
    this.mascotFace = new FaceController(this, 104, k);
    mascot.add(this.mascotFace.root);
    this.tweens.add({
      targets: mascot,
      y: mascotY - 36 * k,
      angle: 6,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildButtons(): void {
    const k = this.k;
    const w = this.scale.width;
    const bw = Math.min(340 * k, w * 0.78);
    const bh = 104 * k;
    const y0 = 900 * k;
    const gap = 128 * k;

    const playBtn = UIHelpers.makeButton(
      this,
      { x: w / 2, y: y0, width: bw, height: bh, label: 'JOUER', fill: 0xffd54f, radius: 26 * k },
      () => {
        audioManager.playButton();
        this.scene.stop();
        this.scene.start('Game');
      },
    );
    // Le bouton JOUER attire l'œil : pulsation douce
    this.tweens.add({
      targets: playBtn,
      scale: 1.045,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    UIHelpers.makeButton(
      this,
      { x: w / 2, y: y0 + gap, width: bw, height: bh, label: 'FRUITS', fill: 0xa5d6a7, radius: 26 * k },
      () => {
        audioManager.playButton();
        this.openFruitsPanel();
      },
    );
    UIHelpers.makeButton(
      this,
      { x: w / 2, y: y0 + gap * 2, width: bw, height: bh, label: 'PARAMÈTRES', fill: 0xffecb3, radius: 26 * k },
      () => {
        audioManager.playButton();
        this.openSettingsPanel();
      },
    );
  }

  // ---------- écran FRUITS ----------

  private openFruitsPanel(): void {
    this.closePanel();
    const k = this.k;
    const w = this.scale.width;
    const h = this.scale.height;
    const pw = w * 0.94;
    const ph = h * 0.76;
    const cx = w / 2;
    const cy = h / 2;

    const container = this.add.container(cx, cy).setDepth(50);
    this.panel = container;
    container.setScale(0.6);
    this.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Back.easeOut' });

    const dim = this.add.rectangle(0, 0, w, h, 0x27272f, 0.45).setInteractive();
    dim.on('pointerdown', () => this.closePanel());
    container.add(dim);

    const g = this.add.graphics();
    g.fillStyle(0xfff9ec, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 30 * k);
    g.lineStyle(6 * k, 0x27272f, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 30 * k);
    container.add(g);

    const title = this.add
      .text(0, -ph / 2 + 60 * k, 'LES FRUITS', {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(44 * k)}px`,
        color: '#2f8f46',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#ffffff', 5 * k);
    container.add(title);

    const cols = 4;
    const rows = 3;
    const cellW = pw / cols;
    const cellH = (ph - 130 * k) / rows;
    FRUITS.forEach((def, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = -pw / 2 + cellW * (col + 0.5);
      const y = -ph / 2 + 130 * k + cellH * (row + 0.5);
      const img = this.add.image(x, y - 34 * k, `fruit_${def.id}`).setScale(k * 0.38);
      container.add(img);
      const name = this.add
        .text(x, y + 26 * k, def.name, {
          fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
          fontSize: `${Math.round(20 * k)}px`,
          color: '#27272f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      container.add(name);
      const pts = this.add
        .text(x, y + 50 * k, `+${def.score}`, {
          fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
          fontSize: `${Math.round(17 * k)}px`,
          color: '#8d6e63',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      container.add(pts);
    });

    // Bouton fermer (détruit à la fermeture pour ne pas bloquer les clics)
    this.closeBtn = UIHelpers.makeButton(
      this,
      {
        x: cx,
        y: cy + ph / 2 + 70 * k,
        width: 200 * k,
        height: 80 * k,
        label: 'FERMER',
        fill: 0xffd54f,
        radius: 20 * k,
        depth: 55,
        fontSize: Math.round(30 * k),
      },
      () => {
        audioManager.playButton();
        this.closePanel();
      },
    );
  }

  // ---------- écran PARAMÈTRES ----------

  private openSettingsPanel(): void {
    this.closePanel();
    const k = this.k;
    const w = this.scale.width;
    const h = this.scale.height;
    const pw = w * 0.88;
    const ph = h * 0.5;
    const cx = w / 2;
    const cy = h / 2;

    const container = this.add.container(cx, cy).setDepth(50);
    this.panel = container;
    container.setScale(0.6);
    this.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Back.easeOut' });

    const dim = this.add.rectangle(0, 0, w, h, 0x27272f, 0.45).setInteractive();
    dim.on('pointerdown', () => this.closePanel());
    container.add(dim);

    const g = this.add.graphics();
    g.fillStyle(0xfff9ec, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 30 * k);
    g.lineStyle(6 * k, 0x27272f, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 30 * k);
    container.add(g);

    const title = this.add
      .text(0, -ph / 2 + 60 * k, 'PARAMÈTRES', {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(42 * k)}px`,
        color: '#27272f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#ffffff', 5 * k);
    container.add(title);

    this.buildToggle(container, -ph / 2 + 170 * k, 'SON', audioManager.soundEnabled, (v) =>
      audioManager.setSoundEnabled(v),
    );
    this.buildToggle(container, -ph / 2 + 280 * k, 'MUSIQUE', audioManager.musicEnabled, (v) =>
      audioManager.setMusicEnabled(v),
    );

    this.closeBtn = UIHelpers.makeButton(
      this,
      {
        x: cx,
        y: cy + ph / 2 + 70 * k,
        width: 200 * k,
        height: 80 * k,
        label: 'FERMER',
        fill: 0xffd54f,
        radius: 20 * k,
        depth: 55,
        fontSize: Math.round(30 * k),
      },
      () => {
        audioManager.playButton();
        this.closePanel();
      },
    );
  }

  private buildToggle(
    parent: Phaser.GameObjects.Container,
    y: number,
    label: string,
    initial: boolean,
    onChange: (value: boolean) => void,
  ): void {
    const k = this.k;
    let value = initial;

    const zone = this.add.zone(0, y, 420 * k, 90 * k).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      value = !value;
      onChange(value);
      audioManager.playButton();
      this.drawToggle(state, y, value);
    });
    parent.add(zone);

    const labelText = this.add
      .text(-180 * k, y, label, {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(34 * k)}px`,
        color: '#27272f',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    parent.add(labelText);

    const state = this.add.graphics();
    this.drawToggle(state, y, value);
    parent.add(state);
  }

  private drawToggle(g: Phaser.GameObjects.Graphics, y: number, value: boolean): void {
    const k = this.k;
    const x = 120 * k;
    g.clear();
    g.fillStyle(value ? 0x66bb6a : 0xbdbdbd, 1);
    g.fillRoundedRect(x, y - 38 * k, 120 * k, 76 * k, 38 * k);
    g.lineStyle(4 * k, 0x27272f, 1);
    g.strokeRoundedRect(x, y - 38 * k, 120 * k, 76 * k, 38 * k);
    // pastille
    const px = value ? x + 84 * k : x + 36 * k;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(px, y, 28 * k);
    g.lineStyle(3 * k, 0x27272f, 1);
    g.strokeCircle(px, y, 28 * k);
  }

  private closePanel(): void {
    this.closeBtn?.destroy();
    this.closeBtn = undefined;
    if (!this.panel) return;
    const panel = this.panel;
    this.panel = undefined;
    this.tweens.add({
      targets: panel,
      scale: 0.6,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => panel.destroy(),
    });
  }
}
