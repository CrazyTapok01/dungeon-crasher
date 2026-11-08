import type { MapNode, NodeKind } from './types';
import { chance, rand, shuffle, weighted, type Seeded } from './rng';

export const MAP_ROWS = 10;   // 0…8 — комнаты, 9 — босс
const LANES = 4;

/** Карта акта: слои комнат, между которыми проложены тропы вперёд. */
export function genMap(o: Seeded): MapNode[][] {
  const rows: MapNode[][] = [];
  for (let r = 0; r < MAP_ROWS - 1; r++) {
    const count = chance(o, 0.55) ? 3 : 2;
    const cols = shuffle(o, [0, 1, 2, 3].slice(0, LANES)).slice(0, count).sort((a, b) => a - b);
    rows.push(cols.map(col => ({ kind: 'fight' as NodeKind, col, next: [] })));
  }
  rows.push([{ kind: 'boss', col: 1.5 as number, next: [] }]);

  // тропы
  for (let r = 0; r < MAP_ROWS - 1; r++) {
    const cur = rows[r], nxt = rows[r + 1];
    cur.forEach((n, i) => {
      const near = nxt.map((m, j) => ({ j, d: Math.abs(m.col - n.col) })).sort((a, b) => a.d - b.d);
      const ok = near.filter(x => x.d <= 1).slice(0, 2);
      n.next = (ok.length ? ok : near.slice(0, 1)).map(x => x.j);
      void i;
    });
    // у каждой комнаты следующего слоя должна быть тропа к ней
    nxt.forEach((m, j) => {
      if (cur.some(n => n.next.includes(j))) return;
      let best = 0, bd = 99;
      cur.forEach((n, i) => { const d = Math.abs(n.col - m.col); if (d < bd) { bd = d; best = i; } });
      cur[best].next.push(j);
    });
    cur.forEach(n => n.next.sort((a, b) => a - b));
  }

  // типы комнат
  const rest = MAP_ROWS - 2;
  rows.forEach((row, r) => {
    if (r === MAP_ROWS - 1) return;
    row.forEach(n => {
      if (r === 0) n.kind = 'fight';
      else if (r === 4) n.kind = 'treasure';
      else if (r === rest) n.kind = 'rest';
      else {
        const opts: [NodeKind, number][] = [
          ['fight', 46], ['event', 22], ['shop', r >= 2 ? 9 : 0], ['rest', r >= 2 ? 8 : 0], ['elite', r >= 3 ? 15 : 0],
        ];
        n.kind = weighted(o, opts.filter(x => x[1] > 0), x => x[1])[0];
      }
    });
  });
  // гарантируем лавку где-то в середине пути
  const mid = rows[5 + (rand(o) < 0.5 ? 0 : 1)];
  if (!rows.some(row => row.some(n => n.kind === 'shop'))) mid[Math.floor(rand(o) * mid.length)].kind = 'shop';
  // и хотя бы один элитный враг
  if (!rows.some(row => row.some(n => n.kind === 'elite'))) {
    const row = rows[3 + Math.floor(rand(o) * 3)];
    row[Math.floor(rand(o) * row.length)].kind = 'elite';
  }
  return rows;
}
