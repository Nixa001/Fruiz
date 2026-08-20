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
  { id: 1, name: 'Jujube', radius: 25, color: 0xc02000, colorDark: 0x801500, score: 10, shape: 'circle', spawnWeight: 30 },
  { id: 2, name: 'Mûre', radius: 29, color: 0x2d1b4e, colorDark: 0x1c1132, score: 20, shape: 'circle', spawnWeight: 26 },
  { id: 3, name: 'Citron', radius: 34, color: 0xf0c010, colorDark: 0xa88500, score: 30, shape: 'circle', spawnWeight: 20 },
  { id: 4, name: 'Goyave', radius: 40, color: 0x90b030, colorDark: 0x60751f, score: 40, shape: 'circle', spawnWeight: 6 },
  { id: 5, name: 'Pêche', radius: 43, color: 0xffb300, colorDark: 0xc98400, score: 50, shape: 'circle', spawnWeight: 0 },
  { id: 6, name: 'Orange', radius: 48, color: 0xe05000, colorDark: 0x963500, score: 65, shape: 'circle', spawnWeight: 0 },
  { id: 7, name: 'Pomme cannelle', radius: 55, color: 0xd0e040, colorDark: 0x93a02c, score: 90, shape: 'circle', spawnWeight: 0 },
  { id: 8, name: 'Mangue', radius: 61, color: 0xf0c040, colorDark: 0xb08920, score: 120, shape: 'circle', spawnWeight: 0 },
  { id: 9, name: 'Pomme', radius: 67, color: 0xd32f2f, colorDark: 0x962020, score: 160, shape: 'circle', spawnWeight: 0 },
  { id: 10, name: 'Banane', radius: 74, color: 0xf5d327, colorDark: 0xb89a0f, score: 220, shape: 'circle', spawnWeight: 0 },
  { id: 11, name: 'Noix de coco', radius: 76, color: 0x965f1a, colorDark: 0x603c10, score: 320, shape: 'circle', spawnWeight: 0 },
  { id: 12, name: 'Pastèque', radius: 82, color: 0x2f9e44, colorDark: 0x1e6b2e, score: 500, shape: 'watermelon', spawnWeight: 0 },
];

/** Fruits pouvant apparaître comme fruit à lancer (tiers 1-4). */
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
