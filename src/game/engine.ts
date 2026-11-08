import type {
  Battle, Card, ClassId, Elem, Enemy, Eff, Fx, FxKind, GameState, Meta, Move, OverInfo, Reward, Run, Shop, ShopItem, StatusId, Statuses,
} from './types';
import { CARDS, STARTER_DECK, canUpgrade, cardDef, cardEff, poolFor } from './data/cards';
import { ENCOUNTERS, ENEMIES } from './data/enemies';
import { CLASS, MAX_ASC, PERKS, POTIONS, POTION, RELIC, RELICS } from './data/items';
import { EVENT, EVENTS, type EvEff } from './data/events';
import { chance, hashStr, pickOne, rand, randInt, shuffle, weighted } from './rng';
import { genMap } from './map';

/*
 * ПРАВИЛА ИГРЫ.
 * gameReducer(state, action) — единственная дверь: берём состояние, копируем, меняем копию,
 * возвращаем её. Внутри нет таймеров и экрана: всё, что нужно показать (числа урона, оглушение),
 * складывается в state.fx, а интерфейс сам решает, как это красиво показать.
 */

export type Action =
  | { type: 'NEW_RUN'; cls: ClassId; asc: number; daily?: string; seed?: number }
  | { type: 'END_RUN' }
  | { type: 'TO_MENU' }
  | { type: 'RESUME' }
  | { type: 'PICK_NODE'; i: number }
  | { type: 'PLAY'; uid: number; target?: number }
  | { type: 'POTION'; slot: number; target?: number }
  | { type: 'DROP_POTION'; slot: number }
  | { type: 'END_TURN' }
  | { type: 'ENEMY_STEP' }
  | { type: 'VICTORY' }
  | { type: 'TAKE_CARD'; i: number }
  | { type: 'SKIP_CARD' }
  | { type: 'TAKE_RELIC'; i: number }
  | { type: 'TAKE_POTION' }
  | { type: 'LEAVE_REWARD' }
  | { type: 'REST_HEAL' }
  | { type: 'REST_MODE'; mode: 'upgrade' | 'forge' | null }
  | { type: 'REST_UPGRADE'; uid: number }
  | { type: 'REST_FORGE'; uid: number; el: Elem }
  | { type: 'REST_LEAVE' }
  | { type: 'SHOP_BUY'; i: number }
  | { type: 'SHOP_REMOVE'; uid: number }
  | { type: 'SHOP_LEAVE' }
  | { type: 'EVENT_CHOOSE'; i: number }
  | { type: 'EVENT_PICK'; uid: number }
  | { type: 'EVENT_LEAVE' }
  | { type: 'BUY_PERK'; id: string }
  | { type: 'SET_TUT' }
  | { type: 'SET_MUTED'; value: boolean };

// ───────────────────────── состояние ─────────────────────────

export const newMeta = (): Meta => ({
  souls: 0, perks: {}, asc: 0, wins: 0, runs: 0, bestRooms: 0, kills: 0,
  classWins: { warrior: 0, mage: 0, thief: 0 }, daily: { date: '', best: 0 }, tut: false, muted: false,
});

export const initialState = (meta: Meta = newMeta(), run: Run | null = null): GameState => ({
  meta, run, screen: run ? 'run' : 'menu', over: null, fx: [],
});

const clone = <T,>(x: T): T => (typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x)) as T);

let fxId = 0;
function fx(d: GameState, kind: FxKind, to: 'hero' | number, extra: Partial<Fx> = {}): void {
  d.fx.push({ id: ++fxId, kind, to, ...extra });
}

const isLost = (b: Battle): boolean => b.phase === 'lost';
export const hasRelic = (r: Run, id: string): boolean => r.relics.includes(id);
const perk = (m: Meta, id: string): number => m.perks[id] ?? 0;

// ───────────────────────── создание забега ─────────────────────────

const newCard = (r: Run, id: string, extra: Partial<Card> = {}): Card => ({ uid: ++r.uid, id, up: false, ...extra });

function newRun(meta: Meta, cls: ClassId, asc: number, daily: string | null, seed?: number): Run {
  const s = seed ?? (daily ? hashStr(`dc-abyss-${daily}`) : Math.floor(Math.random() * 4294967296));
  const maxHp = CLASS[cls].hp + perk(meta, 'hp') * 4;
  const r: Run = {
    v: 1, seed: s, rng: s | 0, daily, cls, asc, hp: maxHp, maxHp,
    gold: 60 + perk(meta, 'gold') * 20,
    deck: [], relics: [], potions: Array(2 + perk(meta, 'potion')).fill(null),
    act: 1, map: [], row: -1, col: 0, pane: 'map', battle: null, reward: null, shop: null,
    restUsed: false, restPick: null, event: null, uid: 0, removals: 0, fights: 0,
    stats: { kills: 0, elites: 0, bosses: 0, rooms: 0, gold: 0, bestHit: 0, breaks: 0, taken: 0 },
    eventFight: null, seenEvents: [],
  };
  r.deck = STARTER_DECK[cls].map(id => newCard(r, id));
  if (asc >= 7) r.deck.push(newCard(r, 'burden'));
  if (perk(meta, 'card') > 0) r.deck.push(newCard(r, pickOne(r, poolFor(cls, 'rare').filter(id => CARDS[id].cls === cls))));
  r.map = genMap(r);
  if (perk(meta, 'relic') > 0) addRelic(r, pickOne(r, RELICS.filter(x => x.rarity === 'common').map(x => x.id)));
  return r;
}

