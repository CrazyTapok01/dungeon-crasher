import type {
  CityState, SeaState, ClassId, Equipment, PetId, HeroState, Item, ItemSlot, Meta, QuestKind, Rarity, RunSnapshot, WorldId, Settings, SkillLevels, UpgradeCounts,
} from '../types';
import { GOODS, ISLANDS, MISSIONS, RESEARCH, SHIP_MAX, SHIP_PARTS, buildingDef, emptyCity, emptySea, hullMax } from './worldsData';
import {
  ACHIEVEMENTS, INITIAL_HERO, QUEST_INFO, RARITY_NAME, RELICS, RELIC_MAX, SKILLS, HELL_PACTS, SOUL_SHOP, FARMS,
  STAGES_PER_FLOOR, GEM_SHOP, TOWER, parseStone, MAX_SOCKETS, MAX_PERK_LEVELS, ENHANCE, PET_REBIRTH, xpForLevel, AUTO_ENHANCE_STEPS, AUTO_CRAFT_STEPS, pactSlots, PETS, PET_MAX, TALENTS, emptyPets, emptyMeta, emptyRelics, emptySkillLevels, fillQuests,
} from '../gameData';

const SAVE_KEY = 'dungeonCrasherSave_v3';
// Ключи старых версий игры — читаем один раз, чтобы не потерять прогресс
const SAVE_KEY_V2 = 'dungeonCrasherSave_v2';
const LEGACY_HERO_KEY = 'dungeonCrasherSave';
const LEGACY_SKILLS_KEY = 'dungeonCrasherSaveSkills';

export interface SaveData {
  hero: HeroState;
  skillLevels: SkillLevels;
  equipped: Equipment;
  inventory: Item[];
  meta: Meta;
  upgradeCounts: UpgradeCounts;
  settings: Settings;
  heroClass?: ClassId | null;
  talents?: Record<string, number>;
  world?: WorldId;
  offRun?: RunSnapshot | null;
  lastSeen?: number; // когда игру закрыли (мс) — для офлайн-награды
}

const SLOTS: ItemSlot[] = ['weapon', 'armor', 'amulet'];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
/** Неотрицательное число с потолком: защита от отрицательных и «безумных» значений в чужом или испорченном сохранении. */
const nn = (v: unknown, max = 1e15, fallback = 0) => clamp(num(v, fallback), 0, max);
/** То же, но целое. */
const cnt = (v: unknown, max = 1e15, fallback = 0) => Math.floor(nn(v, max, fallback));
/** Метка времени (мс): не из далёкого будущего, иначе таймеры «зависнут» навсегда. */
const past = (v: unknown, now = Date.now()) => clamp(num(v), 0, now);
const soon = (v: unknown, horizonMs: number, now = Date.now()) => clamp(num(v), 0, now + horizonMs);

/** Потолки для героя: чтобы формулы роста (1,25^уровень, 1,065^этаж) не уходили в бесконечность. */
export const HERO_CAPS = { level: 1000, floor: 5000, gold: 1e100, stat: 1e30, kills: 1e12 };

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Берём из сохранения только известные числовые поля — остальное игнорируем, значения ограничиваем. */
function sanitizeHero(raw: Record<string, unknown>): HeroState {
  const hero = { ...INITIAL_HERO };
  for (const key of Object.keys(INITIAL_HERO) as (keyof HeroState)[]) {
    const v = raw[key];
    if (typeof v === 'number' && Number.isFinite(v)) hero[key] = v;
  }
  // В старой версии базовое здоровье называлось maxHp
  if (typeof raw.baseMaxHp !== 'number' && typeof raw.maxHp === 'number') hero.baseMaxHp = raw.maxHp;
  const C = HERO_CAPS;
  hero.level = clamp(Math.floor(hero.level), 1, C.level);
  hero.xpToNext = hero.xpToNext >= 1 && hero.xpToNext <= xpForLevel(hero.level) * 4 ? Math.floor(hero.xpToNext) : xpForLevel(hero.level);
  hero.xp = clamp(hero.xp, 0, hero.xpToNext - 1);
  hero.baseMaxHp = clamp(Math.floor(hero.baseMaxHp), 1, C.stat);
  hero.hp = clamp(Math.floor(hero.hp), 0, C.stat);
  hero.baseAtk = clamp(Math.floor(hero.baseAtk), 0, C.stat);
  hero.baseDef = clamp(Math.floor(hero.baseDef), 0, C.stat);
  hero.gold = clamp(Math.floor(hero.gold), 0, C.gold);
  hero.kills = clamp(Math.floor(hero.kills), 0, C.kills);
  hero.floor = clamp(Math.floor(hero.floor), 1, C.floor);
  hero.stage = clamp(Math.floor(hero.stage), 1, STAGES_PER_FLOOR);
  return hero;
}

