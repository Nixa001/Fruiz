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
import { NextFruitUI } from '../ui/NextFruitUI';
import { EvolutionBar } from '../ui/EvolutionBar';
import { SaveManager } from '../managers/SaveManager';
import { ParticleManager } from '../managers/ParticleManager';
import { ScreenEffects } from '../effects/ScreenEffects';
import { audioManager } from '../managers/AudioManager';

/**
 * Scène de jeu principale.
 * Responsabilités : layout adaptatif, récipient physique, contrôles, spawn.
 * La fusion (Phase 2), le score/combo (Phase 3) et les effets (Phase 4)
 * sont délégués à des managers dédiés.
 */
export class GameScene extends Phaser.Scene {
  private scaleK = 1;
  cx = 360;
  containerTop = 0;
  containerBottom = 0;
  containerLeft = 0;
  containerRight = 0;
  private previewY = 0;
  /** Partie en pause (bouton pause). */
  paused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private pauseResumeBtn?: Phaser.GameObjects.Container;
  private pauseRestartBtn?: Phaser.GameObjects.Container;
  private pauseMenuBtn?: Phaser.GameObjects.Container;

  fruits: Fruit[] = [];
  private walls: MatterBody[] = [];
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private bowlGraphics!: Phaser.GameObjects.Graphics;
  private previewGroup!: Phaser.GameObjects.Container;
  private previewSprite!: Phaser.GameObjects.Image;
  private guideGraphics!: Phaser.GameObjects.Graphics;
  private previewX = 360;
  private currentTier = 1;
  private nextTier = 1;
  private dropLocked = false;
  private pointerDown = false;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private escKey?: Phaser.Input.Keyboard.Key;
  /** Debug (DEV only) : touches 1-9/0/-/= pour lâcher un tier précis (1-12). */
  private debugTierKeys: { tier: number; key: Phaser.Input.Keyboard.Key }[] = [];
  /** Accumulateur du balayage anti-coincement (fruits qui flottent). */
  private unstickAccum = 0;
  /** Fruit en chute dont on attend la mi-parcours avant de révéler le NEXT. */
  private pendingNextReveal: Fruit | null = null;
  private dropSpawnY = 0;

  private scoreManager!: ScoreManager;
  private comboManager!: ComboManager;
  private mergeManager!: MergeManager;
  private scoreUI!: ScoreUI;
  private comboPopup!: ComboPopup;
  private nextFruitUI!: NextFruitUI;
  private evolutionBar!: EvolutionBar;
  private particleManager!: ParticleManager;
  private screenEffects!: ScreenEffects;
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
    this.pendingNextReveal = null;
    this.paused = false;
    this.pauseOverlay = undefined;
    this.pauseResumeBtn = undefined;
    this.pauseRestartBtn = undefined;
    this.pauseMenuBtn = undefined;

    // Physique ferme : les fruits se poussent sans se superposer
    const engine = this.matter.world.engine;
    engine.positionIterations = 10;
    engine.velocityIterations = 8;

    this.bgGraphics = this.add.graphics().setDepth(0);
    this.bowlGraphics = this.add.graphics().setDepth(1);

    this.layout();
    this.drawBackground();
    this.buildDoodles();
    this.buildWalls();
    this.drawBowl();
    this.buildPreview();
    this.setupInput();

    // Managers (fusion, score, combo, effets, danger)
    this.scoreManager = new ScoreManager(this);
    this.comboManager = new ComboManager();
    this.scoreUI = new ScoreUI(this);
    this.comboPopup = new ComboPopup(this);
    this.nextFruitUI = new NextFruitUI(this);
    this.evolutionBar = new EvolutionBar(this);
    this.particleManager = new ParticleManager(this);
    this.screenEffects = new ScreenEffects(this);
    // Règle Ball Guys : fruit qui s'échappe de la calebasse = game over
    this.dangerManager = new DangerManager(this, () => this.gameOver());
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
    audioManager.attachScene(this);
    this.input.once('pointerdown', () => audioManager.unlock());
    if (audioManager.musicEnabled) audioManager.startMusic();

    // Bouton pause (haut centre) + overlay REPRENDRE / MENU
    this.buildPauseButton();

