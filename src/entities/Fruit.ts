import Phaser from 'phaser';
import { getFruit } from '../data/FruitData';
import { FruitDefinition, FruitExpression } from '../types/GameTypes';
import { FaceController } from './FaceController';

/** Sous-ensemble typé de la lib matter-js embarquée dans Phaser (Phaser.Physics.Matter.Matter). */
interface MatterLib {
  Bodies: {
    circle(x: number, y: number, radius: number, options?: MatterJS.IBodyDefinition): MatterJS.BodyType;
    rectangle(
      x: number,
      y: number,
      width: number,
      height: number,
      options?: MatterJS.IChamferableBodyDefinition,
    ): MatterJS.BodyType;
    fromVertices(
      x: number,
      y: number,
      vertexSets: MatterJS.Vector[][],
      options?: MatterJS.IBodyDefinition,
      flagInternal?: boolean,
    ): MatterJS.BodyType | undefined;
  };
  Composite: {
    // engine.world est un World matter-js (sous-classe runtime de Composite) : unknown côté types
    add(composite: unknown, object: MatterJS.BodyType): unknown;
    remove(composite: unknown, object: MatterJS.BodyType): unknown;
  };
}
export const Matter = (Phaser.Physics.Matter as unknown as { Matter: MatterLib }).Matter;
export type MatterBody = MatterJS.BodyType;

export const FRUIT_LABEL = 'fruit';
export const WALL_LABEL = 'wall';
export const FRUIT_CATEGORY = 0x0002;
export const WALL_CATEGORY = 0x0001;

export interface FruitOptions {
  /** Facteur d'échelle (adaptation à la taille d'écran). */
  radiusScale: number;
}

/**
 * Fruit = personnage : corps physique Matter + visage procédural.
 * L'affichage (Container) est désynchronisé du corps physique,
 * ce qui permet squash & stretch et expressions sans toucher à la physique.
 */
export class Fruit extends Phaser.GameObjects.Container {
  readonly def: FruitDefinition;
  override readonly body: MatterBody;
  readonly radiusScale: number;
  readonly physicsRadius: number;
  /** En cours de fusion : ignore les nouvelles collisions. */
  isMerging = false;
  /** Retiré du monde physique (en attente de destruction). */
  isRemoved = false;
  /** Dernier impact visuel (anti-spam). */
  lastImpactAt = 0;

  readonly face: FaceController;
  private sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, tier: number, x: number, y: number, opts: FruitOptions) {
    super(scene, x, y);
    this.def = getFruit(tier);
    this.radiusScale = opts.radiusScale;
    this.physicsRadius = this.def.radius * opts.radiusScale;

    this.body = Matter.Bodies.circle(x, y, this.physicsRadius, {
      friction: 0.4,
      frictionStatic: 0.9,
      restitution: 0.12,
      density: 0.0011,
      frictionAir: 0.012,
      sleepThreshold: 40,
      label: FRUIT_LABEL,
      collisionFilter: { category: FRUIT_CATEGORY, mask: FRUIT_CATEGORY | WALL_CATEGORY, group: 0 },
    });
    // Référence directe vers l'entité (lue dans les événements de collision)
    this.body.plugin = { fruit: this };

    this.sprite = scene.add.image(0, 0, `fruit_${tier}`).setScale(opts.radiusScale);
    this.add(this.sprite);
    this.face = new FaceController(scene, this.def.radius, opts.radiusScale);
    this.add(this.face.root);

    this.setDepth(10);
    scene.add.existing(this);
  }

  /** Synchronise l'affichage avec le corps Matter. */
  override update(): void {
    // !this.body : fruit détruit par la scène mais encore référencé pendant un shutdown
    if (this.isRemoved || !this.body) return;
    this.setPosition(this.body.position.x, this.body.position.y);
    this.setRotation(this.body.angle);
  }

  /** Retire le corps du monde physique (fusion). */
  removeBody(): void {
    if (this.isRemoved) return;
    this.isRemoved = true;
    Matter.Composite.remove(this.scene.matter.world.engine.world, this.body);
  }

  /** Change d'expression. Avec autoMs : retour automatique à IDLE. */
  express(expr: FruitExpression, autoMs?: number): void {
    if (this.isRemoved || !this.active) return;
    this.face.setExpression(expr);
    if (autoMs !== undefined && expr !== FruitExpression.IDLE) {
      this.scene.time.delayedCall(autoMs, () => {
        if (this.active && this.face.expression === expr) {
          this.face.setExpression(FruitExpression.IDLE);
        }
      });
    }
  }

  /** Les yeux suivent un point du monde (prochain fruit, mouvement...). */
  lookAt(worldX: number, worldY: number): void {
    if (this.isRemoved || !this.active) return;
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      this.face.lookAt(0, 0);
      return;
    }
    const s = Math.min(dist / 120, 1);
    this.face.lookAt((dx / dist) * s, (dy / dist) * s);
  }

  /**
   * GameObject.destroy() appellerait this.body.destroy() (API Arcade) :
   * le corps Matter brut n'a pas de destroy, on le détache avant.
   */
  override destroy(fromScene?: boolean): void {
    this.face.destroy();
    (this as unknown as { body: unknown }).body = null;
    super.destroy(fromScene);
  }
}