/** Принимает и новый формат ({power: 3}), и старый ([{id: 'power', level: 3, ...}]).
 *  Потолок: в Подземелье — максимум навыка + бонус «Расширенного обучения»; в Преисподней навыки без жёсткого потолка (но не бесконечные). */
function sanitizeLevels(raw: unknown, hell = false): SkillLevels {
  const found = new Map<string, unknown>();
  if (Array.isArray(raw)) raw.forEach(s => found.set(s?.id, s?.level));
  else if (raw && typeof raw === 'object') Object.entries(raw).forEach(([k, v]) => found.set(k, v));

  const levels = emptySkillLevels();
  for (const def of SKILLS) {
    const v = found.get(def.id);
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const cap = def.noPerkLevels ? def.maxLevel : hell ? 1e5 : def.maxLevel + MAX_PERK_LEVELS;
    levels[def.id] = clamp(Math.floor(v), 0, cap);
  }
  return levels;
}

function isItem(x: unknown): x is Item {
  const i = asRecord(x);
  return typeof i.id === 'string' && typeof i.name === 'string'
    && SLOTS.includes(i.slot as ItemSlot) && (i.rarity as string) in RARITY_NAME;
}

/** Предмет из сохранения: все числовые поля проверяются и ограничиваются, лишнее отбрасывается. */
function sanitizeItem(x: unknown): Item | null {
  if (!isItem(x)) return null;
  const r = x as unknown as Record<string, unknown>;
  const out: Item = {
    id: String(x.id).slice(0, 60), name: String(x.name).slice(0, 80), slot: x.slot, rarity: x.rarity,
    emoji: typeof r.emoji === 'string' ? r.emoji.slice(0, 8) : '🎁', price: cnt(r.price, 1e15),
  };
  for (const k of ['atk', 'def', 'hp'] as const) if (typeof r[k] === 'number') out[k] = cnt(r[k], 1e15);
  for (const k of ['crit', 'critdmg', 'dodge', 'vamp'] as const) if (typeof r[k] === 'number') out[k] = nn(r[k], 500);
  if (typeof r.plus === 'number') out.plus = cnt(r.plus, ENHANCE.max);
  if (typeof r.set === 'string') out.set = r.set.slice(0, 30);
  const sockets = typeof r.sockets === 'number' ? cnt(r.sockets, MAX_SOCKETS) : 0;
  if (sockets > 0) out.sockets = sockets;
  if (Array.isArray(r.stones)) {
    const stones = r.stones.filter((k): k is string => typeof k === 'string' && !!parseStone(k)).slice(0, sockets);
    if (stones.length) out.stones = stones;
  }
  return out;
}
const sanitizeItems = (raw: unknown, limit = 120): Item[] =>
  Array.isArray(raw) ? raw.map(sanitizeItem).filter((i): i is Item => i !== null).slice(0, limit) : [];

function sanitizeEquipment(raw: unknown): Equipment {
  const src = asRecord(raw);
  const equipped: Equipment = {};
  for (const slot of SLOTS) {
    const item = sanitizeItem(src[slot]);
    if (item && item.slot === slot) equipped[slot] = item;
  }
  return equipped;
}

