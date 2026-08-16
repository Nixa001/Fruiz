import Phaser from 'phaser';
import { Fruit } from '../entities/Fruit';
import { FruitExpression } from '../types/GameTypes';

/** Squash & stretch et petites animations appliquées aux fruits. */
export class FruitEffects {
  /** Apparition d'un fruit issu d'une fusion : pop avec rebond. */
  static spawnPop(scene: Phaser.Scene, fruit: Fruit): void {
    const k = scene.scale.height / 1280;
    fruit.setScale(0.3);
    scene.tweens.add({
      targets: fruit,
      scale: 1.12,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: fruit,
          scale: 1,
          duration: 140,
          ease: 'Quad.easeOut',
        });
      },
    });
    // petit saut de joie
    scene.tweens.add({
      targets: fruit,
      y: fruit.y - 26 * k,
      duration: 260,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Écrasement latéral à l'impact (dirX = direction du choc). */
  static impact(fruit: Fruit, dirX: number): void {
    const scene = fruit.scene;
    fruit.setScale(1.3, 0.72);
    scene.tweens.add({
      targets: fruit,
      scaleX: 1,
      scaleY: 1,
      duration: 380,
      ease: 'Elastic.easeOut',
      onComplete: () => {
        fruit.setRotation(0);
      },
    });
    // léger penchant dans le sens du choc
    scene.tweens.add({
      targets: fruit,
      angle: { from: dirX >= 0 ? 8 : -8, to: 0 },
      duration: 300,
      ease: 'Sine.easeOut',
    });
  }

  /** Compression des deux fruits vers le point de fusion. */
  static mergeSquash(
    scene: Phaser.Scene,
    fruit: Fruit,
    tx: number,
    ty: number,
    onComplete: () => void,
  ): void {
    scene.tweens.add({
      targets: fruit,
      x: tx,
      y: ty,
      scale: 0.35,
      duration: 110,
      ease: 'Quad.easeIn',
      onComplete,
    });
  }

  /** Petite célébration : hop + expression. */
  static celebrate(scene: Phaser.Scene, fruit: Fruit): void {
    const k = scene.scale.height / 1280;
    fruit.express(FruitExpression.CELEBRATING, 1500);
    scene.tweens.add({
      targets: fruit,
      y: fruit.y - 20 * k,
      duration: 220,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    });
  }
}