export function addRelic(r: Run, id: string): void {
  if (r.relics.includes(id)) return;
  r.relics.push(id);
  switch (id) {
    case 'heart': r.maxHp += 12; r.hp += 12; break;
    case 'goblin_bag': r.gold += 40; break;
    case 'belt': r.potions.push(null); break;
    case 'orb': r.maxHp = Math.max(10, r.maxHp - 10); r.hp = Math.min(r.hp, r.maxHp); break;
    case 'colossus_heart': r.maxHp += 30; r.hp = r.maxHp; break;
  }
}

// ───────────────────────── бой: создание ─────────────────────────

/** Пока Гард цел, враг получает только эту долю урона. */
export const GUARD_MULT = 0.6;
const ascHp = (a: number) => 1 + 0.08 * a;
const ascDmg = (a: number) => 1 + 0.05 * a;

function makeEnemy(r: Run, meta: Meta, id: string): Enemy {
  const def = ENEMIES[id];
  const hp = Math.ceil(randInt(r, def.hp[0], def.hp[1]) * ascHp(r.asc));
  let guard = def.guard + (r.asc >= 5 ? 1 : 0) + (hasRelic(r, 'crown') ? 1 : 0) - (perk(meta, 'hunter') ? 1 : 0);
  guard = Math.max(1, guard);
  const mi = def.mode === 'cycle' || def.kind !== 'normal' ? 0 : Math.floor(rand(r) * def.pattern.length);
  return {
    uid: ++r.uid, id, hp, maxHp: hp, block: 0, guard, maxGuard: guard, broken: false,
    st: { ...(def.start ?? {}) }, mi, move: def.pattern[mi], raged: false, dmgMult: ascDmg(r.asc),
  };
}

function startBattle(d: GameState, ids: string[], kind: 'normal' | 'elite' | 'boss'): void {
  const r = d.run!;
  const b: Battle = {
    enemies: ids.map(id => makeEnemy(r, d.meta, id)),
    hand: [], draw: [], discard: [], exhaust: [], block: 0, energy: 0,
    maxEnergy: 3 + (hasRelic(r, 'crown') ? 1 : 0), st: {}, turn: 0, phase: 'player', eIdx: 0, kind,
    flags: { firstHit: false, shred: false }, taken: 0,
  };
  b.draw = shuffle(r, r.deck.map(c => ({ ...c })));
  if (hasRelic(r, 'plate')) b.block += 6;
  if (hasRelic(r, 'thornring')) addSt(b.st, 'thorns', 3);
  if (hasRelic(r, 'rage_sign')) addSt(b.st, 'strength', 1);
  if (hasRelic(r, 'horn')) { addSt(b.st, 'strength', 2); addSt(b.st, 'dex', 2); }
  r.battle = b;
  r.pane = 'battle';
  startPlayerTurn(d);
}

function addSt(st: Statuses, s: StatusId, n: number): void {
  const v = (st[s] ?? 0) + n;
  if (v === 0 && s !== 'strength' && s !== 'dex') delete st[s];
  else st[s] = v;
}

function drawCards(r: Run, b: Battle, n: number): void {
  for (let i = 0; i < n; i++) {
    if (b.hand.length >= 10) break;
    if (b.draw.length === 0) {
      if (b.discard.length === 0) break;
      b.draw = shuffle(r, b.discard);
      b.discard = [];
    }
    b.hand.push(b.draw.pop()!);
  }
}

function startPlayerTurn(d: GameState): void {
  const r = d.run!, b = r.battle!;
  const first = b.turn === 0;
  b.turn++;
  b.phase = 'player';
  b.eIdx = 0;
  b.flags.shred = false;
  if (!first) b.block = hasRelic(r, 'bastion') ? Math.min(b.block, 8) : 0;
  b.energy = b.maxEnergy + (first && r.cls === 'thief' ? 1 : 0);
  const poison = b.st.poison ?? 0;
  if (poison > 0) {
    fx(d, 'poison', 'hero', { n: poison });
    addSt(b.st, 'poison', -1);
    hurtHero(d, poison, true);
    if (isLost(b)) return;
  }
  const size = 5 + (r.cls === 'mage' ? 1 : 0) + (hasRelic(r, 'orb') ? 1 : 0) + (first && hasRelic(r, 'scroll') ? 2 : 0);
  drawCards(r, b, size);
}

// ───────────────────────── бой: урон ─────────────────────────

function hurtHero(d: GameState, n: number, ignoreBlock = false): void {
  const r = d.run!, b = r.battle!;
  if (n <= 0) return;
  let left = n;
  if (!ignoreBlock && b.block > 0) {
    const a = Math.min(b.block, left);
    b.block -= a;
    left -= a;
    if (a > 0) fx(d, 'block', 'hero', { n: -a });
  }
  if (left > 0) {
    r.hp = Math.max(0, r.hp - left);
    b.taken += left;
    r.stats.taken += left;
    fx(d, 'hurt', 'hero', { n: left });
  }
  if (r.hp <= 0 && !isLost(b)) {
    b.phase = 'lost';
    fx(d, 'die', 'hero');
  }
}

function healHero(d: GameState, n: number): void {
  const r = d.run!;
  const h = Math.min(r.maxHp - r.hp, Math.max(0, Math.floor(n)));
  if (h <= 0) return;
  r.hp += h;
  fx(d, 'heal', 'hero', { n: h });
}