function sanitizeMeta(raw: unknown, hero: HeroState): Meta {
  const r = asRecord(raw);
  const known = new Set(ACHIEVEMENTS.map(a => a.id));
  const relics = emptyRelics();
  const rr = asRecord(r.relics);
  for (const def of RELICS) relics[def.id] = clamp(Math.floor(num(rr[def.id])), 0, RELIC_MAX);
  const pets = emptyPets();
  const pr = asRecord(r.pets);
  for (const p of PETS) pets[p.id] = clamp(Math.floor(num(pr[p.id])), 0, PET_MAX);
  const ap = PETS.find(p => p.id === r.activePet && pets[p.id] > 0);
  const meta: Meta = {
    ...emptyMeta(),
    souls: cnt(r.souls), rebirths: cnt(r.rebirths, 1e6), maxFloor: clamp(Math.floor(Math.max(1, num(r.maxFloor, 1), hero.floor)), 1, HERO_CAPS.floor),
    bossKills: cnt(r.bossKills), elites: cnt(r.elites), crits: cnt(r.crits), deaths: cnt(r.deaths),
    legendaries: cnt(r.legendaries), goldEarned: nn(r.goldEarned, 1e40), abilitiesUsed: cnt(r.abilitiesUsed),
    achievements: Array.isArray(r.achievements)
      ? r.achievements.filter((a): a is string => typeof a === 'string' && known.has(a))
      : [],
    kills: cnt(r.kills),
    relics,
    quests: Array.isArray(r.quests)
      ? r.quests.map(asRecord)
          .filter(q => (q.kind as string) in QUEST_INFO && num(q.target) > 0)
          .slice(0, 3)
          .map(q => ({
            kind: q.kind as QuestKind, target: nn(q.target, 1e15), base: nn(q.base, 1e15),
            souls: cnt(q.souls, 1e9), gold: nn(q.gold, 1e30),
          }))
      : [],
    questsDone: cnt(r.questsDone),
    goblins: cnt(r.goblins),
    gems: cnt(r.gems), hellMax: cnt(r.hellMax, HERO_CAPS.floor), hellOpen: r.hellOpen === true,
    hellRebirths: cnt(r.hellRebirths, 400), farms: sanitizeFarms(r.farms), farmAt: past(r.farmAt),
    petRank: sanitizePetNums(r.petRank, 1, 3, 1), petReborn: sanitizePetNums(r.petReborn, 0, Date.now() + PET_REBIRTH.hours * 3600000, 0),
    soulUps: sanitizeSoulUps(r.soulUps), soulsSpent: cnt(r.soulsSpent), altar: cnt(r.altar, 1e6), pacts: sanitizePacts(r.pacts),
    gemUps: sanitizeGemUps(r.gemUps), petGear: sanitizePetGear(r.petGear),
    stones: sanitizeStones(r.stones), seen: sanitizeCounts2(r.seen),
    found: Array.isArray(r.found) ? r.found.filter((x): x is string => typeof x === 'string').slice(0, 300) : [],
    collClaimed: Array.isArray(r.collClaimed) ? r.collClaimed.filter((x): x is number => typeof x === 'number') : [],
    tower: { best: cnt(asRecord(r.tower).best, 1e6), keys: clamp(Math.floor(num(asRecord(r.tower).keys, TOWER.maxKeys)), 0, TOWER.maxKeys), at: past(asRecord(r.tower).at) },
    challenge: { last: typeof asRecord(r.challenge).last === 'string' ? (asRecord(r.challenge).last as string) : '', score: cnt(asRecord(r.challenge).score, 1e6) },
    run: sanitizeRunStats(r.run),
    weekly: { week: cnt(asRecord(r.weekly).week, 1e9), best: cnt(asRecord(r.weekly).best, 1e6), claimed: Array.isArray(asRecord(r.weekly).claimed) ? (asRecord(r.weekly).claimed as unknown[]).filter((x): x is number => typeof x === 'number') : [], lastDay: typeof asRecord(r.weekly).lastDay === 'string' ? (asRecord(r.weekly).lastDay as string) : '' },
    raid: { at: past(asRecord(r.raid).at), wins: cnt(asRecord(r.raid).wins) },
    city: sanitizeCity(r.city), sea: sanitizeSea(r.sea),
    pets, activePet: ap ? ap.id : null, egg: typeof r.egg === 'number' ? clamp(Math.floor(r.egg), -1, 999) : -1,
    daily: {
      last: typeof asRecord(r.daily).last === 'string' ? (asRecord(r.daily).last as string) : '',
      streak: cnt(asRecord(r.daily).streak, 1e6),
    },
  };
  const act = HELL_PACTS.map(p => p.id).filter(id => meta.pacts[id]);
  if (act.length > pactSlots(meta.hellRebirths)) meta.pacts = Object.fromEntries(act.slice(0, pactSlots(meta.hellRebirths)).map(id => [id, true]));
  return fillQuests(meta);
}

