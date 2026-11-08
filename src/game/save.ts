import type { GameState, Meta, Run } from './types';
import { CARDS } from './data/cards';
import { ENEMIES } from './data/enemies';
import { PERKS, POTION, RELIC } from './data/items';
import { EVENT } from './data/events';
import { initialState, newMeta } from './engine';

const KEY = 'dcAbyss_v1';
const OLD_KEY = 'dungeonCrasherSave_v3';

const num = (x: unknown, d = 0, max = 1e9): number => (typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(0, Math.floor(x))) : d);

function cleanMeta(raw: unknown): Meta {
  const m = newMeta();
  if (!raw || typeof raw !== 'object') return m;
  const o = raw as Record<string, unknown>;
  m.souls = num(o.souls); m.asc = num(o.asc, 0, 8); m.wins = num(o.wins); m.runs = num(o.runs);
  m.bestRooms = num(o.bestRooms); m.kills = num(o.kills);
  m.tut = o.tut === true; m.muted = o.muted === true;
  const p = (o.perks ?? {}) as Record<string, unknown>;
  for (const def of PERKS) { const l = num(p[def.id], 0, def.max); if (l) m.perks[def.id] = l; }
  const cw = (o.classWins ?? {}) as Record<string, unknown>;
  m.classWins = { warrior: num(cw.warrior), mage: num(cw.mage), thief: num(cw.thief) };
  const dl = (o.daily ?? {}) as Record<string, unknown>;
  m.daily = { date: typeof dl.date === 'string' ? dl.date.slice(0, 10) : '', best: num(dl.best) };
  return m;
}

/** Забег принимаем только если каждая его часть понятна игре: иначе он выбрасывается, а прогресс (души) остаётся. */
export function validRun(r: unknown): r is Run {
  try {
    const x = r as Run;
    if (!x || x.v !== 1 || !['warrior', 'mage', 'thief'].includes(x.cls)) return false;
    for (const n of [x.hp, x.maxHp, x.gold, x.act, x.row, x.col, x.uid, x.rng]) if (typeof n !== 'number' || !Number.isFinite(n)) return false;
    if (x.hp < 0 || x.hp > x.maxHp || x.maxHp < 1 || x.gold < 0 || ![1, 2, 3].includes(x.act)) return false;
    if (!Array.isArray(x.deck) || x.deck.length > 200 || !x.deck.every(c => c && CARDS[c.id] && typeof c.uid === 'number')) return false;
    if (!Array.isArray(x.relics) || !x.relics.every(id => RELIC[id])) return false;
    if (!Array.isArray(x.potions) || x.potions.length > 8 || !x.potions.every(p => p === null || POTION[p])) return false;
    if (!Array.isArray(x.map) || x.map.length !== 10 || !x.map.every(row => Array.isArray(row) && row.length > 0 && row.every(n => n && Array.isArray(n.next)))) return false;
    if (x.row < -1 || x.row > 9) return false;
    if (x.row >= 0 && !x.map[x.row][x.col]) return false;
    if (!['map', 'battle', 'reward', 'shop', 'rest', 'event'].includes(x.pane)) return false;
    if (x.pane === 'battle') {
      const b = x.battle;
      if (!b || !Array.isArray(b.enemies) || !b.enemies.length || !b.enemies.every(e => ENEMIES[e.id] && Number.isFinite(e.hp) && e.move)) return false;
      if (![b.hand, b.draw, b.discard, b.exhaust].every(p => Array.isArray(p) && p.every(c => CARDS[c.id]))) return false;
    }
    if (x.pane === 'reward' && !x.reward) return false;
    if (x.pane === 'shop' && !(x.shop && Array.isArray(x.shop.items))) return false;
    if (x.pane === 'event' && !(x.event && EVENT[x.event.id])) return false;
    if (!Array.isArray(x.seenEvents)) x.seenEvents = [];
    return true;
  } catch { return false; }
}

export function loadGame(): GameState {
  try {
    const txt = localStorage.getItem(KEY);
    if (txt) {
      const raw = JSON.parse(txt) as { meta?: unknown; run?: unknown };
      const meta = cleanMeta(raw.meta);
      return initialState(meta, validRun(raw.run) ? raw.run : null);
    }
  } catch { /* битое сохранение — начнём заново */ }
  // Наследие старой версии: немного душ в подарок
  const meta = newMeta();
  try {
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const o = JSON.parse(old) as { meta?: { souls?: unknown; maxFloor?: unknown } };
      meta.souls = Math.min(150, Math.floor(num(o.meta?.souls) / 20) + Math.floor(num(o.meta?.maxFloor) / 4));
    }
  } catch { /* не страшно */ }
  return initialState(meta, null);
}

export function saveGame(s: GameState): void {
  try { localStorage.setItem(KEY, JSON.stringify({ meta: s.meta, run: s.run })); } catch { /* память переполнена — игра идёт и так */ }
}

export function wipeSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* ок */ }
}
