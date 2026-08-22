import Phaser from 'phaser';
import { FRUITS } from '../data/FruitData';
import { SaveManager } from '../managers/SaveManager';

/**
 * Barre d'évolution en bas de l'écran : les fruits alignés en taille
 * croissante.
 * - Atteint dans la partie en cours : en couleur.
 * - Déjà débloqué au moins une fois (collection persistante) mais pas
 *   encore atteint cette partie : silhouette noire (forme connue).
 * - Jamais débloqué (même en collection) : entièrement masqué derrière
 *   un badge cadenas — impossible de deviner la forme.
 */
export class EvolutionBar {
  private sprites: Phaser.GameObjects.Image[] = [];
  private locks: Phaser.GameObjects.Container[] = [];
  private lastTier = 0;
  /** Tier le plus haut jamais débloqué, toutes parties confondues. */
  private everUnlocked = SaveManager.getUnlockedTier();

  constructor(scene: Phaser.Scene) {
    const k = scene.scale.height / 1280;
    const w = scene.scale.width;
    const y = scene.scale.height - 200 * k;
    const margin = 14 * k;
    const slot = (w - margin * 2) / FRUITS.length;

    // Diamètre affiché cible pour les tiers 1-6 : celui du tier 6 (le plus
    // grand du groupe), pour qu'ils paraissent tous à la même taille.
    const refDef = FRUITS[5];
    const refScale = Math.min(0.32 * k, (slot * 0.9) / (refDef.radius * 2));
    const refDiameter = refDef.radius * 2 * refScale;

    for (let i = 0; i < FRUITS.length; i++) {
      const def = FRUITS[i];
      const x = margin + slot * (i + 0.5);
      // Taille croissante le long de l'évolution (plafonnée à la cellule),
      // sauf pour les tiers 1-6 alignés sur la taille du tier 6
      const scale = def.id <= 6 ? refDiameter / (def.radius * 2) : Math.min(0.32 * k, (slot * 0.9) / (def.radius * 2));
      const diameter = def.radius * 2 * scale;
      // Fruits posés sur la même ligne : le bas repose sur la baseline
      const cy = y - def.radius * scale;
      const img = scene.add.image(x, cy, `fruit_${def.id}`).setScale(scale).setDepth(8);
      this.sprites.push(img);

      // Badge cadenas : rond opaque + icône, ne trahit pas la forme du fruit
      const r = diameter * 0.44;
      const lockC = scene.add.container(x, cy).setDepth(9).setVisible(false);
      const badge = scene.add.graphics();
      badge.fillStyle(0x1c1c22, 1);
      badge.fillCircle(0, 0, r);
      badge.lineStyle(Math.max(2 * k, 1.5), 0x000000, 0.35);
      badge.strokeCircle(0, 0, r);
      lockC.add(badge);
      const icon = scene.add.graphics();
      const s = r * 0.55;
      icon.fillStyle(0xd8d3c4, 1);
      icon.fillRoundedRect(-s * 0.5, -s * 0.05, s, s * 0.75, s * 0.12);
      icon.lineStyle(s * 0.16, 0xd8d3c4, 1);
      icon.beginPath();
      icon.arc(0, -s * 0.05, s * 0.3, Math.PI, 0, false);
      icon.strokePath();
      lockC.add(icon);
      this.locks.push(lockC);
    }
    // Ligne de sol discrète sous les fruits
    const line = scene.add.graphics().setDepth(7);
    line.lineStyle(3 * k, 0x27272f, 0.25);
    line.lineBetween(margin, y + 4 * k, w - margin, y + 4 * k);
    this.lastTier = 0;
  }

  setProgress(bestTier: number): void {
    if (bestTier === this.lastTier) return;
    this.lastTier = bestTier;
    for (let i = 0; i < this.sprites.length; i++) {
      const id = FRUITS[i].id;
      const img = this.sprites[i];
      const lock = this.locks[i];
      if (id <= bestTier) {
        img.setVisible(true).clearTint().setAlpha(1);
        lock.setVisible(false);
      } else if (id <= this.everUnlocked) {
        img.setVisible(true).setTint(0x20202a).setAlpha(0.9);
        lock.setVisible(false);
      } else {
        img.setVisible(false);
        lock.setVisible(true);
      }
    }
  }
}
