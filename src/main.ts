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

// Le plateau garde ses coordonnées pendant rotation/redimensionnement :
// aucun déplacement des corps Matter, ni reconstruction des menus ouverts.
// Sur téléphone haut, conserver son ratio initial ; ailleurs, cadre portrait 9:16.
const host = document.getElementById('game')!;
const initialWidth = host.clientWidth || window.innerWidth;
const initialHeight = host.clientHeight || window.innerHeight;
const aspect = Math.min(720 / 1280, initialWidth / initialHeight);
const physHeight = Math.round(initialHeight * DPR);
const physWidth = Math.round(physHeight * aspect);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f5efdf',
  width: physWidth,
  height: physHeight,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
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

// Les insets Android peuvent changer la taille du parent sans changer
// immédiatement celle de window (barres système, clavier, mode multifenêtre).
const resizeObserver = new ResizeObserver(() => {
  game.scale.getParentBounds();
  game.scale.refresh();
});
resizeObserver.observe(host);
game.events.once(Phaser.Core.Events.DESTROY, () => resizeObserver.disconnect());

// Accès global pour les tests automatisés (scripts/smoke.mjs)
(window as unknown as { __game?: Phaser.Game }).__game = game;
