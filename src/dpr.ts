/**
 * Densité utilisée pour le canvas initial : rendu net sur écran retina.
 * Scale.FIT conserve ensuite les coordonnées du plateau et adapte sa taille CSS
 * à la fenêtre, sans déplacer les corps physiques lors d'une rotation.
 */
export const DPR = window.devicePixelRatio || 1;
