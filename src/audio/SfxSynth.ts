// Synthesized SFX — zero external audio files needed.
// All sounds generated on-the-fly via Web Audio API.

class SfxSynth {
    private _ctx: AudioContext | null = null;
    private _muted = false;

    setMuted(v: boolean): void { this._muted = v; }

    private _ctx_(): AudioContext | null {
        if (this._muted) return null;
        if (!this._ctx) {
            try {
                this._ctx = new (window.AudioContext ?? (window as any).webkitAudioContext)();
            } catch { return null; }
        }
        if (this._ctx.state === 'suspended') void this._ctx.resume();
        return this._ctx;
    }

    // "pwow" — marble launched
    fire(): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(380, t);
        o.frequency.exponentialRampToValueAtTime(65, t + 0.13);
        g.gain.setValueAtTime(0.30, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.16);
    }

    // "tck" — marble lands in chain
    insert(): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const t = ctx.currentTime;
        const size = Math.ceil(ctx.sampleRate * 0.035);
        const buf = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const flt = ctx.createBiquadFilter();
        flt.type = 'bandpass'; flt.frequency.value = 1400; flt.Q.value = 1.2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        src.connect(flt); flt.connect(g); g.connect(ctx.destination);
        src.start(t);
    }

    // Ascending arpeggio — more notes for bigger matches
    match(count: number): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const notes = [261.6, 329.6, 392.0, 523.2, 659.3, 783.9];
        const n = Math.min(count, 6);
        const t = ctx.currentTime;
        for (let i = 0; i < n; i++) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.value = notes[i];
            const nt = t + i * 0.07;
            g.gain.setValueAtTime(0, nt);
            g.gain.linearRampToValueAtTime(0.26, nt + 0.025);
            g.gain.exponentialRampToValueAtTime(0.001, nt + 0.25);
            o.connect(g); g.connect(ctx.destination);
            o.start(nt); o.stop(nt + 0.25);
        }
    }

    // Each chain step plays a higher tone
    chainStep(step: number): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const t = ctx.currentTime;
        const freq = 440 * Math.pow(2, (step * 3) / 12);
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 1.4, t + 0.08);
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.28);
    }

    // Combo ding — pitch rises with level
    combo(level: number): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const t = ctx.currentTime;
        const freq = 440 * Math.pow(2, level * 0.28);
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.38);
    }

    // Double heartbeat thud for danger
    danger(): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const t = ctx.currentTime;
        for (const offset of [0, 0.13]) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = 52;
            g.gain.setValueAtTime(0, t + offset);
            g.gain.linearRampToValueAtTime(0.45, t + offset + 0.04);
            g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);
            o.connect(g); g.connect(ctx.destination);
            o.start(t + offset); o.stop(t + offset + 0.2);
        }
    }

    // Victory fanfare — 6 ascending notes
    win(): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const melody = [523.2, 659.3, 783.9, 1046.5, 880, 1046.5];
        const durs   = [0.12, 0.12, 0.12, 0.28, 0.12, 0.42];
        let t = ctx.currentTime + 0.05;
        for (let i = 0; i < melody.length; i++) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'triangle'; o.frequency.value = melody[i];
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.28, t + 0.025);
            g.gain.exponentialRampToValueAtTime(0.001, t + durs[i]);
            o.connect(g); g.connect(ctx.destination);
            o.start(t); o.stop(t + durs[i]);
            t += durs[i];
        }
    }

    // Descending minor stab for game over
    gameOver(): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const t = ctx.currentTime;
        [220, 196, 165, 131].forEach((freq, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sawtooth'; o.frequency.value = freq;
            const nt = t + i * 0.2;
            g.gain.setValueAtTime(0.26, nt);
            g.gain.exponentialRampToValueAtTime(0.001, nt + 0.22);
            o.connect(g); g.connect(ctx.destination);
            o.start(nt); o.stop(nt + 0.22);
        });
    }

    // "whirr" — bomb charged into the cannon
    bombCharge(): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        const flt = ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(180, t);
        o.frequency.linearRampToValueAtTime(420, t + 0.30);
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(600, t);
        flt.frequency.linearRampToValueAtTime(2000, t + 0.30);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        o.connect(flt); flt.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.32);
    }

    // "fzzz" — short fuse hiss on fire
    bombFuse(): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const t = ctx.currentTime;
        const size = Math.ceil(ctx.sampleRate * 0.45);
        const buf = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < size; i++) {
            const env = 1 - i / size;
            data[i] = (Math.random() * 2 - 1) * env * 0.6;
        }
        const src = ctx.createBufferSource(); src.buffer = buf;
        const flt = ctx.createBiquadFilter();
        flt.type = 'highpass'; flt.frequency.value = 2400; flt.Q.value = 0.7;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        src.connect(flt); flt.connect(g); g.connect(ctx.destination);
        src.start(t);
    }

    // "BOOM" — bomb detonation: low kick + noise crack
    bombDetonate(): void {
        const ctx = this._ctx_(); if (!ctx) return;
        const t = ctx.currentTime;
        // Sub kick
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(160, t);
        o.frequency.exponentialRampToValueAtTime(35, t + 0.22);
        og.gain.setValueAtTime(0.55, t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        o.connect(og); og.connect(ctx.destination);
        o.start(t); o.stop(t + 0.6);
        // Noise crack
        const cracksz = Math.ceil(ctx.sampleRate * 0.6);
        const crackbuf = ctx.createBuffer(1, cracksz, ctx.sampleRate);
        const crackdata = crackbuf.getChannelData(0);
        for (let i = 0; i < cracksz; i++) {
            const env = Math.pow(1 - i / cracksz, 2);
            crackdata[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ctx.createBufferSource(); src.buffer = crackbuf;
        const flt = ctx.createBiquadFilter();
        flt.type = 'bandpass'; flt.frequency.value = 600; flt.Q.value = 0.8;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.4, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        src.connect(flt); flt.connect(ng); ng.connect(ctx.destination);
        src.start(t);
    }
}

export const sfxSynth = new SfxSynth();