const patternOf = (e: Enemy): Move[] => {
  const def = ENEMIES[e.id];
  return e.raged && def.rage ? def.rage.pattern : def.pattern;
};

function checkWin(d: GameState): boolean {
  const b = d.run!.battle!;
  if (isLost(b) || b.phase === 'won') return b.phase === 'won';
  if (b.enemies.every(e => e.hp <= 0)) { b.phase = 'won'; return true; }
  return false;
}

function killEnemy(d: GameState, e: Enemy): void {
  const r = d.run!;
  e.hp = 0;
  e.block = 0;
  fx(d, 'die', e.uid);
  const def = ENEMIES[e.id];
  if (def.kind !== 'minion') {
    r.stats.kills++;
    if (def.kind === 'elite') r.stats.elites++;
    if (def.kind === 'boss') r.stats.bosses++;
  }
}

function breakEnemy(d: GameState, e: Enemy): void {
  e.broken = true;
  d.run!.stats.breaks++;
  fx(d, 'break', e.uid);
}

function checkRage(d: GameState, e: Enemy): void {
  const def = ENEMIES[e.id];
  if (!def.rage || e.raged || e.hp <= 0 || e.hp / e.maxHp > def.rage.at) return;
  e.raged = true;
  e.mi = 0;
  e.move = def.rage.pattern[0];
  e.guard = e.maxGuard;
  e.broken = false;
  fx(d, 'text', e.uid, { text: def.rage.text });
  fx(d, 'guard', e.uid, { n: e.guard });
}

/** Один удар по врагу: считает множители, снимает Гард, добивает. */
function hitEnemy(d: GameState, e: Enemy, base: number, el: Elem): void {
  const r = d.run!, b = r.battle!;
  if (e.hp <= 0) return;
  const def = ENEMIES[e.id];
  const weakHit = el !== 'none' && el === def.weak;
  let n = base + (b.st.strength ?? 0);
  if (weakHit && hasRelic(r, 'prism')) n += 2;
  if (b.st.weak) n *= 0.75;
  if (e.st.vuln) n *= 1.5;
  if (e.broken) n *= hasRelic(r, 'hammer') ? 2 : 1.5;
  else if (e.guard > 0) n *= GUARD_MULT;
  if (hasRelic(r, 'dagger') && !b.flags.firstHit) { n *= 2; }
  b.flags.firstHit = true;
  n = base > 0 ? Math.max(1, Math.floor(n)) : 0;

  const absorbed = Math.min(e.block, n);
  e.block -= absorbed;
  const real = n - absorbed;
  e.hp = Math.max(0, e.hp - real);
  if (real > r.stats.bestHit) r.stats.bestHit = real;
  fx(d, absorbed > 0 && real === 0 ? 'block' : 'dmg', e.uid, { n: absorbed > 0 && real === 0 ? -absorbed : real, crit: e.broken });

  if (weakHit && e.guard > 0 && !e.broken) {
    let g = 1;
    if (hasRelic(r, 'wedge') && !b.flags.shred) { g++; b.flags.shred = true; }
    e.guard = Math.max(0, e.guard - g);
    fx(d, 'guard', e.uid, { n: e.guard });
    if (e.guard === 0 && e.hp > 0) breakEnemy(d, e);
  }
  if (e.hp <= 0) { killEnemy(d, e); return; }
  checkRage(d, e);
  const th = e.st.thorns ?? 0;
  if (th > 0) hurtHero(d, th, true);
}

function crushGuard(d: GameState, e: Enemy, n: number): void {
  if (e.hp <= 0 || e.broken || e.guard <= 0) return;
  e.guard = Math.max(0, e.guard - n);
  fx(d, 'guard', e.uid, { n: e.guard });
  if (e.guard === 0) breakEnemy(d, e);
}

function applyStEnemy(d: GameState, e: Enemy, s: StatusId, n: number): void {
  if (e.hp <= 0) return;
  const r = d.run!;
  const v = s === 'poison' && hasRelic(r, 'venom') ? n + 1 : n;
  addSt(e.st, s, v);
  fx(d, 'buff', e.uid, { text: `${s}`, n: v });
}

// ───────────────────────── бой: карты ─────────────────────────

function applyCardEff(d: GameState, def: ReturnType<typeof cardDef>, el: Elem, e: Eff, tgt: Enemy | undefined): void {
  const r = d.run!, b = r.battle!;
  const alive = () => b.enemies.filter(x => x.hp > 0);
  const targets = (): Enemy[] => def.target === 'all' ? alive() : def.target === 'random' ? (alive().length ? [pickOne(r, alive())] : []) : tgt ? [tgt] : [];
  switch (e.k) {
    case 'dmg': {
      const hits = e.hits ?? 1;
      for (let i = 0; i < hits; i++) {
        if (isLost(b)) return;
        if (def.target === 'all') alive().forEach(x => hitEnemy(d, x, e.n, el));
        else if (def.target === 'random') { const a = alive(); if (a.length) hitEnemy(d, pickOne(r, a), e.n, el); }
        else if (tgt) hitEnemy(d, tgt, e.n, el);
      }
      return;
    }
    case 'slam': if (tgt) hitEnemy(d, tgt, b.block, el); return;
    case 'crush': targets().forEach(x => crushGuard(d, x, e.n)); return;
    case 'block': {
      const n = Math.max(0, e.n + (b.st.dex ?? 0));
      b.block += n;
      fx(d, 'block', 'hero', { n });
      return;
    }
    case 'draw': drawCards(r, b, e.n); return;
    case 'energy': b.energy += e.n; return;
    case 'heal': healHero(d, e.n); return;
    case 'hurt': hurtHero(d, e.n, true); return;
    case 'st': {
      const onSelf = e.on === 'self' || (e.on === undefined && def.target === 'self');
      if (onSelf) { addSt(b.st, e.s, e.n); fx(d, 'buff', 'hero', { text: e.s, n: e.n }); }
      else targets().forEach(x => applyStEnemy(d, x, e.s, e.n));
      return;
    }
  }
}

