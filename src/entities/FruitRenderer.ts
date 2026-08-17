import Phaser from 'phaser';
import { FRUITS } from '../data/FruitData';
import { FruitDefinition, FruitShape } from '../types/GameTypes';

const OUTLINE_COLOR = '#27272f';
const OUTLINE_WIDTH = 5;

/**
 * Couche de rendu des fruits — indépendante de la logique de gameplay.
 * Phase 1 : textures procédurales cartoon générées au démarrage (zéro asset externe).
 * Plus tard : charger une texture nommée `fruit_<id>` (PNG/WebP) suffit,
 * generateAllTextures saute alors ce fruit automatiquement.
 */
export class FruitRenderer {
  static textureKey(def: FruitDefinition): string {
    return `fruit_${def.id}`;
  }

  static generateAllTextures(scene: Phaser.Scene): void {
    for (const def of FRUITS) {
      const key = FruitRenderer.textureKey(def);
      if (scene.textures.exists(key)) continue;
      FruitRenderer.generateFruitTexture(scene, def);
    }
  }

  static generateFruitTexture(scene: Phaser.Scene, def: FruitDefinition): void {
    const r = def.radius;
    const extra = FruitRenderer.extraSpace(def.shape, r);
    const size = Math.ceil((r + extra) * 2) + OUTLINE_WIDTH * 2 + 6;
    const canvas = document.createElement('canvas');
    // Résolution 1:1 : le sprite affiché a exactement la taille dessinée.
    // (Un canvas 2x non re-dimensionné rendait les fruits 2x trop grands
    // par rapport à leur cercle de collision.)
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(size / 2, size / 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    FruitRenderer.drawFruit(ctx, def, r);
    scene.textures.addCanvas(FruitRenderer.textureKey(def), canvas);
  }

  private static extraSpace(shape: FruitShape, r: number): number {
    switch (shape) {
      case 'ananas':
        return r * 0.6;
      case 'apple':
        return r * 0.35;
      case 'made':
      case 'mango':
        return r * 0.2;
      default:
        return r * 0.15;
    }
  }

  /**
   * Facteur de dessin du corps : le fruit VISUEL doit tenir exactement
   * dans le cercle de collision (rayon physique = def.radius).
   * Ex : la couronne de l'ananas dépasse de 60% sans correction.
   */
  static bodyScale(shape: FruitShape): number {
    switch (shape) {
      case 'peanut':
        return 0.75;
      case 'apple':
        return 0.84;
      case 'made':
        return 0.97;
      case 'mango':
        return 0.93;
      case 'ananas':
        return 0.78;
      case 'papaya':
        return 0.92;
      default:
        return 1;
    }
  }

  private static drawFruit(ctx: CanvasRenderingContext2D, def: FruitDefinition, r: number): void {
    // Le corps est dessiné dans le rayon physique exact (scale inclus)
    const s = FruitRenderer.bodyScale(def.shape);
    if (s !== 1) ctx.scale(s, s);
    switch (def.shape) {
      case 'peanut':
        FruitRenderer.drawPeanut(ctx, def, r);
        break;
      case 'apple':
        FruitRenderer.drawCircleBase(ctx, def, r);
        FruitRenderer.drawAppleTop(ctx, r);
        break;
      case 'made':
        FruitRenderer.drawMade(ctx, def, r);
        break;
      case 'mango':
        FruitRenderer.drawMango(ctx, def, r);
        break;
      case 'ananas':
        FruitRenderer.drawAnanas(ctx, def, r);
        break;
      case 'papaya':
        FruitRenderer.drawPapaya(ctx, def, r);
        break;
      case 'watermelon':
        FruitRenderer.drawWatermelon(ctx, def, r);
        break;
      default:
        FruitRenderer.drawCircleBase(ctx, def, r);
        FruitRenderer.drawSurfaceDetails(ctx, def, r);
        if (def.id === 4) FruitRenderer.drawGoyaveNubs(ctx, r); // Goyave
        if (def.id === 8) FruitRenderer.drawCocoFiber(ctx, def, r); // Coco
    }
  }

  // ---------- helpers ----------

  private static hexToCss(hex: number, alpha = 1): string {
    const rr = (hex >> 16) & 0xff;
    const gg = (hex >> 8) & 0xff;
    const bb = hex & 0xff;
    return `rgba(${rr},${gg},${bb},${alpha})`;
  }

  /** Éclaircit (amt > 0) ou assombrit (amt < 0) une couleur. */
  private static shade(hex: number, amt: number): string {
    const rr = (hex >> 16) & 0xff;
    const gg = (hex >> 8) & 0xff;
    const bb = hex & 0xff;
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    return `rgb(${Math.round((t - rr) * p + rr)},${Math.round((t - gg) * p + gg)},${Math.round((t - bb) * p + bb)})`;
  }

  private static fillGradient(
    ctx: CanvasRenderingContext2D,
    def: FruitDefinition,
    radius: number,
    cx = 0,
    cy = 0,
  ): void {
    const g = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius * 1.08);
    g.addColorStop(0, FruitRenderer.shade(def.color, 0.38));
    g.addColorStop(0.45, FruitRenderer.hexToCss(def.color));
    g.addColorStop(0.8, FruitRenderer.hexToCss(def.colorDark));
    g.addColorStop(1, FruitRenderer.shade(def.colorDark, -0.18));
    ctx.fillStyle = g;
    ctx.fill();
  }

