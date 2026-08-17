import Phaser from 'phaser';
import { GameOverData } from '../types/GameTypes';
import { UIHelpers } from '../ui/UIHelpers';
import { audioManager } from '../managers/AudioManager';
import { ParticleManager } from '../managers/ParticleManager';

/**
 * Écran de game over façon "menus & panels" :
 * bandeau wax en tête, carte score, badge record, boutons brutal.
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

    const bg = this.add.graphics().setDepth(0);
    UIHelpers.drawNotebookBackground(this, bg, k);

    const particles = new ParticleManager(this);
    const newBest = data.score > 0 && data.score >= data.best;
    if (newBest) particles.comboBurst(cx, cy - 180 * k, 6);

    const panel = this.add.container(cx, cy).setDepth(10);
    panel.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut' });

    const pw = Math.min(w * 0.9, 620 * k);
    const ph = Math.min(h * 0.74, 700 * k);
    const g = this.add.graphics();
    g.fillStyle(0x3d599e, 1);
    g.fillRoundedRect(-pw / 2 + 7 * k, -ph / 2 + 7 * k, pw, ph, 30 * k);
    g.fillStyle(0xfff9ec, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 30 * k);
    g.lineStyle(5 * k, 0x27272f, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 30 * k);
    panel.add(g);

    // Bandeau wax en tête avec GAME OVER
    const headH = 64 * k;
    const head = this.add.graphics();
    head.fillStyle(0xf7be36, 1);
    head.fillRect(-pw / 2, -ph / 2, pw, headH);
    head.lineStyle(1.5 * k, 0xa83728, 0.25);
    for (let px = -pw / 2; px < pw / 2; px += 14 * k) {
      head.lineBetween(px, -ph / 2 + headH, px + 40 * k, -ph / 2);
    }
    head.lineStyle(4 * k, 0x27272f, 1);
    head.lineBetween(-pw / 2, -ph / 2 + headH, pw / 2, -ph / 2 + headH);
    panel.add(head);
    const title = this.add
      .text(0, -ph / 2 + headH / 2, 'GAME OVER', {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(40 * k)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#27272f', 5 * k);
    panel.add(title);
    this.tweens.add({
      targets: title,
      angle: { from: -1.5, to: 1.5 },
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Carte score (ombre terracotta) + badge record
    const P = ph / 2;
    const cardW = Math.min(300 * k, pw * 0.62);
    const cardH = 150 * k;
    const cardY = -P + 260 * k;
    const card = this.add.graphics();
    card.fillStyle(0xc94f3d, 1);
    card.fillRoundedRect(-cardW / 2 + 5 * k, cardY - cardH / 2 + 5 * k, cardW, cardH, 18 * k);
    card.fillStyle(0xffffff, 1);
    card.fillRoundedRect(-cardW / 2, cardY - cardH / 2, cardW, cardH, 18 * k);
    card.lineStyle(4 * k, 0x27272f, 1);
    card.strokeRoundedRect(-cardW / 2, cardY - cardH / 2, cardW, cardH, 18 * k);
    panel.add(card);
    const scoreLabel = this.add
      .text(0, cardY - 44 * k, 'SCORE', {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(20 * k)}px`,
        color: '#58413e',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    panel.add(scoreLabel);
    const scoreText = this.add
      .text(0, cardY - 6 * k, '0', {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(56 * k)}px`,
        color: '#c94f3d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    panel.add(scoreText);
    this.tweens.addCounter({
      from: 0,
      to: data.score,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => scoreText.setText(String(Math.round(tween.getValue() ?? 0))),
    });

    if (newBest) {
      const badge = this.add.container(cardW / 2 - 18 * k, cardY - cardH / 2 - 10 * k).setAngle(12);
      const bgBadge = this.add.graphics();
      bgBadge.fillStyle(0xba1a1a, 1);
      bgBadge.fillRoundedRect(-105 * k, -20 * k, 210 * k, 40 * k, 20 * k);
      bgBadge.lineStyle(3 * k, 0x27272f, 1);
      bgBadge.strokeRoundedRect(-105 * k, -20 * k, 210 * k, 40 * k, 20 * k);
      badge.add(bgBadge);
      badge.add(
        this.add
          .text(0, 0, 'NOUVEAU RECORD', {
            fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
            fontSize: `${Math.round(17 * k)}px`,
            color: '#ffffff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      panel.add(badge);
    }

    // Pilule BEST
    const bestY = -P + 400 * k;
    const pill = this.add.graphics();
    pill.fillStyle(0xe0e3e8, 1);
    pill.fillRoundedRect(-140 * k, bestY - 22 * k, 280 * k, 44 * k, 22 * k);
    pill.lineStyle(3 * k, 0x27272f, 1);
    pill.strokeRoundedRect(-140 * k, bestY - 22 * k, 280 * k, 44 * k, 22 * k);
    panel.add(pill);
    const bestText = this.add
      .text(0, bestY, `BEST : ${data.best}`, {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(24 * k)}px`,
        color: '#58413e',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    panel.add(bestText);

    // Boutons en bas de la carte
    const bw = Math.min(340 * k, w * 0.72);
    const bh = 64 * k;
    const btnY1 = cy + ph / 2 - 104 * k;
    UIHelpers.makeButton(
      this,
      {
        x: cx,
        y: btnY1,
        width: bw,
        height: bh,
        label: 'REJOUER',
        fill: 0xfdc33b,
        radius: 20 * k,
        depth: 15,
        shadowColor: 0x3d599e,
        icon: 'play',
        iconPosition: 'left',
        fontSize: Math.round(bh * 0.36),
      },
      () => {
        audioManager.playButton();
        this.scene.stop();
        this.scene.start('Game');
      },
    );
    UIHelpers.makeButton(
      this,
      {
        x: cx,
        y: btnY1 + bh + 14 * k,
        width: bw,
        height: bh,
        label: 'MENU',
        fill: 0xe0e3e8,
        radius: 20 * k,
        depth: 15,
        shadowColor: 0x27272f,
        fontSize: Math.round(bh * 0.34),
      },
      () => {
        audioManager.playButton();
        this.scene.stop();
        this.scene.start('Menu');
      },
    );

    audioManager.playButton();
    this.cameras.main.fadeIn(250, 245, 239, 223);
  }
}
