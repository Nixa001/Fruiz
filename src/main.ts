import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

// Résolution de référence : portrait mobile 720x1280.
// Le mode RESIZE + layout adaptatif gère toutes les tailles (360x800 → 720x1280).
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f5efdf',
  width: 720,
  height: 1280,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: false,
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
      gravity: { x: 0, y: 1.6 },
      enableSleeping: true,
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene],
});

// Accès global pour les tests automatisés (scripts/smoke.mjs)
(window as unknown as { __game?: Phaser.Game }).__game = game;
