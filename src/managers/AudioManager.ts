import { SaveManager } from './SaveManager';

/**
 * Audio 100% synthétisé (WebAudio) : aucun fichier requis.
 * Les vrais fichiers audio pourront remplacer ces sons plus tard
 * sans modifier le gameplay (l'interface des méthodes reste stable).
 */
export class AudioManager {
  soundEnabled: boolean;
  musicEnabled: boolean;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.soundEnabled = SaveManager.isSoundEnabled();
    this.musicEnabled = SaveManager.isMusicEnabled();
  }

  /** À appeler après un geste utilisateur (débloque l'audio mobile). */
  unlock(): void {
    this.ensureCtx();
    this.ctx?.resume().catch(() => undefined);
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

  playButton(): void {
    this.tone(880, 0.05, 'square', 0.12, 0);
  }

  playDrop(): void {
    this.slide(320, 170, 0.16, 'sine', 0.22);
  }

  playImpact(): void {
    this.tone(110, 0.09, 'sine', 0.3, 0);
    this.noise(0.05, 0.15);
  }

  /** Son de fusion : hauteur croissante avec le niveau du fruit. */
  playMerge(tier: number): void {
    const base = 392 * Math.pow(1.09, tier);
    this.tone(base, 0.12, 'triangle', 0.3, 0);
    this.tone(base * 1.5, 0.14, 'triangle', 0.3, 0.06);
    this.tone(base * 2, 0.12, 'sine', 0.2, 0.12);
  }

  playCombo(combo: number): void {
    const base = 520 * Math.pow(1.06, combo);
    for (let i = 0; i < 3; i++) {
      this.tone(base * (1 + i * 0.25), 0.07, 'square', 0.15, i * 0.06);
    }
  }

  playDanger(): void {
    this.tone(740, 0.12, 'square', 0.12, 0);
    this.tone(560, 0.14, 'square', 0.12, 0.15);
  }

  playGameOver(): void {
    this.tone(392, 0.22, 'sine', 0.3, 0);
    this.tone(330, 0.22, 'sine', 0.3, 0.24);
    this.tone(262, 0.45, 'sine', 0.3, 0.48);
  }

  // ---------- musique ----------

  /** Boucle kalimba légère (pentatonique). */
  startMusic(): void {
    if (!this.musicEnabled || this.musicTimer) return;
    this.ensureCtx();
    if (!this.ctx) return;
    const scale = [262, 294, 330, 392, 440, 523, 587, 659];
    let step = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx) return;
      step++;
      // mélodie simple : deux notes, parfois un accord
      if (step % 2 === 0) {
        const note = scale[Math.floor(step / 2) % scale.length];
        this.tone(note, 0.28, 'sine', 0.06, 0);
        this.tone(note * 2, 0.2, 'sine', 0.02, 0);
      } else {
        const note = scale[(Math.floor(step / 2) + 4) % scale.length];
        this.tone(note, 0.22, 'triangle', 0.04, 0);
      }
    }, 420);
  }

  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  destroy(): void {
    this.stopMusic();
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
      this.master.gain.value = this.soundEnabled ? 1 : 0;
      this.master.connect(this.ctx.destination);
    }
  }

  private tone(freq: number, duration: number, type: OscillatorType, gain: number, delay: number): void {
    if (!this.soundEnabled) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
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

  /** Petit souffle de bruit (impact). */
  private noise(duration: number, gain: number): void {
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
    filter.frequency.value = 900;
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
