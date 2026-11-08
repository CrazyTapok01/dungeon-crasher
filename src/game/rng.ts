/*
 * Детерминированный генератор (mulberry32). Его состояние лежит прямо в забеге,
 * поэтому ежедневный забег у всех одинаков, а сохранённая игра продолжается с того же места.
 */
export interface Seeded { rng: number }

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rand(o: Seeded): number {
  o.rng = (o.rng + 0x6D2B79F5) | 0;
  let t = Math.imul(o.rng ^ (o.rng >>> 15), 1 | o.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const randInt = (o: Seeded, a: number, b: number): number => a + Math.floor(rand(o) * (b - a + 1));
export const chance = (o: Seeded, p: number): boolean => rand(o) < p;
export function pickOne<T>(o: Seeded, arr: readonly T[]): T { return arr[Math.floor(rand(o) * arr.length)]; }

export function shuffle<T>(o: Seeded, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(o) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function weighted<T>(o: Seeded, items: readonly T[], w: (t: T) => number): T {
  let total = 0;
  for (const it of items) total += w(it);
  let x = rand(o) * total;
  for (const it of items) { x -= w(it); if (x < 0) return it; }
  return items[items.length - 1];
}
