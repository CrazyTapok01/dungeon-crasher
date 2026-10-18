import type { CityState, SeaState } from '../types';

/*
 * «Ржавый город» и «Бездонное море» — два мира с другой основой, чем бои с монстрами.
 * Здесь только данные и чистые функции (без импорта gameData, чтобы не было циклов).
 */

// ════════════════════════ РЖАВЫЙ ГОРОД ════════════════════════
// Стратегия на таймерах: добыча копится сама, отряды ходят в вылазки, исследования усиливают героя во всех мирах.

export const CITY = { unlockFloor: 15 };

export type BuildingId = 'mine' | 'gen' | 'foundry' | 'depot' | 'barracks' | 'lab';
export interface BuildingDef { id: BuildingId; name: string; emoji: string; desc: string; max: number; metal: number; energy: number; energyFrom: number }
export const BUILDINGS: BuildingDef[] = [
  { id: 'mine',     name: 'Рудник',      emoji: '⛏️', desc: 'Добывает металл',                       max: 25, metal: 30,  energy: 10, energyFrom: 3 },
  { id: 'gen',      name: 'Генератор',   emoji: '⚡', desc: 'Вырабатывает энергию',                  max: 25, metal: 45,  energy: 10, energyFrom: 3 },
  { id: 'depot',    name: 'Склад',       emoji: '🏚️', desc: 'Больше часов накопления без сбора',      max: 20, metal: 40,  energy: 10, energyFrom: 3 },
  { id: 'foundry',  name: 'Плавильня',   emoji: '🔥', desc: 'Медленно выплавляет осколки',            max: 20, metal: 150, energy: 80, energyFrom: 0 },
  { id: 'barracks', name: 'Казарма',     emoji: '🛡️', desc: 'Силу отрядов и их число (1 на 4 ур.)',   max: 20, metal: 80,  energy: 40, energyFrom: 0 },
  { id: 'lab',      name: 'Лаборатория', emoji: '🔬', desc: 'Открывает исследования и усиливает их',   max: 15, metal: 120, energy: 60, energyFrom: 0 },
];
export const buildingDef = (id: string) => BUILDINGS.find(b => b.id === id);
export const START_BUILDINGS: Record<string, number> = { mine: 1, gen: 1, depot: 1 };

/** Цена следующего уровня здания (L — текущий уровень). */
export function buildCost(d: BuildingDef, level: number): { metal: number; energy: number } {
  return {
    metal: Math.round(d.metal * Math.pow(1.5, level)),
    energy: level >= d.energyFrom && d.energy > 0 ? Math.round(d.energy * Math.pow(1.45, level)) : 0,
  };
}
export const lv = (c: { bld: Record<string, number> }, id: string) => c.bld[id] ?? 0;
export function cityRates(c: CityState): { metal: number; energy: number; shards: number } {
  const m = lv(c, 'mine'), g = lv(c, 'gen'), f = lv(c, 'foundry');
  return { metal: 25 * m * Math.pow(1.07, m), energy: 12 * g * Math.pow(1.07, g), shards: 0.8 * f };
}
export const cityCapHours = (c: CityState) => 4 + 2 * lv(c, 'depot');
export function cityPending(c: CityState, now: number): { metal: number; energy: number; shards: number; hours: number; full: boolean } {
  const cap = cityCapHours(c);
  const raw = c.at > 0 ? Math.max(0, (now - c.at) / 3600000) : 0;
  const hours = Math.min(cap, raw);
  const r = cityRates(c);
  return { metal: r.metal * hours, energy: r.energy * hours, shards: r.shards * hours, hours, full: raw >= cap };
}
export const cityLevel = (c: CityState) => Object.values(c.bld).reduce((a, b) => a + b, 0);

