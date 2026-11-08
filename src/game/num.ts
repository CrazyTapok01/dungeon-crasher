import { useSyncExternalStore } from 'react';

/*
 * ФОРМАТ ЧИСЕЛ.
 *   «Полный»      — как есть: 1234567890123.
 *   «Сокращённый» — с 1 000 000 000 (миллиард) числа пишутся как 1.23E+9.
 * Выбор хранится в localStorage.
 */
export type NumMode = 'full' | 'short';
const KEY = 'dungeonCrasherNum';

function read(): NumMode {
  try { if (localStorage.getItem(KEY) === 'short') return 'short'; } catch { /* ок */ }
  return 'full';
}
let mode: NumMode = read();
const listeners = new Set<() => void>();

export const getNumMode = () => mode;
export function setNumMode(m: NumMode): void {
  mode = m;
  try { localStorage.setItem(KEY, m); } catch { /* ок */ }
  listeners.forEach(l => l());
}

/** Форматирует число по текущему режиму. Нечисла возвращает как есть. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (mode === 'short' && Math.abs(n) >= 1e9) {
    const [m, e] = n.toExponential(2).split('e');
    return `${m.replace(/\.?0+$/, '')}E${e}`;
  }
  return String(Math.round(n * 100) / 100);
}

/** Подписка компонента на смену режима; возвращает fmt. */
export function useFmt(): (n: number) => string {
  useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => mode);
  return fmt;
}
