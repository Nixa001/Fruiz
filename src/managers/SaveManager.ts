/**
 * Persistance localStorage.
 * Prêt à évoluer (coins, unlockedFruits, statistics) sans casser l'existant.
 */
const KEYS = {
  bestScore: 'merge_fruits_best',
  soundEnabled: 'merge_fruits_sound',
  musicEnabled: 'merge_fruits_music',
  unlockedTier: 'merge_fruits_unlocked',
  game: 'merge_fruits_game',
  favoriteTier: 'merge_fruits_favorite',
} as const;

/** Fruit favori par défaut (Pomme cannelle) tant que le joueur n'en a pas choisi un. */
const DEFAULT_FAVORITE_TIER = 7;

/** Fruit sauvegardé : position normalisée dans la calebasse ([-1,1] x, [0,1] y). */
export interface SavedFruit {
  tier: number;
  nx: number;
  ny: number;
}

export interface GameSaveState {
  score: number;
  bestTier: number;
  currentTier: number;
  nextTier: number;
  fruits: SavedFruit[];
}

export class SaveManager {
  private static bestScore = -1;
  private static soundEnabled: boolean | null = null;
  private static musicEnabled: boolean | null = null;

  /** localStorage peut être indisponible (mode privé) : ne jamais crasher. */
  private static storage(): Storage | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  static getBestScore(): number {
    if (SaveManager.bestScore === -1) {
      const v = SaveManager.storage()?.getItem(KEYS.bestScore);
      SaveManager.bestScore = v ? parseInt(v, 10) || 0 : 0;
    }
    return SaveManager.bestScore;
  }

  /** Retourne le nouveau best si battu, sinon null. */
  static submitScore(score: number): number | null {
    const best = SaveManager.getBestScore();
    if (score > best) {
      SaveManager.bestScore = score;
      SaveManager.storage()?.setItem(KEYS.bestScore, String(score));
      return score;
    }
    return null;
  }

  static isSoundEnabled(): boolean {
    if (SaveManager.soundEnabled === null) {
      const v = SaveManager.storage()?.getItem(KEYS.soundEnabled);
      SaveManager.soundEnabled = v === null ? true : v === '1';
    }
    return SaveManager.soundEnabled;
  }

  static setSoundEnabled(enabled: boolean): void {
    SaveManager.soundEnabled = enabled;
    SaveManager.storage()?.setItem(KEYS.soundEnabled, enabled ? '1' : '0');
  }

  static isMusicEnabled(): boolean {
    if (SaveManager.musicEnabled === null) {
      const v = SaveManager.storage()?.getItem(KEYS.musicEnabled);
      SaveManager.musicEnabled = v === null ? true : v === '1';
    }
    return SaveManager.musicEnabled;
  }

  static setMusicEnabled(enabled: boolean): void {
    SaveManager.musicEnabled = enabled;
    SaveManager.storage()?.setItem(KEYS.musicEnabled, enabled ? '1' : '0');
  }

  /** Fruit le plus haut déjà débloqué (jamais, persistant). Défaut : 4
   * (les 4 premiers tiers sont spawnables/visibles dès le début). */
  static getUnlockedTier(): number {
    const v = SaveManager.storage()?.getItem(KEYS.unlockedTier);
    return v ? parseInt(v, 10) || 4 : 4;
  }

  static setUnlockedTier(tier: number): void {
    const cur = SaveManager.getUnlockedTier();
    if (tier > cur) {
      SaveManager.storage()?.setItem(KEYS.unlockedTier, String(tier));
    }
  }

  /** Partie en cours sauvegardée (reprise depuis le menu principal). */
  static hasGameSave(): boolean {
    return !!SaveManager.storage()?.getItem(KEYS.game);
  }

  static saveGame(state: GameSaveState): void {
    try {
      SaveManager.storage()?.setItem(KEYS.game, JSON.stringify(state));
    } catch {
      // quota dépassé / stockage indisponible : tant pis, pas de reprise
    }
  }

  static loadGame(): GameSaveState | null {
    const raw = SaveManager.storage()?.getItem(KEYS.game);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GameSaveState;
    } catch {
      return null;
    }
  }

  static clearGame(): void {
    SaveManager.storage()?.removeItem(KEYS.game);
  }

  /** Fruit préféré choisi dans la Collection : déclenche la célébration
   * spéciale "TON PRÉFÉRÉ !" à son déblocage. */
  static getFavoriteTier(): number {
    const v = SaveManager.storage()?.getItem(KEYS.favoriteTier);
    return v ? parseInt(v, 10) || DEFAULT_FAVORITE_TIER : DEFAULT_FAVORITE_TIER;
  }

  static setFavoriteTier(tier: number): void {
    SaveManager.storage()?.setItem(KEYS.favoriteTier, String(tier));
  }
}