export interface MissionDef { id: string; name: string; emoji: string; ms: number; diff: number; barracks: number; metal: number; energy: number; shards: number; gem: number; stone: number }
export const MISSIONS: MissionDef[] = [
  { id: 'scout', name: 'Разведка свалок',  emoji: '🔍', ms: 30 * 60000,     diff: 110,  barracks: 1,  metal: 150,  energy: 60,   shards: 0,  gem: 0,    stone: 0 },
  { id: 'raid',  name: 'Налёт на склады',  emoji: '📦', ms: 2 * 3600000,    diff: 480,  barracks: 3,  metal: 700,  energy: 300,  shards: 3,  gem: 0.03, stone: 0.1 },
  { id: 'siege', name: 'Штурм цитадели',   emoji: '🏰', ms: 6 * 3600000,    diff: 1700, barracks: 7,  metal: 3200, energy: 1300, shards: 12, gem: 0.15, stone: 0.3 },
  { id: 'core',  name: 'Ядро Города',      emoji: '☢️', ms: 12 * 3600000,   diff: 5300, barracks: 12, metal: 9000, energy: 3800, shards: 35, gem: 0.4,  stone: 0.6 },
];
export const squadCount = (c: CityState) => (lv(c, 'barracks') > 0 ? Math.min(4, 1 + Math.floor(lv(c, 'barracks') / 4)) : 0);
export const squadPower = (c: CityState, rebirths: number) => { const b = lv(c, 'barracks'); return 100 * b * Math.pow(1.12, b) * (1 + 0.05 * rebirths); };
export const missionChance = (m: MissionDef, c: CityState, rebirths: number) => Math.max(0.2, Math.min(0.98, squadPower(c, rebirths) / m.diff));
export const missionMult = (c: CityState) => 1 + 0.04 * cityLevel(c);

export type BonusPct = { atk: number; hp: number; def: number; gold: number; xp: number };
export interface ResearchDef { id: string; name: string; emoji: string; key: keyof BonusPct; per: number; max: number }
export const RESEARCH: ResearchDef[] = [
  { id: 'r_atk',  name: 'Оружейные чертежи', emoji: '🗡️', key: 'atk',  per: 1.5, max: 15 },
  { id: 'r_hp',   name: 'Бронированные отсеки', emoji: '❤️', key: 'hp', per: 1.5, max: 15 },
  { id: 'r_def',  name: 'Укреплённая броня',  emoji: '🛡️', key: 'def', per: 1.5, max: 15 },
  { id: 'r_gold', name: 'Торговые сети',      emoji: '💰', key: 'gold', per: 2.5, max: 15 },
  { id: 'r_xp',   name: 'Архивы знаний',      emoji: '📚', key: 'xp',   per: 2.5, max: 15 },
];
export const researchCost = (level: number) => Math.ceil(4 * Math.pow(1.45, level));
export const researchMult = (c: CityState) => (lv(c, 'lab') > 0 ? 1 + 0.1 * (lv(c, 'lab') - 1) : 0);

export const MARKET = { lot: 100, goldPerMetal: (floor: number) => 6 * Math.max(1, floor), gemBase: 50, gemStep: 25, gemMax: 20 };
export const shardGemCost = (c: CityState) => MARKET.gemBase + MARKET.gemStep * c.gemsBought;

export const emptyCity = (): CityState => ({ open: false, res: { metal: 0, energy: 0, shards: 0 }, at: 0, bld: { ...START_BUILDINGS }, research: {}, missions: [], gemsBought: 0, done: 0, report: [] });

// ════════════════════════ БЕЗДОННОЕ МОРЕ ════════════════════════
// Исследование: корабль плывёт между островами (по таймеру), на островах — раскопки, обломки, торговля и левиафаны.

