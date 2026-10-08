// Здесь только типы — никакого рабочего кода.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemSlot = 'weapon' | 'armor' | 'amulet';

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  atk?: number;
  def?: number;
  hp?: number;
  rarity: Rarity;
  emoji: string;
  price: number;
}

/** Что надето на герое: по одному предмету на слот. */
export type Equipment = Partial<Record<ItemSlot, Item>>;

export interface Monster {
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  def: number;
  gold: number;
  xp: number;
  isBoss: boolean;
  tier: number;
}

export type SkillId = 'power' | 'vitality' | 'armor' | 'crit' | 'critdmg' | 'dodge' | 'vamp';

/** Описание навыка — неизменяемые данные (лежат в gameData.ts). */
export interface SkillDef {
  id: SkillId;
  name: string;
  emoji: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  costMult: number;
  effect: (level: number) => string;
}

/** Навык + текущий уровень — то, что рисует SkillsPanel. */
export interface Skill extends SkillDef {
  level: number;
}

/** Сохраняются только уровни навыков (функции в JSON не превращаются). */
export type SkillLevels = Record<SkillId, number>;

/** «Голые» параметры героя, без предметов и навыков. */
export interface HeroState {
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  baseMaxHp: number;
  baseAtk: number;
  baseDef: number;
  gold: number;
  floor: number;
  stage: number; // 1–10 на этаже, 10-я стадия — босс
  kills: number;
}

/** Итоговые параметры героя: база + предметы + навыки. */
export interface HeroStats {
  atk: number;
  def: number;
  maxHp: number;
  critChance: number; // %
  critDmg: number;    // % от обычного урона
  dodge: number;      // %
  lifesteal: number;  // %
}

export type LogType = 'dmg' | 'crit' | 'heal' | 'loot' | 'dodge' | 'info' | 'boss' | 'death';

export interface LogEntry {
  id: number;
  text: string;
  type: LogType;
}

/**
 * Одно «событие» для анимации: число над персонажем, тряска, взмах меча.
 * Новый id = новая анимация.
 */
export interface HitEvent {
  id: number;
  kind: 'damage' | 'heal' | 'dodge';
  text: string;
  crit?: boolean;
}

export type UpgradeKind = 'atk' | 'def' | 'hp';

export interface ShopUpgrade {
  kind: UpgradeKind;
  name: string;
  emoji: string;
  cost: number;
  amount: number;
  label: string; // «к базовой атаке» — показывается после «+{amount}»
}
