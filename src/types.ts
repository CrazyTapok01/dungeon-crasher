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
  // «Аффиксы» — бонусы редких вещей (у обычных их нет)
  crit?: number;    // +% шанс крита
  critdmg?: number; // +% крит. урона
  dodge?: number;   // +% уклонения
  vamp?: number;    // +% вампиризма
  rarity: Rarity;
  emoji: string;
  price: number;
}

/** Что надето на герое: по одному предмету на слот. */
export type Equipment = Partial<Record<ItemSlot, Item>>;

/** Особенности монстров: делают бои разнообразнее. */
export type MonsterTrait = 'poison' | 'armored' | 'regen' | 'enrage' | 'thorns' | 'swift';

export interface Monster {
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  def: number;
  gold: number;
  xp: number;
  isBoss: boolean;
  isElite: boolean;
  tier: number;
  trait?: MonsterTrait;
}

/** «Мозг» монстра в текущем бою: босс копит мощный удар, берсерк звереет. */
export interface MonsterAi {
  turnsUntilHeavy: number;
  charging: boolean; // босс замахнулся — следующий его удар будет мощным
  enraged: boolean;
}

export type SkillId =
  | 'power' | 'vitality' | 'armor' | 'crit' | 'critdmg' | 'dodge' | 'vamp'
  | 'regen' | 'fortune' | 'wisdom';

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

/** Активные способности — кнопки в бою с перезарядкой. */
export type AbilityId = 'strike' | 'heal' | 'shield';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  emoji: string;
  desc: string;
  cooldownTicks: number; // перезарядка в «тиках» боя (1 тик = COMBAT_TICK_MS)
  unlockLevel: number;   // с какого уровня героя доступна
}

/** Перезарядка каждой способности, в тиках (0 = готова). */
export type Cooldowns = Record<AbilityId, number>;

/** Временные эффекты на герое. */
export interface HeroStatus {
  poisonTurns: number;   // сколько ходов монстра ещё действует яд
  poisonDmg: number;     // урон яда за ход
  shieldCharges: number; // сколько ударов ещё смягчит «Щит»
}

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

/** Итоговые параметры героя: база + предметы + навыки + души. */
export interface HeroStats {
  atk: number;
  def: number;
  maxHp: number;
  critChance: number; // %
  critDmg: number;    // % от обычного урона
  dodge: number;      // %
  lifesteal: number;  // %
  regen: number;      // HP за ход героя
  goldBonus: number;  // % к золоту
  xpBonus: number;    // % к опыту
}

/** Прогресс «на всю игру»: переживает перерождение. */
export interface Meta {
  souls: number;        // души — постоянный бонус от перерождений
  rebirths: number;
  maxFloor: number;     // рекорд глубины
  bossKills: number;
  elites: number;
  crits: number;
  deaths: number;
  legendaries: number;
  goldEarned: number;
  abilitiesUsed: number;
  achievements: string[]; // id полученных достижений
}

export interface Settings {
  autoAbilities: boolean; // способности применяются сами
}

export type UpgradeKind = 'atk' | 'def' | 'hp';
export type UpgradeCounts = Record<UpgradeKind, number>;

export interface ShopUpgrade {
  kind: UpgradeKind;
  name: string;
  emoji: string;
  cost: number;
  amount: number;
  label: string; // «к базовой атаке» — показывается после «+{amount}»
}

/** Отчёт «пока тебя не было». */
export interface OfflineReport {
  seconds: number;
  kills: number;
  gold: number;
  xp: number;
  levels: number;
}

export type LogType =
  | 'dmg' | 'crit' | 'heal' | 'loot' | 'dodge' | 'info' | 'boss' | 'death' | 'ability';

export interface LogEntry {
  id: number;
  text: string;
  type: LogType;
}

// ───────────────────────── события для анимаций и звука ─────────────────────────
//
// Правила игры (reducer) не знают про экран. Вместо этого каждое действие
// складывает в state.events «что только что произошло», а интерфейс
// (сцена боя, звук) красиво это показывает: частицы, числа, тряску.

export type GameEventBody =
  | { type: 'hero_attack'; dmg: number; crit: boolean; heavy: boolean }
  | { type: 'monster_dodge' }
  | { type: 'monster_attack'; dmg: number; heavy: boolean; dodged: boolean; blocked: boolean }
  | { type: 'thorns'; dmg: number }
  | { type: 'poison_tick'; dmg: number }
  | { type: 'poisoned' }
  | { type: 'heal'; amount: number; source: 'lifesteal' | 'regen' | 'potion' | 'ability' | 'levelup' }
  | { type: 'ability'; ability: AbilityId }
  | { type: 'boss_spawn' }
  | { type: 'boss_charge' }
  | { type: 'enrage' }
  | { type: 'monster_regen'; amount: number }
  | { type: 'monster_killed'; emoji: string; boss: boolean; elite: boolean; gold: number; xp: number }
  | { type: 'level_up'; level: number }
  | { type: 'loot'; rarity: Rarity }
  | { type: 'floor_cleared'; floor: number }
  | { type: 'hero_died' }
  | { type: 'respawn' }
  | { type: 'rebirth'; souls: number }
  | { type: 'achievement'; id: string }
  | { type: 'ui'; kind: 'buy' | 'equip' | 'sell' };

export type GameEvent = GameEventBody & { id: number };
