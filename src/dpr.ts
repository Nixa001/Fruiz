/**
 * Ratio pixels physiques / pixels CSS de l'écran. Le jeu tourne en mode
 * Scale.NONE + zoom inverse pour un rendu net sur écrans retina/mobile :
 * le monde (positions, physique) est donc en pixels physiques, pas CSS.
 * Les constantes physiques absolues (gravité, vitesses de particules...)
 * doivent être multipliées par DPR pour garder le même ressenti visuel.
 */
export const DPR = window.devicePixelRatio || 1;
