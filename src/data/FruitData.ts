import { FruitDefinition } from '../types/GameTypes';

/**
 * Les 11 fruits du jeu — assets illustrés réels (src/assets/fruit_<id>.png).
 * `color`/`colorDark` servent de teinte de secours (fallback procédural,
 * vignette de déblocage, particules de fusion) et suivent la couleur
 * dominante de chaque image.
 * Ajouter un fruit = ajouter une définition ici. Rien d'autre à toucher :
 * le système de fusion, le rendu et le score sont génériques.
 */
export const FRUITS: FruitDefinition[] = [
  { id: 1, name: 'Jujube', radius: 22, color: 0x8a3b2b, colorDark: 0x5c261c, score: 10, shape: 'circle', spawnWeight: 30 },
  { id: 2, name: 'Framboise', radius: 26, color: 0xc62840, colorDark: 0x8a1a2c, score: 20, shape: 'circle', spawnWeight: 24 },
  { id: 3, name: 'Mûre', radius: 31, color: 0x2d1b4e, colorDark: 0x1c1132, score: 30, shape: 'circle', spawnWeight: 18 },
  { id: 4, name: 'Citron vert', radius: 37, color: 0x9fbf00, colorDark: 0x6c8200, score: 40, shape: 'circle', spawnWeight: 0 },
  { id: 5, name: 'Goyave', radius: 43, color: 0x7cb342, colorDark: 0x4f7a24, score: 50, shape: 'circle', spawnWeight: 0 },
  { id: 6, name: 'Pêche', radius: 50, color: 0xffb300, colorDark: 0xc98400, score: 65, shape: 'circle', spawnWeight: 0 },
  { id: 7, name: 'Orange', radius: 60, color: 0xff9800, colorDark: 0xc26a00, score: 90, shape: 'circle', spawnWeight: 0 },
  { id: 8, name: 'Pomme rouge', radius: 68, color: 0xd32f2f, colorDark: 0x962020, score: 120, shape: 'circle', spawnWeight: 0 },
  { id: 9, name: 'Pomme verte', radius: 76, color: 0x9ccc3c, colorDark: 0x6f9226, score: 160, shape: 'circle', spawnWeight: 0 },
  { id: 10, name: 'Banane', radius: 85, color: 0xf5d327, colorDark: 0xb89a0f, score: 220, shape: 'circle', spawnWeight: 0 },
  { id: 11, name: 'Noix de coco', radius: 94, color: 0x965f1a, colorDark: 0x603c10, score: 320, shape: 'circle', spawnWeight: 0 },
  { id: 12, name: 'Pastèque', radius: 105, color: 0x2f9e44, colorDark: 0x1e6b2e, score: 500, shape: 'watermelon', spawnWeight: 0 },
];

/** Fruits pouvant apparaître comme fruit à lancer (tiers 1-3). */
export const SPAWNABLE_TIERS = FRUITS.filter((f) => f.spawnWeight > 0);

/** Score bonus quand deux pastèques fusionnent (elles disparaissent). */
export const MAX_TIER_MERGE_BONUS = 1000;

/** Récupère la définition d'un fruit par son niveau (1-11). */
export function getFruit(tier: number): FruitDefinition {
  const def = FRUITS.find((f) => f.id === tier);
  if (!def) {
    throw new Error(`Fruit niveau ${tier} introuvable dans FruitData`);
  }
  return def;
}

/** Tire un fruit aléatoire pondéré parmi les tiers jouables. */
export function rollSpawnTier(): number {
  const total = SPAWNABLE_TIERS.reduce((sum, f) => sum + f.spawnWeight, 0);
  let r = Math.random() * total;
  for (const f of SPAWNABLE_TIERS) {
    r -= f.spawnWeight;
    if (r <= 0) return f.id;
  }
  return SPAWNABLE_TIERS[0].id;
}