function numMap(raw: unknown, keys?: (k: string) => boolean, max = 1e6): Record<string, number> {
  const r = asRecord(raw);
  const out: Record<string, number> = {};
  for (const k of Object.keys(r)) if ((!keys || keys(k)) && typeof r[k] === 'number' && Number.isFinite(r[k] as number)) out[k] = clamp(Math.floor(r[k] as number), 0, max);
  return out;
}
const strList = (raw: unknown, ok: (s: string) => boolean = () => true): string[] => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && ok(x)).slice(0, 40) : []);

function sanitizeCity(raw: unknown): CityState {
  const r = asRecord(raw), d = emptyCity(), res = asRecord(r.res);
  const bld = numMap(r.bld, k => !!buildingDef(k), 100);
  return {
    open: r.open === true,
    res: { metal: nn(res.metal, 1e18), energy: nn(res.energy, 1e18), shards: nn(res.shards, 1e15) },
    at: past(r.at),
    bld: Object.keys(bld).length ? bld : d.bld,
    research: numMap(r.research, k => RESEARCH.some(x => x.id === k), 100),
    missions: Array.isArray(r.missions) ? r.missions.map(asRecord).filter(m => MISSIONS.some(x => x.id === m.id) && typeof m.endAt === 'number' && Number.isFinite(m.endAt)).map(m => ({ id: m.id as string, endAt: soon(m.endAt, 13 * 3600000) })).slice(0, 4) : [],
    gemsBought: cnt(r.gemsBought, 1e6), done: cnt(r.done), report: strList(r.report).slice(0, 6),
  };
}

function sanitizeSea(raw: unknown): SeaState {
  const r = asRecord(raw), d = emptySea();
  const ship = numMap(r.ship, k => SHIP_PARTS.some(p => p.id === k), SHIP_MAX);
  for (const p of SHIP_PARTS) ship[p.id] = Math.max(1, ship[p.id] ?? 1);
  const ids = (s: string) => ISLANDS.some(i => i.id === s);
  const at = typeof r.at === 'string' && ids(r.at) ? r.at : 'harbor';
  const v = asRecord(r.voyage);
  const out: SeaState = {
    ...d, open: r.open === true, at,
    voyage: ids(v.from as string) && ids(v.to as string) && typeof v.endAt === 'number' && Number.isFinite(v.endAt) ? { from: v.from as string, to: v.to as string, endAt: soon(v.endAt, 24 * 3600000), food: nn(v.food, 1e6) } : null,
    coin: nn(r.coin, 1e18, d.coin), pearls: cnt(r.pearls, 1e12), food: nn(r.food, 1e6, d.food),
    ship, goods: numMap(r.goods, k => GOODS.some(g => g.id === k), 1e4), cd: Object.fromEntries(Object.entries(numMap(r.cd, ids, 1e16)).map(([k, t]) => [k, soon(t, 30 * 24 * 3600000)])),
    seen: [...new Set(['harbor', 'reef', 'bay', ...strList(r.seen, ids)])], visited: [...new Set(['harbor', ...strList(r.visited, ids)])],
    lairs: numMap(r.lairs, ids, 1e6), trips: cnt(r.trips), report: strList(r.report).slice(0, 6), hull: 0,
  };
  out.hull = clamp(Math.round(num(r.hull, hullMax(out))), 1, hullMax(out));
  return out;
}

