import { useSyncExternalStore } from 'react';

/*
 * КАЧЕСТВО ГРАФИКИ.
 *   «Авто»    — по умолчанию. Игра сама замечает, что кадры идут медленно, и включает «Низкую».
 *   «Высокая» — все эффекты всегда.
 *   «Низкая»  — меньше частиц, без тумана, свечений и теней: заметно легче для слабых телефонов.
 * Выбор и «запомненная медлительность» хранятся в localStorage.
 */

export type GfxSetting = 'auto' | 'high' | 'low';

const KEY = 'dungeonCrasherGfx';
const SLOW_KEY = 'dungeonCrasherGfxSlow';

function readSetting(): GfxSetting {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'auto' || v === 'high' || v === 'low') return v;
  } catch { /* хранилище недоступно */ }
  return 'auto';
}

function initialAutoLow(): boolean {
  try { if (localStorage.getItem(SLOW_KEY) === '1') return true; } catch { /* ок */ }
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  if ((nav.deviceMemory ?? 8) <= 2) return true;
  if ((navigator.hardwareConcurrency ?? 8) <= 3) return true;
  return false;
}

let setting: GfxSetting = readSetting();
let autoLow = initialAutoLow();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const isLowGfx = () => setting === 'low' || (setting === 'auto' && autoLow);

export function setGfxSetting(value: GfxSetting): void {
  setting = value;
  try { localStorage.setItem(KEY, value); } catch { /* ок */ }
  // выбрав «Авто» заново, даём игре шанс снова проверить устройство
  if (value === 'auto') {
    autoLow = false;
    try { localStorage.removeItem(SLOW_KEY); } catch { /* ок */ }
  }
  emit();
}

/** Вызывается слоем частиц, когда кадры стабильно идут медленнее ~40 FPS. */
export function reportSlowFrames(): void {
  if (setting !== 'auto' || autoLow) return;
  autoLow = true;
  try { localStorage.setItem(SLOW_KEY, '1'); } catch { /* ок */ }
  emit();
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = () => `${setting}|${autoLow ? 1 : 0}`;

export function useGfx(): { setting: GfxSetting; low: boolean } {
  const snap = useSyncExternalStore(subscribe, snapshot);
  const [s, a] = snap.split('|');
  return { setting: s as GfxSetting, low: s === 'low' || (s === 'auto' && a === '1') };
}
