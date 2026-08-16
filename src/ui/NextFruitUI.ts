import Phaser from 'phaser';

/** Carte "NEXT" en haut à droite : le prochain fruit à lancer. */
export class NextFruitUI {
  private sprite!: Phaser.GameObjects.Image;
  private lastTier = 0;

  constructor(private scene: Phaser.Scene) {
    const k = scene.scale.height / 1280;
    const w = scene.scale.width;
    const size = Math.min(118 * k, scene.scale.width * 0.17);
    const x = w - 16 * k;
    const y = 12 * k;

    const g = scene.add.graphics().setDepth(20);
    g.fillStyle(0x000000, 0.15);
    g.fillRoundedRect(x - size + 4 * k, y + 5 * k, size, size, 16 * k);
    g.fillStyle(0xfffdf5, 1);
    g.fillRoundedRect(x - size, y, size, size, 16 * k);
    g.lineStyle(4 * k, 0x27272f, 1);
    g.strokeRoundedRect(x - size, y, size, size, 16 * k);

    scene.add
      .text(x - size / 2, y + 12 * k, 'NEXT', {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(16 * k)}px`,
        color: '#8d6e63',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.sprite = scene.add.image(x - size / 2, y + size * 0.55, 'fruit_1').setScale(k * 0.5).setDepth(21);
  }

  /** Masque le fruit (pendant la chute du fruit courant). */
  hide(): void {
    this.sprite.setVisible(false);
  }

  setTier(tier: number): void {
    if (tier === this.lastTier) {
      this.sprite.setVisible(true);
      return;
    }
    this.lastTier = tier;
    this.sprite.setVisible(true).setTexture(`fruit_${tier}`).setScale(this.scene.scale.height / 1280 * 0.5);
    this.scene.tweens.add({
      targets: this.sprite,
      scale: this.scene.scale.height / 1280 * 0.62,
      duration: 160,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }
}