function sanitizeStones(raw: unknown): Record<string, number> {
  const r = asRecord(raw);
  const out: Record<string, number> = {};
  for (const k of Object.keys(r)) if (parseStone(k)) { const v = cnt(r[k], 1e9); if (v > 0) out[k] = v; }
  return out;
}
function sanitizeCounts2(raw: unknown): Record<string, number> {
  const r = asRecord(raw);
  const out: Record<string, number> = {};
  for (const k of Object.keys(r)) { const v = cnt(r[k], 1e12); if (v > 0 && /^[dh]:/.test(k)) out[k] = v; }
  return out;
}
function sanitizeRunStats(raw: unknown): Meta['run'] {
  const r = asRecord(raw);
  const b = asRecord(r.best);
  const best = typeof b.name === 'string' && (b.rarity as string) in RARITY_NAME
    ? { name: b.name, emoji: typeof b.emoji === 'string' ? b.emoji : '🎁', rarity: b.rarity as Rarity, price: cnt(b.price, 1e15) } : null;
  return { start: num(r.start) > 0 ? past(r.start) : Date.now(), kills: cnt(r.kills), gold: nn(r.gold, 1e40), bosses: cnt(r.bosses), bestHit: nn(r.bestHit, 1e40), best };
}

function sanitizePetNums(raw: unknown, lo: number, hi: number, dflt: number): Record<PetId, number> {
  const r = asRecord(raw);
  const out = emptyPets();
  for (const p of PETS) out[p.id] = typeof r[p.id] === 'number' ? clamp(Math.floor(r[p.id] as number), lo, hi) : dflt;
  return out;
}
function sanitizeFarms(raw: unknown): Record<string, number> {
  const r = asRecord(raw);
  const out: Record<string, number> = {};
  for (const d of FARMS) { const v = clamp(Math.floor(num(r[d.id])), 0, d.max); if (v > 0) out[d.id] = v; }
  return out;
}
function sanitizeSoulUps(raw: unknown): Record<string, number> {
  const r = asRecord(raw);
  const out: Record<string, number> = {};
  for (const d of SOUL_SHOP) { const v = clamp(Math.floor(num(r[d.id])), 0, d.max); if (v > 0) out[d.id] = v; }
  return out;
}
function sanitizePacts(raw: unknown): Record<string, boolean> {
  const r = asRecord(raw);
  const out: Record<string, boolean> = {};
  for (const p of HELL_PACTS) if (r[p.id] === true) out[p.id] = true;
  return out;
}

function sanitizeGemUps(raw: unknown): Record<string, number> {
  const r = asRecord(raw);
  const out: Record<string, number> = {};
  for (const d of GEM_SHOP) { const v = clamp(Math.floor(num(r[d.id])), 0, d.max); if (v > 0) out[d.id] = v; }
  return out;
}

function sanitizePetGear(raw: unknown): Meta['petGear'] {
  const r = asRecord(raw);
  const pick = (v: unknown) => (typeof v === 'string' && v in RARITY_NAME ? (v as Rarity) : null);
  return { collar: pick(r.collar), armor: pick(r.armor), charm: pick(r.charm) };
}

function sanitizeTalents(raw: unknown): Record<string, number> {
  const r = asRecord(raw);
  const out: Record<string, number> = {};
  for (const t of TALENTS) { const v = clamp(Math.floor(num(r[t.id])), 0, t.max); if (v > 0) out[t.id] = v; }
  return out;
}

function sanitizeRun(raw: unknown, hell = false): RunSnapshot | null {
  const r = asRecord(raw);
  if (!r.hero) return null;
  const inv = sanitizeItems(r.inventory);
  return {
    hero: sanitizeHero(asRecord(r.hero)),
    skillLevels: sanitizeLevels(r.skillLevels, hell),
    equipped: sanitizeEquipment(r.equipped),
    inventory: inv,
    upgradeCounts: sanitizeCounts(r.upgradeCounts),
    talents: sanitizeTalents(r.talents),
    heroClass: r.heroClass === 'warrior' || r.heroClass === 'mage' || r.heroClass === 'thief' ? r.heroClass : null,
  };
}

