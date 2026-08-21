import Phaser from 'phaser';
import { DPR } from '../dpr';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/**
 * Particules courte durée, pré-configurées et réutilisées (zéro allocation par effet).
 */
export class ParticleManager {
  private emitters: Emitter[] = [];

  constructor(private scene: Phaser.Scene) {}

  /** Explosion de fusion : points teintés couleur du fruit + étoiles. */
  mergeBurst(x: number, y: number, color: number, tier: number): void {
    const k = this.scene.scale.height / 1280;
    const emitter = this.getEmitter({
      frame: 'p_dot',
      speed: { min: 60 * DPR, max: 300 * DPR },
      angle: { min: 200, max: 340 },
      gravityY: 420 * DPR,
      lifespan: { min: 350, max: 650 },
      scale: { start: 1.1 * k, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [color, 0xffffff, 0xffe082],
    });
    emitter.explode(10 + tier * 2, x, y);
    const stars = this.getEmitter({
      frame: 'p_star',
      speed: { min: 40 * DPR, max: 160 * DPR },
      angle: { min: 180, max: 360 },
      gravityY: 260 * DPR,
      lifespan: 550,
      scale: { start: 0.9 * k, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0xfff176, 0xffffff],
    });
    stars.explode(2 + Math.min(tier, 6), x, y);
  }

  /** Poussière discrète à l'impact. */
  impactDust(x: number, y: number): void {
    const k = this.scene.scale.height / 1280;
    const emitter = this.getEmitter({
      frame: 'p_dot',
      speed: { min: 20 * DPR, max: 90 * DPR },
      angle: { min: 200, max: 340 },
      gravityY: 300 * DPR,
      lifespan: 300,
      scale: { start: 0.6 * k, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xd7ccc8,
    });
    emitter.explode(5, x, y);
  }

  /** Pluie d'étoiles sur un gros combo. */
  comboBurst(x: number, y: number, combo: number): void {
    const k = this.scene.scale.height / 1280;
    const emitter = this.getEmitter({
      frame: 'p_star',
      speed: { min: 120 * DPR, max: 320 * DPR },
      angle: { min: 160, max: 380 },
      gravityY: 380 * DPR,
      lifespan: 700,
      scale: { start: 1.2 * k, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0xffe082, 0xff8f00, 0xe53935, 0xffffff],
    });
    emitter.explode(4 + combo * 2, x, y);
  }

  /** Confettis qui se dispersent tout autour d'un point (déblocage de fruit). */
  radialConfetti(x: number, y: number, count: number, tint?: number[]): void {
    const k = this.scene.scale.height / 1280;
    const emitter = this.getEmitter({
      frame: 'p_confetti',
      speed: { min: 120 * DPR, max: 330 * DPR },
      angle: { min: 0, max: 360 },
      gravityY: 240 * DPR,
      lifespan: { min: 600, max: 1000 },
      scale: { start: 1.1 * k, end: 1.1 * k },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 720 },
      tint: tint ?? [0xffc53d, 0x2d4a8e, 0xc94f3d, 0x2f9e44, 0xfff176],
    });
    emitter.explode(count, x, y);
  }

  /** Confettis de fin de partie. */
  gameOverConfetti(): void {
    const k = this.scene.scale.height / 1280;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const emitter = this.getEmitter({
      frame: 'p_confetti',
      x: { min: 0, max: w },
      y: -20,
      speedY: { min: 120 * DPR, max: 320 * DPR },
      speedX: { min: -60 * DPR, max: 60 * DPR },
      gravityY: 160 * DPR,
      lifespan: { min: 1800, max: 3000 },
      scale: { start: 1.4 * k, end: 1.4 * k },
      alpha: { start: 1, end: 0.9 },
      rotate: { min: 0, max: 720 },
      frequency: 40,
      quantity: 3,
      tint: [0xe53935, 0xffb300, 0x43a047, 0x1e88e5, 0x8e24aa],
    });
    emitter.explode(24, w / 2, h * 0.2);
    this.scene.time.delayedCall(2500, () => emitter.stop());
  }

  destroy(): void {
    for (const e of this.emitters) {
      e.destroy();
    }
    this.emitters = [];
  }

  private getEmitter(config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig): Emitter {
    const emitter = this.scene.add.particles(0, 0, config.frame as string, {
      ...config,
      emitting: false,
    });
    emitter.setDepth(70);
    this.emitters.push(emitter);
    return emitter;
  }
}
