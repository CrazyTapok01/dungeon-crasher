import type { GameEvent } from '../types';

/*
 * ЗВУК БЕЗ ФАЙЛОВ.
 * Все эффекты синтезируются Web Audio API прямо в браузере (WebView на Android тоже умеет),
 * поэтому в игре нет аудио-ассетов и APK остаётся лёгким.
 * Браузеры разрешают звук только после касания — unlockAudio() вызывается по первому тапу.
 */

const MUTE_KEY = 'dungeonCrasherMuted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export const isMuted = () => muted;

export function setMuted(value: boolean): void {
  muted = value;
  try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch { /* не страшно */ }
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.5, ctx.currentTime, 0.02);
}

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* звука не будет — игра работает и так */ }
}

interface ToneOpts { type?: OscillatorType; vol?: number; to?: number; delay?: number }

function tone(freq: number, dur: number, { type = 'sine', vol = 0.25, to, delay = 0 }: ToneOpts = {}): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

interface NoiseOpts { vol?: number; filter?: BiquadFilterType; freq?: number; delay?: number }

function noise(dur: number, { vol = 0.2, filter = 'lowpass', freq = 1800, delay = 0 }: NoiseOpts = {}): void {
  if (!ctx || !master) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const arpeggio = (notes: number[], step: number, type: OscillatorType = 'triangle', vol = 0.2) =>
  notes.forEach((n, i) => tone(n, step * 1.8, { type, vol, delay: i * step }));

export type Sfx =
  | 'hit' | 'crit' | 'strike' | 'hurt' | 'heavy' | 'dodge' | 'block' | 'heal' | 'coin' | 'levelup'
  | 'loot' | 'lootRare' | 'boss' | 'charge' | 'death' | 'shield' | 'poison' | 'floor'
  | 'rebirth' | 'achievement' | 'click' | 'buy' | 'enrage';

export function play(name: Sfx): void {
  if (!ctx || !master || muted) return;
  switch (name) {
    case 'hit':
      noise(0.08, { vol: 0.25, freq: 1800 });
      tone(160, 0.1, { type: 'sawtooth', vol: 0.15, to: 60 });
      break;
    case 'crit':
      noise(0.12, { vol: 0.3, freq: 3000, filter: 'highpass' });
      tone(180, 0.14, { type: 'sawtooth', vol: 0.2, to: 50 });
      tone(880, 0.12, { type: 'square', vol: 0.08, to: 1500, delay: 0.02 });
      break;
    case 'strike':
      noise(0.28, { vol: 0.4, freq: 900 });
      tone(110, 0.32, { type: 'sine', vol: 0.4, to: 38 });
      tone(660, 0.18, { type: 'sawtooth', vol: 0.1, to: 1800, delay: 0.02 });
      break;
    case 'hurt':
      tone(220, 0.16, { type: 'sawtooth', vol: 0.18, to: 90 });
      noise(0.07, { vol: 0.15, freq: 1200 });
      break;
    case 'heavy':
      noise(0.4, { vol: 0.45, freq: 500 });
      tone(80, 0.45, { type: 'sine', vol: 0.5, to: 30 });
      break;
    case 'dodge':
      noise(0.16, { vol: 0.12, filter: 'highpass', freq: 2500 });
      break;
    case 'block':
      tone(1100, 0.14, { type: 'triangle', vol: 0.2, to: 800 });
      noise(0.05, { vol: 0.15, filter: 'highpass', freq: 3500 });
      break;
    case 'heal':
      arpeggio([523, 659, 784], 0.07, 'sine', 0.2);
      break;
    case 'coin':
      tone(1568, 0.07, { type: 'square', vol: 0.06 });
      tone(2093, 0.18, { type: 'square', vol: 0.06, delay: 0.06 });
      break;
    case 'levelup':
      arpeggio([523, 659, 784, 1047, 1319], 0.09, 'triangle', 0.22);
      break;
    case 'loot':
      arpeggio([1319, 1568], 0.06, 'sine', 0.15);
      break;
    case 'lootRare':
      arpeggio([784, 988, 1175, 1568, 1976], 0.08, 'triangle', 0.22);
      break;
    case 'boss':
      tone(70, 0.9, { type: 'sawtooth', vol: 0.25, to: 55 });
      tone(105, 0.9, { type: 'sawtooth', vol: 0.15, to: 80, delay: 0.05 });
      break;
    case 'charge':
      tone(120, 0.7, { type: 'sawtooth', vol: 0.2, to: 520 });
      break;
    case 'death':
      tone(420, 0.9, { type: 'sawtooth', vol: 0.25, to: 50 });
      noise(0.5, { vol: 0.2, freq: 600 });
      break;
    case 'shield':
      tone(500, 0.25, { type: 'triangle', vol: 0.22, to: 1100 });
      break;
    case 'poison':
      tone(300, 0.2, { type: 'sine', vol: 0.15, to: 180 });
      tone(340, 0.2, { type: 'sine', vol: 0.1, to: 200, delay: 0.08 });
      break;
    case 'floor':
      arpeggio([392, 523, 659, 784, 1047], 0.12, 'triangle', 0.25);
      break;
    case 'rebirth':
      arpeggio([262, 330, 392, 523, 659, 784, 1047, 1319], 0.11, 'sine', 0.25);
      break;
    case 'achievement':
      arpeggio([1047, 1319, 1568, 2093], 0.08, 'sine', 0.18);
      break;
    case 'click':
      tone(700, 0.04, { type: 'square', vol: 0.05 });
      break;
    case 'buy':
      tone(900, 0.06, { type: 'square', vol: 0.07 });
      tone(1350, 0.1, { type: 'square', vol: 0.07, delay: 0.05 });
      break;
    case 'enrage':
      tone(200, 0.5, { type: 'sawtooth', vol: 0.22, to: 400 });
      break;
  }
}

/** Какой звук играть на какое игровое событие. */
export function playForEvent(e: GameEvent): void {
  switch (e.type) {
    case 'hero_attack':  play(e.heavy ? 'strike' : e.crit ? 'crit' : 'hit'); break;
    case 'monster_attack':
      play(e.dodged ? 'dodge' : e.blocked ? 'block' : e.heavy ? 'heavy' : 'hurt');
      break;
    case 'monster_dodge': play('dodge'); break;
    case 'thorns': play('hurt'); break;
    case 'poisoned':
    case 'poison_tick':  play('poison'); break;
    case 'heal':         if (e.source !== 'regen') play('heal'); break;
    case 'ability':      if (e.ability === 'shield') play('shield'); break;
    case 'boss_spawn':   play('boss'); break;
    case 'boss_charge':  play('charge'); break;
    case 'enrage':       play('enrage'); break;
    case 'monster_killed': play('coin'); break;
    case 'level_up':     play('levelup'); break;
    case 'loot':         play(e.rarity === 'epic' || e.rarity === 'legendary' ? 'lootRare' : 'loot'); break;
    case 'floor_cleared': play('floor'); break;
    case 'hero_died':    play('death'); break;
    case 'rebirth':      play('rebirth'); break;
    case 'achievement':  play('achievement'); break;
    case 'ui':           play(e.kind === 'sell' ? 'coin' : 'buy'); break;
  }
}