function playCard(d: GameState, uid: number, ti?: number): boolean {
  const r = d.run;
  const b = r?.battle;
  if (!r || !b || r.pane !== 'battle' || b.phase !== 'player') return false;
  const ci = b.hand.findIndex(c => c.uid === uid);
  if (ci < 0) return false;
  const card = b.hand[ci];
  const def = cardDef(card);
  const eff = cardEff(card);
  if (eff.cost < 0 || eff.cost > b.energy) return false;
  const alive = b.enemies.filter(e => e.hp > 0);
  let tgt: Enemy | undefined;
  if (def.target === 'enemy') {
    tgt = ti !== undefined ? b.enemies[ti] : undefined;
    if (!tgt || tgt.hp <= 0) {
      if (alive.length === 1) tgt = alive[0];
      else return false;
    }
  }
  b.energy -= eff.cost;
  b.hand.splice(ci, 1);
  fx(d, 'play', 'hero');
  for (const e of eff.fx) {
    if (isLost(b)) break;
    applyCardEff(d, def, eff.el, e, tgt);
  }
  if (def.type === 'power') { /* остаётся в бою навсегда: карта уходит из оборота */ }
  else if (def.exhaust) b.exhaust.push(card);
  else b.discard.push(card);
  checkWin(d);
  return true;
}

// ───────────────────────── бой: зелья ─────────────────────────

function usePotion(d: GameState, slot: number, ti?: number): boolean {
  const r = d.run;
  const b = r?.battle;
  if (!r || !b || r.pane !== 'battle' || b.phase !== 'player') return false;
  const id = r.potions[slot];
  if (!id) return false;
  const def = POTION[id];
  const alive = b.enemies.filter(e => e.hp > 0);
  let tgt: Enemy | undefined;
  if (def.target === 'enemy') {
    tgt = ti !== undefined ? b.enemies[ti] : undefined;
    if (!tgt || tgt.hp <= 0) { if (alive.length === 1) tgt = alive[0]; else return false; }
  }
  r.potions[slot] = null;
  switch (id) {
    case 'heal': healHero(d, Math.ceil(r.maxHp * 0.35)); break;
    case 'steel': b.block += 16; fx(d, 'block', 'hero', { n: 16 }); break;
    case 'poison': if (tgt) applyStEnemy(d, tgt, 'poison', 9); break;
    case 'bomb': alive.forEach(e => hitEnemy(d, e, 16, 'none')); break;
    case 'acid': alive.forEach(e => crushGuard(d, e, 3)); break;
    case 'might': addSt(b.st, 'strength', 3); fx(d, 'buff', 'hero', { text: 'strength', n: 3 }); break;
    case 'clarity': drawCards(r, b, 3); b.energy += 2; break;
  }
  checkWin(d);
  return true;
}

// ───────────────────────── бой: ход врагов ─────────────────────────

function endTurn(d: GameState): boolean {
  const r = d.run;
  const b = r?.battle;
  if (!r || !b || r.pane !== 'battle' || b.phase !== 'player') return false;
  for (const c of b.hand) {
    const burn = cardDef(c).burn;
    if (burn) hurtHero(d, burn, true);
  }
  if (isLost(b)) return true;
  const regen = (b.st.regen ?? 0) + (hasRelic(r, 'vine') ? 2 : 0);
  if (regen > 0) healHero(d, regen);
  const keep: Card[] = [];
  for (const c of b.hand) { if (cardDef(c).retain) keep.push(c); else b.discard.push(c); }
  b.hand = keep;
  for (const s of ['weak', 'vuln'] as const) if (b.st[s]) addSt(b.st, s, -1);
  b.phase = 'enemy';
  b.eIdx = 0;
  return true;
}

function nextMove(r: Run, e: Enemy): void {
  const def = ENEMIES[e.id];
  const pat = patternOf(e);
  if (def.mode === 'rand') {
    let i = e.mi;
    if (pat.length > 1) while (i === e.mi) i = Math.floor(rand(r) * pat.length);
    e.mi = i;
  } else e.mi = (e.mi + 1) % pat.length;
  e.move = pat[e.mi];
}

function enemyHit(d: GameState, e: Enemy, base: number): void {
  const b = d.run!.battle!;
  let n = base * e.dmgMult + (e.st.strength ?? 0);
  if (e.st.weak) n *= 0.75;
  if (b.st.vuln) n *= 1.5;
  n = Math.max(0, Math.floor(n));
  hurtHero(d, n);
  const th = b.st.thorns ?? 0;
  if (th > 0 && e.hp > 0 && n > 0) {
    e.hp = Math.max(0, e.hp - th);
    fx(d, 'dmg', e.uid, { n: th });
    if (e.hp <= 0) killEnemy(d, e); else checkRage(d, e);
  }
}