export type IslandType = 'port' | 'treasure' | 'wreck' | 'lair';
export interface IslandDef { id: string; name: string; emoji: string; x: number; y: number; type: IslandType; tier: number; links: string[]; lair?: { hp: number; atk: number; name: string } }
export const ISLANDS: IslandDef[] = [
  { id: 'harbor',  name: 'Порт Ржавый Якорь', emoji: '⚓', x: 50, y: 90, type: 'port',     tier: 1, links: ['reef', 'bay'] },
  { id: 'reef',    name: 'Коралловый риф',    emoji: '🪸', x: 20, y: 76, type: 'treasure', tier: 1, links: ['wreck1', 'shoal'] },
  { id: 'bay',     name: 'Тихая бухта',       emoji: '🏝️', x: 80, y: 76, type: 'treasure', tier: 1, links: ['wreck1', 'wreck2'] },
  { id: 'wreck1',  name: 'Кладбище кораблей', emoji: '🚢', x: 50, y: 66, type: 'wreck',    tier: 1, links: ['port2'] },
  { id: 'shoal',   name: 'Мель Теней',        emoji: '🌫️', x: 12, y: 54, type: 'treasure', tier: 2, links: ['lair1'] },
  { id: 'port2',   name: 'Торговый остров',   emoji: '🏘️', x: 50, y: 50, type: 'port',     tier: 2, links: ['lair1', 'wreck2', 'port3'] },
  { id: 'lair1',   name: 'Логово кракена',    emoji: '🐙', x: 24, y: 36, type: 'lair',     tier: 2, links: ['treasure3'], lair: { hp: 700, atk: 22, name: 'Кракен' } },
  { id: 'wreck2',  name: 'Штормовой утёс',    emoji: '⛈️', x: 84, y: 52, type: 'wreck',    tier: 2, links: ['lair2'] },
  { id: 'lair2',   name: 'Гнездо сирены',     emoji: '🧜', x: 84, y: 30, type: 'lair',     tier: 3, links: ['wreck3'], lair: { hp: 3200, atk: 62, name: 'Сирена-матриарх' } },
  { id: 'port3',   name: 'Вольная гавань',    emoji: '🏴‍☠️', x: 50, y: 30, type: 'port',   tier: 3, links: ['treasure3', 'wreck3'] },
  { id: 'treasure3', name: 'Остров Сокровищ', emoji: '💰', x: 28, y: 14, type: 'treasure', tier: 3, links: ['lair3'] },
  { id: 'wreck3',  name: 'Корабль-призрак',   emoji: '👻', x: 72, y: 12, type: 'wreck',    tier: 4, links: ['lair3'] },
  { id: 'lair3',   name: 'Бездна Левиафана',  emoji: '🌊', x: 50, y: 4,  type: 'lair',     tier: 4, links: [], lair: { hp: 9000, atk: 80, name: 'Левиафан' } },
];
export const island = (id: string) => ISLANDS.find(i => i.id === id)!;
export function neighbors(id: string): string[] {
  const out = new Set(island(id).links);
  for (const i of ISLANDS) if (i.links.includes(id)) out.add(i.id);
  return [...out];
}
export const dist = (a: string, b: string) => { const A = island(a), B = island(b); return Math.hypot(A.x - B.x, A.y - B.y); };

export type ShipPart = 'hull' | 'cannon' | 'crew' | 'sails' | 'hold';
export const SHIP_PARTS: { id: ShipPart; name: string; emoji: string; desc: string; base: number }[] = [
  { id: 'hull',   name: 'Корпус',  emoji: '🛶', desc: 'Прочность корабля',        base: 80 },
  { id: 'cannon', name: 'Пушки',   emoji: '💣', desc: 'Урон в сражениях',         base: 90 },
  { id: 'crew',   name: 'Команда', emoji: '🧑‍✈️', desc: 'Успех событий, щит от штормов', base: 70 },
  { id: 'sails',  name: 'Паруса',  emoji: '⛵', desc: 'Скорость плавания',         base: 100 },
  { id: 'hold',   name: 'Трюм',    emoji: '📦', desc: 'Груз и запас провианта',    base: 60 },
];
export const SHIP_MAX = 15;
export const shipCost = (base: number, level: number) => ({ coin: Math.round(base * Math.pow(1.7, level - 1)), pearls: level >= 8 ? level - 7 : 0 });
export const hullMax = (s: SeaState) => Math.round(100 * Math.pow(s.ship.hull, 1.25));
export const cannonDmg = (s: SeaState, petLevels: number) => Math.round(12 * Math.pow(s.ship.cannon, 1.2) * (1 + 0.01 * petLevels));
export const crewSkill = (s: SeaState, petLevels: number) => Math.min(0.9, 0.12 * s.ship.crew + 0.005 * petLevels);
export const sailSpeed = (s: SeaState) => 1 + 0.15 * (s.ship.sails - 1);
export const foodMax = (s: SeaState) => 30 + 20 * s.ship.hold;
export const cargoMax = (s: SeaState) => 20 + 10 * s.ship.hold;
export const voyageMs = (from: string, to: string, s: SeaState) => Math.round((dist(from, to) * 0.9 * 60000) / sailSpeed(s));
export const voyageFood = (from: string, to: string) => Math.ceil(dist(from, to) / 8);
export const SEA = { unlockFloor: 25, foodPrice: 3, repairPer: 0.6, cooldownMs: { treasure: 6 * 3600000, wreck: 8 * 3600000, lair: 8 * 3600000 } };

