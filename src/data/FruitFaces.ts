export interface FaceConfig {
  /** Décalage horizontal, fraction du rayon visuel (+ = droite). */
  dx: number;
  /** Décalage vertical, fraction du rayon visuel (+ = bas). */
  dy: number;
  /** Multiplicateur de taille du visage (yeux/bouche). */
  scale: number;
  /** Rotation du visage en radians. */
  rotation: number;
}

const DEFAULT: FaceConfig = { dx: 0, dy: 0, scale: 1, rotation: 0 };

/**
 * Ajustements de position/taille/rotation du visage par fruit, pour bien
 * tomber sur chaque photo réelle (corps asymétrique, fibres, feuilles...).
 * Un tier absent utilise DEFAULT (visage centré, taille normale).
 */
const FRUIT_FACE_CONFIG: Record<number, Partial<FaceConfig>> = {
  1: { dy: -0.04, rotation: -0.12, scale: 0.92 }, // Jujube : ovale incliné
  2: { dy: -0.03 }, // Framboise : légèrement remonté, base large
  3: { dy: -0.02 }, // Mûre : quasi centré
  4: { dy: 0.05 }, // Citron vert : reflet en haut, visage un peu plus bas
  5: { dy: 0.1 }, // Goyave : évite tige/feuille en haut
  6: { dy: 0.06 }, // Pêche : évite le creux du pédoncule en haut
  7: { dy: 0.02 }, // Orange : feuille en haut à droite, quasi centré
  8: { dy: 0.14, scale: 0.92 }, // Pomme rouge : corps plus large en bas
  9: { dy: 0.14, scale: 0.92 }, // Pomme verte : idem
  10: { dx: 0.08, dy: 0.18, rotation: 0.08, scale: 0.5 }, // Banane : sur la banane centrale du bouquet
  11: { dy: 0.15 }, // Coco : rond, évite juste les 3 trous naturels en haut
  12: { dy: 0.02 }, // Pastèque : quasi centré
};

export function getFaceConfig(tier: number): FaceConfig {
  return { ...DEFAULT, ...FRUIT_FACE_CONFIG[tier] };
}
