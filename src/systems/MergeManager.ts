import { Fruit, MatterBody } from '../entities/Fruit';
import { FRUITS, MAX_TIER_MERGE_BONUS, getFruit } from '../data/FruitData';
import { FruitExpression } from '../types/GameTypes';
import { FruitEffects } from '../effects/FruitEffects';
import { ScreenEffects } from '../effects/ScreenEffects';
import { ParticleManager } from '../managers/ParticleManager';
import { AudioManager } from '../managers/AudioManager';
import { ScoreManager } from './ScoreManager';
import { ComboManager } from './ComboManager';
import { ComboPopup } from '../ui/ComboPopup';
import { UIHelpers } from '../ui/UIHelpers';
import { audioManager } from '../managers/AudioManager';
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
  /** Fruit le plus élevé atteint pendant la partie (les 3 premiers sont débloqués d'office). */
  bestTier = 3;

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
    if (this.scene.paused) return;
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
    // Déblocage : première apparition d'un fruit de niveau ≥ 4
    const newTier = Math.min(tier + 1, FRUITS.length);
    const isUnlock = newTier >= 4 && newTier > this.bestTier;
    this.bestTier = Math.max(this.bestTier, newTier);

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
        fruit.body.velocity.y = -3;
        FruitEffects.spawnPop(scene, fruit);
        fruit.express(FruitExpression.CELEBRATING, 1400);
        this.score.addMerge(tier + 1, comboN, x, y);
      }
      if (comboN >= 2) {
        this.popup.show(comboN);
        this.audio.playCombo(comboN);
        this.particles.comboBurst(scene.scale.width / 2, 250 * (scene.scale.height / 1280), comboN);
      }
      // Animation de déblocage (première fois qu'on atteint un fruit ≥ 4)
      if (isUnlock && tier < FRUITS.length) {
        this.unlockCelebration(x, y, newTier);
      }
    });
  }

  /** Célébration "DÉBLOQUÉ !" : panneau terracotta, fruit dans une pastille, bouton SUPER. */
  private unlockCelebration(x: number, y: number, tier: number): void {
    const scene = this.scene;
    const k = scene.scale.height / 1280;
    const def = getFruit(tier);
    const cx = scene.scale.width / 2;
    const cy = scene.scale.height / 2;
    this.screens.flash(0.55, 220);
    this.screens.shake(0.025, 350);
    this.audio.playCombo(6);
    this.particles.radialConfetti(cx, cy - 30 * k, 16);
    this.particles.comboBurst(x, y, 8);

    const panel = scene.add.container(cx, cy).setDepth(60).setScale(0.4);
    const g = scene.add.graphics();
    g.fillStyle(0xffc53d, 1);
    g.fillRoundedRect(-215 * k + 7 * k, -185 * k + 7 * k, 430 * k, 370 * k, 28 * k);
    g.fillStyle(0xc94f3d, 1);
    g.fillRoundedRect(-215 * k, -185 * k, 430 * k, 370 * k, 28 * k);
    g.lineStyle(5 * k, 0x27272f, 1);
    g.strokeRoundedRect(-215 * k, -185 * k, 430 * k, 370 * k, 28 * k);
    const dots = [0xffc53d, 0x4ade80, 0x2d4a8e, 0xfff176];
    for (let i = 0; i < 14; i++) {
      const dx = -190 * k + ((i * 97 * k) % (380 * k));
      const dy = -160 * k + ((i * 61 * k) % (320 * k));
      g.fillStyle(dots[i % dots.length], 0.5);
      g.fillCircle(dx, dy, 5 * k);
    }
    panel.add(g);

    // Pastille blanche avec le fruit qui rebondit
    const circle = scene.add.container(0, -72 * k);
    const cg = scene.add.graphics();
    cg.fillStyle(0x27272f, 1);
    cg.fillCircle(4 * k, 4 * k, 62 * k);
    cg.fillStyle(0xfffdf5, 1);
    cg.fillCircle(0, 0, 62 * k);
    cg.lineStyle(4 * k, 0x27272f, 1);
    cg.strokeCircle(0, 0, 62 * k);
    circle.add(cg);
    circle.add(scene.add.image(0, 0, `fruit_${def.id}`).setScale(k * 0.42));
    panel.add(circle);
    scene.tweens.add({
      targets: circle,
      y: circle.y - 10 * k,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const title = scene.add
      .text(0, 20 * k, 'DÉBLOQUÉ !', {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(54 * k)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#27272f', 6 * k);
    panel.add(title);
    const sub = scene.add
      .text(0, 82 * k, `Nouvel Ami Fruit : ${def.name}`, {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(26 * k)}px`,
        color: '#ffdad4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    panel.add(sub);

    // Bouton SUPER (ferme le popup)
    const superBtn = UIHelpers.makeButton(
      scene,
      {
        x: cx,
        y: cy + 128 * k,
        width: 240 * k,
        height: 76 * k,
        label: 'SUPER',
        fill: 0xfdc33b,
        radius: 18 * k,
        depth: 62,
        shadowColor: 0x27272f,
        fontSize: Math.round(76 * k * 0.34),
      },
      () => {
        audioManager.playButton();
        panel.destroy();
        superBtn.destroy();
      },
    );
    superBtn.setVisible(false);

    scene.tweens.add({
      targets: panel,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => superBtn.setVisible(true),
    });
    // Disparition automatique après 2,2 s
    scene.time.delayedCall(2200, () => {
      panel.destroy();
      superBtn.destroy();
    });
  }
}
