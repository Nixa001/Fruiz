import { Fruit, MatterBody } from '../entities/Fruit';
import { FRUITS, MAX_TIER_MERGE_BONUS } from '../data/FruitData';
import { FruitExpression } from '../types/GameTypes';
import { FruitEffects } from '../effects/FruitEffects';
import { ScreenEffects } from '../effects/ScreenEffects';
import { ParticleManager } from '../managers/ParticleManager';
import { AudioManager } from '../managers/AudioManager';
import { ScoreManager } from './ScoreManager';
import { ComboManager } from './ComboManager';
import { ComboPopup } from '../ui/ComboPopup';
import type { GameScene } from '../scenes/GameScene';

interface PendingMerge {
  a: Fruit;
  b: Fruit;
}

/** Vitesse minimale (px/step) pour déclencher un impact visuel/sonore. */
const IMPACT_SPEED = 5;

/**
 * Détection et exécution des fusions + réactions aux collisions (impacts).
 * Les fusions en chaîne sont automatiques : le nouveau fruit naît au point
 * de contact et déclenche immédiatement de nouvelles collisions.
 */
export class MergeManager {
  /** Fruit le plus élevé atteint pendant la partie. */
  bestTier = 1;

  private pending: PendingMerge[] = [];

  private scanTimer!: Phaser.Time.TimerEvent;

  constructor(
    private scene: GameScene,
    private score: ScoreManager,
    private combo: ComboManager,
    private popup: ComboPopup,
    private particles: ParticleManager,
    private screens: ScreenEffects,
    private audio: AudioManager,
  ) {
    scene.matter.world.on('collisionstart', this.onCollision, this);
    // Filet de sécurité : scan de proximité périodique — attrape les fusions
    // que les événements de collision auraient manquées (corps endormis, etc.)
    this.scanTimer = scene.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => this.proximityScan(),
    });
  }

  destroy(): void {
    this.scanTimer.remove();
    // matter.world peut déjà être détruit lors du SHUTDOWN de la scène
    this.scene.matter.world?.off('collisionstart', this.onCollision, this);
  }

  private onCollision(_event: unknown, bodyA: MatterBody, bodyB: MatterBody): void {
    const a = bodyA?.plugin?.fruit as Fruit | undefined;
    const b = bodyB?.plugin?.fruit as Fruit | undefined;

    // Réactions d'impact (fruits entre eux ou contre les murs)
    this.handleImpact(bodyA, bodyB, a, b);

    if (!a || !b || a === b) return;
    if (a.isRemoved || b.isRemoved || a.isMerging || b.isMerging) return;
    if (a.def.id !== b.def.id) return;
    if (this.pending.some((p) => p.a === a || p.b === a || p.a === b || p.b === b)) return;
    this.pending.push({ a, b });
  }

  private handleImpact(
    bodyA: MatterBody,
    bodyB: MatterBody,
    a: Fruit | undefined,
    b: Fruit | undefined,
  ): void {
    const now = performance.now();
    const react = (fruit: Fruit | undefined, speed: number): void => {
      if (!fruit || fruit.isRemoved || fruit.isMerging) return;
      if (speed < IMPACT_SPEED) return;
      if (now - fruit.lastImpactAt < 350) return;
      fruit.lastImpactAt = now;
      const dir = fruit.body ? fruit.body.velocity.x : 0;
      FruitEffects.impact(fruit, dir);
      fruit.express(FruitExpression.SURPRISED, 500);
      this.particles.impactDust(fruit.x, fruit.y);
      this.audio.playImpact();
      this.screens.shake(0.004, 90);
    };
    react(a, bodyA.speed);
    react(b, bodyB.speed);
  }

  /** Fusions manquées par les événements : deux fruits de même niveau qui se touchent. */
  private proximityScan(): void {
    const fruits = this.scene.fruits;
    for (let i = 0; i < fruits.length; i++) {
      const a = fruits[i];
      if (a.isRemoved || a.isMerging) continue;
      for (let j = i + 1; j < fruits.length; j++) {
        const b = fruits[j];
        if (b.isRemoved || b.isMerging) continue;
        if (a.def.id !== b.def.id) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const minDist = (a.physicsRadius + b.physicsRadius) * 1.02;
        if (dx * dx + dy * dy < minDist * minDist) {
          if (!this.pending.some((p) => p.a === a || p.b === a || p.a === b || p.b === b)) {
            this.pending.push({ a, b });
          }
        }
      }
    }
  }

  /** À appeler chaque frame : exécute les fusions détectées. */
  update(): void {
    if (this.pending.length === 0) return;
    const jobs = this.pending.splice(0);
    for (const { a, b } of jobs) {
      if (a.isRemoved || b.isRemoved || a.isMerging || b.isMerging) continue;
      this.doMerge(a, b);
    }
  }

  private doMerge(a: Fruit, b: Fruit): void {
    const scene = this.scene;
    const tier = a.def.id;
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    const color = a.def.color;

    a.isMerging = true;
    b.isMerging = true;
    a.removeBody();
    b.removeBody();
    this.bestTier = Math.max(this.bestTier, Math.min(tier + 1, FRUITS.length));

    // Les deux fruits se compressent vers le centre puis disparaissent
    a.express(FruitExpression.MERGING);
    b.express(FruitExpression.MERGING);
    FruitEffects.mergeSquash(scene, a, x, y, () => a.destroy());
    FruitEffects.mergeSquash(scene, b, x, y, () => b.destroy());

    // Flash + particules + shake au moment du "pop"
    scene.time.delayedCall(90, () => {
      this.particles.mergeBurst(x, y, color, tier);
      this.screens.shake(Math.min(0.004 + tier * 0.0025, 0.03), 220 + tier * 8);
      if (tier >= 8) this.screens.flash(0.35, 110);
      this.audio.playMerge(tier);
    });

    scene.time.delayedCall(110, () => {
      const comboN = this.combo.registerMerge();
      if (tier >= FRUITS.length) {
        // Deux pastèques : elles disparaissent, bonus géant
        this.score.addBonus(MAX_TIER_MERGE_BONUS * comboN, x, y);
        this.particles.comboBurst(x, y, 8);
        this.screens.flash(0.5, 200);
        this.audio.playMerge(tier + 2);
      } else {
        const fruit = scene.spawnFruit(tier + 1, x, y);
        // Petit pop vers le haut : la fusion "pousse" le nouveau fruit
        fruit.body.velocity.y = -4;
        FruitEffects.spawnPop(scene, fruit);
        fruit.express(FruitExpression.CELEBRATING, 1400);
        this.score.addMerge(tier + 1, comboN, x, y);
      }
      if (comboN >= 2) {
        this.popup.show(comboN);
        this.audio.playCombo(comboN);
        this.particles.comboBurst(scene.scale.width / 2, 250 * (scene.scale.height / 1280), comboN);
      }
    });
  }
}
