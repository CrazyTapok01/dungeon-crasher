import type {
  Equipment, HeroState, Item, ItemSlot, Meta, Settings, SkillLevels, UpgradeCounts,
} from '../types';
import {
  ACHIEVEMENTS, INITIAL_HERO, RARITY_NAME, SKILLS, STAGES_PER_FLOOR,
  emptyMeta, emptySkillLevels,
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
  lastSeen?: number; // когда игру закрыли (мс) — для офлайн-награды
}

const SLOTS: ItemSlot[] = ['weapon', 'armor', 'amulet'];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Берём из сохранения только известные числовые поля — остальное игнорируем. */
function sanitizeHero(raw: Record<string, unknown>): HeroState {
  const hero = { ...INITIAL_HERO };
  for (const key of Object.keys(INITIAL_HERO) as (keyof HeroState)[]) {
    const v = raw[key];
    if (typeof v === 'number' && Number.isFinite(v)) hero[key] = v;
  }
  // В старой версии базовое здоровье называлось maxHp
  if (typeof raw.baseMaxHp !== 'number' && typeof raw.maxHp === 'number') hero.baseMaxHp = raw.maxHp;
  hero.floor = Math.max(1, Math.floor(hero.floor));
  hero.stage = clamp(Math.floor(hero.stage), 1, STAGES_PER_FLOOR);
  return hero;
}

/** Принимает и новый формат ({power: 3}), и старый ([{id: 'power', level: 3, ...}]). */
function sanitizeLevels(raw: unknown): SkillLevels {
  const found = new Map<string, unknown>();
  if (Array.isArray(raw)) raw.forEach(s => found.set(s?.id, s?.level));
  else if (raw && typeof raw === 'object') Object.entries(raw).forEach(([k, v]) => found.set(k, v));

  const levels = emptySkillLevels();
  for (const def of SKILLS) {
    const v = found.get(def.id);
    if (typeof v === 'number') levels[def.id] = clamp(Math.floor(v), 0, def.maxLevel);
  }
  return levels;
}

function isItem(x: unknown): x is Item {
  const i = asRecord(x);
  return typeof i.id === 'string' && typeof i.name === 'string'
    && SLOTS.includes(i.slot as ItemSlot) && (i.rarity as string) in RARITY_NAME;
}

function sanitizeEquipment(raw: unknown): Equipment {
  const src = asRecord(raw);
  const equipped: Equipment = {};
  for (const slot of SLOTS) {
    const item = src[slot];
    if (isItem(item) && item.slot === slot) equipped[slot] = item;
  }
  return equipped;
}

function sanitizeMeta(raw: unknown, hero: HeroState): Meta {
  const r = asRecord(raw);
  const known = new Set(ACHIEVEMENTS.map(a => a.id));
  return {
    ...emptyMeta(),
    souls: num(r.souls), rebirths: num(r.rebirths), maxFloor: Math.max(1, num(r.maxFloor, 1), hero.floor),
    bossKills: num(r.bossKills), elites: num(r.elites), crits: num(r.crits), deaths: num(r.deaths),
    legendaries: num(r.legendaries), goldEarned: num(r.goldEarned), abilitiesUsed: num(r.abilitiesUsed),
    achievements: Array.isArray(r.achievements)
      ? r.achievements.filter((a): a is string => typeof a === 'string' && known.has(a))
      : [],
  };
}

function sanitizeCounts(raw: unknown): UpgradeCounts {
  const r = asRecord(raw);
  return { atk: num(r.atk), def: num(r.def), hp: num(r.hp) };
}

function fromRecord(d: Record<string, unknown>): SaveData {
  const hero = sanitizeHero(asRecord(d.hero));
  const settings = asRecord(d.settings);
  return {
    hero,
    skillLevels: sanitizeLevels(d.skillLevels),
    equipped: sanitizeEquipment(d.equipped),
    inventory: Array.isArray(d.inventory) ? d.inventory.filter(isItem) : [],
    meta: sanitizeMeta(d.meta, hero),
    upgradeCounts: sanitizeCounts(d.upgradeCounts),
    settings: { autoAbilities: settings.autoAbilities !== false }, // по умолчанию включено
    lastSeen: typeof d.lastSeen === 'number' ? d.lastSeen : undefined,
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

export function saveGame(data: SaveData): void {
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
