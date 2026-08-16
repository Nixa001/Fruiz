import { FruitDefinition } from '../types/GameTypes';

/**
 * Les 11 fruits du jeu — identité sénégalaise.
 * Couleurs proches du fruit réel, mais diversifiées pour un rendu attrayant.
 * Ajouter un fruit = ajouter une définition ici. Rien d'autre à toucher :
 * le système de fusion, le rendu et le score sont génériques.
 */
export const FRUITS: FruitDefinition[] = [
  { id: 1, name: 'Gigibier', radius: 22, color: 0xd95535, colorDark: 0x9c3620, score: 10, shape: 'circle', spawnWeight: 30 },
  { id: 2, name: 'Soump', radius: 27, color: 0x7e57c2, colorDark: 0x543a8a, score: 20, shape: 'circle', spawnWeight: 24 },
  { id: 3, name: 'Ditakh', radius: 33, color: 0x558b2f, colorDark: 0x3a611d, score: 30, shape: 'circle', spawnWeight: 18 },
  { id: 4, name: 'Goyave', radius: 39, color: 0xcddc39, colorDark: 0x9eaa1c, score: 40, shape: 'circle', spawnWeight: 0 },
  { id: 5, name: 'Tol', radius: 45, color: 0xff9f1c, colorDark: 0xc26a00, score: 50, shape: 'circle', spawnWeight: 0 },
  { id: 6, name: 'Bouye', radius: 59, color: 0x9c8f52, colorDark: 0x6e6432, score: 80, shape: 'circle', spawnWeight: 0 },
  { id: 7, name: 'Kola', radius: 67, color: 0xa0522d, colorDark: 0x70361a, score: 100, shape: 'circle', spawnWeight: 0 },
  { id: 8, name: 'Coco', radius: 75, color: 0x7a5c4e, colorDark: 0x533e34, score: 150, shape: 'circle', spawnWeight: 0 },
  { id: 9, name: 'New', radius: 84, color: 0xdfa83f, colorDark: 0xae7c1f, score: 200, shape: 'circle', spawnWeight: 0 },
  { id: 10, name: 'Karité', radius: 93, color: 0x7fb83a, colorDark: 0x588a24, score: 300, shape: 'circle', spawnWeight: 0 },
  { id: 11, name: 'Pastèque', radius: 104, color: 0x2f9e44, colorDark: 0x1e6b2e, score: 500, shape: 'watermelon', spawnWeight: 0 },
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
