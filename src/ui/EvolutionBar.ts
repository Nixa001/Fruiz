import Phaser from 'phaser';
import { FRUITS } from '../data/FruitData';

/**
 * Barre d'évolution en bas de l'écran : les 12 fruits alignés.
 * Les fruits déjà atteints sont en couleur, les autres estompés.
 */
export class EvolutionBar {
  private sprites: Phaser.GameObjects.Image[] = [];
  private lastTier = 0;

  constructor(private scene: Phaser.Scene) {
    const k = scene.scale.height / 1280;
    const w = scene.scale.width;
    const y = scene.scale.height - 140 * k;
    const margin = 14 * k;
    const slot = (w - margin * 2) / FRUITS.length;

    for (let i = 0; i < FRUITS.length; i++) {
      const def = FRUITS[i];
      const x = margin + slot * (i + 0.5);
      const scale = Math.min(slot * 0.8, 48 * k) / (def.radius * 2);
      const img = scene.add.image(x, y, `fruit_${def.id}`).setScale(scale).setDepth(8);
      this.sprites.push(img);
    }
    this.lastTier = 0;
  }

  /** Met en valeur les fruits atteints (niveau max atteint pendant la partie). */
  setProgress(bestTier: number): void {
    if (bestTier === this.lastTier) return;
    this.lastTier = bestTier;
    for (let i = 0; i < this.sprites.length; i++) {
      this.sprites[i].setAlpha(FRUITS[i].id <= bestTier ? 1 : 0.35);
    }
  }
}
