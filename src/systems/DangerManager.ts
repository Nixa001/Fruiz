import { Fruit } from '../entities/Fruit';
import type { GameScene } from '../scenes/GameScene';

/**
 * Règle de fin façon Ball Guys : pas de ligne de remplissage.
 * Game over immédiat si un fruit S'ÉCHAPPE de la calebasse :
 * - il sort de la silhouette du bol en dessous du rebord (rebond dehors)
 * - ou il tombe hors de l'écran
 */
export class DangerManager {
  private triggered = false;

  constructor(
    private scene: GameScene,
    private onGameOver: () => void,
  ) {}

  reset(): void {
    this.triggered = false;
  }

  update(fruits: Fruit[]): void {
    if (this.triggered) return;
    const cx = this.scene.cx;
    const rimTop = this.scene.containerTop;
    // Silhouette du bol : demi-ellipse (rayon X = demi-largeur, rayon Y = hauteur)
    const rimRadiusX = (this.scene.containerRight - this.scene.containerLeft) / 2;
    const rimRadiusY = this.scene.containerBottom - rimTop;
    const screenH = this.scene.scale.height;

    for (const fruit of fruits) {
      if (fruit.isRemoved || !fruit.body) continue;
      // Grâce 400 ms après spawn : un fruit né d'une fusion peut être
      // poussé violemment hors du bol par la résolution de collision
      // sans que ce soit une vraie échappée
      if (this.scene.time.now - fruit.spawnTime < 400) continue;
      const p = fruit.body.position;

      // Tombé hors de l'écran par le bas
      if (p.y > screenH + 60) {
        this.trigger();
        return;
      }
      // En dessous du rebord mais hors de la silhouette du bol : échappé
      if (p.y > rimTop + 10) {
        const nx = (p.x - cx) / rimRadiusX;
        const ny = (p.y - rimTop) / rimRadiusY;
        if (nx * nx + ny * ny > 1) {
          this.trigger();
          return;
        }
      }
    }
  }

  private trigger(): void {
    this.triggered = true;
    this.onGameOver();
  }
}
