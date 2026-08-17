import Phaser from 'phaser';
import { FruitExpression } from '../types/GameTypes';

interface ExpressionSpec {
  /** Taille des yeux (multiplicateur du rayon). */
  eyeW: number;
  eyeH: number;
  pupilR: number;
  /** Type de bouche. */
  mouth: 'smile' | 'openSmile' | 'o' | 'wavy' | 'frown' | 'grin';
  mouthR: number;
  /** Yeux spéciaux (arcs écrasés, croix...). */
  special: 'none' | 'squeezed' | 'cross';
  /** Sourcils fâchés. */
  angryBrows: boolean;
  /** Bouche décalée en y (frown...). */
  mouthY: number;
}

const EXPRESSIONS: Record<FruitExpression, ExpressionSpec> = {
  [FruitExpression.IDLE]: { eyeW: 0.3, eyeH: 0.4, pupilR: 0.1, mouth: 'smile', mouthR: 0.2, special: 'none', angryBrows: false, mouthY: 0.32 },
  [FruitExpression.HAPPY]: { eyeW: 0.27, eyeH: 0.36, pupilR: 0.1, mouth: 'smile', mouthR: 0.26, special: 'none', angryBrows: false, mouthY: 0.34 },
  [FruitExpression.EXCITED]: { eyeW: 0.34, eyeH: 0.46, pupilR: 0.12, mouth: 'openSmile', mouthR: 0.24, special: 'none', angryBrows: false, mouthY: 0.36 },
  [FruitExpression.SURPRISED]: { eyeW: 0.36, eyeH: 0.46, pupilR: 0.055, mouth: 'o', mouthR: 0.13, special: 'none', angryBrows: false, mouthY: 0.38 },
  [FruitExpression.CONFUSED]: { eyeW: 0.3, eyeH: 0.4, pupilR: 0.09, mouth: 'wavy', mouthR: 0.22, special: 'none', angryBrows: false, mouthY: 0.36 },
  [FruitExpression.ANGRY]: { eyeW: 0.27, eyeH: 0.32, pupilR: 0.085, mouth: 'frown', mouthR: 0.22, special: 'none', angryBrows: true, mouthY: 0.42 },
  [FruitExpression.SCARED]: { eyeW: 0.38, eyeH: 0.46, pupilR: 0.05, mouth: 'wavy', mouthR: 0.26, special: 'none', angryBrows: false, mouthY: 0.42 },
  [FruitExpression.MERGING]: { eyeW: 0, eyeH: 0, pupilR: 0, mouth: 'grin', mouthR: 0.3, special: 'squeezed', angryBrows: false, mouthY: 0.34 },
  [FruitExpression.CELEBRATING]: { eyeW: 0.36, eyeH: 0.46, pupilR: 0.13, mouth: 'openSmile', mouthR: 0.3, special: 'none', angryBrows: false, mouthY: 0.36 },
  [FruitExpression.GAME_OVER]: { eyeW: 0, eyeH: 0, pupilR: 0, mouth: 'frown', mouthR: 0.24, special: 'cross', angryBrows: false, mouthY: 0.44 },
};

const EYE_SPACING = 0.34;
const EYE_Y = -0.14;
const DARK = 0x27272f;

/**
 * Visage procédural d'un fruit : yeux (blanc + pupille + variantes),
 * bouche, expressions, clignements et regard directionnel.
 */
export class FaceController {
  readonly root: Phaser.GameObjects.Container;
  expression = FruitExpression.IDLE;