function execMove(d: GameState, e: Enemy): void {
  const r = d.run!, b = r.battle!;
  const m = e.move;
  fx(d, 'text', e.uid, { text: `${m.emoji} ${m.name}` });
  if (m.heal) { const h = Math.min(e.maxHp - e.hp, m.heal); e.hp += h; if (h > 0) fx(d, 'heal', e.uid, { n: h }); }
  if (m.block) { e.block += m.block; fx(d, 'block', e.uid, { n: m.block }); }
  if (m.self) for (const [k, v] of Object.entries(m.self)) { addSt(e.st, k as StatusId, v as number); fx(d, 'buff', e.uid, { text: k, n: v as number }); }
  if (m.summon && b.enemies.filter(x => x.hp > 0).length < 3) {
    const minion = makeEnemy(r, d.meta, m.summon);
    b.enemies.push(minion);
    fx(d, 'text', minion.uid, { text: 'Призван!' });
  }
  if (m.dmg) {
    for (let i = 0; i < (m.hits ?? 1); i++) {
      if (isLost(b) || e.hp <= 0) break;
      enemyHit(d, e, m.dmg);
    }
  }
  if (m.hero && !isLost(b)) for (const [k, v] of Object.entries(m.hero)) { addSt(b.st, k as StatusId, v as number); fx(d, 'buff', 'hero', { text: k, n: v as number }); }
  if (m.give && !isLost(b)) {
    for (let i = 0; i < m.give.n; i++) b.discard.push(newCard(r, m.give.id, { temp: true }));
    fx(d, 'text', 'hero', { text: `+${m.give.n} ${CARDS[m.give.id].name}` });
  }
}

function enemyStep(d: GameState): boolean {
  const r = d.run;
  const b = r?.battle;
  if (!r || !b || r.pane !== 'battle' || b.phase !== 'enemy') return false;
  while (b.eIdx < b.enemies.length && b.enemies[b.eIdx].hp <= 0) b.eIdx++;
  if (b.eIdx >= b.enemies.length) { startPlayerTurn(d); return true; }

  const e = b.enemies[b.eIdx];
  e.block = 0;
  const poison = e.st.poison ?? 0;
  if (poison > 0) {
    e.hp = Math.max(0, e.hp - poison);
    fx(d, 'poison', e.uid, { n: poison });
    addSt(e.st, 'poison', -1);
    if (e.hp <= 0) killEnemy(d, e); else checkRage(d, e);
    if (checkWin(d)) return true;
  }
  if (e.hp > 0) {
    const wasBroken = e.broken;
    if (wasBroken) {
      fx(d, 'text', e.uid, { text: '😵 Оглушён' });
      e.broken = false;
      e.guard = e.maxGuard;
      fx(d, 'guard', e.uid, { n: e.guard });
    } else execMove(d, e);
    if (isLost(b)) return true;
    if (e.hp > 0) {
      for (const s of ['weak', 'vuln'] as const) if (e.st[s]) addSt(e.st, s, -1);
      if (e.st.ritual) addSt(e.st, 'strength', e.st.ritual);
      if (!wasBroken) nextMove(r, e);
    }
    if (checkWin(d)) return true;
  }
  b.eIdx++;
  while (b.eIdx < b.enemies.length && b.enemies[b.eIdx].hp <= 0) b.eIdx++;
  if (b.eIdx >= b.enemies.length) startPlayerTurn(d);
  return true;
}

// ───────────────────────── награды ─────────────────────────

