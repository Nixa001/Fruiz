import { Fruit } from '../entities/Fruit';
import { FruitExpression } from '../types/GameTypes';
import { DangerLine } from '../ui/DangerLine';
import { audioManager } from '../managers/AudioManager';

const DANGER_MS = 700;
const GAME_OVER_MS = 1000;

/**
 * Surveille le rebord de la calebasse : un fruit qui déborde au-dessus
 * trop longtemps déclenche la fin de partie. 3 états : normal, danger, critique.
 */
export class DangerManager {
  private overLineSince = 0;
  private triggered = false;
  private lineY = 0;
  private marginPx = 0;
  private lastState: 'normal' | 'danger' | 'critical' = 'normal';

  constructor(
    private line: DangerLine,
    private onGameOver: () => void,
    marginPx: number,
  ) {
    this.lineY = line.y;
    this.marginPx = marginPx;
  }

  setLineY(y: number, marginPx: number): void {
    this.lineY = y;
    this.marginPx = marginPx;
  }

  reset(): void {
    this.overLineSince = 0;
    this.triggered = false;
    this.line.setState('normal');
  }

  update(fruits: Fruit[], dt: number): void {
    if (this.triggered) return;
    let anyOver = false;
    for (const fruit of fruits) {
      if (fruit.isRemoved || !fruit.body) continue;
      // On ignore les fruits encore en mouvement (chute, rebond) :
      // seul un fruit POSÉ au-dessus du rebord compte comme débordement.
      // Marge : un fruit posé sur la pente interne peut dépasser le rebord
      // de quelques pixels sans déborder réellement.
      if (fruit.body.speed > 2.5) continue;
      const top = fruit.body.position.y - fruit.physicsRadius;
      if (top < this.lineY + this.marginPx) {
        anyOver = true;
        fruit.express(FruitExpression.SCARED);
      }
    }

    if (anyOver) {
      this.overLineSince += dt;
      const newState = this.overLineSince >= DANGER_MS ? 'critical' : 'danger';
      this.line.setState(newState);
      if (newState === 'critical' && this.lastState !== 'critical') {
        audioManager.playDanger();
      }
      this.lastState = newState;
      if (this.overLineSince >= GAME_OVER_MS) {
        this.triggered = true;
        this.onGameOver();
      }
    } else {
      this.overLineSince = 0;
      this.line.setState('normal');
      this.lastState = 'normal';
    }
  }
}
