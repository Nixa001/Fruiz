import Phaser from 'phaser';
import { UIHelpers } from './UIHelpers';
import { GAMEPLAY } from '../data/GameplayBalance';
import type { JokerManager } from '../systems/JokerManager';

/** Action explicite sous l'évolution, indépendante de la zone de lancer. */
export class JokerButton {
  readonly button: Phaser.GameObjects.Container;
  private hint: Phaser.GameObjects.Text;
  private progress: Phaser.GameObjects.Graphics;
  private lastState = '';
  private k: number;
  private width: number;

  constructor(scene: Phaser.Scene, onUse: () => void) {
    this.k = scene.scale.height / 1280;
    const k = this.k;
    this.width = Math.min(380 * k, scene.scale.width - 32 * k);
    this.button = UIHelpers.makeButton(scene, {
      x: scene.scale.width / 2, y: scene.scale.height - 125 * k,
      width: 88 * k, height: 88 * k, label: '',
      fill: 0xffc43d, shadowColor: 0xc94f3d, radius: 22 * k,
      fontSize: Math.round(29 * k), depth: 25,
      icon: 'restart', iconPosition: 'left', iconColor: 0x543f3a,
    }, onUse).setName('joker-button');
    this.hint = scene.add.text(scene.scale.width / 2, scene.scale.height - 43 * k, '', {
      fontFamily: '"Fredoka", "Trebuchet MS", sans-serif',
      fontSize: `${Math.round(22 * k)}px`, color: '#543f3a', align: 'center',
    }).setOrigin(0.5).setDepth(25);
    this.progress = scene.add.graphics().setDepth(25);
  }

  destroy(): void {
    this.button.scene.tweens.killTweensOf(this.button);
    this.button.destroy();
    this.hint.destroy();
    this.progress.destroy();
  }

  update(joker: JokerManager, canUse: boolean, sameFruit: boolean): void {
    const state = `${joker.ready}:${joker.progress}:${canUse}:${sameFruit}`;
    if (state === this.lastState) return;
    this.lastState = state;
    this.button.setAlpha(joker.ready && canUse && !sameFruit ? 1 : 0.6);
    this.hint.setText(joker.ready
      ? sameFruit ? 'Deux fruits identiques : garde ton échange'
        : 'Échange le fruit en main avec le suivant'
      : `${joker.progress}/${GAMEPLAY.joker.mergesToRecharge} fusions • prochain échange`);
    this.hint.setScale(Math.min(1, (this.width + 20 * this.k) / this.hint.width));
    const w = 88 * this.k * 0.86;
    const x = this.button.x - w / 2;
    const y = this.button.y + 56 * this.k;
    this.progress.clear().fillStyle(0x543f3a, 0.15).fillRoundedRect(x, y, w, 6 * this.k, 3 * this.k);
    const fraction = joker.ready ? 1 : joker.progress / GAMEPLAY.joker.mergesToRecharge;
    if (fraction > 0) this.progress.fillStyle(0x64b638).fillRoundedRect(x, y, w * fraction, 6 * this.k, 3 * this.k);
  }
}