  private static strokeOutline(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = OUTLINE_COLOR;
    ctx.lineWidth = OUTLINE_WIDTH;
    ctx.stroke();
  }

  // ---------- formes de base ----------

  private static drawCircleBase(
    ctx: CanvasRenderingContext2D,
    def: FruitDefinition,
    r: number,
    cx = 0,
    cy = 0,
    radius = r,
  ): void {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    FruitRenderer.fillGradient(ctx, def, radius, cx, cy);
    FruitRenderer.strokeOutline(ctx);
    // Liseré lumineux discret à l'intérieur du contour (haut-gauche)
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.82, -2.55, -2.15, false);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = radius * 0.07;
    ctx.stroke();
  }

  /** Petits détails de surface par fruit (discrets, pas de blancs). */
  private static drawSurfaceDetails(ctx: CanvasRenderingContext2D, def: FruitDefinition, r: number): void {
    ctx.fillStyle = FruitRenderer.hexToCss(def.colorDark, 0.28);
    switch (def.id) {
      case 1: // Gigibier : petites mouchetures
        for (const [sx, sy] of [[-0.35, -0.15], [0.3, 0.1], [-0.15, 0.35], [0.45, -0.3], [0.05, -0.5]] as [number, number][]) {
          ctx.beginPath();
          ctx.arc(sx * r, sy * r, r * 0.04, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 2: // Soump : reflet latéral
        ctx.beginPath();
        ctx.arc(r * 0.15, -r * 0.1, r * 0.72, -0.7, 0.35, false);
        ctx.strokeStyle = FruitRenderer.shade(def.color, 0.25);
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = r * 0.1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      case 3: // Ditakh : lenticelles
        for (const [sx, sy] of [[-0.3, 0.25], [0.35, 0.3], [-0.4, -0.25]] as [number, number][]) {
          ctx.beginPath();
          ctx.arc(sx * r, sy * r, r * 0.045, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 5: // Tol : point d'attache + pli
        ctx.beginPath();
        ctx.arc(0, -r * 0.82, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, r * 0.15, r * 0.55, -0.5, 0.5, false);
        ctx.strokeStyle = FruitRenderer.hexToCss(def.colorDark, 0.2);
        ctx.lineWidth = r * 0.06;
        ctx.stroke();
        break;
      case 6: // Bouye : taches veloutées
        ctx.fillStyle = FruitRenderer.hexToCss(def.colorDark, 0.15);
        for (const [sx, sy, rx, ry] of [[-0.4, -0.2, 0.25, 0.18], [0.35, 0.3, 0.3, 0.2]] as [number, number, number, number][]) {
          ctx.beginPath();
          ctx.ellipse(sx * r, sy * r, rx * r, ry * r, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 7: // Kola : sillon vertical
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.6);
        ctx.quadraticCurveTo(r * 0.18, 0, 0, r * 0.6);
        ctx.strokeStyle = FruitRenderer.hexToCss(def.colorDark, 0.3);
        ctx.lineWidth = r * 0.06;
        ctx.stroke();
        break;
      case 9: // New : point d'attache
        ctx.beginPath();
        ctx.arc(0, -r * 0.85, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 10: // Karité : couture + attache
        ctx.beginPath();
        ctx.arc(0, -r * 0.82, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -r * 0.1, r * 0.6, -1.1, 1.1, false);
        ctx.strokeStyle = FruitRenderer.hexToCss(def.colorDark, 0.18);
        ctx.lineWidth = r * 0.05;
        ctx.stroke();
        break;
      default:
        break;
    }
  }

  private static drawEllipseBase(
    ctx: CanvasRenderingContext2D,
    def: FruitDefinition,
    rx: number,
    ry: number,
    rot = 0,
  ): void {
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, rx * 0.1, 0, 0, Math.max(rx, ry) * 1.05);
    g.addColorStop(0, FruitRenderer.shade(def.color, 0.35));
    g.addColorStop(0.55, FruitRenderer.hexToCss(def.color));
    g.addColorStop(1, FruitRenderer.hexToCss(def.colorDark));
    ctx.fillStyle = g;
    ctx.fill();
    FruitRenderer.strokeOutline(ctx);
    ctx.restore();
  }

  // ---------- formes spécifiques ----------

  /** Arachide : ellipse + étranglement central. */
  private static drawPeanut(ctx: CanvasRenderingContext2D, def: FruitDefinition, r: number): void {
    const rx = r * 1.32;
    const ry = r * 0.9;
    FruitRenderer.drawEllipseBase(ctx, def, rx, ry);
    ctx.strokeStyle = FruitRenderer.hexToCss(def.colorDark, 0.5);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -ry * 0.72);
    ctx.quadraticCurveTo(-r * 0.22, 0, 0, ry * 0.3);
    ctx.moveTo(0, ry * 0.72);
    ctx.quadraticCurveTo(-r * 0.22, 0, 0, -ry * 0.3);
    ctx.stroke();
  }

  /** Pomme : tige + feuille. */
  private static drawAppleTop(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.strokeStyle = '#6d4c2f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.88);
    ctx.quadraticCurveTo(r * 0.08, -r * 1.05, r * 0.16, -r * 1.18);
    ctx.stroke();
    ctx.save();
    ctx.translate(r * 0.3, -r * 1.02);
    ctx.rotate(-0.7);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.3, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5fa44b';
    ctx.fill();
    FruitRenderer.strokeOutline(ctx);
    ctx.restore();
  }

  /** Made (Saba senegalensis) : goutte pointue vers le bas. */
  private static drawMade(ctx: CanvasRenderingContext2D, def: FruitDefinition, r: number): void {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.02);
    ctx.bezierCurveTo(-r, -r * 0.15, -r * 0.9, r * 0.55, 0, r * 1.02);
    ctx.bezierCurveTo(r * 0.9, r * 0.55, r, -r * 0.15, 0, -r * 1.02);
    ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1);
    g.addColorStop(0, FruitRenderer.shade(def.color, 0.35));
    g.addColorStop(0.55, FruitRenderer.hexToCss(def.color));
    g.addColorStop(1, FruitRenderer.hexToCss(def.colorDark));
    ctx.fillStyle = g;
    ctx.fill();
    FruitRenderer.strokeOutline(ctx);
  }

  /** Mangue : ovale incliné + tige. */
  private static drawMango(ctx: CanvasRenderingContext2D, def: FruitDefinition, r: number): void {
    FruitRenderer.drawEllipseBase(ctx, def, r * 1.05, r * 0.8, -0.45);
    ctx.strokeStyle = '#6d4c2f';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.85);
    ctx.quadraticCurveTo(-r * 0.1, -r * 1.05, r * 0.05, -r * 1.08);
    ctx.stroke();
  }

  /** Ananas : couronne de feuilles + quadrillage. */
  private static drawAnanas(ctx: CanvasRenderingContext2D, def: FruitDefinition, r: number): void {
    // couronne
    ctx.fillStyle = '#3d7a2c';
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      const lx = -r * 0.44 + i * r * 0.22;
      ctx.beginPath();
      ctx.moveTo(lx - r * 0.12, -r * 0.5);
      ctx.lineTo(lx + r * 0.12, -r * 0.5);
      ctx.lineTo(lx, -r * 1.22);
      ctx.closePath();
      ctx.fill();
      FruitRenderer.strokeOutline(ctx);
    }
    // corps
    const cy = r * 0.1;
    const cr = r * 0.9;
    ctx.beginPath();
    ctx.arc(0, cy, cr, 0, Math.PI * 2);
    FruitRenderer.fillGradient(ctx, def, cr, 0, cy);
    // quadrillage
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = FruitRenderer.hexToCss(def.colorDark, 0.3);
    ctx.lineWidth = 2;
    for (let d = -r; d <= r; d += r * 0.22) {
      ctx.beginPath();
      ctx.moveTo(d - r, cy + r);
      ctx.lineTo(d + r, cy - r);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(d - r, cy - r);
      ctx.lineTo(d + r, cy + r);
      ctx.stroke();
    }
    ctx.restore();
    FruitRenderer.strokeOutline(ctx);
  }

  /** Papaye : ovale vertical. */
  private static drawPapaya(ctx: CanvasRenderingContext2D, def: FruitDefinition, r: number): void {
    FruitRenderer.drawEllipseBase(ctx, def, r * 0.86, r * 1.06);
    ctx.beginPath();
    ctx.arc(0, -r * 1.02, r * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = '#6d4c2f';
    ctx.fill();
    ctx.lineWidth = 3;
    FruitRenderer.strokeOutline(ctx);
  }

  /** Pastèque : rayures sombres + tige. */
  private static drawWatermelon(ctx: CanvasRenderingContext2D, def: FruitDefinition, r: number): void {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    FruitRenderer.fillGradient(ctx, def, r);
    // rayures
    ctx.save();
    ctx.clip();
    ctx.fillStyle = FruitRenderer.hexToCss(def.colorDark);
    for (const sx of [-0.58, -0.2, 0.2, 0.58]) {
      ctx.beginPath();
      ctx.moveTo((sx - 0.09) * r, r);
      ctx.bezierCurveTo((sx - 0.2) * r, r * 0.4, (sx - 0.2) * r, -r * 0.4, (sx - 0.09) * r, -r);
      ctx.lineTo((sx + 0.09) * r, -r);
      ctx.bezierCurveTo((sx + 0.2) * r, -r * 0.4, (sx + 0.2) * r, r * 0.4, (sx + 0.09) * r, r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    FruitRenderer.strokeOutline(ctx);
    // tige
    ctx.strokeStyle = '#1e6b31';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.92);
    ctx.quadraticCurveTo(r * 0.3, -r * 1.05, r * 0.15, -r * 1.25);
    ctx.stroke();
  }

  /** Goyave : petits bourgeons au sommet. */
  private static drawGoyaveNubs(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.fillStyle = '#7cb342';
    ctx.lineWidth = 3.5;
    for (const a of [-0.55, 0, 0.55]) {
      ctx.save();
      ctx.translate(Math.sin(a) * r * 0.72, -Math.cos(a) * r * 0.92);
      ctx.rotate(a * 0.9);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.17, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      FruitRenderer.strokeOutline(ctx);
      ctx.restore();
    }
  }

  /** Coco : fibres. */
  private static drawCocoFiber(ctx: CanvasRenderingContext2D, def: FruitDefinition, r: number): void {
    ctx.strokeStyle = FruitRenderer.hexToCss(def.colorDark, 0.35);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.3, r * 0.35, -2, 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.2, r * 0.25, r * 0.3, 0.8, 2.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.15, r * 0.45, r * 0.3, -2.6, -1.2);
    ctx.stroke();
  }
}
