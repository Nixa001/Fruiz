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
  private escKey?: Phaser.Input.Keyboard.Key;

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

    // Bandes tissu wax (identité sénégalaise) en haut et en bas
    const bands = this.add.graphics().setDepth(1);
    UIHelpers.drawWaxBand(bands, 0, 0, w, 26 * k);
    UIHelpers.drawWaxBand(bands, 0, this.scale.height - 26 * k, w, 26 * k);

    this.buildDoodles();
    this.buildLogo();
    this.buildButtons();

    // Échap ferme les panneaux ouverts (desktop)
    const kb = this.input.keyboard;
    if (kb) this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.cameras.main.fadeIn(300, 245, 239, 223);

    // La mascotte réagit au tap
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.mascotFace) return;
      const mascotY = 545 * k;
      if (Math.abs(pointer.x - w / 2) < 150 * k && Math.abs(pointer.y - mascotY) < 150 * k) {
        this.mascotFace.setExpression(FruitExpression.CELEBRATING);
        this.time.delayedCall(1200, () => this.mascotFace?.setExpression(FruitExpression.IDLE));
        audioManager.playMerge(4);
      }
    });
  }

  override update(): void {
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey) && this.panel) {
      this.closePanel();
    }
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

    // Carte logo FRUIZ (ombre indigo décalée, rebond lent)
    const card = this.add.container(w / 2, 200 * k).setDepth(5);
    const g = this.add.graphics();
    g.fillStyle(0x3d599e, 1);
    g.fillRoundedRect(-160 * k + 6 * k, -58 * k + 6 * k, 320 * k, 116 * k, 24 * k);
    g.fillStyle(0xfff9ec, 1);
    g.fillRoundedRect(-160 * k, -58 * k, 320 * k, 116 * k, 24 * k);
    g.lineStyle(4 * k, 0x27272f, 1);
    g.strokeRoundedRect(-160 * k, -58 * k, 320 * k, 116 * k, 24 * k);
    card.add(g);
    const logoText = this.add
      .text(0, 0, 'FRUIZ', {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(76 * k)}px`,
        color: '#c94f3d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#ffffff', 6 * k);
    card.add(logoText);
    this.tweens.add({
      targets: card,
      y: card.y - 14 * k,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Étincelles ambiantes qui montent
    this.add
      .particles(0, 0, 'p_star', {
        x: { min: 0, max: w },
        y: this.scale.height + 12,
        lifespan: 7000,
        speedY: { min: -45, max: -90 },
        speedX: { min: -16, max: 16 },
        scale: { start: 0.5 * k, end: 0 },
        alpha: { start: 0.5, end: 0 },
        frequency: 1600,
        quantity: 1,
        tint: [0xffc53d, 0xffd54f, 0xffecb3],
      })
      .setDepth(2);

    // Mascotte pastèque vivante (grosse, au centre)
    const mascotY = 545 * k;
    const mascot = this.add.container(w / 2, mascotY).setDepth(5);
    const img = this.add.image(0, 0, 'fruit_11').setScale(k * 1.05);
    mascot.add(img);
    this.mascotFace = new FaceController(this, 104, k * 1.05);
    mascot.add(this.mascotFace.root);
    this.tweens.add({
      targets: mascot,
      y: mascotY - 22 * k,
      angle: 4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildButtons(): void {
    const k = this.k;
    const w = this.scale.width;
    const h = this.scale.height;
    // Natte ancrée en bas, au-dessus de la bande wax
    const matW = Math.min(w, 460 * k);
    const matH = 272 * k;
    const matTop = h - 26 * k - matH - 100 * k;
    const mat = this.add.graphics().setDepth(2);
    UIHelpers.drawSeckoMat(mat, w / 2 - matW / 2, matTop, matW, matH);

    const bw = matW - 48 * k;
    const bh = 92 * k;
    const yJouer = matTop + 36 * k + bh / 2;

    const playBtn = UIHelpers.makeButton(
      this,
      {
        x: w / 2,
        y: yJouer,
        width: bw,
        height: bh,
        label: 'JOUER',
        fill: 0xfdc33b,
        radius: 20 * k,
        shadowColor: 0xffc53d,
        icon: 'play',
        iconPosition: 'left',
        fontSize: Math.round(bh * 0.38),
      },
      () => {
        audioManager.playButton();
        this.scene.stop();
        this.scene.start('Game');
      },
    );
    this.tweens.add({
      targets: playBtn,
      scale: 1.03,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const b2w = (bw - 16 * k) / 2;
    const b2h = 86 * k;
    const y2 = yJouer + bh / 2 + 24 * k + b2h / 2;
    const fruitsBtn = UIHelpers.makeButton(
      this,
      {
        x: w / 2 - b2w / 2 - 8 * k,
        y: y2,
        width: b2w,
        height: b2h,
        label: 'FRUITS',
        fill: 0xfff9ec,
        radius: 16 * k,
        shadowColor: 0xc94f3d,
        icon: 'leaf',
        iconPosition: 'top',
        fontSize: Math.round(b2h * 0.3),
      },
      () => {
        audioManager.playButton();
        this.openFruitsPanel();
      },
    );
    const paramsBtn = UIHelpers.makeButton(
      this,
      {
        x: w / 2 + b2w / 2 + 8 * k,
        y: y2,
        width: b2w,
        height: b2h,
        label: 'PARAMÈTRES',
        fill: 0xfff9ec,
        radius: 16 * k,
        shadowColor: 0xc94f3d,
        icon: 'gear',
        iconPosition: 'top',
        fontSize: Math.round(b2h * 0.26),
      },
      () => {
        audioManager.playButton();
        this.openSettingsPanel();
      },
    );

    // Entrée en cascade des boutons
    for (const [i, btn] of [playBtn, fruitsBtn, paramsBtn].entries()) {
      btn.setAlpha(0).setY(btn.y + 40 * k);
      this.tweens.add({
        targets: btn,
        alpha: 1,
        y: btn.y - 40 * k,
        delay: 150 + i * 90,
        duration: 260,
        ease: 'Back.easeOut',
      });
    }
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

    const band = this.add.graphics();
    UIHelpers.drawWaxBand(band, -pw / 2, -ph / 2, pw, 18 * k);
    container.add(band);

    const title = this.add
      .text(0, -ph / 2 + 60 * k, 'LES FRUITS', {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
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
      // Pastille teintée de la couleur du fruit
      const chip = this.add.graphics();
      chip.fillStyle(def.color, 0.3);
      chip.fillRoundedRect(x - cellW * 0.3, y - 34 * k - cellW * 0.3, cellW * 0.6, cellW * 0.6, 14 * k);
      container.add(chip);
      const img = this.add.image(x, y - 34 * k, `fruit_${def.id}`).setScale(k * 0.38);
      container.add(img);
      const name = this.add
        .text(x, y + 26 * k, def.name, {
          fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
          fontSize: `${Math.round(20 * k)}px`,
          color: '#27272f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      container.add(name);
      const pts = this.add
        .text(x, y + 50 * k, `+${def.score}`, {
          fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
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

    const band = this.add.graphics();
    UIHelpers.drawWaxBand(band, -pw / 2, -ph / 2, pw, 18 * k);
    container.add(band);

    const title = this.add
      .text(0, -ph / 2 + 60 * k, 'PARAMÈTRES', {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
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
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
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
