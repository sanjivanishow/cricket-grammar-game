// ============================================================
// Grammar Cricket — Audio Manager
// Synthesizes all game sounds using Web Audio API
// No external audio files required
// ============================================================

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private enabled: boolean = true;
  private crowdVolume: number = 0.7;
  private effectsVolume: number = 0.8;


  // Lazy init to comply with browser autoplay policies
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.value = this.crowdVolume;
      this.crowdGain.connect(this.masterGain);

      this.effectsGain = this.ctx.createGain();
      this.effectsGain.gain.value = this.effectsVolume;
      this.effectsGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(enabled ? 1 : 0, this.ensureContext().currentTime, 0.1);
    }
  }

  setCrowdVolume(vol: number) {
    this.crowdVolume = vol;
    if (this.crowdGain) {
      this.crowdGain.gain.setTargetAtTime(vol, this.ensureContext().currentTime, 0.1);
    }
  }

  setEffectsVolume(vol: number) {
    this.effectsVolume = vol;
    if (this.effectsGain) {
      this.effectsGain.gain.setTargetAtTime(vol, this.ensureContext().currentTime, 0.1);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Bat hit sounds (intensity varies with runs)
  // ─────────────────────────────────────────────────────────

  playBatHit(intensity: 'light' | 'medium' | 'hard' | 'massive') {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.effectsGain!);

    const freqMap = { light: 200, medium: 300, hard: 400, massive: 500 };
    const durMap = { light: 0.08, medium: 0.1, hard: 0.15, massive: 0.2 };

    osc.type = 'square';
    osc.frequency.setValueAtTime(freqMap[intensity], now);
    osc.frequency.exponentialRampToValueAtTime(80, now + durMap[intensity]);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durMap[intensity]);

    osc.start(now);
    osc.stop(now + durMap[intensity]);

    // Add thwack noise
    this.playNoise(0.1, 0.05, this.effectsGain!);
  }

  playBatHitForOutcome(outcome: string) {
    switch (outcome) {
      case 'six': this.playBatHit('massive'); break;
      case 'four': this.playBatHit('hard'); break;
      case 'three': this.playBatHit('medium'); break;
      case 'two': this.playBatHit('medium'); break;
      case 'one': this.playBatHit('light'); break;
      default: break;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Stumps hit
  // ─────────────────────────────────────────────────────────

  playStumpsHit() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Wooden crack sound
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.effectsGain!);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800 - i * 100, now + i * 0.05);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1 + i * 0.05);
      gain.gain.setValueAtTime(0.2, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + i * 0.05);

      osc.start(now + i * 0.05);
      osc.stop(now + 0.2 + i * 0.05);
    }
    this.playNoise(0.15, 0.1, this.effectsGain!);
  }

  // ─────────────────────────────────────────────────────────
  // Crowd sounds
  // ─────────────────────────────────────────────────────────

  playCrowdCheer(intensity: 'light' | 'medium' | 'massive') {
    if (!this.enabled) return;
    this.ensureContext();
    const durMap = { light: 1.0, medium: 2.0, massive: 3.5 };
    const volMap = { light: 0.15, medium: 0.25, massive: 0.4 };
    this.playFilteredNoise(durMap[intensity], volMap[intensity], 800, this.crowdGain!);
  }

  playCrowdGasp() {
    if (!this.enabled) return;
    this.ensureContext();
    const duration = 0.6;
    this.playFilteredNoise(duration, 0.2, 600, this.crowdGain!);
  }

  playCrowdAmbience() {
    if (!this.enabled) return;
    this.ensureContext();
    // Low-level crowd hum
    this.playFilteredNoise(2.0, 0.05, 300, this.crowdGain!);
  }

  // ─────────────────────────────────────────────────────────
  // Celebration / success sounds
  // ─────────────────────────────────────────────────────────

  playSixCelebration() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    void ctx; void now;

    // Ascending fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.effectsGain!);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.3, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });

    this.playCrowdCheer('massive');
  }

  playFourCelebration() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.effectsGain!);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.25, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });

    this.playCrowdCheer('medium');
  }

  playWicketCelebration() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Dramatic descending sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.effectsGain!);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.start(now);
    osc.stop(now + 0.6);
    this.playCrowdGasp();
  }

  playToss() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Coin flip sound
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.effectsGain!);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200 + Math.random() * 400, now + i * 0.05);
      gain.gain.setValueAtTime(0.1, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.03);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.05);
    }
  }

  playScoreboardTick() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.effectsGain!);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playMatchOver() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Victory fanfare
    const melody = [523.25, 523.25, 523.25, 659.25, 523.25, 659.25, 783.99];
    const durations = [0.15, 0.15, 0.15, 0.45, 0.15, 0.15, 0.6];
    let t = now;
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.effectsGain!);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + durations[i]);

      osc.start(t);
      osc.stop(t + durations[i] + 0.05);
      t += durations[i];
    });
  }

  playRunsSound(runs: number) {
    if (!this.enabled) return;
    switch (runs) {
      case 6: this.playSixCelebration(); break;
      case 4: this.playFourCelebration(); break;
      case 3: this.playCrowdCheer('medium'); break;
      case 2: this.playCrowdCheer('light'); break;
      case 1: this.playCrowdAmbience(); break;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Helper: Generate noise buffer
  // ─────────────────────────────────────────────────────────

  private playNoise(duration: number, volume: number, destination: GainNode) {
    const ctx = this.ensureContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    source.start();
  }

  private playFilteredNoise(duration: number, volume: number, frequency: number, destination: GainNode) {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, now);
    filter.Q.setValueAtTime(0.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setTargetAtTime(0, now + duration * 0.7, 0.2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(now);
    source.stop(now + duration);
  }

  // ─────────────────────────────────────────────────────────
  // Button click sound
  // ─────────────────────────────────────────────────────────

  playClick() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.effectsGain!);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.06);
  }
}

// Singleton instance
export const audioManager = new AudioManager();
