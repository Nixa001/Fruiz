import Phaser from 'phaser';
import { GameOverData } from '../types/GameTypes';
import { UIHelpers } from '../ui/UIHelpers';
import { audioManager } from '../managers/AudioManager';
import { ParticleManager } from '../managers/ParticleManager';
import { ScreenEffects } from '../effects/ScreenEffects';
import { SaveManager } from '../managers/SaveManager';
import { FRUITS } from '../data/FruitData';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const k = h / 1280;
    const cx = w / 2;

    const FONT =
      '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';

    audioManager.attachScene(this);

    if (audioManager.musicEnabled) {
      audioManager.startMusic();
    }

    const particles = new ParticleManager(this);

    const newBest =
      data.score > 0 &&
      data.score >= data.best;

    // ---------------------------------------------------------
    // BACKGROUND
    // ---------------------------------------------------------

    const bg = this.add.graphics().setDepth(0);

    UIHelpers.drawNotebookBackground(
      this,
      bg,
      k
    );

    // Assombrissement léger du fond
    this.add
      .rectangle(
        0,
        0,
        w,
        h,
        0x27272f,
        0.42
      )
      .setOrigin(0)
      .setDepth(1);

    // Fruits décoratifs derrière le panneau
    this.spawnFruitRain(k, w, h);

    // Effets
    new ScreenEffects(this).flash(
      0.25,
      140
    );

    particles.gameOverConfetti();

    // ---------------------------------------------------------
    // MAIN PANEL
    // ---------------------------------------------------------

    const panelW = Math.min(
      w * 0.90,
      650 * k
    );

    const panelH = Math.min(
      h * 0.91,
      1080 * k
    );

    const panelX = cx;
    const panelY = h / 2;

    const panel = this.add
      .container(panelX, panelY)
      .setDepth(10)
      .setScale(0.82)
      .setAlpha(0);

    this.createMainPanel(
      panel,
      panelW,
      panelH,
      k
    );

    // Animation du panneau
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // ---------------------------------------------------------
    // HEADER
    // ---------------------------------------------------------

    this.createHeader(
      panel,
      panelW,
      panelH,
      k,
      FONT
    );

    // ---------------------------------------------------------
    // SCORE
    // ---------------------------------------------------------

    const scoreY =
      -panelH / 2 +
      310 * k;

    this.createScoreCard(
      panel,
      scoreY,
      panelW,
      k,
      FONT,
      data,
      newBest,
      particles,
      panelY + scoreY
    );

    // ---------------------------------------------------------
    // BEST SCORE
    // ---------------------------------------------------------

    const bestY =
      -panelH / 2 +
      473 * k;

    this.createBestScore(
      panel,
      bestY,
      panelW,
      k,
      FONT,
      data.best
    );

    // ---------------------------------------------------------
    // MESSAGE / PROGRESSION
    // ---------------------------------------------------------

    const messageY =
      -panelH / 2 +
      594 * k;

    if (!newBest && data.best > 0) {
      this.createAlmostRecord(
        panel,
        messageY,
        panelW,
        k,
        FONT,
        data
      );
    } else if (newBest) {
      this.createNewRecord(
        panel,
        messageY,
        panelW,
        k,
        FONT
      );
    }

    // ---------------------------------------------------------
    // REPLAY BUTTON
    // ---------------------------------------------------------

    const replayY =
      -panelH / 2 +
      744 * k;

    this.createReplayButton(
      panel,
      replayY,
      panelW,
      k,
      FONT
    );

    // ---------------------------------------------------------
    // SECONDARY BUTTONS
    // ---------------------------------------------------------

    const secondaryY =
      -panelH / 2 +
      871 * k;

    this.createSecondaryButtons(
      panel,
      secondaryY,
      panelW,
      k,
      FONT
    );

    // ---------------------------------------------------------
    // MAIN MENU
    // ---------------------------------------------------------

    const menuY =
      -panelH / 2 +
      984 * k;

    this.createMenuButton(
      panel,
      menuY,
      panelW,
      k,
      FONT
    );

    this.cameras.main.fadeIn(
      250,
      245,
      239,
      223
    );
  }

  // ============================================================
  // MAIN PANEL
  // ============================================================

  private createMainPanel(
    panel: Phaser.GameObjects.Container,
    pw: number,
    ph: number,
    k: number
  ): void {
    const g = this.add.graphics();

    // Ombre bleue
    g.fillStyle(
      0x304f91,
      1
    );

    g.fillRoundedRect(
      -pw / 2 + 9 * k,
      -ph / 2 + 12 * k,
      pw,
      ph,
      36 * k
    );

    // Ombre foncée
    g.fillStyle(
      0x27272f,
      1
    );

    g.fillRoundedRect(
      -pw / 2 + 4 * k,
      -ph / 2 + 5 * k,
      pw,
      ph,
      36 * k
    );

    // Fond crème
    g.fillStyle(
      0xfff8e9,
      1
    );

    g.fillRoundedRect(
      -pw / 2,
      -ph / 2,
      pw,
      ph,
      36 * k
    );

    // Bordure
    g.lineStyle(
      5 * k,
      0x27272f,
      1
    );

    g.strokeRoundedRect(
      -pw / 2,
      -ph / 2,
      pw,
      ph,
      36 * k
    );

    panel.add(g);
  }

  // ============================================================
  // HEADER
  // ============================================================

  private createHeader(
    panel: Phaser.GameObjects.Container,
    pw: number,
    ph: number,
    k: number,
    FONT: string
  ): void {
    const headerH = 150 * k;
    const y = -ph / 2;

    const header = this.add.graphics();

    // Fond jaune
    header.fillStyle(
      0xffc43d,
      1
    );

    header.fillRoundedRect(
      -pw / 2,
      y,
      pw,
      headerH,
      {
        tl: 36 * k,
        tr: 36 * k,
        bl: 0,
        br: 0,
      }
    );

    // Motif wax (réutilise le motif partagé de l'app, cf. Menu/Pause)
    UIHelpers.drawWaxBand(
      header,
      -pw / 2,
      y,
      pw,
      headerH
    );

    // Ligne de séparation
    header.lineStyle(
      5 * k,
      0x27272f,
      1
    );

    header.lineBetween(
      -pw / 2,
      y + headerH,
      pw / 2,
      y + headerH
    );

    panel.add(header);

    // Petites feuilles décoratives
    this.addLeaf(
      panel,
      -pw / 2 + 55 * k,
      y + headerH / 2,
      k,
      -25
    );

    this.addLeaf(
      panel,
      pw / 2 - 55 * k,
      y + headerH / 2,
      k,
      25
    );

    // GAME (ligne 1, centrée)
    const gameText = this.add.text(
      0,
      y + 50 * k,
      'GAME',
      {
        fontFamily: FONT,
        fontSize: `${Math.round(
          58 * k
        )}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      }
    );

    gameText
      .setOrigin(0.5)
      .setStroke(
        '#27272f',
        7 * k
      );

    // OVER (ligne 2, centrée, même taille)
    const overText = this.add.text(
      0,
      y + 106 * k,
      'OVER',
      {
        fontFamily: FONT,
        fontSize: `${Math.round(
          58 * k
        )}px`,
        fontStyle: 'bold',
        color: '#ffc33b',
      }
    );

    overText
      .setOrigin(0.5)
      .setStroke(
        '#27272f',
        7 * k
      );

    panel.add([
      gameText,
      overText,
    ]);

    // Petit bounce du titre
    this.tweens.add({
      targets: [
        gameText,
        overText,
      ],
      yoyo: true,
      repeat: -1,
      duration: 1400,
      y: '+=3',
      ease: 'Sine.easeInOut',
    });
  }

  // ============================================================
  // SCORE CARD
  // ============================================================

  private createScoreCard(
    panel: Phaser.GameObjects.Container,
    y: number,
    pw: number,
    k: number,
    FONT: string,
    data: GameOverData,
    newBest: boolean,
    particles: ParticleManager,
    cardAbsY: number
  ): void {
    const cardW = Math.min(
      pw * 0.78,
      470 * k
    );

    const cardH = 190 * k;

    const card = this.add.container(
      0,
      y
    );

    const g = this.add.graphics();

    // Ombre
    g.fillStyle(
      0xd98b2b,
      1
    );

    g.fillRoundedRect(
      -cardW / 2 + 6 * k,
      -cardH / 2 + 8 * k,
      cardW,
      cardH,
      28 * k
    );

    // Carte
    g.fillStyle(
      0xfffdf8,
      1
    );

    g.fillRoundedRect(
      -cardW / 2,
      -cardH / 2,
      cardW,
      cardH,
      28 * k
    );

    // Bordure
    g.lineStyle(
      5 * k,
      0x27272f,
      1
    );

    g.strokeRoundedRect(
      -cardW / 2,
      -cardH / 2,
      cardW,
      cardH,
      28 * k
    );

    card.add(g);

    // SCORE
    const label = this.add.text(
      0,
      -55 * k,
      'SCORE',
      {
        fontFamily: FONT,
        fontSize: `${Math.round(
          28 * k
        )}px`,
        fontStyle: 'bold',
        color: '#543f3a',
      }
    );

    label.setOrigin(0.5);

    card.add(label);

    // Score
    const scoreText = this.add.text(
      0,
      25 * k,
      '0',
      {
        fontFamily: FONT,
        fontSize: `${Math.round(
          78 * k
        )}px`,
        fontStyle: 'bold',
        color: '#d9472f',
      }
    );

    scoreText
      .setOrigin(0.5)
      .setStroke(
        '#9f2e22',
        2 * k
      );

    card.add(scoreText);

    panel.add(card);

    // Animation
    card
      .setScale(0)
      .setAlpha(0);

    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      delay: 250,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Compteur
    this.tweens.addCounter({
      from: 0,
      to: data.score,
      duration: 1000,
      delay: 400,
      ease: 'Cubic.easeOut',

      onUpdate: tween => {
        const value =
          tween.getValue() ?? 0;

        scoreText.setText(
          Math.round(value).toString()
        );
      },

      onComplete: () => {
        this.tweens.add({
          targets: scoreText,
          scale: 1.2,
          duration: 150,
          yoyo: true,
          ease: 'Back.easeOut',
        });

        if (newBest) {
          particles.comboBurst(
            this.scale.width / 2,
            cardAbsY,
            10
          );
        }
      },
    });
  }

  // ============================================================
  // BEST SCORE
  // ============================================================

  private createBestScore(
    panel: Phaser.GameObjects.Container,
    y: number,
    pw: number,
    k: number,
    FONT: string,
    best: number
  ): void {
    const width = Math.min(
      pw * 0.72,
      430 * k
    );

    const height = 92 * k;

    const row = this.add.container(0, y);

    const g = this.add.graphics();

    // Ombre
    g.fillStyle(
      0xc58c28,
      1
    );

    g.fillRoundedRect(
      -width / 2 + 4 * k,
      -height / 2 + 5 * k,
      width,
      height,
      24 * k
    );

    // Fond
    g.fillStyle(
      0xffe7a1,
      1
    );

    g.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      24 * k
    );

    g.lineStyle(
      4 * k,
      0x9d681d,
      1
    );

    g.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      24 * k
    );

    row.add(
      g
    );

    const text = this.add.text(
      0,
      -16 * k,
      'MEILLEUR SCORE',
      {
        fontFamily: FONT,
        fontSize: `${Math.round(
          17 * k
        )}px`,
        fontStyle: 'bold',
        color: '#573b20',
      }
    );

    text.setOrigin(0.5);

    const value = this.add.text(
      0,
      17 * k,
      best.toString(),
      {
        fontFamily: FONT,
        fontSize: `${Math.round(
          29 * k
        )}px`,
        fontStyle: 'bold',
        color: '#3c2b1e',
      }
    );

    value.setOrigin(0.5);

    // Groupe icône + texte centré : mesure réelle du texte le plus large,
    // pas une estimation à l'œil (évite tout chevauchement).
    const iconR = 18 * k;
    const gapIT = 14 * k;
    const textW = Math.max(text.width, value.width);
    const groupHalf = (iconR * 2 + gapIT + textW) / 2;
    const trophy = UIHelpers.addIcon(this, -groupHalf + iconR, 0, iconR, 'trophy', 0x9d681d);
    row.add(trophy);

    const textX = -groupHalf + iconR * 2 + gapIT + textW / 2;
    text.setX(textX);
    value.setX(textX);
    row.add(text);
    row.add(value);
    panel.add(row);
  }

  // ============================================================
  // ALMOST RECORD
  // ============================================================

  private createAlmostRecord(
    panel: Phaser.GameObjects.Container,
    y: number,
    pw: number,
    k: number,
    FONT: string,
    data: GameOverData
  ): void {
    const width = Math.min(
      pw * 0.78,
      470 * k
    );

    const height = 105 * k;

    const row = this.add.container(0, y);
    const card = this.add.graphics();

    // Ombre
    card.fillStyle(
      0x27272f,
      1
    );

    card.fillRoundedRect(
      -width / 2 + 5 * k,
      -height / 2 + 6 * k,
      width,
      height,
      22 * k
    );

    // Rouge
    card.fillStyle(
      0xd92f20,
      1
    );

    card.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      22 * k
    );

    card.lineStyle(
      4 * k,
      0x27272f,
      1
    );

    card.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      22 * k
    );

    row.add(card);

    const bolt = UIHelpers.addIcon(this, -width / 2 + 30 * k, -28 * k, 13 * k, 'bolt', 0xffe082);
    row.add(bolt);

    const missing =
      Math.max(
        0,
        data.best - data.score
      );

    const title = this.add.text(
      0,
      -28 * k,
      `PRESQUE ! -${missing} PTS`,
      {
        fontFamily: FONT,
        fontSize: `${Math.round(
          20 * k
        )}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      }
    );

    title.setOrigin(0.5);

    row.add(title);

    // Progression
    const barW =
      width - 45 * k;

    const barH =
      15 * k;

    const barY =
      20 * k;

    const track =
      this.add.graphics();

    track.fillStyle(
      0x8e1e19,
      1
    );

    track.fillRoundedRect(
      -barW / 2,
      barY,
      barW,
      barH,
      barH / 2
    );

    row.add(track);

    const fill =
      this.add.graphics();

    row.add(fill);
    panel.add(row);

    const ratio =
      Phaser.Math.Clamp(
        data.score / data.best,
        0,
        1
      );

    this.tweens.addCounter({
      from: 0,
      to: ratio,
      duration: 900,
      delay: 700,
      ease: 'Cubic.easeOut',

      onUpdate: tween => {
        const value =
          tween.getValue() ?? 0;

        fill.clear();

        fill.fillStyle(
          0xffc43d,
          1
        );

        fill.fillRoundedRect(
          -barW / 2,
          barY,
          Math.max(
            barH,
            barW * value
          ),
          barH,
          barH / 2
        );
      },
    });
  }

  // ============================================================
  // NEW RECORD
  // ============================================================

  private createNewRecord(
    panel: Phaser.GameObjects.Container,
    y: number,
    pw: number,
    k: number,
    FONT: string
  ): void {
    const width = Math.min(
      pw * 0.78,
      470 * k
    );

    const height = 95 * k;

    const row = this.add.container(0, y);
    const g = this.add.graphics();

    g.fillStyle(
      0x27272f,
      1
    );

    g.fillRoundedRect(
      -width / 2 + 5 * k,
      -height / 2 + 6 * k,
      width,
      height,
      22 * k
    );

    g.fillStyle(
      0xe3482f,
      1
    );

    g.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      22 * k
    );

    g.lineStyle(
      4 * k,
      0x27272f,
      1
    );

    g.strokeRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      22 * k
    );

    row.add(g);

    const text =
      this.add.text(
        0,
        0,
        'NOUVEAU RECORD !',
        {
          fontFamily: FONT,
          fontSize: `${Math.round(
            24 * k
          )}px`,
          fontStyle: 'bold',
          color: '#ffffff',
        }
      );

    text.setOrigin(
      0.5
    );

    // Réserve la place occupée au sommet des deux pulsations.
    // Le conteneur anime l'icône sans écraser l'échelle ajustée de son PNG.
    const iconR2 = 24 * k;
    const trophyPulse = 1.12;
    const textPulse = 1.06;
    const iconWidth = iconR2 * 2.1 * trophyPulse;
    const textWidth = text.width * textPulse;
    const gapIT2 = 16 * k;
    const contentWidth = iconWidth + gapIT2 + textWidth;
    const content = this.add.container(0, 0).setName('record-content');
    const trophy = this.add.container(-contentWidth / 2 + iconWidth / 2, 0)
      .setName('record-trophy');
    trophy.add(UIHelpers.addIcon(this, 0, 0, iconR2, 'trophy', 0xffffff));
    content.add(trophy);
    this.tweens.add({
      targets: trophy,
      scale: trophyPulse,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    text.setX(contentWidth / 2 - textWidth / 2).setName('record-label');
    content.add(text);
    content.setScale(Math.min(1, (width - 32 * k) / contentWidth));
    row.add(content).setName('game-over-new-record');
    panel.add(row);

    this.tweens.add({
      targets: text,
      scale: textPulse,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ============================================================
  // REPLAY
  // ============================================================

  private createReplayButton(
    panel: Phaser.GameObjects.Container,
    y: number,
    pw: number,
    k: number,
    FONT: string
  ): void {
    const width = Math.min(
      pw * 0.82,
      510 * k
    );

    const height =
      105 * k;

    // Halo
    const halo =
      this.add.graphics();

    halo.fillStyle(
      0xc8f36b,
      0.45
    );

    halo.fillRoundedRect(
      -width / 2 - 10 * k,
      y - height / 2 - 10 * k,
      width + 20 * k,
      height + 20 * k,
      30 * k
    );

    panel.add(halo);

    this.tweens.add({
      targets: halo,
      alpha: 0.1,
      scale: 1.04,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Ombre
    const shadow =
      this.add.graphics();

    shadow.fillStyle(
      0x24511e,
      1
    );

    shadow.fillRoundedRect(
      -width / 2 + 5 * k,
      y - height / 2 + 8 * k,
      width,
      height,
      28 * k
    );

    panel.add(shadow);

    // Bouton
    const button =
      this.add.graphics();

    button.fillStyle(
      0x64b638,
      1
    );

    button.fillRoundedRect(
      -width / 2,
      y - height / 2,
      width,
      height,
      28 * k
    );

    button.lineStyle(
      5 * k,
      0x275b20,
      1
    );

    button.strokeRoundedRect(
      -width / 2,
      y - height / 2,
      width,
      height,
      28 * k
    );

    panel.add(button);

    // Play triangle
    const triangle =
      this.add.graphics();

    triangle.fillStyle(
      0xffffff,
      1
    );

    triangle.beginPath();

    triangle.moveTo(
      -width / 2 + 65 * k,
      y - 32 * k
    );

    triangle.lineTo(
      -width / 2 + 65 * k,
      y + 32 * k
    );

    triangle.lineTo(
      -width / 2 + 105 * k,
      y
    );

    triangle.closePath();

    triangle.fillPath();

    panel.add(triangle);

    const text =
      this.add.text(
        35 * k,
        y,
        'REJOUER',
        {
          fontFamily: FONT,
          fontSize: `${Math.round(
            37 * k
          )}px`,
          fontStyle: 'bold',
          color: '#ffffff',
        }
      );

    text
      .setOrigin(0.5)
      .setStroke(
        '#315d22',
        3 * k
      );

    panel.add(text);

    // Interaction
    const zone =
      this.add
        .zone(
          0,
          y,
          width,
          height
        )
        .setInteractive({
          useHandCursor: true,
        });

    panel.add(zone);

    zone.on(
      'pointerover',
      () => {
        this.tweens.add({
          targets: [
            button,
            text,
            triangle,
          ],
          scale: 1.04,
          duration: 120,
        });
      }
    );

    zone.on(
      'pointerout',
      () => {
        this.tweens.add({
          targets: [
            button,
            text,
            triangle,
          ],
          scale: 1,
          duration: 120,
        });
      }
    );

    zone.on(
      'pointerdown',
      () => {
        audioManager.playButton();

        this.tweens.add({
          targets: [
            button,
            text,
            triangle,
          ],
          scale: 0.96,
          duration: 80,
          yoyo: true,
          onComplete: () => {
            this.scene.stop();
            this.scene.start('Game');
          },
        });
      }
    );
  }

  // ============================================================
  // SECONDARY BUTTONS
  // ============================================================

  private createSecondaryButtons(
    panel: Phaser.GameObjects.Container,
    y: number,
    pw: number,
    k: number,
    FONT: string
  ): void {
    const gap =
      18 * k;

    const totalW =
      Math.min(
        pw * 0.84,
        510 * k
      );

    const buttonW =
      (totalW - gap) / 2;

    const buttonH =
      100 * k;

    const buttons = [
      {
        x: -(buttonW + gap) / 2,
        tex: 'chart' as const,
        label: 'CLASSEMENT',
        action: () => {
          audioManager.playButton();
          // TODO : classement en ligne
          this.showToast('Classement bientôt disponible !', k, FONT);
        },
      },
      {
        x: (buttonW + gap) / 2,
        tex: 'share' as const,
        label: 'PARTAGER',
        action: () => {
          audioManager.playButton();
          // TODO : partage natif
          this.showToast('Partage bientôt disponible !', k, FONT);
        },
      },
    ];

    for (const item of buttons) {
      const x = item.x;
      // Tout le visuel grandit autour du centre du bouton ; sa zone reste fixe.
      const visual = this.add.container(x, y)
        .setName(`game-over-${item.label}`)
        .setSize(buttonW, buttonH);
      panel.add(visual);

      const g =
        this.add.graphics();

      // Ombre
      g.fillStyle(
        0xd08b28,
        1
      );

      g.fillRoundedRect(
        -buttonW / 2 + 4 * k,
        -buttonH / 2 + 6 * k,
        buttonW,
        buttonH,
        22 * k
      );

      // Fond
      g.fillStyle(
        0xffd36b,
        1
      );

      g.fillRoundedRect(
        -buttonW / 2,
        -buttonH / 2,
        buttonW,
        buttonH,
        22 * k
      );

      g.lineStyle(
        4 * k,
        0x9c681c,
        1
      );

      g.strokeRoundedRect(
        -buttonW / 2,
        -buttonH / 2,
        buttonW,
        buttonH,
        22 * k
      );

      visual.add(g);

      const icon = UIHelpers.addIcon(this, 0, -14 * k, 18 * k, item.tex, 0x4d321c);
      visual.add(icon);

      const label =
        this.add.text(
          0,
          28 * k,
          item.label,
          {
            fontFamily: FONT,
            fontSize: `${Math.round(
              18 * k
            )}px`,
            fontStyle: 'bold',
            color: '#4d321c',
          }
        );

      label.setOrigin(0.5);

      visual.add(label);

      const zone =
        this.add
          .zone(
            x,
            y,
            buttonW,
            buttonH
          )
          .setInteractive({
            useHandCursor: true,
          });

      panel.add(zone);

      zone.on(
        'pointerover',
        () => {
          this.tweens.killTweensOf(visual);
          this.tweens.add({
            targets: visual,
            scale: 1.05,
            duration: 120,
          });
        }
      );

      zone.on(
        'pointerout',
        () => {
          this.tweens.killTweensOf(visual);
          this.tweens.add({
            targets: visual,
            scale: 1,
            duration: 120,
          });
        }
      );

      zone.on(
        'pointerdown',
        item.action
      );
    }
  }

  // ============================================================
  // MENU BUTTON
  // ============================================================

  private createMenuButton(
    panel: Phaser.GameObjects.Container,
    y: number,
    pw: number,
    k: number,
    FONT: string
  ): void {
    const width =
      Math.min(
        pw * 0.84,
        510 * k
      );

    const height =
      75 * k;

    const g =
      this.add.graphics();

    g.fillStyle(
      0x27272f,
      1
    );

    g.fillRoundedRect(
      -width / 2 + 3 * k,
      y - height / 2 + 5 * k,
      width,
      height,
      24 * k
    );

    g.fillStyle(
      0xe0e4ea,
      1
    );

    g.fillRoundedRect(
      -width / 2,
      y - height / 2,
      width,
      height,
      24 * k
    );

    g.lineStyle(
      4 * k,
      0x27272f,
      1
    );

    g.strokeRoundedRect(
      -width / 2,
      y - height / 2,
      width,
      height,
      24 * k
    );

    panel.add(g);

    const text =
      this.add.text(
        0,
        y,
        'MENU PRINCIPAL',
        {
          fontFamily: FONT,
          fontSize: `${Math.round(
            25 * k
          )}px`,
          fontStyle: 'bold',
          color: '#353640',
        }
      );

    text.setOrigin(0.5);

    // Groupe icône + texte centré (mesure réelle, pas d'estimation)
    const iconR3 = 14 * k;
    const gapIT3 = 14 * k;
    const groupHalf3 = (iconR3 * 2 + gapIT3 + text.width) / 2;
    const icon = UIHelpers.addIcon(this, -groupHalf3 + iconR3, y, iconR3, 'home', 0x353640);
    panel.add(icon);
    text.setX(-groupHalf3 + iconR3 * 2 + gapIT3 + text.width / 2);
    panel.add(text);

    const zone =
      this.add
        .zone(
          0,
          y,
          width,
          height
        )
        .setInteractive({
          useHandCursor: true,
        });

    panel.add(zone);

    zone.on(
      'pointerdown',
      () => {
        audioManager.playButton();

        this.scene.stop();
        this.scene.start('Menu');
      }
    );
  }

  // ============================================================
  // LEAF
  // ============================================================

  private addLeaf(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    k: number,
    angle: number
  ): void {
    const leaf =
      this.add.graphics();

    leaf.fillStyle(
      0x67ad39,
      1
    );

    leaf.fillEllipse(
      x + 27 * k,
      y,
      55 * k,
      32 * k
    );

    leaf.lineStyle(
      2 * k,
      0x347421,
      1
    );

    leaf.lineBetween(
      x,
      y,
      x + 48 * k,
      y
    );

    leaf.setAngle(
      angle
    );

    panel.add(leaf);
  }

  // ============================================================
  // FRUIT RAIN
  // ============================================================

  private dropFruit(
    img: Phaser.GameObjects.Image,
    w: number,
    h: number
  ): void {
    const startX =
      Phaser.Math.Between(
        Math.round(
          w * 0.05
        ),
        Math.round(
          w * 0.95
        )
      );

    img
      .setPosition(
        startX,
        -100
      )
      .setAngle(
        Phaser.Math.Between(
          -25,
          25
        )
      );

    this.tweens.add({
      targets: img,

      y: h + 120,

      x:
        startX +
        Phaser.Math.Between(
          -100,
          100
        ),

      angle:
        Phaser.Math.Between(
          -50,
          50
        ),

      duration:
        Phaser.Math.Between(
          5000,
          8000
        ),

      delay:
        Phaser.Math.Between(
          0,
          1800
        ),

      ease: 'Sine.easeIn',

      onComplete: () => {
        this.dropFruit(
          img,
          w,
          h
        );
      },
    });
  }

  /** Petit toast temporaire (fonctionnalité pas encore branchée) : donne un
   * retour visuel au tap, au lieu d'un console.log invisible pour le joueur. */
  private showToast(message: string, k: number, FONT: string): void {
    const cx = this.scale.width / 2;
    const y = this.scale.height * 0.16;
    const text = this.add
      .text(cx, y, message, {
        fontFamily: FONT,
        fontSize: `${Math.round(22 * k)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#27272f',
        padding: { x: 16 * k, y: 10 * k },
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setAlpha(0);
    this.tweens.add({
      targets: text,
      alpha: 1,
      y: y - 14 * k,
      duration: 200,
      ease: 'Sine.easeOut',
      yoyo: false,
    });
    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 1100,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => text.destroy(),
    });
  }

  private spawnFruitRain(
    k: number,
    w: number,
    h: number
  ): void {
    const unlockedTier =
      SaveManager.getUnlockedTier();

    const pool =
      FRUITS
        .filter(
          f =>
            f.id <=
            unlockedTier
        )
        .map(
          f =>
            `fruit_${f.id}`
        );

    if (!pool.length) {
      return;
    }

    const count =
      Math.min(
        8,
        pool.length
      );

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const texture =
        pool[
          i %
            pool.length
        ];

      const fruit =
        this.add
          .image(
            0,
            0,
            texture
          )
          .setDepth(2)
          .setScale(
            k * 0.45
          )
          .setAlpha(
            0.75
          );

      this.dropFruit(
        fruit,
        w,
        h
      );
    }
  }
}