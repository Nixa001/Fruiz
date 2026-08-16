import Phaser from 'phaser';

/** Point d'entrée : configuration globale, puis chargement des textures. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.stop();
    this.scene.start('Preload');
  }
}
