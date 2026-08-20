import Phaser from 'phaser';
import decomp from 'poly-decomp';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { DPR } from './dpr';

// Décomposition des hulls concaves (Bodies.fromVertices) en morceaux convexes :
// sans ça Matter aplatit les creux (hull convexe forcé) ou, pire, plante le
// placement du corps physique (bug "téléporte à l'origine du monde").
(Phaser.Physics.Matter as unknown as { Matter: { Common: { setDecomp(d: unknown): void } } }).Matter.Common.setDecomp(
  decomp,
);

// Résolution de référence : portrait mobile 720x1280.
// Layout adaptatif gère toutes les tailles (360x800 → 720x1280).
// Mode Scale.NONE + zoom inverse au DPR : le monde tourne en pixels
// physiques (canvas net sur écrans retina), affiché à taille CSS via zoom.
const physWidth = Math.round(window.innerWidth * DPR);
const physHeight = Math.round(window.innerHeight * DPR);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f5efdf',
  width: physWidth,
  height: physHeight,
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: 1 / DPR,
  },
  render: {
    antialias: true,
    roundPixels: false,
    pixelArt: false,
  },
  fps: {
    target: 60,
    smoothStep: true,
  },
  input: {
    activePointers: 2,
  },
  physics: {
    default: 'matter',
    matter: {
      // Valeur écrasée par GameScene.layout() (déjà proportionnelle à scale.height,
      // donc auto-compensée DPR) dès la création de la scène de jeu.
      gravity: { x: 0, y: 1.6 },
      enableSleeping: true,
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene],
});

const handleResize = (): void => {
  const w = Math.round(window.innerWidth * DPR);
  const h = Math.round(window.innerHeight * DPR);
  game.scale.resize(w, h);
};
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

// Accès global pour les tests automatisés (scripts/smoke.mjs)
(window as unknown as { __game?: Phaser.Game }).__game = game;
