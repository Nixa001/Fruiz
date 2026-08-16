/**
 * Combo : fusions rapprochées dans une fenêtre de 0,8 s.
 * Maximum ×8. Le combo sert de multiplicateur de score.
 */
export class ComboManager {
  static readonly WINDOW_MS = 800;
  static readonly MAX_COMBO = 8;

  private combo = 0;
  private lastMergeTime = -Infinity;

  /** Enregistre une fusion et retourne le combo courant (1 = pas de combo). */
  registerMerge(): number {
    const now = performance.now();
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
