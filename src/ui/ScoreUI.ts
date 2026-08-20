import Phaser from 'phaser';

/** Carte SCORE / BEST en haut à gauche, scindée par un séparateur vertical. */
export class ScoreUI {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private lastScore = -1;
  private lastBest = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const k = scene.scale.height / 1280;
    const x = 16 * k;
    const y = 40 * k;
    const cardW = Math.min(235 * k, scene.scale.width * 0.34);
    const cardH = 100 * k;
    const splitX = cardW * 0.62;

    const g = scene.add.graphics().setDepth(20);
    g.fillStyle(0xc94f3d, 1);
    g.fillRoundedRect(x + 5 * k, y + 5 * k, cardW, cardH, 18 * k);
    g.fillStyle(0xfffdf5, 1);
    g.fillRoundedRect(x, y, cardW, cardH, 18 * k);
    g.lineStyle(4 * k, 0x27272f, 1);
    g.strokeRoundedRect(x, y, cardW, cardH, 18 * k);
    g.lineStyle(2 * k, 0x27272f, 0.25);
    g.lineBetween(x + splitX, y + 12 * k, x + splitX, y + cardH - 12 * k);

    const labelStyle = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
      fontSize: `${Math.round(size * k)}px`,
      color,
      fontStyle: 'bold',
    });

    const scoreColX = x + splitX / 2;
    const bestColX = x + splitX + (cardW - splitX) / 2;

    scene.add.text(scoreColX, y + 18 * k, 'SCORE', labelStyle(17, '#8d6e63')).setOrigin(0.5, 0).setDepth(21);
    this.scoreText = scene.add
      .text(scoreColX, y + 44 * k, '0', labelStyle(34, '#c94f3d'))
      .setOrigin(0.5, 0)
      .setDepth(21);

    scene.add.text(bestColX, y + 18 * k, 'BEST', labelStyle(15, '#8d6e63')).setOrigin(0.5, 0).setDepth(21);
    this.bestText = scene.add
      .text(bestColX, y + 46 * k, '0', labelStyle(24, '#2f8f46'))
      .setOrigin(0.5, 0)
      .setDepth(21);
  }

  /** Met à jour les valeurs (léger pop quand une valeur change). */
  update(score: number, best: number): void {
    if (score !== this.lastScore) {
      this.lastScore = score;
      this.scoreText.setText(String(score));
      this.scene.tweens.add({
        targets: this.scoreText,
        scale: 1.22,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
    if (best !== this.lastBest) {
      this.lastBest = best;
      this.bestText.setText(String(best));
      this.scene.tweens.add({
        targets: this.bestText,
        scale: 1.22,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }
}
