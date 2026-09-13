/** Réglages de gameplay : durées en millisecondes de jeu actif. */
export const GAMEPLAY = {
  joker: { startingCharges: 1, mergesToRecharge: 8 },
  merge: { scanMs: 150, squashMs: 150, revealMs: 360, chainRevealMs: 480 },
  combo: { windowMs: 1100, max: 8, popupHoldMs: 2400 },
  drop: { cooldownMs: 220 },
} as const;
