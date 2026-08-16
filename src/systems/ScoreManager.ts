import Phaser from 'phaser';
import { getFruit } from '../data/FruitData';
import { SaveManager } from '../managers/SaveManager';

/** Score, meilleur score et popups "+N". */
export class ScoreManager {
  score = 0;
  best = 0;

  constructor(private scene: Phaser.Scene) {
    this.best = SaveManager.getBestScore();
  }

  reset(): void {
    this.score = 0;
    this.best = SaveManager.getBestScore();
  }

  /** Points d'une fusion : valeur du fruit créé × multiplicateur combo. */
  addMerge(newTier: number, comboMultiplier: number, x: number, y: number): number {
    const gain = getFruit(newTier).score * comboMultiplier;
    this.score += gain;
    this.best = Math.max(this.best, this.score);
    this.showGain(gain, x, y);
    return gain;
  }

  /** Bonus spécial (fusion de deux pastèques). */
  addBonus(bonus: number, x: number, y: number): number {
    this.score += bonus;
    this.best = Math.max(this.best, this.score);
    this.showGain(bonus, x, y);
    return bonus;
  }

  /** Persiste le meilleur score (fin de partie). */
  submit(): void {
    SaveManager.submitScore(this.score);
  }

  private showGain(gain: number, x: number, y: number): void {
    const k = this.scene.scale.height / 1280;
    const big = gain >= 200;
    const color = gain >= 500 ? '#e53935' : big ? '#ff8f00' : '#27272f';
    const text = this.scene.add
      .text(x, y, `+${gain}`, {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(36 * k * (big ? 1.3 : 1))}px`,
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setStroke('#ffffff', 6 * k);
    this.scene.tweens.add({
      targets: text,
      y: y - 95 * k,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
