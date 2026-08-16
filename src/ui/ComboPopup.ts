import Phaser from 'phaser';

/** Popup "COMBO ×N" : plus le combo est haut, plus l'animation est spectaculaire. */
export class ComboPopup {
  private container?: Phaser.GameObjects.Container;

  private static readonly COLORS = [
    '#ff8f00', // ×2
    '#ff6d00', // ×3
    '#e53935', // ×4
    '#c2185b', // ×5
    '#8e24aa', // ×6
    '#3949ab', // ×7
    '#00897b', // ×8
  ];

  constructor(private scene: Phaser.Scene) {}

  show(combo: number): void {
    if (combo < 2) return;
    const k = this.scene.scale.height / 1280;
    const cx = this.scene.scale.width / 2;
    const y = 250 * k;
    const color = ComboPopup.COLORS[Math.min(combo, 8) - 2];
    const scale = 1 + combo * 0.07;

    this.container?.destroy();
    const text = this.scene.add
      .text(0, 0, `COMBO ×${combo}`, {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(46 * k * (1 + combo * 0.06))}px`,
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#ffffff', 8 * k);

    this.container = this.scene.add.container(cx, y, [text]).setDepth(60).setScale(scale * 0.4);
    this.scene.tweens.add({
      targets: this.container,
      scale,
      duration: 200,
      ease: 'Back.easeOut',
    });
    // secousse énergique sur les gros combos
    if (combo >= 4) {
      this.scene.tweens.add({
        targets: this.container,
        angle: { from: -3 - combo, to: 3 + combo },
        duration: 60,
        yoyo: true,
        repeat: 2,
      });
    }
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      delay: 550,
      duration: 320,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.container?.destroy();
        this.container = undefined;
      },
    });
  }
}
