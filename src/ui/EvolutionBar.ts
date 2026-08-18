import Phaser from 'phaser';
import { FRUITS } from '../data/FruitData';

/**
 * Barre d'évolution en bas de l'écran : les fruits alignés en taille
 * croissante. Atteints en couleur, verrouillés en silhouette noire.
 */
export class EvolutionBar {
  private sprites: Phaser.GameObjects.Image[] = [];
  private lastTier = 0;

  constructor(scene: Phaser.Scene) {
    const k = scene.scale.height / 1280;
    const w = scene.scale.width;
    const y = scene.scale.height - 200 * k;
    const margin = 14 * k;
    const slot = (w - margin * 2) / FRUITS.length;

    for (let i = 0; i < FRUITS.length; i++) {
      const def = FRUITS[i];
      const x = margin + slot * (i + 0.5);
      // Taille croissante le long de l'évolution (plafonnée à la cellule)
      const scale = Math.min(0.32 * k, (slot * 0.9) / (def.radius * 2));
      // Fruits posés sur la même ligne : le bas repose sur la baseline
      const img = scene.add.image(x, y - def.radius * scale, `fruit_${def.id}`).setScale(scale).setDepth(8);
      this.sprites.push(img);
    }
    // Ligne de sol discrète sous les fruits
    const line = scene.add.graphics().setDepth(7);
    line.lineStyle(3 * k, 0x27272f, 0.25);
    line.lineBetween(margin, y + 4 * k, w - margin, y + 4 * k);
    this.lastTier = 0;
  }

  /** Fruits atteints en couleur ; les autres en silhouette noire (verrouillés). */
  setProgress(bestTier: number): void {
    if (bestTier === this.lastTier) return;
    this.lastTier = bestTier;
    for (let i = 0; i < this.sprites.length; i++) {
      const img = this.sprites[i];
      if (FRUITS[i].id <= bestTier) {
        img.clearTint();
        img.setAlpha(1);
      } else {
        img.setTint(0x20202a);
        img.setAlpha(0.9);
      }
    }
  }
}
