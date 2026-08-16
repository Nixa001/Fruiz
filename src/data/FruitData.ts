import { FruitDefinition } from '../types/GameTypes';

/**
 * Les 12 fruits du jeu — identité sénégalaise.
 * Ajouter un fruit = ajouter une définition ici. Rien d'autre à toucher :
 * le système de fusion, le rendu et le score sont génériques.
 */
export const FRUITS: FruitDefinition[] = [
  { id: 1, name: 'Gigibier', radius: 22, color: 0xc94f3d, colorDark: 0x8e2f22, score: 10, shape: 'circle', spawnWeight: 30 },
  { id: 2, name: 'Arachide', radius: 27, color: 0xd9b477, colorDark: 0xa97f45, score: 20, shape: 'peanut', spawnWeight: 24 },
  { id: 3, name: 'Ditakh', radius: 33, color: 0x5d8a2e, colorDark: 0x3f611e, score: 30, shape: 'circle', spawnWeight: 18 },
  { id: 4, name: 'Goyave', radius: 39, color: 0xa4c639, colorDark: 0x6b8e23, score: 40, shape: 'circle', spawnWeight: 12 },
  { id: 5, name: 'Tol', radius: 45, color: 0x43a047, colorDark: 0x2e7031, score: 50, shape: 'circle', spawnWeight: 8 },
  { id: 6, name: 'Made', radius: 52, color: 0xffb300, colorDark: 0xc77700, score: 60, shape: 'made', spawnWeight: 0 },
  { id: 7, name: 'Pomme', radius: 59, color: 0xe53935, colorDark: 0xa62828, score: 80, shape: 'apple', spawnWeight: 0 },
  { id: 8, name: 'Mangue', radius: 67, color: 0xff8f00, colorDark: 0xc25e00, score: 100, shape: 'mango', spawnWeight: 0 },
  { id: 9, name: 'Coco', radius: 75, color: 0x8d6e63, colorDark: 0x5f4439, score: 150, shape: 'circle', spawnWeight: 0 },
  { id: 10, name: 'Papaye', radius: 84, color: 0xff7a45, colorDark: 0xd14e24, score: 200, shape: 'papaya', spawnWeight: 0 },
  { id: 11, name: 'Ananas', radius: 93, color: 0xf6c244, colorDark: 0xc98f1b, score: 300, shape: 'ananas', spawnWeight: 0 },
  { id: 12, name: 'Pastèque', radius: 104, color: 0x2f8f46, colorDark: 0x1e6b31, score: 500, shape: 'watermelon', spawnWeight: 0 },
];

/** Fruits pouvant apparaître comme fruit à lancer (tiers 1-5). */
export const SPAWNABLE_TIERS = FRUITS.filter((f) => f.spawnWeight > 0);

/** Score bonus quand deux pastèques fusionnent (elles disparaissent). */
export const MAX_TIER_MERGE_BONUS = 1000;

/** Récupère la définition d'un fruit par son niveau (1-12). */
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
