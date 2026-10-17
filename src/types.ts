// Здесь только типы — никакого рабочего кода.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'divine' | 'secret';
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
  plus?: number;    // уровень заточки (+1…+10): усиливает атаку, защиту и HP предмета
}

/** Что надето на герое: по одному предмету на слот. */
export type Equipment = Partial<Record<ItemSlot, Item>>;

/** Особенности монстров: делают бои разнообразнее. */
/** Стихии: Огонь > Лёд > Природа > Огонь. */
export type Element = 'fire' | 'ice' | 'nature';

/** Классы героя: выбираются при первом запуске и после каждого перерождения. */
export type ClassId = 'warrior' | 'mage' | 'thief';

export interface ClassDef {
  id: ClassId;
  name: string;
  emoji: string;
  desc: string;
  perks: string[];
}

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
  element: Element;  // стихия врага: у каждой есть слабость
  affix?: string;   // аффикс этажа Преисподней (id)
  goblin?: boolean; // гоблин-казначей: мало HP, много золота
}

/** «Мозг» монстра в текущем бою: босс копит мощный удар, берсерк звереет. */
export interface MonsterAi {
  turnsUntilHeavy: number;
  charging: boolean; // босс замахнулся — следующий его удар будет мощным
  enraged: boolean;
}

export type SkillId =
  | 'power' | 'vitality' | 'armor' | 'crit' | 'critdmg' | 'dodge' | 'vamp'
  | 'regen' | 'fortune' | 'wisdom' | 'fury';

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
  unlockRebirths?: number; // навык открывается после N перерождений
  noPerkLevels?: boolean;  // бонус «Расширенного обучения» на него не действует (у него есть жёсткий потолок)
}

/** Навык + текущий уровень — то, что рисует SkillsPanel. */
export interface Skill extends SkillDef {
  level: number;
  locked: boolean; // ещё не открыт перерождениями
}

/** Сохраняются только уровни навыков (функции в JSON не превращаются). */
export type SkillLevels = Record<SkillId, number>;

/** Активные способности — кнопки в бою с перезарядкой. */
export type AbilityId = 'strike' | 'heal' | 'shield' | 'rage';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  emoji: string;
  desc: string;
  cooldownTicks: number; // перезарядка в «тиках» боя (1 тик = COMBAT_TICK_MS)
  unlockLevel: number;   // с какого уровня героя доступна
  unlockRebirths?: number; // и сколько перерождений нужно совершить
}

/** Перезарядка каждой способности, в тиках (0 = готова). */
export type Cooldowns = Record<AbilityId, number>;

/** Временные эффекты на герое. */
export interface HeroStatus {
  poisonTurns: number;   // сколько ходов монстра ещё действует яд
  poisonDmg: number;     // урон яда за ход
  shieldCharges: number; // сколько ударов ещё смягчит «Щит»
  rageCharges: number;   // сколько ударов героя ещё усилит «Берсерк»
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
  kills: number;          // всего убито монстров (за всю игру)
  relics: Record<RelicId, number>; // уровни реликвий — не сбрасываются перерождением
  quests: Quest[];        // активные задания
  questsDone: number;     // сколько заданий выполнено (растёт сложность)
  daily: { last: string; streak: number }; // ежедневная награда
  goblins: number;        // побеждено гоблинов-казначеев
  pets: Record<PetId, number>; // уровни питомцев (0 — ещё нет)
  activePet: PetId | null;     // питомец, который сейчас помогает
  egg: number;                 // убийств в инкубации яйца (-1 — яйца нет)
  gems: number;                // кристаллы бездны — редкая валюта
  gemUps: Record<string, number>; // купленные улучшения за кристаллы
  petGear: Record<PetSlot, Rarity | null>; // снаряжение питомца
  hellOpen: boolean;           // открыт ли портал в Преисподнюю
  hellMax: number;             // рекорд этажа в Преисподней
  soulUps: Record<string, number>; // улучшения из лавки душ
  soulsSpent: number;          // потрачено душ в лавке (бонус душ считается от всех заработанных)
  pacts: Record<string, boolean>;  // включённые договоры Преисподней
  altar: number;               // сколько раз приносили жертву на алтаре
  hellRebirths: number;        // перерождения в Преисподней
  farms: Record<string, number>; // уровни кристальных ферм
  farmAt: number;              // с какого момента (мс) копятся кристаллы фермы
  petRank: Record<PetId, number>;   // ранг питомца: после перерождения бонусы умножаются на ранг
  petReborn: Record<PetId, number>; // когда питомец вернётся из перерождения (мс), 0 — не перерождается
}

/** Миры: основное подземелье и Преисподняя (у неё свой герой и своя валюта). */
export type WorldId = 'dungeon' | 'hell';

/** «Забег» мира: всё, что принадлежит герою конкретного мира. Второй мир хранится рядом и не теряется. */
export interface RunSnapshot {
  hero: HeroState;
  skillLevels: SkillLevels;
  equipped: Equipment;
  inventory: Item[];
  upgradeCounts: UpgradeCounts;
  talents: Record<string, number>;
  heroClass: ClassId | null;
}

export type PetSlot = 'collar' | 'armor' | 'charm';

export interface GemUpgradeDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;   // что даёт один уровень
  max: number;
  baseCost: number; // цена n-го уровня = baseCost × n
}

/** Питомцы: падают яйцами с боссов, помогают пассивными бонусами. */
export type PetId = 'wolf' | 'hawk' | 'turtle' | 'fox' | 'drake';

/** Бонус «за уровень»: atk/hp/def/gold/xp — в процентах, crit — в пунктах шанса. */
export type BonusKey = 'atk' | 'hp' | 'def' | 'gold' | 'xp' | 'crit' | 'critdmg' | 'dodge' | 'regen' | 'pierce' | 'speed';

export interface PetDef {
  id: PetId;
  name: string;
  emoji: string;
  desc: string;
  per: Partial<Record<BonusKey, number>>;
}

/** Таланты класса: очки даёт уровень героя, сбрасываются при перерождении. */
export interface TalentDef {
  id: string;
  cls: ClassId;
  name: string;
  emoji: string;
  desc: string; // что даёт один уровень
  max: number;
  per: Partial<Record<BonusKey, number>>;
}

/** Реликвии: редкая добыча с боссов, постоянные бонусы. */
export type RelicId = 'fang' | 'heart' | 'coin' | 'eye' | 'tome' | 'scale' | 'blood' | 'wind';

export interface RelicDef {
  id: RelicId;
  name: string;
  emoji: string;
  desc: string;       // что даёт один уровень
  maxLevel: number;
}

/** Задание: считаем прирост счётчика meta[counter] с момента выдачи. */
export type QuestKind = 'kills' | 'bosses' | 'elites' | 'crits' | 'abilities' | 'floor';

export interface Quest {
  kind: QuestKind;
  target: number;
  base: number;   // значение счётчика при выдаче (для 'floor' — 0)
  souls: number;  // награда
  gold: number;
}

export interface Settings {
  autoAbilities: boolean; // способности применяются сами
  autoElement: boolean;   // герой сам выбирает выигрышную стихию
  autoSell: Rarity[];     // качества, которые продаются сразу при выпадении (если не лучше надетого)
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
  // У этих двух событий своё поле key: поле id занято порядковым номером события (GameEvent.id)
  | { type: 'achievement'; key: string }
  | { type: 'perk'; key: string }
  | { type: 'relic'; key: string; level: number }
  | { type: 'quest'; text: string }
  | { type: 'ui'; kind: 'buy' | 'equip' | 'sell' | 'fail' };

export type GameEvent = GameEventBody & { id: number };
