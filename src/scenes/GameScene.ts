import Phaser from 'phaser';
import { Fruit, FRUIT_CATEGORY, WALL_CATEGORY, WALL_LABEL, Matter, MatterBody } from '../entities/Fruit';
import { getFruit, rollSpawnTier } from '../data/FruitData';
import { FruitExpression, GameOverData } from '../types/GameTypes';
import { UIHelpers } from '../ui/UIHelpers';
import { MergeManager } from '../systems/MergeManager';
import { ScoreManager } from '../systems/ScoreManager';
import { ComboManager } from '../systems/ComboManager';
import { DangerManager } from '../systems/DangerManager';
import { ScoreUI } from '../ui/ScoreUI';
import { ComboPopup } from '../ui/ComboPopup';
import { DangerLine } from '../ui/DangerLine';
import { NextFruitUI } from '../ui/NextFruitUI';
import { SaveManager } from '../managers/SaveManager';
import { ParticleManager } from '../managers/ParticleManager';
import { ScreenEffects } from '../effects/ScreenEffects';
import { FruitEffects } from '../effects/FruitEffects';
import { audioManager } from '../managers/AudioManager';

/**
 * Scène de jeu principale.
 * Responsabilités : layout adaptatif, récipient physique, contrôles, spawn.
 * La fusion (Phase 2), le score/combo (Phase 3) et les effets (Phase 4)
 * sont délégués à des managers dédiés.
 */
export class GameScene extends Phaser.Scene {
  private scaleK = 1;
  private cx = 360;
  private containerTop = 0;
  private containerBottom = 0;
  private containerLeft = 0;
  private containerRight = 0;
  private previewY = 0;

  private fruits: Fruit[] = [];
  private walls: MatterBody[] = [];
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private bowlGraphics!: Phaser.GameObjects.Graphics;
  private physicsDebugGraphics!: Phaser.GameObjects.Graphics;
  private previewGroup!: Phaser.GameObjects.Container;
  private previewSprite!: Phaser.GameObjects.Image;
  private guideGraphics!: Phaser.GameObjects.Graphics;
  private previewX = 360;
  private currentTier = 1;
  private nextTier = 1;
  private dropLocked = false;
  private pointerDown = false;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;

  private scoreManager!: ScoreManager;
  private comboManager!: ComboManager;
  private mergeManager!: MergeManager;
  private scoreUI!: ScoreUI;
  private comboPopup!: ComboPopup;
  private nextFruitUI!: NextFruitUI;
  private particleManager!: ParticleManager;
  private screenEffects!: ScreenEffects;
  private dangerLine!: DangerLine;
  private dangerManager!: DangerManager;
  private gameOverTriggered = false;

  constructor() {
    super('Game');
  }

  create(): void {
    // Reset d'état : scene.restart() réutilise la même instance de scène
    this.fruits = [];
    this.walls = [];
    this.dropLocked = false;
    this.pointerDown = false;
    this.gameOverTriggered = false;

    // Physique plus stable pour les piles de fruits
    const engine = this.matter.world.engine;
    engine.positionIterations = 8;
    engine.velocityIterations = 6;

    this.bgGraphics = this.add.graphics().setDepth(0);
    this.bowlGraphics = this.add.graphics().setDepth(1);
    this.physicsDebugGraphics = this.add.graphics().setDepth(3);

    this.layout();
    this.drawBackground();
    this.buildWalls();
    this.drawBowl();
    this.drawPhysicsDebug();
    this.buildPreview();
    this.setupInput();

    // Managers (fusion, score, combo, effets, danger)
    this.scoreManager = new ScoreManager(this);
    this.comboManager = new ComboManager();
    this.scoreUI = new ScoreUI(this);
    this.comboPopup = new ComboPopup(this);
    this.nextFruitUI = new NextFruitUI(this);
    this.particleManager = new ParticleManager(this);
    this.screenEffects = new ScreenEffects(this);
    // Ligne de danger = rebord de la calebasse : un fruit qui déborde = danger.
    // Placée juste SOUS le plan du rebord : un fruit posé sur la pente interne
    // (légitimement dans le bol) ne compte pas, un vrai débordement oui.
    this.dangerLine = new DangerLine(this, this.containerLeft, this.containerRight, this.containerTop - 10 * this.scaleK);
    this.dangerManager = new DangerManager(this.dangerLine, () => this.gameOver(), 0);
    this.mergeManager = new MergeManager(
      this,
      this.scoreManager,
      this.comboManager,
      this.comboPopup,
      this.particleManager,
      this.screenEffects,
      audioManager,
    );

    // Débloque l'audio au premier geste (exigence navigateurs mobiles)
    this.input.once('pointerdown', () => audioManager.unlock());

    this.currentTier = rollSpawnTier();
    this.nextTier = rollSpawnTier();
    this.refreshPreview();

    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  override update(): void {
    // Clavier (test desktop) : flèches + espace
    if (this.keys) {
      const step = 12 * this.scaleK;
      if (this.keys.left.isDown) {
        this.previewX -= step;
        this.updatePreviewPosition();
      }
      if (this.keys.right.isDown) {
        this.previewX += step;
        this.updatePreviewPosition();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.up)) {
        this.dropCurrent();
      }
    }
    for (const fruit of this.fruits) {
      fruit.update();
    }
    // Nettoyage des fruits retirés (fusion)
    if (this.fruits.some((f) => f.isRemoved)) {
      const removed = this.fruits.filter((f) => f.isRemoved);
      this.fruits = this.fruits.filter((f) => !f.isRemoved);
      for (const fruit of removed) fruit.destroy();
    }
    this.mergeManager.update();
    this.scoreUI.update(this.scoreManager.score, this.scoreManager.best);
    this.dangerManager.update(this.fruits, this.game.loop.delta);
    // Les fruits regardent le prochain fruit à lancer
    for (const fruit of this.fruits) {
      fruit.lookAt(this.previewX, this.previewY);
    }
  }

