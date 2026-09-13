import { GAMEPLAY } from '../data/GameplayBalance';

/**
 * Combo : fusions rapprochées dans une fenêtre de jeu actif configurable (pause exclue).
 * Maximum ×8. Le combo sert de multiplicateur de score.
 */
export class ComboManager {
  static readonly WINDOW_MS = GAMEPLAY.combo.windowMs;
  static readonly MAX_COMBO = GAMEPLAY.combo.max;

  private combo = 0;
  private elapsed = 0;
  private lastMergeTime = -Infinity;

  update(delta: number): void { this.elapsed += delta; }

  /** Enregistre une fusion et retourne le combo courant (1 = pas de combo). */
  registerMerge(): number {
    const now = this.elapsed;
    if (now - this.lastMergeTime <= ComboManager.WINDOW_MS) {
      this.combo = Math.min(this.combo + 1, ComboManager.MAX_COMBO);
    } else {
      this.combo = 1;
    }
    this.lastMergeTime = now;
    return this.combo;
  }

  getCombo(): number {
    return this.combo;
  }

  reset(): void {
    this.combo = 0;
    this.lastMergeTime = -Infinity;
  }
}
