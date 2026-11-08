/*
 * ЗВУК БЕЗ ФАЙЛОВ: все эффекты синтезируются Web Audio API.
 * Браузеры разрешают звук только после касания, поэтому unlockAudio() зовётся по первому тапу.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;

export const setMuted = (v: boolean): void => { muted = v; if (master && ctx) master.gain.setTargetAtTime(v ? 0 : 0.5, ctx.currentTime, 0.02); };

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const ch = noise.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* звука не будет — игра работает и так */ }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, to?: number, delay = 0): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function hiss(dur: number, vol = 0.2, freq = 1200, delay = 0): void {
  if (!ctx || !master || !noise) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noise;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t); s.stop(t + dur + 0.05);
}

export type Sfx = 'click' | 'card' | 'hit' | 'big' | 'block' | 'hurt' | 'heal' | 'break' | 'win' | 'lose' | 'coin' | 'buff' | 'poison' | 'turn' | 'relic';

export function play(n: Sfx): void {
  if (muted) return;
  switch (n) {
    case 'click': tone(520, 0.05, 'square', 0.07); break;
    case 'card': hiss(0.08, 0.12, 2500); tone(300, 0.08, 'triangle', 0.1, 500); break;
    case 'hit': hiss(0.12, 0.25, 900); tone(180, 0.12, 'sawtooth', 0.12, 80); break;
    case 'big': hiss(0.25, 0.35, 500); tone(120, 0.3, 'sawtooth', 0.2, 40); break;
    case 'block': tone(700, 0.1, 'square', 0.1, 400); hiss(0.05, 0.1, 4000); break;
    case 'hurt': tone(150, 0.25, 'sawtooth', 0.22, 60); hiss(0.15, 0.2, 400); break;
    case 'heal': tone(520, 0.12, 'sine', 0.15); tone(780, 0.18, 'sine', 0.15, undefined, 0.09); break;
    case 'break': tone(900, 0.08, 'square', 0.2, 200); hiss(0.3, 0.35, 700); tone(100, 0.4, 'sawtooth', 0.2, 40, 0.05); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.18, undefined, i * 0.1)); break;
    case 'lose': [330, 247, 196, 147].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.15, undefined, i * 0.2)); break;
    case 'coin': tone(988, 0.07, 'square', 0.1); tone(1319, 0.14, 'square', 0.1, undefined, 0.07); break;
    case 'buff': tone(440, 0.15, 'triangle', 0.12, 660); break;
    case 'poison': tone(220, 0.2, 'sawtooth', 0.08, 140); break;
    case 'turn': tone(330, 0.1, 'triangle', 0.1); tone(250, 0.15, 'triangle', 0.1, undefined, 0.08); break;
    case 'relic': [660, 880, 1320].forEach((f, i) => tone(f, 0.2, 'sine', 0.15, undefined, i * 0.08)); break;
  }
}
