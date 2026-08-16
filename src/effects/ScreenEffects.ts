import Phaser from 'phaser';

/** Screen shake et flash plein écran. */
export class ScreenEffects {
  constructor(private scene: Phaser.Scene) {}

  shake(intensity: number, duration = 250): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  /** Flash lumineux (fusion importante, game over). */
  flash(alpha = 0.55, duration = 130, color = 0xffffff): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const rect = this.scene.add
      .rectangle(w / 2, h / 2, w + 40, h + 40, color, alpha)
      .setDepth(95)
      .setScrollFactor(0);
    this.scene.tweens.add({
      targets: rect,
      alpha: 0,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => rect.destroy(),
    });
  }
}