    this.currentTier = rollSpawnTier();
    this.nextTier = rollSpawnTier();
    this.refreshPreview();
    // Première révélation du NEXT (aucun fruit en chute au démarrage)
    this.nextFruitUI.setTier(this.nextTier);

    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  override update(): void {
    if (this.paused) {
      if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) this.togglePause();
      return;
    }
    // Clavier (test desktop) : flèches + espace, Échap = pause
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.togglePause();
    }
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
    // Debug (DEV only) : lâcher un tier précis au clavier
    for (const { tier, key } of this.debugTierKeys) {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.spawnFruit(tier, this.previewX, this.previewY);
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
    this.dangerManager.update(this.fruits);
    this.evolutionBar.setProgress(this.mergeManager.bestTier);
    // Balayage anti-coincement : réveille les fruits endormis en l'air
    // ou collés sur les parois sans support
    this.unstickAccum += this.game.loop.delta;
    if (this.unstickAccum >= 800) {
      this.unstickAccum = 0;
      this.unstickSleepingFruits();
    }
    // Révélation du fruit suivant : quand le fruit lâché atteint la mi-parcours
    // (ou s'il a fusionné en vol), le fruit EN MAIN apparaît au point de départ
    // et la carte NEXT avance au fruit d'après
    if (this.pendingNextReveal) {
      const f = this.pendingNextReveal;
      if (f.isRemoved || f.y >= this.dropSpawnY + (this.containerTop - this.dropSpawnY) * 0.5) {
        this.pendingNextReveal = null;
        this.currentTier = this.nextTier;
        this.nextTier = rollSpawnTier();
        this.previewSprite.setVisible(true);
        this.refreshPreview();
        this.nextFruitUI.setTier(this.nextTier);
      }
    }
    // Occlusion : les fruits du bas dessinés derrière, ceux du haut devant
    this.fruits.sort((a, b) => a.y - b.y);
    for (let i = 0; i < this.fruits.length; i++) {
      this.fruits[i].setDepth(10 + i);
    }
    // Les fruits regardent le prochain fruit à lancer (éveillés seulement :
    // les endormis n'ont pas besoin de bouger les yeux chaque frame)
    for (const fruit of this.fruits) {
      if (!fruit.body.isSleeping) fruit.lookAt(this.previewX, this.previewY);
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
    // on remplit, un fruit déborde → game over. Taille réduite de 20% ×2.
    // Remontée pour laisser la place à la barre d'évolution des fruits en bas.
    const halfW = Math.min(w * 0.46, 330 * k) * 0.78;
    this.containerLeft = this.cx - halfW;
    this.containerRight = this.cx + halfW;
    this.containerBottom = h - 300 * k;
    this.containerTop = this.containerBottom - halfW;
    // Le fruit est lancé depuis le haut, mais descendu pour réduire la chute
    this.previewY = 300 * k;
    this.matter.world.setGravity(0, 1.1 * k);
  }

  private onResize(): void {
    this.layout();
    this.drawBackground();
    this.buildWalls();
    this.drawBowl();
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

  /** Fruits décoratifs flottants (ambiance arcade, derrière le bol). */
  private buildDoodles(): void {
    const k = this.scaleK;
    const w = this.scale.width;
    const h = this.scale.height;
    const specs: [string, number, number, number][] = [
      ['fruit_2', 0.32, 42 * k, h * 0.34],
      ['fruit_8', 0.3, w - 42 * k, h * 0.4],
      ['fruit_4', 0.28, 38 * k, h * 0.56],
    ];
    for (const [tex, alpha, x, y] of specs) {
      const img = this.add.image(x, y, tex).setScale(k * 0.3).setAlpha(alpha).setDepth(0.6);
      this.tweens.add({
        targets: img,
        y: y + 14 * k,
        angle: 10,
        duration: 2200 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
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

    // Reflet haut-gauche de la coquille
    g.fillStyle(0xffffff, 0.13);
    g.fillEllipse(cx - R * 0.45, rimTop + R * 0.3, R * 0.3, R * 0.14);
    // Liseré brillant le long de la coquille (haut-gauche)
    g.lineStyle(9 * k, 0xffffff, 0.16);
    g.beginPath();
    g.arc(cx, rimTop, RShell - 12 * k, Math.PI * 0.12, Math.PI * 0.55, false);
    g.strokePath();
  }

  // ---------- physique ----------

  /**
   * Physique de la calebasse demi-cercle : uniquement l'ARC du fond
   * (chaîne de petits cercles statiques le long du demi-cercle).
   * La surface intérieure colle à la courbe dessinée (R - 8k) et les
   * fruits roulent naturellement vers le centre. (fromVertices/poly-decomp
   * produit des triangles parasites sur cette forme concave : on évite.)
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
      // Friction faible : les fruits glissent vers le centre au lieu
      // de rester collés sur les parois
      friction: 0.35,
      restitution: 0.05,
      label: WALL_LABEL,
      collisionFilter: { category: WALL_CATEGORY, mask: FRUIT_CATEGORY | WALL_CATEGORY, group: 0 },
    };

    // Fond en demi-ellipse (la hauteur du bol est indépendante de sa largeur)
    const rInnerX = R - 4 * k;
    const rInnerY = this.containerBottom - rimTop - 4 * k;
    const circleR = 5 * k;
    const arcCircles = 100;
    for (let i = 0; i <= arcCircles; i++) {
      const t = (i / arcCircles) * Math.PI;
      const body = Matter.Bodies.circle(
        cx + rInnerX * Math.cos(t),
        rimTop + rInnerY * Math.sin(t) + 5 * k,
        circleR,
        base,
      );
      Matter.Composite.add(engine.world, body);
      this.walls.push(body);
    }

    // Petites butées d'angle au rebord (gauche et droite) :
    // rattrapent les fruits lâchés trop près des bords, qui rebondissent
    // dessus et roulent dans le bol (visibles en rouge dans le debug)
    // Petites corniches horizontales aux angles du rebord (lignes plates)
    const cornerW = 36 * k;
    const cornerH = 6 * k;
    const corners = [
      Matter.Bodies.rectangle(this.containerLeft - 8 * k, rimTop + 0.01 * k, cornerW, cornerH, base),
      Matter.Bodies.rectangle(this.containerRight + 8 * k, rimTop + 0.01 * k, cornerW, cornerH, base),
    ];
    for (const body of corners) {
      Matter.Composite.add(engine.world, body);
      this.walls.push(body);
    }
  }

  /**
   * Un fruit endormi doit toucher le fond du bol ou reposer sur un autre
   * fruit. Sinon (coincé sur une paroi, suspendu) : on le réveille avec
   * une petite impulsion pour qu'il retombe.
   */
  private unstickSleepingFruits(): void {
    const k = this.scaleK;
    const rX = (this.containerRight - this.containerLeft) / 2 - 4 * k;
    const rY = this.containerBottom - this.containerTop - 4 * k;
    for (const f of this.fruits) {
      if (f.isRemoved || !f.body || !f.body.isSleeping) continue;
      const p = f.body.position;
      const dx = p.x - this.cx;
      if (Math.abs(dx) > rX) continue; // hors bol : règle d'échappement
      const t = dx / rX;
      const floorY = this.containerTop + rY * Math.sqrt(Math.max(0, 1 - t * t)) - f.physicsRadius;
      if (p.y >= floorY - 4) continue; // posé sur le fond : normal
      // Soutenu par un autre fruit en dessous ?
      let supported = false;
      for (const o of this.fruits) {
        if (o === f || o.isRemoved || !o.body) continue;
        if (o.body.position.y <= p.y) continue;
        const ddx = o.body.position.x - p.x;
        const ddy = o.body.position.y - p.y;
        const minD = (o.physicsRadius + f.physicsRadius) * 0.85;
        if (ddx * ddx + ddy * ddy < minD * minD) {
          supported = true;
          break;
        }
      }
      if (!supported) {
        Matter.Sleeping.set(f.body, false);
        f.body.velocity.y = 0.6;
      }
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
    // NB : nextFruitUI est mis à jour séparément (mi-parcours de la chute)
  }

  private updatePreviewPosition(): void {
    const k = this.scaleK;
    const r = getFruit(this.currentTier).radius * k;
    // Course : le fruit peut dépasser un peu les bords du bol
    // (lâché trop loin, il rebondit sur le rebord et roule dedans)
    const minX = this.containerLeft + r - 40 * k;
    const maxX = this.containerRight - r + 40 * k;
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
      this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      if (import.meta.env.DEV) {
        const KC = Phaser.Input.Keyboard.KeyCodes;
        const codes = [KC.ONE, KC.TWO, KC.THREE, KC.FOUR, KC.FIVE, KC.SIX, KC.SEVEN, KC.EIGHT, KC.NINE, KC.ZERO, KC.MINUS, KC.PLUS];
        this.debugTierKeys = codes.map((code, i) => ({ tier: i + 1, key: kb.addKey(code) }));
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    this.previewX = pointer.x;
    this.updatePreviewPosition();
  }

  private dropCurrent(): void {
    // Pas de lancer tant que le fruit précédent n'a pas atteint la mi-parcours
    if (this.dropLocked || this.pendingNextReveal || this.paused) return;
    this.dropLocked = true;
    this.time.delayedCall(220, () => {
      this.dropLocked = false;
    });
    const fruit = this.spawnFruit(this.currentTier, this.previewX, this.previewY);
    // Le fruit est excité de tomber
    fruit.express(FruitExpression.EXCITED);
    audioManager.playDrop();
    // Le fruit en main disparaît et ne revient qu'à la mi-parcours de la chute.
    // La carte NEXT continue d'afficher le fruit qui viendra en main.
    this.pendingNextReveal = fruit;
    this.dropSpawnY = this.previewY;
    this.previewSprite.setVisible(false);
    this.guideGraphics.clear();
  }

  spawnFruit(tier: number, x: number, y: number): Fruit {
    const fruit = new Fruit(this, tier, x, y, { radiusScale: this.scaleK });
    Matter.Composite.add(this.matter.world.engine.world, fruit.body);
    this.fruits.push(fruit);
    return fruit;
  }

  // ---------- pause ----------

  private buildPauseButton(): void {
    const k = this.scaleK;
    UIHelpers.makeButton(
      this,
      {
        x: this.scale.width / 2,
        y: 90 * k,
        width: 92 * k,
        height: 100 * k,
        label: '❚❚',
        fill: 0xffd54f,
        radius: 22 * k,
        depth: 25,
        shadowColor: 0xc94f3d,
        fontSize: Math.round(36 * k),
      },
      () => {
        audioManager.playButton();
        this.togglePause();
      },
    );
  }

  togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.matter.world.pause();
      this.showPauseOverlay();
    } else {
      // Les boutons sont créés en absolu (input fiable) : à détruire à part
      this.pauseResumeBtn?.destroy();
      this.pauseRestartBtn?.destroy();
      this.pauseMenuBtn?.destroy();
      this.pauseResumeBtn = undefined;
      this.pauseRestartBtn = undefined;
      this.pauseMenuBtn = undefined;
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
      this.matter.world.resume();
      // Anti "tap-through" : le tap sur REPRENDRE ne doit pas lâcher un fruit
      this.pointerDown = false;
      this.dropLocked = true;
      this.time.delayedCall(300, () => {
        this.dropLocked = false;
      });
    }
  }

  private showPauseOverlay(): void {
    if (this.pauseOverlay) return;
    const k = this.scaleK;
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    const overlay = this.add.container(0, 0).setDepth(80);
    const dim = this.add.rectangle(cx, cy, w, h, 0x27272f, 0.5).setInteractive();
    overlay.add(dim);

    // Panneau crème avec ombre indigo
    const pw = Math.min(480 * k, w * 0.94);
    const ph = 600 * k;
    const g = this.add.graphics();
    g.fillStyle(0x3d599e, 1);
    g.fillRoundedRect(cx - pw / 2 + 7 * k, cy - ph / 2 + 7 * k, pw, ph, 30 * k);
    g.fillStyle(0xfff9ec, 1);
    g.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 30 * k);
    g.lineStyle(6 * k, 0x27272f, 1);
    g.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 30 * k);
    overlay.add(g);

    // Bandeau wax en tête avec PAUSE (coins hauts arrondis : pas de débordement)
    const headH = 96 * k;
    const inset = 10 * k;
    const head = this.add.graphics();
    head.fillStyle(0xf7be36, 1);
    head.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, headH, { tl: 30 * k, tr: 30 * k, bl: 0, br: 0 });
    UIHelpers.drawWaxBand(head, cx - pw / 2 + inset, cy - ph / 2, pw - inset * 2, headH);
    head.lineStyle(4 * k, 0x27272f, 1);
    head.lineBetween(cx - pw / 2, cy - ph / 2 + headH, cx + pw / 2, cy - ph / 2 + headH);
    overlay.add(head);
    const titleY = cy - ph / 2 + headH / 2;
    const FONT = '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
    overlay.add(
      this.add
        .text(cx + 4 * k, titleY + 4 * k, 'PAUSE', {
          fontFamily: FONT,
          fontSize: `${Math.round(64 * k)}px`,
          color: '#c94f3d',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    const title = this.add
      .text(cx, titleY, 'PAUSE', {
        fontFamily: FONT,
        fontSize: `${Math.round(64 * k)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setStroke('#27272f', 6 * k);
    overlay.add(title);
    // trait sous le bandeau
    const rule = this.add.graphics();
    rule.lineStyle(4 * k, 0x27272f, 0.35);
    rule.lineBetween(cx - 180 * k, cy - 150 * k, cx + 180 * k, cy - 150 * k);
    overlay.add(rule);

    this.pauseOverlay = overlay;
    overlay.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: overlay, scale: 1, alpha: 1, duration: 240, ease: 'Back.easeOut' });

    // Boutons (absolus : input fiable sur mobile) — couleurs wax vives
    const bw = Math.min(380 * k, w * 0.78);
    const bh = 96 * k;
    this.pauseResumeBtn = UIHelpers.makeButton(
      this,
      {
        x: cx,
        y: cy - 96 * k,
        width: bw,
        height: bh,
        label: 'REPRENDRE',
        fill: 0x2f9e44,
        textColor: '#ffffff',
        radius: 24 * k,
        depth: 85,
        shadowColor: 0x1b5e20,
        icon: 'play',
        iconPosition: 'left',
      },
      () => {
        audioManager.playButton();
        this.togglePause();
      },
    );
    this.pauseRestartBtn = UIHelpers.makeButton(
      this,
      {
        x: cx,
        y: cy + 14 * k,
        width: bw,
        height: bh,
        label: 'RECOMMENCER',
        fill: 0xffc53d,
        radius: 24 * k,
        depth: 85,
        shadowColor: 0xc94f3d,
        fontSize: Math.round(bh * 0.3),
      },
      () => {
        audioManager.playButton();
        this.matter.world.resume();
        this.paused = false;
        this.pauseOverlay?.destroy();
        this.pauseOverlay = undefined;
        this.pauseResumeBtn?.destroy();
        this.pauseRestartBtn?.destroy();
        this.pauseMenuBtn?.destroy();
        this.scene.restart();
      },
    );
    this.pauseMenuBtn = UIHelpers.makeButton(
      this,
      {
        x: cx,
        y: cy + 124 * k,
        width: bw,
        height: bh,
        label: 'MENU',
        fill: 0xc94f3d,
        textColor: '#ffffff',
        radius: 24 * k,
        depth: 85,
        shadowColor: 0x3d599e,
        fontSize: Math.round(bh * 0.32),
      },
      () => {
        audioManager.playButton();
        this.matter.world.resume();
        this.paused = false;
        this.scene.stop();
        this.scene.start('Menu');
      },
    );

    // Entrée en cascade des boutons
    for (const [i, btn] of [this.pauseResumeBtn, this.pauseRestartBtn, this.pauseMenuBtn].entries()) {
      btn.setAlpha(0).setY(btn.y + 50 * k);
      this.tweens.add({
        targets: btn,
        alpha: 1,
        y: btn.y - 50 * k,
        delay: 100 + i * 90,
        duration: 300,
        ease: 'Back.easeOut',
      });
    }
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
      SaveManager.setUnlockedTier(this.mergeManager.bestTier);
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
