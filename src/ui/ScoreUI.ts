import Phaser from 'phaser';

/** Carte SCORE / BEST en haut à gauche. */
export class ScoreUI {
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private lastScore = -1;
  private lastBest = -1;

  constructor(private scene: Phaser.Scene) {
    const k = scene.scale.height / 1280;
    const x = 16 * k;
    const y = 12 * k;
    const cardW = Math.min(235 * k, scene.scale.width * 0.34);
    const cardH = 116 * k;

    const g = scene.add.graphics().setDepth(20);
    g.fillStyle(0x000000, 0.15);
    g.fillRoundedRect(x + 4 * k, y + 5 * k, cardW, cardH, 18 * k);
    g.fillStyle(0xfffdf5, 1);
    g.fillRoundedRect(x, y, cardW, cardH, 18 * k);
    g.lineStyle(4 * k, 0x27272f, 1);
    g.strokeRoundedRect(x, y, cardW, cardH, 18 * k);

    const labelStyle = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
      fontSize: `${Math.round(size * k)}px`,
      color,
      fontStyle: 'bold',
    });

    scene.add.text(x + 16 * k, y + 10 * k, 'SCORE', labelStyle(20, '#8d6e63')).setDepth(21);
    this.scoreText = scene.add.text(x + 16 * k, y + 38 * k, '0', labelStyle(40, '#c94f3d')).setDepth(21);
    scene.add.text(x + 16 * k, y + 84 * k, 'BEST', labelStyle(16, '#8d6e63')).setDepth(21);
    this.bestText = scene.add.text(x + cardW - 16 * k, y + 80 * k, '0', labelStyle(26, '#2f8f46')).setOrigin(1, 0).setDepth(21);
  }

  /** Met à jour les valeurs (léger pop quand le score change). */
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
    }
  }
}