function sanitizeCounts(raw: unknown): UpgradeCounts {
  const r = asRecord(raw);
  return { atk: cnt(r.atk, 1e6), def: cnt(r.def, 1e6), hp: cnt(r.hp, 1e6) };
}

function fromRecord(d: Record<string, unknown>): SaveData {
  const hero = sanitizeHero(asRecord(d.hero));
  const settings = asRecord(d.settings);
  const world: WorldId = d.world === 'hell' && asRecord(d.offRun).hero ? 'hell' : 'dungeon';
  return {
    hero,
    skillLevels: sanitizeLevels(d.skillLevels, world === 'hell'),
    equipped: sanitizeEquipment(d.equipped),
    inventory: sanitizeItems(d.inventory),
    meta: sanitizeMeta(d.meta, hero),
    upgradeCounts: sanitizeCounts(d.upgradeCounts),
    settings: { autoAbilities: settings.autoAbilities !== false, autoElement: settings.autoElement === true,
      autoEnhance: AUTO_ENHANCE_STEPS.includes(num(settings.autoEnhance)) ? num(settings.autoEnhance) : 0,
      autoCraft: AUTO_CRAFT_STEPS.includes(settings.autoCraft as Rarity | null) && settings.autoCraft ? (settings.autoCraft as Rarity) : null,
      notify: settings.notify === true,
      autoSell: Array.isArray(settings.autoSell) ? settings.autoSell.filter((r): r is Rarity => typeof r === 'string' && r in RARITY_NAME && r !== 'divine' && r !== 'secret') : [] },
    heroClass: d.heroClass === 'warrior' || d.heroClass === 'mage' || d.heroClass === 'thief' ? d.heroClass : null,
    talents: sanitizeTalents(d.talents),
    world,
    offRun: sanitizeRun(d.offRun, world !== 'hell'),
    lastSeen: typeof d.lastSeen === 'number' && Number.isFinite(d.lastSeen) ? past(d.lastSeen) : undefined,
  };
}

export function loadGame(): SaveData | null {
  // v3 — текущий формат; v2 — предыдущая версия игры (те же поля, но без мета-прогресса)
  const data = readJson(SAVE_KEY) ?? readJson(SAVE_KEY_V2);
  if (data) return fromRecord(asRecord(data));

  const legacyHero = readJson(LEGACY_HERO_KEY);
  if (legacyHero) {
    return fromRecord({ hero: legacyHero, skillLevels: readJson(LEGACY_SKILLS_KEY) });
  }
  return null;
}

let saveBlocked = false; // после импорта перезаписывать сохранение нельзя до перезагрузки

/** Код сохранения: можно скопировать и вставить на другом устройстве. */
export function exportSave(): string | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? `DC1:${btoa(unescape(encodeURIComponent(raw)))}` : null;
  } catch { return null; }
}

/** Проверяет и записывает код сохранения. После успеха страницу нужно перезагрузить. */
export function importSave(code: string): boolean {
  try {
    const t = code.trim();
    if (!t.startsWith('DC1:')) return false;
    const raw = decodeURIComponent(escape(atob(t.slice(4))));
    const data = asRecord(JSON.parse(raw));
    if (!data.hero) return false;
    fromRecord(data); // проверка: не падает на этих данных
    localStorage.setItem(SAVE_KEY, raw);
    saveBlocked = true;
    return true;
  } catch { return false; }
}

export function saveGame(data: SaveData): void {
  if (saveBlocked) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, lastSeen: Date.now() }));
  } catch {
    /* хранилище недоступно или переполнено — играем без сохранения */
  }
}

export function clearSave(): void {
  try {
    [SAVE_KEY, SAVE_KEY_V2, LEGACY_HERO_KEY, LEGACY_SKILLS_KEY].forEach(k => localStorage.removeItem(k));
  } catch {
    /* ничего страшного */
  }
}
