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
  1: { dy: 0.1 }, // Jujube (pomme rouge) : tige/feuille en haut
  2: { dy: -0.02 }, // Mûre : quasi centré
  3: { dy: 0.05 }, // Citron vert : reflet en haut, visage un peu plus bas
  4: { dy: 0.12, scale: 0.95 }, // Goyave : forme poire, plus étroit en haut
  5: { dy: 0.06 }, // Pêche : évite le creux du pédoncule en haut
  6: { dy: 0.05 }, // Orange : feuille en haut à droite
  7: { dy: 0.08 }, // Pomme cannelle : tige courte en haut
  8: { dy: 0.08, scale: 0.92 }, // Mangue : ovale, feuille en haut à gauche
  9: { dy: 0.14, scale: 0.92 }, // Pomme : corps plus large en bas
  10: { dy: 0.18, scale: 0.6 }, // Banane : sous l'attache, corps du bouquet
  11: { dy: 0.15 }, // Coco : rond, évite juste les 3 trous naturels en haut
  12: { dy: 0.02 }, // Pastèque : quasi centré
};

export function getFaceConfig(tier: number): FaceConfig {
  return { ...DEFAULT, ...FRUIT_FACE_CONFIG[tier] };
}
