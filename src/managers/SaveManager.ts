/**
 * Persistance localStorage.
 * Prêt à évoluer (coins, unlockedFruits, statistics) sans casser l'existant.
 */
const KEYS = {
  bestScore: 'merge_fruits_best',
  soundEnabled: 'merge_fruits_sound',
  musicEnabled: 'merge_fruits_music',
  unlockedTier: 'merge_fruits_unlocked',
} as const;

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
}
