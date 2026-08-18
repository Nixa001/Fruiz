import Phaser from 'phaser';
import { GameOverData } from '../types/GameTypes';
import { UIHelpers } from '../ui/UIHelpers';
import { audioManager } from '../managers/AudioManager';
import { ParticleManager } from '../managers/ParticleManager';
import { ScreenEffects } from '../effects/ScreenEffects';

/**
 * Écran de game over façon "menus & panels" :
 * voile sombre, bandeau wax, carte score, badge record, boutons brutal en cascade.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    const k = this.scale.height / 1280;
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2 - 110 * k;
    const FONT = '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';

    audioManager.attachScene(this);
    if (audioManager.musicEnabled) audioManager.startMusic();

    const bg = this.add.graphics().setDepth(0);
    UIHelpers.drawNotebookBackground(this, bg, k);

    // Voile sombre : détache le pop du fond
    const dim = this.add.rectangle(0, 0, w, h, 0x27272f, 0).setOrigin(0).setDepth(5);
    this.tweens.add({ targets: dim, fillAlpha: 0.55, duration: 320, ease: 'Sine.easeOut' });

    const particles = new ParticleManager(this);
    const newBest = data.score > 0 && data.score >= data.best;

    // Pluie de fruits ambiante derrière le panneau + flash d'entrée
    this.spawnFruitRain(k, w, h);
    new ScreenEffects(this).flash(0.35, 150);
    particles.gameOverConfetti();

    const panel = this.add.container(cx, cy).setDepth(10);
    panel.setScale(0.25).setAlpha(0).setAngle(-3);
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      angle: 0,
      duration: 380,
      ease: 'Back.easeOut',
    });

    const pw = Math.min(w * 0.9, 620 * k);
    const ph = Math.min(h * 0.76, 720 * k);
    const P = ph / 2;
    const g = this.add.graphics();
    g.fillStyle(0x3d599e, 1);
    g.fillRoundedRect(-pw / 2 + 7 * k, -P + 7 * k, pw, ph, 30 * k);
    g.fillStyle(0xfff9ec, 1);
    g.fillRoundedRect(-pw / 2, -P, pw, ph, 30 * k);
    g.lineStyle(5 * k, 0x27272f, 1);
    g.strokeRoundedRect(-pw / 2, -P, pw, ph, 30 * k);
    panel.add(g);

    // Bandeau wax en tête avec GAME OVER
    const headH = 72 * k;
    const headC = this.add.container(0, -P);
    const head = this.add.graphics();
    head.fillStyle(0xf7be36, 1);
    head.fillRect(-pw / 2, 0, pw, headH);
    UIHelpers.drawWaxBand(head, -pw / 2, 0, pw, headH);
    head.lineStyle(4 * k, 0x27272f, 1);
    head.lineBetween(-pw / 2, headH, pw / 2, headH);
    headC.add(head);
    const titleShadow = this.add
      .text(4 * k, headH / 2 + 4 * k, 'GAME OVER', {
        fontFamily: FONT,
        fontSize: `${Math.round(46 * k)}px`,
        color: '#c94f3d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    headC.add(titleShadow);
    const title = this.add
      .text(0, headH / 2, 'GAME OVER', {
        fontFamily: FONT,
        fontSize: `${Math.round(46 * k)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#27272f', 6 * k);
    headC.add(title);
    panel.add(headC);
    headC.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: headC, scale: 1, alpha: 1, delay: 80, duration: 280, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: title,
      angle: { from: -1.5, to: 1.5 },
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Carte score (ombre terracotta) + badge record
    const cardY = -P + 280 * k;
    const cardAbsY = cy + cardY;
    const cardW = Math.min(300 * k, pw * 0.62);
    const cardH = 150 * k;
    const cardC = this.add.container(0, cardY);
    const card = this.add.graphics();
    card.fillStyle(0xc94f3d, 1);
    card.fillRoundedRect(-cardW / 2 + 5 * k, -cardH / 2 + 5 * k, cardW, cardH, 18 * k);
    card.fillStyle(0xffffff, 1);
    card.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18 * k);
    card.lineStyle(4 * k, 0x27272f, 1);
    card.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18 * k);
    cardC.add(card);
    const scoreLabel = this.add
      .text(0, -44 * k, 'SCORE', {
        fontFamily: FONT,
        fontSize: `${Math.round(22 * k)}px`,
        color: '#58413e',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    cardC.add(scoreLabel);
    const scoreText = this.add
      .text(0, -6 * k, '0', {
        fontFamily: FONT,
        fontSize: `${Math.round(64 * k)}px`,
        color: '#c94f3d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    cardC.add(scoreText);
    panel.add(cardC);
    cardC.setScale(0).setAlpha(0);
    this.tweens.add({ targets: cardC, scale: 1, alpha: 1, delay: 240, duration: 320, ease: 'Back.easeOut' });
    this.tweens.addCounter({
      from: 0,
      to: data.score,
      duration: 900,
      delay: 300,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => scoreText.setText(String(Math.round(tween.getValue() ?? 0))),
      onComplete: () => {
        scoreText.setScale(1.35);
        this.tweens.add({ targets: scoreText, scale: 1, duration: 280, ease: 'Back.easeOut' });
        if (newBest) particles.comboBurst(cx, cardAbsY, 7);
      },
    });

    if (newBest) {
      const badgeC = this.add.container(cardW / 2 - 18 * k, -cardH / 2 - 10 * k).setAngle(12).setScale(0);
      const bgBadge = this.add.graphics();
      bgBadge.fillStyle(0xba1a1a, 1);
      bgBadge.fillRoundedRect(-105 * k, -20 * k, 210 * k, 40 * k, 20 * k);
      bgBadge.lineStyle(3 * k, 0x27272f, 1);
      bgBadge.strokeRoundedRect(-105 * k, -20 * k, 210 * k, 40 * k, 20 * k);
      badgeC.add(bgBadge);
      badgeC.add(
        this.add
          .text(0, 0, 'NOUVEAU RECORD', {
            fontFamily: FONT,
            fontSize: `${Math.round(18 * k)}px`,
            color: '#ffffff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      panel.add(badgeC);
      this.tweens.add({ targets: badgeC, scale: 1, delay: 850, duration: 300, ease: 'Back.easeOut' });
    }

    // Pilule BEST
    const pillY = -P + 420 * k;
    const pillC = this.add.container(0, pillY);
    const pill = this.add.graphics();
    pill.fillStyle(0xe0e3e8, 1);
    pill.fillRoundedRect(-140 * k, -22 * k, 280 * k, 44 * k, 22 * k);
    pill.lineStyle(3 * k, 0x27272f, 1);
    pill.strokeRoundedRect(-140 * k, -22 * k, 280 * k, 44 * k, 22 * k);
    pillC.add(pill);
    pillC.add(
      this.add
        .text(0, 0, `BEST : ${data.best}`, {
          fontFamily: FONT,
          fontSize: `${Math.round(26 * k)}px`,
          color: '#58413e',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    panel.add(pillC);
    pillC.setScale(0).setAlpha(0);
    this.tweens.add({ targets: pillC, scale: 1, alpha: 1, delay: 400, duration: 300, ease: 'Back.easeOut' });

    // Gros boutons en bas de la carte
    const bw = Math.min(430 * k, w * 0.82);
    const bh = 88 * k;
    const btnY1 = cy + P - 2 * bh - 20 * k - 16 * k;
    const btnY2 = btnY1 + bh + 20 * k;

    // Halo pulsant derrière REJOUER pour attirer l'œil
    const ring = this.add.graphics().setDepth(14);
    ring.fillStyle(0xfff176, 0.4);
    ring.fillRoundedRect(-bw / 2 - 10 * k, -bh / 2 - 10 * k, bw + 20 * k, bh + 20 * k, 26 * k);
    ring.setPosition(cx, btnY1);
    this.tweens.add({
      targets: ring,
      alpha: 0.08,
      scale: 1.06,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const replayBtn = UIHelpers.makeButton(
      this,
      {
        x: cx,
        y: btnY1,
        width: bw,
        height: bh,
        label: 'REJOUER',
        fill: 0xfdc33b,
        radius: 24 * k,
        depth: 15,
        shadowColor: 0x3d599e,
        icon: 'play',
        iconPosition: 'left',
        fontSize: Math.round(bh * 0.34),
      },
      () => {
        audioManager.playButton();
        this.scene.stop();
        this.scene.start('Game');
      },
    );
    const menuBtn = UIHelpers.makeButton(
      this,
      {
        x: cx,
        y: btnY2,
        width: bw,
        height: bh,
        label: 'MENU',
        fill: 0xe0e3e8,
        radius: 24 * k,
        depth: 15,
        shadowColor: 0x27272f,
        fontSize: Math.round(bh * 0.32),
      },
      () => {
        audioManager.playButton();
        this.scene.stop();
        this.scene.start('Menu');
      },
    );

    // Entrée en cascade des boutons
    for (const [i, btn] of [replayBtn, menuBtn].entries()) {
      btn.setAlpha(0).setY(btn.y + 60 * k);
      this.tweens.add({
        targets: btn,
        alpha: 1,
        y: btn.y - 60 * k,
        delay: 460 + i * 110,
        duration: 340,
        ease: 'Back.easeOut',
      });
    }

    this.cameras.main.fadeIn(250, 245, 239, 223);
  }

  /** Fruits qui tombent en boucle derrière le panneau. */
  private dropFruit(img: Phaser.GameObjects.Image, w: number, h: number): void {
    const startX = Phaser.Math.Between(Math.round(w * 0.08), Math.round(w * 0.92));
    img.setPosition(startX, -80).setAngle(Phaser.Math.Between(-15, 15));
    this.tweens.add({
      targets: img,
      y: h + 100,
      x: startX + Phaser.Math.Between(-70, 70),
      angle: Phaser.Math.Between(-30, 30),
      duration: Phaser.Math.Between(4500, 7500),
      delay: Phaser.Math.Between(0, 1200),
      ease: 'Sine.easeIn',
      onComplete: () => this.dropFruit(img, w, h),
    });
  }

  private spawnFruitRain(k: number, w: number, h: number): void {
    const textures = ['fruit_2', 'fruit_4', 'fruit_6', 'fruit_8', 'fruit_10'];
    for (const tex of textures) {
      const img = this.add.image(0, 0, tex).setDepth(8).setScale(k * 0.5).setAlpha(0.85);
      this.dropFruit(img, w, h);
    }
  }
}