function rollCards(r: Run, n: number, rareBonus: number): string[] {
  const out: string[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 50) {
    const rar = weighted(r, ['common', 'uncommon', 'rare'] as const, x => x === 'common' ? 58 : x === 'uncommon' ? 34 : 8 + rareBonus);
    const pool = poolFor(r.cls, rar);
    const id = pickOne(r, pool);
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

function rollRelic(r: Run, rarities: ('common' | 'uncommon' | 'rare' | 'boss')[], w: (x: string) => number = () => 1): string | null {
  const pool = RELICS.filter(x => rarities.includes(x.rarity) && !r.relics.includes(x.id));
  if (!pool.length) return null;
  return weighted(r, pool, x => w(x.rarity) * 1).id;
}

const relicRarityWeight = (rar: string) => rar === 'common' ? 60 : rar === 'uncommon' ? 30 : 10;

function randomPotion(r: Run): string {
  return weighted(r, POTIONS, p => p.id === 'heal' ? 3 : 2).id;
}

function makeReward(d: GameState, kind: 'normal' | 'elite' | 'boss' | 'treasure'): Reward {
  const r = d.run!;
  const base = kind === 'normal' ? randInt(r, 11, 19) : kind === 'elite' ? randInt(r, 27, 38) : kind === 'boss' ? randInt(r, 65, 80) : 0;
  let gold = base * (hasRelic(r, 'goblin_bag') ? 1.25 : 1) * (r.asc >= 3 ? 0.85 : 1);
  gold = Math.round(gold);
  r.gold += gold;
  r.stats.gold += gold;
  const rew: Reward = {
    title: kind === 'boss' ? '👑 Босс повержен' : kind === 'elite' ? '⭐ Элитный враг повержен' : kind === 'treasure' ? '💎 Сокровищница' : '🏆 Победа',
    gold, cards: kind === 'treasure' ? null : rollCards(r, 3, kind === 'boss' ? 25 : kind === 'elite' ? 8 : 0),
    relics: [], potion: null, final: kind === 'boss' && r.act === 3, bossDone: kind === 'boss',
  };
  if (kind === 'elite' || kind === 'treasure') {
    const id = rollRelic(r, ['common', 'uncommon', 'rare'], relicRarityWeight);
    if (id) rew.relics = [id];
  }
  if (kind === 'boss') {
    const bossRel = RELICS.filter(x => x.rarity === 'boss' && !r.relics.includes(x.id)).map(x => x.id);
    rew.relics = shuffle(r, bossRel).slice(0, 3);
  }
  const hasSlot = r.potions.some(p => p === null);
  const pChance = kind === 'normal' ? 0.32 : kind === 'elite' ? 0.55 : 0;
  if (hasSlot && pChance > 0 && chance(r, pChance)) rew.potion = randomPotion(r);
  return rew;
}

function claimVictory(d: GameState): boolean {
  const r = d.run;
  const b = r?.battle;
  if (!r || !b || b.phase !== 'won') return false;
  if (r.cls === 'warrior') healHero(d, 6);
  if (hasRelic(r, 'chalice')) healHero(d, 7);
  const kind = b.kind;
  const evKind = r.eventFight;
  r.eventFight = null;
  const rewardKind = kind === 'boss' ? 'boss' : evKind === 'elite' ? 'elite' : kind;
  r.battle = null;
  r.reward = makeReward(d, rewardKind);
  r.pane = 'reward';
  return true;
}

// ───────────────────────── комнаты ─────────────────────────

function genShop(d: GameState): Shop {
  const r = d.run!;
  const disc = (hasRelic(r, 'coupon') ? 0.75 : 1) * (1 - 0.08 * perk(d.meta, 'trade'));
  const items: ShopItem[] = [];
  const cardIds: string[] = [];
  const pool = (rar: 'common' | 'uncommon' | 'rare') => poolFor(r.cls, rar);
  for (const rar of ['common', 'common', 'uncommon', 'uncommon', 'rare'] as const) {
    const choices = pool(rar).filter(id => !cardIds.includes(id));
    if (!choices.length) continue;
    const id = pickOne(r, choices);
    cardIds.push(id);
    const base = rar === 'common' ? 48 : rar === 'uncommon' ? 78 : 140;
    items.push({ kind: 'card', id, price: Math.round((base + randInt(r, -8, 8)) * disc), sold: false, sale: false });
  }
  const relicIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const pool2 = RELICS.filter(x => x.rarity !== 'boss' && !r.relics.includes(x.id) && !relicIds.includes(x.id));
    if (!pool2.length) break;
    const rel = weighted(r, pool2, x => relicRarityWeight(x.rarity));
    relicIds.push(rel.id);
    const base = rel.rarity === 'common' ? 135 : rel.rarity === 'uncommon' ? 185 : 245;
    items.push({ kind: 'relic', id: rel.id, price: Math.round((base + randInt(r, -12, 12)) * disc), sold: false, sale: false });
  }
  for (let i = 0; i < 2; i++) {
    const p = POTION[randomPotion(r)];
    items.push({ kind: 'potion', id: p.id, price: Math.round(p.price * disc), sold: false, sale: false });
  }
  const sale = items[Math.floor(rand(r) * items.length)];
  sale.sale = true;
  sale.price = Math.round(sale.price * 0.6);
  return { items, removeUsed: false };
}

export const removePrice = (r: Run, meta: Meta): number =>
  Math.round((70 + 25 * r.removals) * (hasRelic(r, 'coupon') ? 0.75 : 1) * (1 - 0.08 * perk(meta, 'trade')));

export const restHealPct = (r: Run, meta: Meta): number => (r.asc >= 4 ? 0.25 : 0.30) + 0.05 * perk(meta, 'rest');

function enterNode(d: GameState, i: number): boolean {
  const r = d.run;
  if (!r || r.pane !== 'map') return false;
  const row = r.row + 1;
  const options = r.row < 0 ? r.map[0].map((_, k) => k) : r.map[r.row][r.col].next;
  if (!options.includes(i)) return false;
  r.row = row;
  r.col = i;
  r.stats.rooms++;
  const node = r.map[row][i];
  const enc = ENCOUNTERS[r.act];
  switch (node.kind) {
    case 'fight': {
      const pool = r.fights < 2 ? enc.easy : enc.hard;
      r.fights++;
      startBattle(d, pickOne(r, pool), 'normal');
      break;
    }
    case 'elite': startBattle(d, pickOne(r, enc.elite), 'elite'); break;
    case 'boss': startBattle(d, [enc.boss], 'boss'); break;
    case 'shop': r.shop = genShop(d); r.pane = 'shop'; break;
    case 'rest': r.restUsed = false; r.restPick = null; r.pane = 'rest'; break;
    case 'treasure': r.reward = makeReward(d, 'treasure'); r.pane = 'reward'; break;
    case 'event': {
      const fresh = EVENTS.filter(x => !r.seenEvents.includes(x.id));
      const ev = pickOne(r, fresh.length ? fresh : EVENTS);
      r.seenEvents.push(ev.id);
      if (r.seenEvents.length >= EVENTS.length) r.seenEvents = [];
      r.event = { id: ev.id, stage: 'choose', result: '', pick: null };
      r.pane = 'event';
      break;
    }
  }
  return true;
}

function leaveToMap(r: Run): void {
  r.pane = 'map';
  r.reward = null;
  r.shop = null;
  r.event = null;
  r.restPick = null;
}

function nextAct(d: GameState): void {
  const r = d.run!;
  r.act = (r.act + 1) as 1 | 2 | 3;
  r.map = genMap(r);
  r.row = -1;
  r.col = 0;
  r.fights = 0;
  r.hp = Math.min(r.maxHp, r.hp + Math.ceil(r.maxHp * 0.5));
  leaveToMap(r);
}

// ───────────────────────── события ─────────────────────────

function applyEv(d: GameState, effs: EvEff[]): string {
  const r = d.run!;
  const ev = r.event!;
  let text = '';
  for (const e of effs) {
    switch (e.k) {
      case 'gold': r.gold = Math.max(0, r.gold + e.n); break;
      case 'hp': r.hp = Math.min(r.maxHp, Math.max(1, r.hp + e.n)); break;
      case 'hpPct': r.hp = Math.min(r.maxHp, r.hp + Math.ceil(r.maxHp * e.n / 100)); break;
      case 'maxHp': r.maxHp = Math.max(10, r.maxHp + e.n); r.hp = Math.min(r.maxHp, e.n > 0 ? r.hp + e.n : r.hp); break;
      case 'relic': { const id = rollRelic(r, ['common', 'uncommon', 'rare'], relicRarityWeight); if (id) { addRelic(r, id); text += ` Получена реликвия: ${RELIC[id].name}.`; } break; }
      case 'potion': { const i = r.potions.indexOf(null); if (i >= 0) { r.potions[i] = randomPotion(r); } break; }
      case 'card': { const id = pickOne(r, poolFor(r.cls, e.rarity)); r.deck.push(newCard(r, id)); text += ` Новая карта: ${CARDS[id].name}.`; break; }
      case 'curse': r.deck.push(newCard(r, 'burden')); text += ' В колоду добавлено «Бремя».'; break;
      case 'upgrade': if (!r.deck.some(canUpgrade)) { text += ' Улучшать нечего.'; break; } ev.pick = 'upgrade'; return text;
      case 'remove': ev.pick = 'remove'; return text;
      case 'fight': {
        r.eventFight = e.kind;
        const enc = ENCOUNTERS[r.act];
        r.event = null;
        startBattle(d, pickOne(r, e.kind === 'elite' ? enc.elite : enc.hard), e.kind === 'elite' ? 'elite' : 'normal');
        return text;
      }
      case 'gamble': {
        const win = chance(r, e.p);
        text += win ? ' Тебе повезло!' : ' Не повезло...';
        text += applyEv(d, win ? e.win : e.lose);
        if (!r.event || r.event.pick) return text;
        break;
      }
    }
  }
  return text;
}

function evChoose(d: GameState, i: number): boolean {
  const r = d.run;
  if (!r || r.pane !== 'event' || !r.event || r.event.stage !== 'choose') return false;
  const def = EVENT[r.event.id];
  const ch = def.choices[i];
  if (!ch) return false;
  if (ch.needGold && r.gold < ch.needGold) return false;
  const extra = applyEv(d, ch.fx);
  if (r.event) {
    r.event.result = ch.result + extra;
    if (!r.event.pick) r.event.stage = 'result';
  }
  return true;
}

function evPick(d: GameState, uid: number): boolean {
  const r = d.run;
  if (!r || !r.event || !r.event.pick) return false;
  const c = r.deck.find(x => x.uid === uid);
  if (!c) return false;
  if (r.event.pick === 'upgrade') { if (!canUpgrade(c)) return false; c.up = true; r.event.result += ` «${cardDef(c).name}» улучшена.`; }
  else { r.deck = r.deck.filter(x => x.uid !== uid); r.removals++; r.event.result += ` «${cardDef(c).name}» убрана из колоды.`; }
  r.event.pick = null;
  r.event.stage = 'result';
  return true;
}

// ───────────────────────── конец забега ─────────────────────────

export function scoreOf(r: Run, win: boolean): number {
  return r.stats.rooms * 10 + r.stats.elites * 25 + r.stats.bosses * 100 + (win ? 500 : 0) + Math.floor(r.stats.gold / 10) + r.asc * 20;
}

function finishRun(d: GameState, win: boolean): void {
  const r = d.run!;
  const m = d.meta;
  const souls = r.stats.rooms + r.stats.elites * 3 + r.stats.bosses * 12 + (win ? 40 + r.asc * 10 : 0);
  m.souls += souls;
  m.runs++;
  m.kills += r.stats.kills;
  m.bestRooms = Math.max(m.bestRooms, r.stats.rooms + (r.act - 1) * 10);
  let newAsc = false;
  if (win) {
    m.wins++;
    m.classWins[r.cls]++;
    if (!r.daily && r.asc === m.asc && m.asc < MAX_ASC) { m.asc++; newAsc = true; }
  }
  const score = scoreOf(r, win);
  if (r.daily && (m.daily.date !== r.daily || score > m.daily.best)) m.daily = { date: r.daily, best: score };
  const info: OverInfo = { win, cls: r.cls, asc: r.asc, souls, stats: r.stats, act: r.act, score, daily: !!r.daily, newAsc };
  d.over = info;
  d.run = null;
  d.screen = 'over';
}

// ───────────────────────── редьюсер ─────────────────────────

function handle(d: GameState, a: Action): boolean {
  const r = d.run;
  switch (a.type) {
    case 'NEW_RUN': {
      if (d.run) return false;
      const asc = Math.max(0, Math.min(a.daily ? 2 : a.asc, MAX_ASC));
      if (!a.daily && asc > d.meta.asc) return false;
      d.run = newRun(d.meta, a.cls, asc, a.daily ?? null, a.seed);
      d.screen = 'run';
      d.over = null;
      return true;
    }
    case 'RESUME': if (!r) return false; d.screen = 'run'; return true;
    case 'TO_MENU': d.screen = 'menu'; d.over = null; return true;
    case 'END_RUN': {
      if (!r) return false;
      finishRun(d, !!r.reward?.final);
      return true;
    }
    case 'PICK_NODE': return enterNode(d, a.i);
    case 'PLAY': return playCard(d, a.uid, a.target);
    case 'POTION': return usePotion(d, a.slot, a.target);
    case 'DROP_POTION': { if (!r || !r.potions[a.slot]) return false; r.potions[a.slot] = null; return true; }
    case 'END_TURN': return endTurn(d);
    case 'ENEMY_STEP': return enemyStep(d);
    case 'VICTORY': return claimVictory(d);
    case 'TAKE_CARD': {
      if (!r?.reward?.cards) return false;
      const id = r.reward.cards[a.i];
      if (!id) return false;
      r.deck.push(newCard(r, id));
      r.reward.cards = null;
      return true;
    }
    case 'SKIP_CARD': { if (!r?.reward?.cards) return false; r.reward.cards = null; return true; }
    case 'TAKE_RELIC': {
      if (!r?.reward) return false;
      const id = r.reward.relics[a.i];
      if (!id) return false;
      addRelic(r, id);
      r.reward.relics = [];
      return true;
    }
    case 'TAKE_POTION': {
      if (!r?.reward?.potion) return false;
      const i = r.potions.indexOf(null);
      if (i < 0) return false;
      r.potions[i] = r.reward.potion;
      r.reward.potion = null;
      return true;
    }
    case 'LEAVE_REWARD': {
      if (!r?.reward) return false;
      if (r.reward.final) { finishRun(d, true); return true; }
      if (r.reward.bossDone) nextAct(d); else leaveToMap(r);
      return true;
    }
    case 'REST_HEAL': {
      if (!r || r.pane !== 'rest' || r.restUsed) return false;
      healHero(d, Math.ceil(r.maxHp * restHealPct(r, d.meta)));
      r.restUsed = true;
      return true;
    }
    case 'REST_MODE': { if (!r || r.pane !== 'rest' || r.restUsed) return false; r.restPick = a.mode; return true; }
    case 'REST_UPGRADE': {
      if (!r || r.pane !== 'rest' || r.restUsed) return false;
      const c = r.deck.find(x => x.uid === a.uid);
      if (!c || !canUpgrade(c)) return false;
      c.up = true;
      r.restUsed = true;
      r.restPick = null;
      return true;
    }
    case 'REST_FORGE': {
      if (!r || r.pane !== 'rest' || r.restUsed) return false;
      const c = r.deck.find(x => x.uid === a.uid);
      if (!c || cardDef(c).type !== 'attack' || cardEff(c).el === a.el) return false;
      c.el = a.el;
      r.restUsed = true;
      r.restPick = null;
      return true;
    }
    case 'REST_LEAVE': { if (!r || r.pane !== 'rest') return false; leaveToMap(r); return true; }
    case 'SHOP_BUY': {
      const sh = r?.shop;
      if (!r || !sh || r.pane !== 'shop') return false;
      const it = sh.items[a.i];
      if (!it || it.sold || r.gold < it.price) return false;
      if (it.kind === 'potion') { const i = r.potions.indexOf(null); if (i < 0) return false; r.potions[i] = it.id; }
      else if (it.kind === 'card') r.deck.push(newCard(r, it.id));
      else addRelic(r, it.id);
      r.gold -= it.price;
      it.sold = true;
      return true;
    }
    case 'SHOP_REMOVE': {
      const sh = r?.shop;
      if (!r || !sh || r.pane !== 'shop' || sh.removeUsed) return false;
      const price = removePrice(r, d.meta);
      const c = r.deck.find(x => x.uid === a.uid);
      if (!c || r.gold < price) return false;
      r.gold -= price;
      r.deck = r.deck.filter(x => x.uid !== a.uid);
      r.removals++;
      sh.removeUsed = true;
      return true;
    }
    case 'SHOP_LEAVE': { if (!r || r.pane !== 'shop') return false; leaveToMap(r); return true; }
    case 'EVENT_CHOOSE': return evChoose(d, a.i);
    case 'EVENT_PICK': return evPick(d, a.uid);
    case 'EVENT_LEAVE': { if (!r || r.pane !== 'event' || r.event?.stage !== 'result') return false; leaveToMap(r); return true; }
    case 'BUY_PERK': {
      const p = PERKS.find(x => x.id === a.id);
      if (!p) return false;
      const lvl = perk(d.meta, p.id);
      const cost = p.cost(lvl);
      if (lvl >= p.max || d.meta.souls < cost) return false;
      d.meta.souls -= cost;
      d.meta.perks[p.id] = lvl + 1;
      return true;
    }
    case 'SET_TUT': if (d.meta.tut) return false; d.meta.tut = true; return true;
    case 'SET_MUTED': d.meta.muted = a.value; return true;
  }
}

export function gameReducer(state: GameState, a: Action): GameState {
  const d = clone(state);
  d.fx = [];
  return handle(d, a) ? d : state;
}