  // ---------- layout ----------

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.scaleK = h / 1280;
    const k = this.scaleK;
    this.cx = w / 2;
    // Calebasse peu profonde, large, en bas de l'écran (façon Ball Guys) :
    // on remplit, un fruit déborde → game over
    const halfW = Math.min(w * 0.46, 330 * k);
    this.containerLeft = this.cx - halfW;
    this.containerRight = this.cx + halfW;
    this.containerTop = h - 400 * k;
    this.containerBottom = this.containerTop + halfW;
    // Le fruit est lancé depuis le HAUT de l'écran (sous le HUD)
    this.previewY = 130 * k;
    this.matter.world.setGravity(0, 1.4 * k);
  }

  private onResize(): void {
    this.layout();
    this.drawBackground();
    this.buildWalls();
    this.drawBowl();
    this.drawPhysicsDebug();
    this.dangerLine.setPosition(this.containerLeft, this.containerRight, this.containerTop - 10 * this.scaleK);
    this.dangerManager.setLineY(this.dangerLine.y, 0);
    this.updatePreviewPosition();
  }

  private onShutdown(): void {
    this.scale.off('resize', this.onResize, this);
    this.mergeManager.destroy();
    this.particleManager.destroy();
  }

  // ---------- décor ----------

  private drawBackground(): void {
    UIHelpers.drawNotebookBackground(this, this.bgGraphics, this.scaleK);
  }

  /**
   * Dessine la calebasse : coquille en DEMI-CERCLE (fond arrondi, pas de pointe),
   * intérieur crème, rebord épais, rayures radiales.
   * La coquille est légèrement plus grande que la physique (les fruits
   * restent visuellement à l'intérieur).
   */
  private drawBowl(): void {
    const g = this.bowlGraphics;
    g.clear();
    const k = this.scaleK;
    const cx = this.cx;
    const rimTop = this.containerTop;
    const R = (this.containerRight - this.containerLeft) / 2; // rayon du demi-cercle
    const RShell = R + 26 * k; // coquille (anneau autour de l'intérieur)

    // Coquille : demi-cercle vers le BAS (0 → PI en sens horaire = traverse +y)
    g.fillStyle(0xc97b3f, 1);
    g.beginPath();
    g.arc(cx, rimTop, RShell, 0, Math.PI, false);
    g.closePath();
    g.fillPath();

    // Rayures radiales (méridiens de la calebasse)
    g.lineStyle(3 * k, 0x8d5524, 0.28);
    for (const sx of [-0.62, -0.3, 0.3, 0.62]) {
      const dy = Math.sqrt(Math.max(0, 1 - sx * sx));
      g.beginPath();
      g.moveTo(cx + sx * (R - 6 * k), rimTop + dy * (R - 6 * k));
      g.lineTo(cx + sx * (RShell - 5 * k), rimTop + dy * (RShell - 5 * k));
      g.strokePath();
    }

    // Contour épais
    g.lineStyle(6 * k, 0x27272f, 1);
    g.beginPath();
    g.arc(cx, rimTop, RShell, 0, Math.PI, false);
    g.closePath();
    g.strokePath();

    // Intérieur crème
    g.fillStyle(0xf3dfae, 1);
    g.beginPath();
    g.arc(cx, rimTop, R - 8 * k, 0, Math.PI, false);
    g.closePath();
    g.fillPath();

    // Ombre du fond (profondeur, suit la courbe)
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(cx, this.containerBottom - 16 * k, (R - 8 * k) * 1.35, 30 * k);

    // Rebord (ouverture)
    g.fillStyle(0xe9cf96, 1);
    g.fillEllipse(cx, rimTop + 8 * k, R, 30 * k);
    g.lineStyle(7 * k, 0x27272f, 1);
    g.strokeEllipse(cx, rimTop + 8 * k, R, 30 * k);

    // Reflet haut-gauche de la coquille
    g.fillStyle(0xffffff, 0.13);
    g.fillEllipse(cx - R * 0.45, rimTop + R * 0.3, R * 0.3, R * 0.14);
  }

  /**
   * Affiche en rouge les lignes de collision de la calebasse
   * (contours exacts des corps physiques : murets + dalles en V).
   */
  private drawPhysicsDebug(): void {
    const g = this.physicsDebugGraphics;
    g.clear();
    g.lineStyle(3, 0xff2222, 0.85);
    for (const body of this.walls) {
      const v = body.vertices;
      if (!v || v.length === 0) continue;
      g.beginPath();
      g.moveTo(v[0].x, v[0].y);
      for (let i = 1; i < v.length; i++) {
        g.lineTo(v[i].x, v[i].y);
      }
      g.closePath();
      g.strokePath();
    }
  }

  // ---------- physique ----------

  /**
   * Physique de la calebasse demi-cercle :
   * - deux murets au-dessus du rebord (rattrapent les rebonds)
   * - une bande en ARC (demi-cercle) pour le fond : les collisions
   *   suivent exactement la courbe de la calebasse
   */
  private buildWalls(): void {
    const engine = this.matter.world.engine;
    for (const body of this.walls) {
      Matter.Composite.remove(engine.world, body);
    }
    this.walls = [];
    const k = this.scaleK;
    const cx = this.cx;
    const rimTop = this.containerTop;
    const R = (this.containerRight - this.containerLeft) / 2; // rayon du demi-cercle

    const base = {
      isStatic: true,
      friction: 0.7,
      restitution: 0.05,
      label: WALL_LABEL,
      collisionFilter: { category: WALL_CATEGORY, mask: FRUIT_CATEGORY | WALL_CATEGORY, group: 0 },
    };

    // Murets au-dessus du rebord
    const wallW = 34 * k;
    const wallH = 90 * k;
    const wallCY = rimTop - 35 * k;
    const left = Matter.Bodies.rectangle(this.containerLeft + wallW / 2, wallCY, wallW, wallH, base);
    const right = Matter.Bodies.rectangle(this.containerRight - wallW / 2, wallCY, wallW, wallH, base);

    // Fond en arc : bande annulaire échantillonnée le long du demi-cercle.
    // La surface intérieure colle à la courbe dessinée (R - 8k).
    const rInner = R - 8 * k;
    const bandW = 34 * k;
    const samples = 30;
    const verts: { x: number; y: number }[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * Math.PI;
      verts.push({
        x: cx + (rInner + bandW) * Math.cos(t),
        y: rimTop + (rInner + bandW) * Math.sin(t),
      });
    }
    for (let i = samples; i >= 0; i--) {
      const t = (i / samples) * Math.PI;
      verts.push({ x: cx + rInner * Math.cos(t), y: rimTop + rInner * Math.sin(t) });
    }
    const arc = Matter.Bodies.fromVertices(cx, rimTop, [verts], base, false);
    if (arc) {
      Matter.Composite.add(engine.world, arc);
      this.walls.push(arc);
    }

    for (const body of [left, right]) {
      Matter.Composite.add(engine.world, body);
      this.walls.push(body);
    }
  }

  // ---------- preview + contrôles ----------

  private buildPreview(): void {
    this.previewX = this.cx;
    // depth 30 : le fruit à lancer passe au-dessus des cartes du HUD
    this.previewGroup = this.add.container(this.previewX, this.previewY).setDepth(30);
    this.previewSprite = this.add.image(0, 0, `fruit_${this.currentTier}`).setScale(this.scaleK);
    this.previewGroup.add(this.previewSprite);
    this.guideGraphics = this.add.graphics().setDepth(5);
    this.startPreviewBounce();
    this.updatePreviewPosition();
  }

  private startPreviewBounce(): void {
    this.tweens.add({
      targets: this.previewSprite,
      scale: this.scaleK * 1.06,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private refreshPreview(): void {
    this.tweens.killTweensOf(this.previewSprite);
    this.previewSprite.setTexture(`fruit_${this.currentTier}`).setScale(this.scaleK);
    this.startPreviewBounce();
    this.updatePreviewPosition();
    this.nextFruitUI.setTier(this.nextTier);
  }

  private updatePreviewPosition(): void {
    const k = this.scaleK;
    const r = getFruit(this.currentTier).radius * k;
    // +30k : marge pour le col resserré de la calebasse (évite les drops sur le rebord)
    const minX = this.containerLeft + r + 30 * k;
    const maxX = this.containerRight - r - 30 * k;
    this.previewX = Phaser.Math.Clamp(this.previewX, minX, maxX);
    this.previewGroup.setPosition(this.previewX, this.previewY);
    this.drawGuide();
  }

  /** Trajectoire en pointillés vers le récipient. */
  private drawGuide(): void {
    const g = this.guideGraphics;
    g.clear();
    const k = this.scaleK;
    const r = getFruit(this.currentTier).radius * k;
    const topY = this.containerTop + 14 * k;
    const startY = this.previewY + r + 14 * k;
    g.fillStyle(0x27272f, 0.3);
    for (let y = startY; y < topY; y += 16 * k) {
      g.fillCircle(this.previewX, y, 3 * k);
    }
    g.fillTriangle(this.previewX, topY + 16 * k, this.previewX - 7 * k, topY + 2 * k, this.previewX + 7 * k, topY + 2 * k);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.pointerDown = true;
      this.onPointerMove(pointer);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.pointerDown) this.onPointerMove(pointer);
    });
    this.input.on('pointerup', () => {
      // Évite un drop "fantôme" si le doigt était déjà levé
      // avant l'arrivée dans cette scène (ex : tap sur JOUER au menu)
      if (!this.pointerDown) return;
      this.pointerDown = false;
      this.dropCurrent();
    });
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.createCursorKeys();
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    this.previewX = pointer.x;
    this.updatePreviewPosition();
  }

  private dropCurrent(): void {
    if (this.dropLocked) return;
    this.dropLocked = true;
    this.time.delayedCall(220, () => {
      this.dropLocked = false;
    });
    const fruit = this.spawnFruit(this.currentTier, this.previewX, this.previewY);
    // Le fruit est excité de tomber + étirement de chute
    fruit.express(FruitExpression.EXCITED);
    FruitEffects.dropStretch(fruit);
    audioManager.playDrop();
    this.currentTier = this.nextTier;
    this.nextTier = rollSpawnTier();
    this.refreshPreview();
  }

  spawnFruit(tier: number, x: number, y: number): Fruit {
    const fruit = new Fruit(this, tier, x, y, { radiusScale: this.scaleK });
    Matter.Composite.add(this.matter.world.engine.world, fruit.body);
    this.fruits.push(fruit);
    return fruit;
  }

  // ---------- fin de partie ----------

  gameOver(): void {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    // Petit moment dramatique : les fruits sont tristes, l'écran tremble
    for (const fruit of this.fruits) {
      fruit.express(FruitExpression.GAME_OVER);
    }
    this.screenEffects.shake(0.02, 500);
    this.screenEffects.flash(0.5, 250);
    audioManager.playGameOver();
    this.particleManager.gameOverConfetti();

    this.time.delayedCall(800, () => {
      this.matter.world.pause();
      this.scoreManager.submit();
      const data: GameOverData = {
        score: this.scoreManager.score,
        best: SaveManager.getBestScore(),
        bestTier: this.mergeManager.bestTier,
      };
      this.scene.stop();
      this.scene.start('GameOver', data);
    });
  }
}