export const GOODS: { id: string; name: string; emoji: string; base: number }[] = [
  { id: 'salt', name: 'Соль', emoji: '🧂', base: 10 },
  { id: 'wine', name: 'Вино', emoji: '🍷', base: 26 },
  { id: 'silk', name: 'Шёлк', emoji: '🧵', base: 62 },
];
/** Цена товара в порту: меняется каждые 3 часа (одинаковая для всех игроков, без случайности в хранилище). */
export function goodPrice(portId: string, goodId: string, now: number): number {
  const g = GOODS.find(x => x.id === goodId)!;
  const slot = Math.floor(now / (3 * 3600000));
  let h = 2166136261;
  for (const ch of `${portId}|${goodId}|${slot}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const f = ((h >>> 0) % 1000) / 1000; // 0..1
  const tier = island(portId).tier;
  return Math.max(1, Math.round(g.base * (0.55 + 0.9 * f) * (1 + 0.15 * (tier - 1))));
}
export const SELL_RATE = 0.92;
export const cargoCount = (s: SeaState) => Object.values(s.goods).reduce((a, b) => a + b, 0);

export const emptySea = (): SeaState => ({
  open: false, at: 'harbor', voyage: null, coin: 120, pearls: 0, food: 40, hull: 100,
  ship: { hull: 1, cannon: 1, crew: 1, sails: 1, hold: 1 }, goods: {}, cd: {}, seen: ['harbor', 'reef', 'bay'], visited: ['harbor'], lairs: {}, trips: 0, report: [],
});

/** Бой с левиафаном (мгновенный расчёт). */
export function fightLair(s: SeaState, lair: { hp: number; atk: number }, petLevels: number, rand: () => number): { win: boolean; hullLeft: number; rounds: number } {
  let hp = lair.hp, hull = s.hull, rounds = 0;
  const dmg = cannonDmg(s, petLevels);
  while (hp > 0 && hull > 0 && rounds < 300) {
    rounds++;
    hp -= Math.round(dmg * (0.85 + rand() * 0.3));
    if (hp <= 0) break;
    hull -= Math.round(lair.atk * (0.7 + rand() * 0.6));
  }
  return { win: hp <= 0, hullLeft: Math.max(0, hull), rounds };
}

// ════════════════════════ БОНУСЫ ДЛЯ ВСЕХ МИРОВ ════════════════════════

/** Постоянные бонусы городa и моря к характеристикам героя (в процентах). */
export function worldBonuses(city: CityState, sea: SeaState): BonusPct {
  const out: BonusPct = { atk: 0, hp: 0, def: 0, gold: 0, xp: 0 };
  const k = researchMult(city);
  for (const r of RESEARCH) out[r.key] += (city.research[r.id] ?? 0) * r.per * k;
  const shipLv = sea.open ? Object.values(sea.ship).reduce((a, b) => a + b, 0) - 5 : 0;
  const lairs = Object.values(sea.lairs).filter(v => v > 0).length;
  out.atk += shipLv * 0.4 + lairs * 3;
  out.hp += shipLv * 0.4 + lairs * 3;
  return out;
}
