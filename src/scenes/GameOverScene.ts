import Phaser from 'phaser';
import { GameOverData } from '../types/GameTypes';
import { UIHelpers } from '../ui/UIHelpers';
import { audioManager } from '../managers/AudioManager';
import { ParticleManager } from '../managers/ParticleManager';
import { getFruit } from '../data/FruitData';

/**
 * Écran de game over : panneau animé, score compté, record, fruit le plus haut.
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
    const cy = h / 2;

    const bg = this.add.graphics().setDepth(0);
    UIHelpers.drawNotebookBackground(this, bg, k);

    const particles = new ParticleManager(this);
    const newBest = data.score > 0 && data.score >= data.best;
    if (newBest) particles.comboBurst(cx, cy - 220 * k, 6);

    const panel = this.add.container(cx, cy).setDepth(10);
    panel.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut' });

    const pw = Math.min(w * 0.9, 620 * k);
    const ph = Math.min(h * 0.78, 960 * k);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(-pw / 2 + 8 * k, -ph / 2 + 10 * k, pw, ph, 34 * k);
    g.fillStyle(0xfff9ec, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 34 * k);
    g.lineStyle(7 * k, 0x27272f, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 34 * k);
    panel.add(g);

    const title = UIHelpers.makeText(this, 0, -ph / 2 + 110 * k, 'GAME OVER', 92 * k, '#e53935');
    title.setStroke('#ffffff', 8 * k);
    panel.add(title);

    // Fruit le plus haut atteint
    const bestTier = data.bestTier;
    const fruitImg = this.add.image(0, -ph / 2 + 300 * k, `fruit_${bestTier}`).setScale(k * 0.62);
    panel.add(fruitImg);
    this.tweens.add({
      targets: fruitImg,
      angle: { from: -5, to: 5 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const fruitName = this.add
      .text(0, -ph / 2 + 420 * k, `Meilleur fruit : ${getFruit(bestTier).name}`, {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(28 * k)}px`,
        color: '#27272f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    panel.add(fruitName);

    // Score compté
    const scoreLabel = this.add
      .text(0, -ph / 2 + 500 * k, 'SCORE', {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(26 * k)}px`,
        color: '#8d6e63',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    panel.add(scoreLabel);
    const scoreText = this.add
      .text(0, -ph / 2 + 570 * k, '0', {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(72 * k)}px`,
        color: '#c94f3d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#ffffff', 6 * k);
    panel.add(scoreText);
    this.tweens.addCounter({
      from: 0,
      to: data.score,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => scoreText.setText(String(Math.round(tween.getValue() ?? 0))),
    });

    // Best + badge record
    const bestText = this.add
      .text(0, -ph / 2 + 680 * k, `BEST  ${data.best}`, {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(34 * k)}px`,
        color: '#2f8f46',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    panel.add(bestText);

    if (newBest) {
      const badge = this.add.container(0, -ph / 2 + 770 * k);
      const bgBadge = this.add.graphics();
      bgBadge.fillStyle(0xffd54f, 1);
      bgBadge.fillRoundedRect(-170 * k, -32 * k, 340 * k, 64 * k, 32 * k);
      bgBadge.lineStyle(4 * k, 0x27272f, 1);
      bgBadge.strokeRoundedRect(-170 * k, -32 * k, 340 * k, 64 * k, 32 * k);
      badge.add(bgBadge);
      const badgeText = this.add
        .text(0, 0, '★ NOUVEAU RECORD ★', {
          fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
          fontSize: `${Math.round(26 * k)}px`,
          color: '#27272f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      badge.add(badgeText);
      panel.add(badge);
      this.tweens.add({
        targets: badge,
        angle: { from: -3, to: 3 },
        scale: { from: 1.05, to: 1 },
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Boutons sous le panneau (absolus : input fiable sur mobile)
    const bw = Math.min(340 * k, w * 0.7);
    const bh = 96 * k;
    const btnY1 = cy + ph / 2 + 70 * k;
    UIHelpers.makeButton(
      this,
      { x: cx, y: btnY1, width: bw, height: bh, label: 'REJOUER', fill: 0xffd54f, radius: 24 * k, depth: 15 },
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
        y: btnY1 + bh + 24 * k,
        width: bw,
        height: bh,
        label: 'MENU',
        fill: 0xffecb3,
        radius: 24 * k,
        depth: 15,
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
