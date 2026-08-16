/**
 * Types globaux du jeu.
 */

/** Expressions faciales des fruits. Déclenchées automatiquement par les événements. */
export enum FruitExpression {
  IDLE = 'IDLE',
  HAPPY = 'HAPPY',
  EXCITED = 'EXCITED',
  SURPRISED = 'SURPRISED',
  CONFUSED = 'CONFUSED',
  ANGRY = 'ANGRY',
  SCARED = 'SCARED',
  MERGING = 'MERGING',
  CELEBRATING = 'CELEBRATING',
  GAME_OVER = 'GAME_OVER',
}

/** Formes de base disponibles pour le rendu procédural. */
export type FruitShape =
  | 'circle'
  | 'ellipse'
  | 'peanut'
  | 'apple'
  | 'made'
  | 'mango'
  | 'ananas'
  | 'papaya'
  | 'watermelon';

/** Définition complète d'un fruit. Le système de fusion est 100% générique. */
export interface FruitDefinition {
  /** Niveau de fusion (1 à 12). */
  id: number;
  /** Nom sénégalais affiché. */
  name: string;
  /** Rayon de base en px (à l'échelle de design 720x1280). */
  radius: number;
  /** Couleur principale. */
  color: number;
  /** Couleur d'ombrage / bords (gradient). */
  colorDark: number;
  /** Points gagnés à la création de ce fruit (fusion). */
  score: number;
  /** Forme de rendu procédural. */
  shape: FruitShape;
  /** Poids d'apparition dans la file de spawn (uniquement tiers 1-5). */
  spawnWeight: number;
}

/** Données transmises à la scène Game Over. */
export interface GameOverData {
  score: number;
  best: number;
  /** Fruit le plus élevé atteint pendant la partie. */
  bestTier: number;
}
