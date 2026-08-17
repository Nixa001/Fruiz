import Phaser from 'phaser';

export type DangerState = 'normal' | 'danger' | 'critical';

/** Ligne de danger : discrète → clignotante → critique (tremblante). */
export class DangerLine {
  private g: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private state: DangerState = 'normal';
  private blinkTween?: Phaser.Tweens.Tween;
  private wiggleTween?: Phaser.Tweens.Tween;

  constructor(
    private scene: Phaser.Scene,
    private x1: number,
    private x2: number,
    y: number,
  ) {
    this.g = scene.add.graphics().setDepth(8);
    this.label = scene.add
      .text((x1 + x2) / 2, y - 24 * (scene.scale.height / 1280), '⚠ DANGER', {
        fontFamily: '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        fontSize: `${Math.round(20 * (scene.scale.height / 1280))}px`,
        color: '#c94f3d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(8)
      .setVisible(false);
    this.redraw(y);
  }

  get y(): number {
    return this.g.y;
  }

  /** Repositionne la ligne (resize / layout). */
  setPosition(x1: number, x2: number, y: number): void {
    this.x1 = x1;
    this.x2 = x2;
    this.label.setPosition((x1 + x2) / 2, y - 24 * (this.scene.scale.height / 1280));
    this.redraw(y);
  }

  setState(state: DangerState): void {
    if (this.state === state) return;
    this.state = state;
    this.blinkTween?.stop();
    this.wiggleTween?.stop();
    this.redraw(this.g.y);

    if (state === 'danger' || state === 'critical') {
      this.label.setVisible(true);
      const color = state === 'critical' ? 0xe53935 : 0xfb8c00;
      this.label.setColor(state === 'critical' ? '#e53935' : '#fb8c00');
      // clignotement
      this.blinkTween = this.scene.tweens.add({
        targets: this.g,
        alpha: 0.25,
        duration: state === 'critical' ? 140 : 280,
        yoyo: true,
        repeat: -1,
      });
      void color;
      if (state === 'critical') {
        // tremblement
        this.wiggleTween = this.scene.tweens.add({
          targets: this.g,
          y: this.g.y + 3,
          duration: 50,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      this.label.setVisible(false);
      this.g.setAlpha(1);
    }
  }

  private redraw(y: number): void {
    const g = this.g;
    g.clear();
    g.setPosition(0, y);
    const k = this.scene.scale.height / 1280;
    const dash = 18 * k;
    const color = this.state === 'normal' ? 0x9e9e9e : this.state === 'danger' ? 0xfb8c00 : 0xe53935;
    const width = this.state === 'critical' ? 5 * k : 3 * k;
    g.lineStyle(width, color, this.state === 'normal' ? 0.45 : 0.9);
    g.beginPath();
    for (let x = this.x1; x < this.x2; x += dash * 2) {
      g.moveTo(x, 0);
      g.lineTo(Math.min(x + dash, this.x2), 0);
    }
    g.strokePath();
  }
}
