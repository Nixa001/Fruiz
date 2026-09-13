import { GAMEPLAY } from '../data/GameplayBalance';

export interface JokerState {
  charges: number;
  merges: number;
}

/** Une réserve d'échange ; aucune accumulation de charges ou de monnaie. */
export class JokerManager {
  private charges: number = GAMEPLAY.joker.startingCharges;
  private merges = 0;

  constructor(saved?: JokerState) {
    if (!saved) return; // Sauvegardes antérieures au joker.
    this.charges = saved.charges === 1 ? 1 : 0;
    this.merges = this.charges || !Number.isFinite(saved.merges) ? 0
      : Math.max(0, Math.min(GAMEPLAY.joker.mergesToRecharge - 1, Math.floor(saved.merges)));
  }

  get ready(): boolean { return this.charges === 1; }
  get progress(): number { return this.merges; }

  use(currentTier: number, nextTier: number): boolean {
    if (!this.ready || currentTier === nextTier) return false;
    this.charges = 0;
    this.merges = 0;
    return true;
  }

  /** Une fusion = un cran, même pendant un gros combo. */
  registerMerge(): void {
    if (this.ready) return;
    this.merges++;
    if (this.merges >= GAMEPLAY.joker.mergesToRecharge) {
      this.charges = 1;
      this.merges = 0;
    }
  }

  snapshot(): JokerState { return { charges: this.charges, merges: this.merges }; }
}
