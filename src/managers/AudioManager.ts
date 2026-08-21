import Phaser from 'phaser';
import { SaveManager } from './SaveManager';

/** Gain global des bruitages synthétisés (1 = neutre). */
const SFX_GAIN = 1.8;

/**
 * SFX 100% synthétisés (WebAudio). La musique de fond peut venir d'un
 * fichier externe (bgm_*.mp3 chargé par PreloadScene) ou retomber sur
 * la boucle kalimba synthétique si le fichier est absent.
 */
export class AudioManager {
  soundEnabled: boolean;
  musicEnabled: boolean;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private scene: Phaser.Scene | null = null;
  private music: Phaser.Sound.BaseSound | null = null;

  constructor() {
    this.soundEnabled = SaveManager.isSoundEnabled();
    this.musicEnabled = SaveManager.isMusicEnabled();
    // App backgroundée (Home, switch d'app) : le contexte WebAudio continue de
    // tourner nativement même quand le JS est throttled, donc on doit le
    // suspendre explicitement (Phaser gère déjà scene.sound via pauseOnBlur,
    // mais pas notre AudioContext maison pour les SFX/musique synthétisée).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.suspend();
      else this.resumeIfNeeded();
    });
    window.addEventListener('pagehide', () => this.suspend());
  }

  /** Scène active qui porte le gestionnaire de sons (musique en fichier). */
  attachScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  private suspend(): void {
    this.ctx?.suspend().catch(() => undefined);
    if (this.music?.isPlaying) this.music.pause();
  }

  private resumeIfNeeded(): void {
    if (document.hidden) return;
    this.ctx?.resume().catch(() => undefined);
    if (this.musicEnabled && this.music && !this.music.isPlaying) this.music.resume();
  }

  /** À appeler après un geste utilisateur (débloque l'audio mobile). */
  unlock(): void {
    this.ensureCtx();
    this.ctx?.resume().catch(() => undefined);
    this.scene?.sound.unlock();
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    SaveManager.setSoundEnabled(enabled);
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    SaveManager.setMusicEnabled(enabled);
    if (enabled) this.startMusic();
    else this.stopMusic();
  }

  // ---------- effets ----------

  /** Petit "pop" lumineux (boutons). */
  playButton(): void {
    this.tone(660, 0.05, 'square', 0.1, 0);
    this.tone(990, 0.07, 'triangle', 0.12, 0.035);
  }

  /** Chute : glissando descendant + petit boing. */
  playDrop(): void {
    this.slide(420, 190, 0.16, 'sine', 0.22);
    this.tone(140, 0.1, 'triangle', 0.12, 0.02);
  }

  /** Impact : coup sourd + claquement. */
  playImpact(): void {
    this.tone(95, 0.12, 'sine', 0.32, 0);
    this.tone(190, 0.06, 'triangle', 0.18, 0.005);
    this.noise(0.06, 0.16, 500);
  }

  /** Fusion : accord qui s'enrichit avec le niveau du fruit + scintillement. */
  playMerge(tier: number): void {
    const base = 330 * Math.pow(1.09, tier);
    const chord = [1, 1.25, 1.5, 2];
    chord.forEach((ratio, i) => {
      this.tone(base * ratio, 0.16, 'triangle', 0.26, i * 0.045);
    });
    // scintillement aigu
    this.tone(base * 3, 0.1, 'sine', 0.1, 0.18);
    this.noise(0.09, 0.05, 6000);
  }

  /** Combo : arpège pentatonique montant, plus long avec le combo. */
  playCombo(combo: number): void {
    const base = 520 * Math.pow(1.06, combo);
    const ratios = [1, 1.125, 1.25, 1.5, 1.6875, 2, 2.25, 3];
    const count = Math.min(3 + combo, ratios.length);
    for (let i = 0; i < count; i++) {
      this.tone(base * ratios[i], 0.09, 'square', 0.13, i * 0.055);
    }
    if (combo >= 5) this.noise(0.15, 0.06, 8000);
  }

  /** Alarme : deux tons vibrants. */
  playDanger(): void {
    this.tone(740, 0.14, 'square', 0.12, 0, 35);
    this.tone(560, 0.16, 'square', 0.12, 0.16, 30);
  }

  /** Déblocage : petite fanfare triomphale. */
  playUnlock(): void {
    const notes = [392, 523, 659, 784, 1047];
    notes.forEach((f, i) => {
      this.tone(f, 0.14, 'triangle', 0.24, i * 0.07);
    });
    this.tone(1568, 0.2, 'sine', 0.12, 0.35);
  }

  /** Game over : mélodie descendante mélancolique. */
  playGameOver(): void {
    const seq: [number, number, number][] = [
      [392, 0.22, 0],
      [330, 0.22, 0.24],
      [262, 0.3, 0.48],
      [196, 0.6, 0.78],
      [130, 0.9, 1.38],
    ];
    for (const [f, d, delay] of seq) {
      this.tone(f, d, 'sine', 0.26, delay);
    }
  }

  // ---------- musique ----------

  /** Musique de fond : fichier mp3 (boucle) si dispo, sinon kalimba synthétique.
   * Garde-fou anti-doublon : `this.music` est la seule source de vérité (pas de
   * relecture via scene.sound.get(), qui pouvait renvoyer une instance orpheline
   * lors d'un appel concurrent — ex. tap sur JOUER qui déclenche à la fois le
   * pointerdown du menu et le create() de GameScene). */
  startMusic(): void {
    if (!this.musicEnabled) return;
    if (this.music?.isPlaying) return;
    // Fichier externe : le son appartient au SoundManager global (partagé
    // entre scènes), on réutilise l'instance existante si elle existe déjà
    if (this.scene && this.scene.cache.audio.exists('Baobab_Morning')) {
      this.stopSynthMusic();
      if (!this.music) {
        this.music = this.scene.sound.add('Baobab_Morning', { loop: true, volume: 0.35 });
      }
      this.music.play();
      return;
    }
    this.startSynthMusic();
  }

  stopMusic(): void {
    this.stopSynthMusic();
    this.music?.stop();
  }

  /** Boucle kalimba douce : mélodie pentatonique + basse (fallback sans fichier). */
  private startSynthMusic(): void {
    if (this.musicTimer) return;
    this.ensureCtx();
    if (!this.ctx) return;
    const scale = [262, 294, 330, 392, 440, 523, 587, 659];
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx) return;
      step++;
      if (step % 8 === 0) {
        // basse discrète toutes les 8 croches
        const root = scale[(Math.floor(step / 8) * 3) % scale.length];
        this.tone(root / 2, 0.5, 'sine', 0.08, 0);
      }
      if (step % 2 === 0) {
        const note = scale[Math.floor(step / 2) % scale.length];
        this.tone(note, 0.3, 'sine', 0.06, 0);
        this.tone(note * 2, 0.22, 'sine', 0.02, 0.01);
        // petite quinte en harmonie une fois sur deux
        if (step % 4 === 0) {
          this.tone(note * 1.5, 0.26, 'triangle', 0.03, 0);
        }
      } else {
        const note = scale[(Math.floor(step / 2) + 4) % scale.length];
        this.tone(note, 0.2, 'triangle', 0.04, 0);
      }
    }, 420);
  }

  private stopSynthMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  destroy(): void {
    this.stopMusic();
    this.music?.destroy();
    this.music = null;
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  // ---------- synthèse ----------

  private ensureCtx(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      // Boost : la musique de fond (fichier mp3, volume 0.35) couvrait les
      // bruitages synthétisés, à peine audibles en comparaison.
      this.master.gain.value = this.soundEnabled ? SFX_GAIN : 0;
      this.master.connect(this.ctx.destination);
    }
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    delay: number,
    vibratoDepth = 0,
  ): void {
    if (!this.soundEnabled) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (vibratoDepth > 0) {
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        const t = t0 + (duration * i) / steps;
        const off = i % 2 === 0 ? vibratoDepth : -vibratoDepth;
        osc.frequency.linearRampToValueAtTime(freq + off, t);
      }
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  private slide(from: number, to: number, duration: number, type: OscillatorType, gain: number): void {
    if (!this.soundEnabled) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  /** Petit souffle de bruit filtré (impact, scintillement). */
  private noise(duration: number, gain: number, cutoff: number): void {
    if (!this.soundEnabled) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }
}

/** Instance globale partagée entre les scènes (menu, jeu, game over). */
export const audioManager = new AudioManager();