  private r: number;
  private scene: Phaser.Scene;
  private eyeL!: Phaser.GameObjects.Container;
  private eyeR!: Phaser.GameObjects.Container;
  private whiteL!: Phaser.GameObjects.Graphics;
  private whiteR!: Phaser.GameObjects.Graphics;
  private pupilL!: Phaser.GameObjects.Graphics;
  private pupilR!: Phaser.GameObjects.Graphics;
  private specialL!: Phaser.GameObjects.Graphics;
  private specialR!: Phaser.GameObjects.Graphics;
  private brows!: Phaser.GameObjects.Graphics;
  private mouth!: Phaser.GameObjects.Graphics;
  private lookDX = 0;
  private lookDY = 0;
  private blinkEvent!: Phaser.Time.TimerEvent;
  private glanceEvent!: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, r: number, radiusScale: number) {
    this.scene = scene;
    this.r = r;
    this.root = scene.add.container(0, 0).setScale(radiusScale);

    const makeEye = (sx: number) => {
      const ex = sx * EYE_SPACING * r;
      const eye = scene.add.container(ex, EYE_Y * r);
      const white = scene.add.graphics();
      const pupil = scene.add.graphics();
      const special = scene.add.graphics();
      eye.add([white, pupil, special]);
      this.root.add(eye);
      return { eye, white, pupil, special };
    };
    const l = makeEye(-1);
    const rr = makeEye(1);
    this.eyeL = l.eye;
    this.eyeR = rr.eye;
    this.whiteL = l.white;
    this.whiteR = rr.white;
    this.pupilL = l.pupil;
    this.pupilR = rr.pupil;
    this.specialL = l.special;
    this.specialR = rr.special;

    this.brows = scene.add.graphics();
    this.mouth = scene.add.graphics();
    this.root.add([this.brows, this.mouth]);

    this.setExpression(FruitExpression.IDLE);

    // Clignements et regards furtifs aléatoires (auto-reprogrammés)
    this.blinkEvent = scene.time.delayedCall(2000, () => this.scheduleBlink());
    this.glanceEvent = scene.time.delayedCall(3500, () => this.scheduleGlance());
  }

  private scheduleBlink(): void {
    this.blink();
    this.blinkEvent = this.scene.time.delayedCall(Phaser.Math.Between(1800, 4200), () => this.scheduleBlink());
  }

  private scheduleGlance(): void {
    if (this.expression === FruitExpression.IDLE || this.expression === FruitExpression.HAPPY) {
      this.lookAt(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1));
    }
    this.glanceEvent = this.scene.time.delayedCall(Phaser.Math.Between(2500, 5500), () => this.scheduleGlance());
  }

  /** Change d'expression (redessine yeux + bouche). Sans effet si identique. */
  setExpression(expr: FruitExpression): void {
    if (this.expression === expr) return;
    this.expression = expr;
    const spec = EXPRESSIONS[expr];
    this.drawEye(this.whiteL, this.pupilL, this.specialL, spec, -1);
    this.drawEye(this.whiteR, this.pupilR, this.specialR, spec, 1);
    this.drawBrows(spec);
    this.drawMouth(spec);
  }

  /** Regarde dans une direction (-1..1). */
  lookAt(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy);
    if (len < 0.05) {
      this.lookDX = 0;
      this.lookDY = 0;
    } else {
      const s = Math.min(len, 1);
      this.lookDX = (dx / len) * s;
      this.lookDY = (dy / len) * s;
    }
    this.applyPupilPosition();
  }

  destroy(): void {
    this.blinkEvent.remove();
    this.glanceEvent.remove();
  }

  private blink(): void {
    for (const eye of [this.eyeL, this.eyeR]) {
      this.scene.tweens.add({
        targets: eye,
        scaleY: 0.08,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeIn',
      });
    }
  }

  private applyPupilPosition(): void {
    const off = this.r * 0.09;
    this.pupilL.setPosition(this.lookDX * off, this.lookDY * off);
    this.pupilR.setPosition(this.lookDX * off, this.lookDY * off);
  }

  private drawEye(
    white: Phaser.GameObjects.Graphics,
    pupil: Phaser.GameObjects.Graphics,
    special: Phaser.GameObjects.Graphics,
    spec: ExpressionSpec,
    side: number,
  ): void {
    const ex = side * EYE_SPACING * this.r;
    const ey = EYE_Y * this.r;
    white.clear();
    pupil.clear();
    special.clear();

    if (spec.special === 'squeezed') {
      // Yeux écrasés : ^ ^
      special.lineStyle(this.r * 0.07, DARK, 1);
      special.beginPath();
      special.arc(ex, ey + this.r * 0.04, this.r * 0.16, Math.PI * 1.15, Math.PI * 1.85);
      special.strokePath();
      return;
    }
    if (spec.special === 'cross') {
      // Yeux en croix
      special.lineStyle(this.r * 0.06, DARK, 1);
      const c = this.r * 0.13;
      special.lineBetween(ex - c, ey - c, ex + c, ey + c);
      special.lineBetween(ex - c, ey + c, ex + c, ey - c);
      return;
    }

    const w = spec.eyeW * this.r;
    const h = spec.eyeH * this.r;
    white.fillStyle(0xffffff, 1);
    white.fillEllipse(ex, ey, w, h);
    white.lineStyle(Math.max(this.r * 0.045, 2), DARK, 1);
    white.strokeEllipse(ex, ey, w, h);

    const pr = spec.pupilR * this.r;
    // Pupille noire pleine : pas de point blanc (il se confondait avec un œil)
    pupil.fillStyle(DARK, 1);
    pupil.fillCircle(0, 0, pr);
    this.applyPupilPosition();
  }

  private drawBrows(spec: ExpressionSpec): void {
    this.brows.clear();
    if (!spec.angryBrows) return;
    this.brows.lineStyle(this.r * 0.06, DARK, 1);
    for (const side of [-1, 1]) {
      const bx = side * EYE_SPACING * this.r;
      const by = (EYE_Y - 0.34) * this.r;
      this.brows.lineBetween(bx - this.r * 0.14, by + side * this.r * 0.05, bx + this.r * 0.14, by - side * this.r * 0.05);
    }
  }

  private drawMouth(spec: ExpressionSpec): void {
    const g = this.mouth;
    g.clear();
    const my = spec.mouthY * this.r;
    const mr = spec.mouthR * this.r;
    const lw = Math.max(this.r * 0.055, 2.5);

    switch (spec.mouth) {
      case 'smile':
        g.lineStyle(lw, DARK, 1);
        g.beginPath();
        g.arc(0, my - mr * 0.25, mr, Math.PI * 0.18, Math.PI * 0.82);
        g.strokePath();
        break;
      case 'openSmile':
        g.fillStyle(DARK, 1);
        g.beginPath();
        g.arc(0, my - mr * 0.35, mr, 0, Math.PI);
        g.closePath();
        g.fillPath();
        g.lineStyle(lw, DARK, 1);
        g.beginPath();
        g.arc(0, my - mr * 0.35, mr, 0, Math.PI);
        g.strokePath();
        break;
      case 'o':
        g.fillStyle(DARK, 1);
        g.fillEllipse(0, my, mr * 0.8, mr * 1.05);
        g.lineStyle(lw, DARK, 1);
        g.strokeEllipse(0, my, mr * 0.8, mr * 1.05);
        break;
      case 'wavy':
        g.lineStyle(lw, DARK, 1);
        g.beginPath();
        g.moveTo(-mr, my - this.r * 0.05);
        g.lineTo(-mr * 0.5, my - this.r * 0.2);
        g.lineTo(0, my - this.r * 0.05);
        g.lineTo(mr * 0.5, my + this.r * 0.12);
        g.lineTo(mr, my - this.r * 0.05);
        g.strokePath();
        break;
      case 'frown':
        g.lineStyle(lw, DARK, 1);
        g.beginPath();
        g.arc(0, my + mr * 0.55, mr, Math.PI * 1.2, Math.PI * 1.8);
        g.strokePath();
        break;
      case 'grin':
        g.fillStyle(DARK, 1);
        g.beginPath();
        g.arc(0, my - mr * 0.4, mr, 0, Math.PI);
        g.closePath();
        g.fillPath();
        g.lineStyle(lw, DARK, 1);
        g.beginPath();
        g.arc(0, my - mr * 0.4, mr, 0, Math.PI);
        g.strokePath();
        // dents
        g.fillStyle(0xffffff, 1);
        g.fillRect(-mr * 0.55, my - mr * 0.4, mr * 1.1, mr * 0.16);
        break;
    }
  }
}
