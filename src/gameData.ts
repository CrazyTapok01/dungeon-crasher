import type {
  AbilityDef, AbilityId, Cooldowns, Equipment, HeroState, Item, Meta, Monster, MonsterTrait,
  Rarity, ShopUpgrade, SkillDef, SkillId, SkillLevels, UpgradeCounts, UpgradeKind,
} from './types';

// ════════════════════════════════════════════════════════════════
//  1. БАЛАНС — все «магические числа» игры собраны здесь
// ════════════════════════════════════════════════════════════════

export const STAGES_PER_FLOOR = 10;   // на 10-й стадии — босс
export const INVENTORY_LIMIT = 40;
export const LOG_LIMIT = 60;

// Тайминги (мс)
export const COMBAT_TICK_MS = 700;    // один удар (героя или монстра) раз в 700 мс
export const BANNER_DURATION_MS = 2200;
export const RESPAWN_DELAY_MS = 2500;

export const LEVEL_UP = { hpBonus: 12, xpBase: 50, xpGrowth: 1.25 };
export function xpForLevel(level: number): number {
  return Math.round(LEVEL_UP.xpBase * Math.pow(LEVEL_UP.xpGrowth, level - 1));
}

export const INITIAL_HERO: HeroState = {
  level: 1, xp: 0, xpToNext: xpForLevel(1),
  hp: 100, baseMaxHp: 100,
  baseAtk: 12, baseDef: 3,
  gold: 50,
  floor: 1, stage: 1, kills: 0,
};

/** Параметры в процентах, которые есть у любого героя «с нуля». */
export const BASE_STATS = { critChance: 5, critDmg: 150, dodge: 0, lifesteal: 0 };
export const STAT_CAPS = { critChance: 80, dodge: 50 };

/** При смерти герой теряет этаж и часть золота. */
export const DEATH_GOLD_KEPT = 0.7;

export const DROP = {
  itemChance: 0.28,
  eliteItemChance: 0.85,
  bossItemChance: 1,
  potionChance: 0.15,
  potionHeal: 30,
};

export const SHOP_POTION = { name: 'Малое зелье лечения', emoji: '🧪', cost: 30, heal: 50 };

export const SHOP_UPGRADES: ShopUpgrade[] = [
  { kind: 'atk', name: 'Заточка оружия',     emoji: '⚔️', cost: 80, amount: 2,  label: 'к базовой атаке' },
  { kind: 'def', name: 'Укрепление доспеха', emoji: '🛡️', cost: 70, amount: 1,  label: 'к базовой защите' },
  { kind: 'hp',  name: 'Тренировка тела',    emoji: '❤️', cost: 60, amount: 20, label: 'к макс. HP' },
];
/** Каждая покупка улучшения дорожает на 22%. */
export const UPGRADE_COST_GROWTH = 1.22;
export function upgradeCost(up: ShopUpgrade, bought: number): number {
  return Math.round(up.cost * Math.pow(UPGRADE_COST_GROWTH, bought));
}
export function emptyUpgradeCounts(): UpgradeCounts {
  return { atk: 0, def: 0, hp: 0 };
}
export type { UpgradeKind };

/** Сундук сокровищ: трата золота на гарантированную вещь (не хуже необычной, с шансом на редкую). */
export function chestCost(floor: number): number {
  return Math.round(120 + floor * 70);
}

// ── Бой: особенности и способности ───────────────────────────────

export const BOSS = { heavyEvery: 4, heavyMult: 2.5 }; // каждый 4-й ход босс замахивается на ×2.5
export const ELITE = { minFloor: 3, chance: 0.06, hp: 2.0, atk: 1.35, def: 1.2, gold: 3, xp: 2.5 };

export const SWIFT_DODGE = 25;   // % шанс «Проворного» увернуться
export const THORNS_FRAC = 0.12; // «Шипастый» возвращает 12% урона
export const REGEN_FRAC = 0.05;  // «Регенерация» лечит 5% HP за ход
export const POISON = { turns: 4, dmgFrac: 0.2 };
export const ENRAGE = { hpFrac: 0.4, atkMult: 1.5 };

export const TRAITS: Record<MonsterTrait, { name: string; emoji: string; desc: string }> = {
  poison:  { name: 'Ядовитый',      emoji: '🧪', desc: 'Удары отравляют героя' },
  armored: { name: 'Бронированный', emoji: '🛡️', desc: 'Повышенная защита' },
  regen:   { name: 'Регенерация',   emoji: '💚', desc: 'Лечится каждый ход' },
  enrage:  { name: 'Берсерк',       emoji: '😡', desc: 'Звереет при низком HP' },
  thorns:  { name: 'Шипастый',      emoji: '🌵', desc: 'Возвращает часть урона' },
  swift:   { name: 'Проворный',     emoji: '💨', desc: 'Может увернуться от удара' },
};
const NORMAL_TRAITS: MonsterTrait[] = ['poison', 'armored', 'regen', 'enrage', 'thorns', 'swift'];
const BOSS_TRAITS: MonsterTrait[] = ['armored', 'regen', 'enrage', 'thorns'];

export const STRIKE = { mult: 2.5, ignoreDef: 0.5 };
export const HEAL_ABILITY = { frac: 0.3 };
export const SHIELD = { charges: 3, reduction: 0.6 };

export const ABILITIES: AbilityDef[] = [
  { id: 'strike', name: 'Сокрушающий удар', emoji: '💥', desc: `Мгновенный удар ×${STRIKE.mult}, игнорирует половину брони`, cooldownTicks: 8,  unlockLevel: 1 },
  { id: 'shield', name: 'Щит',              emoji: '🛡️', desc: `Следующие ${SHIELD.charges} удара врага слабее на ${SHIELD.reduction * 100}%`,   cooldownTicks: 20, unlockLevel: 4 },
  { id: 'heal',   name: 'Исцеление',        emoji: '✨', desc: `Лечит ${HEAL_ABILITY.frac * 100}% макс. HP и снимает яд`,                       cooldownTicks: 26, unlockLevel: 7 },
];
export function emptyCooldowns(): Cooldowns {
  return { strike: 0, shield: 0, heal: 0 };
}
export const abilityDef = (id: AbilityId): AbilityDef => ABILITIES.find(a => a.id === id)!;

// ── Перерождение ─────────────────────────────────────────────────

export const PRESTIGE = {
  minFloor: 8,
  atkHpPerSoul: 0.05,   // +5% к атаке и HP за каждую душу
  goldPerSoul: 0.02,    // +2% к золоту
  startGoldPerSoul: 10, // стартовое золото после перерождения
};
export function soulsForFloor(floor: number): number {
  if (floor < PRESTIGE.minFloor) return 0;
  return Math.max(1, Math.floor(Math.pow(floor, 1.45) / 2));
}
export const soulMultiplier = (souls: number) => 1 + souls * PRESTIGE.atkHpPerSoul;

// ── Офлайн-прогресс ──────────────────────────────────────────────

export const OFFLINE = {
  minSeconds: 60,
  maxHours: 2,
  secondsPerKill: 14, // сколько в среднем длится бой
  efficiency: 0.3,    // за время «вне игры» герой зарабатывает 30% от обычного
};

// ════════════════════════════════════════════════════════════════
//  2. НАВЫКИ
// ════════════════════════════════════════════════════════════════

/** Сколько даёт один уровень навыка (используется и в расчёте, и в описании). */
export const SKILL_BONUS: Record<SkillId, number> = {
  power: 3, vitality: 15, armor: 2, crit: 2, critdmg: 20, dodge: 2, vamp: 3,
  regen: 1, fortune: 5, wisdom: 5,
};
const B = SKILL_BONUS;

export const SKILLS: SkillDef[] = [
  { id: 'power',    name: 'Сила',      emoji: '💪', desc: `+${B.power} к атаке за уровень`,           maxLevel: 50, baseCost: 50,  costMult: 1.35, effect: l => `+${l * B.power} к атаке` },
  { id: 'vitality', name: 'Живучесть', emoji: '❤️', desc: `+${B.vitality} к макс. HP за уровень`,     maxLevel: 50, baseCost: 60,  costMult: 1.35, effect: l => `+${l * B.vitality} HP` },
  { id: 'armor',    name: 'Стойкость', emoji: '🛡️', desc: `+${B.armor} к защите за уровень`,          maxLevel: 40, baseCost: 55,  costMult: 1.35, effect: l => `+${l * B.armor} защиты` },
  { id: 'crit',     name: 'Критический удар', emoji: '⚡', desc: `+${B.crit}% шанс крита за уровень`,  maxLevel: 25, baseCost: 100, costMult: 1.45, effect: l => `${l * B.crit}% шанс крита` },
  { id: 'critdmg',  name: 'Мощь крита', emoji: '💥', desc: `+${B.critdmg}% урона крита за уровень`,   maxLevel: 25, baseCost: 120, costMult: 1.45, effect: l => `+${l * B.critdmg}% крит. урона` },
  { id: 'dodge',    name: 'Уклонение', emoji: '💨', desc: `+${B.dodge}% шанс уклонения за уровень`,   maxLevel: 20, baseCost: 150, costMult: 1.5,  effect: l => `${l * B.dodge}% уклонение` },
  { id: 'vamp',     name: 'Вампиризм', emoji: '🩸', desc: `+${B.vamp}% кражи жизни за уровень`,       maxLevel: 15, baseCost: 250, costMult: 1.6,  effect: l => `${l * B.vamp}% вампиризм` },
  { id: 'regen',    name: 'Регенерация', emoji: '🌿', desc: `+${B.regen} HP за ход героя за уровень`, maxLevel: 30, baseCost: 90,  costMult: 1.4,  effect: l => `+${l * B.regen} HP за ход` },
  { id: 'fortune',  name: 'Золотоискатель', emoji: '🪙', desc: `+${B.fortune}% золота за уровень`,    maxLevel: 30, baseCost: 120, costMult: 1.42, effect: l => `+${l * B.fortune}% золота` },
  { id: 'wisdom',   name: 'Мудрость',  emoji: '📖', desc: `+${B.wisdom}% опыта за уровень`,           maxLevel: 30, baseCost: 120, costMult: 1.42, effect: l => `+${l * B.wisdom}% опыта` },
];

export function emptySkillLevels(): SkillLevels {
  return { power: 0, vitality: 0, armor: 0, crit: 0, critdmg: 0, dodge: 0, vamp: 0, regen: 0, fortune: 0, wisdom: 0 };
}

/** Цена следующего уровня навыка растёт по геометрической прогрессии. */
export function skillCost(def: SkillDef, level: number): number {
  return Math.round(def.baseCost * Math.pow(def.costMult, level));
}

// ════════════════════════════════════════════════════════════════
//  3. РЕДКОСТЬ ПРЕДМЕТОВ (названия и цвета для интерфейса)
// ════════════════════════════════════════════════════════════════

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const RARITY_NAME: Record<Rarity, string> = {
  common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий',
  epic: 'Эпический', legendary: 'Легендарный',
};

export const RARITY_COLORS: Record<Rarity, { text: string; border: string; bg: string; glow: string; hex: string }> = {
  common:    { text: 'text-gray-300',   border: 'border-gray-500',   bg: 'from-gray-700/50 to-gray-900/50',     glow: 'shadow-gray-500/30',   hex: '#9ca3af' },
  uncommon:  { text: 'text-green-400',  border: 'border-green-500',  bg: 'from-green-900/40 to-gray-900/50',    glow: 'shadow-green-500/40',  hex: '#4ade80' },
  rare:      { text: 'text-blue-400',   border: 'border-blue-500',   bg: 'from-blue-900/40 to-gray-900/50',     glow: 'shadow-blue-500/40',   hex: '#60a5fa' },
  epic:      { text: 'text-purple-400', border: 'border-purple-500', bg: 'from-purple-900/40 to-gray-900/50',   glow: 'shadow-purple-500/50', hex: '#c084fc' },
  legendary: { text: 'text-amber-300',  border: 'border-amber-400',  bg: 'from-amber-900/40 to-gray-900/50',    glow: 'shadow-amber-400/60',  hex: '#fcd34d' },
};

// ════════════════════════════════════════════════════════════════
//  4. БИОМЫ — внешний вид сцены меняется каждые 3 этажа
// ════════════════════════════════════════════════════════════════

export type AmbientKind = 'ember' | 'soul' | 'lava' | 'snow' | 'void';

export interface Biome {
  name: string;
  emoji: string;
  wall: string;      // цвет стены
  wallDark: string;
  floorTop: string;
  floorBottom: string;
  flameCore: string; // огонь факелов
  flameEdge: string;
  light: string;     // свет от факелов (rgb без альфы, "251,146,60")
  mist: string;      // туман (rgba)
  ambient: AmbientKind;
}

export const BIOMES: Biome[] = [
  { name: 'Мрачное подземелье', emoji: '🏚️', wall: '#2b2140', wallDark: '#150f24', floorTop: '#3a2d52', floorBottom: '#120b1d', flameCore: '#fff3b0', flameEdge: '#f97316', light: '251,146,60', mist: 'rgba(168,85,247,0.18)', ambient: 'ember' },
  { name: 'Проклятые катакомбы', emoji: '⚰️', wall: '#1d3a38', wallDark: '#0b1c1d', floorTop: '#285452', floorBottom: '#08181a', flameCore: '#d9ffe9', flameEdge: '#22d3a5', light: '45,212,170',  mist: 'rgba(52,211,153,0.16)', ambient: 'soul' },
  { name: 'Лавовые пещеры',      emoji: '🌋', wall: '#4a1d16', wallDark: '#220b08', floorTop: '#6b2a1c', floorBottom: '#1c0805', flameCore: '#ffe9a8', flameEdge: '#ef4444', light: '248,113,60',  mist: 'rgba(239,68,68,0.16)',  ambient: 'lava' },
  { name: 'Ледяная бездна',      emoji: '🧊', wall: '#1d3350', wallDark: '#0a1626', floorTop: '#2e5278', floorBottom: '#091524', flameCore: '#f0fbff', flameEdge: '#38bdf8', light: '125,211,252', mist: 'rgba(125,211,252,0.18)', ambient: 'snow' },
  { name: 'Врата Пустоты',       emoji: '🌌', wall: '#2a1245', wallDark: '#0d0518', floorTop: '#3d1d63', floorBottom: '#0a0314', flameCore: '#fdf4ff', flameEdge: '#d946ef', light: '217,70,239',  mist: 'rgba(217,70,239,0.18)', ambient: 'void' },
];
export const biomeForFloor = (floor: number): Biome =>
  BIOMES[Math.floor((Math.max(1, floor) - 1) / 3) % BIOMES.length];

// ════════════════════════════════════════════════════════════════
//  5. МОНСТРЫ
// ════════════════════════════════════════════════════════════════

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const MONSTER_POOL: { name: string; emoji: string; tier: number }[] = [
  { name: 'Слизень',      emoji: '🟢', tier: 1 },
  { name: 'Крыса',        emoji: '🐀', tier: 1 },
  { name: 'Летучая мышь', emoji: '🦇', tier: 1 },
  { name: 'Гоблин',       emoji: '👺', tier: 1 },
  { name: 'Скелет',       emoji: '💀', tier: 1 },
  { name: 'Зомби',        emoji: '🧟', tier: 2 },
  { name: 'Паук',         emoji: '🕷️', tier: 2 },
  { name: 'Волк',         emoji: '🐺', tier: 2 },
  { name: 'Орк',          emoji: '👹', tier: 2 },
  { name: 'Гарпия',       emoji: '🦅', tier: 3 },
  { name: 'Минотавр',     emoji: '🐂', tier: 3 },
  { name: 'Тролль',       emoji: '🧌', tier: 3 },
  { name: 'Призрак',      emoji: '👻', tier: 4 },
  { name: 'Виверна',      emoji: '🐉', tier: 4 },
  { name: 'Горгулья',     emoji: '🗿', tier: 4 },
  { name: 'Вампир',       emoji: '🧛', tier: 5 },
  { name: 'Лич',          emoji: '☠️', tier: 5 },
  { name: 'Демон',        emoji: '👿', tier: 6 },
  { name: 'Циклоп',       emoji: '👁️', tier: 6 },
  { name: 'Йети',         emoji: '🦍', tier: 6 },
  { name: 'Гидра',        emoji: '🐲', tier: 7 },
  { name: 'Колдун',       emoji: '🧙‍♂️', tier: 7 },
  { name: 'Джинн',        emoji: '🧞', tier: 8 },
  { name: 'Ифрит',        emoji: '🔥', tier: 8 },
  { name: 'Некромант',    emoji: '💀', tier: 9 },
  { name: 'Архилич',      emoji: '☠️', tier: 9 },
];

// Один босс на каждые 3 этажа
const BOSSES: { name: string; emoji: string }[] = [
  { name: 'Король гоблинов',    emoji: '👑' },
  { name: 'Мать пауков',        emoji: '🕸️' },
  { name: 'Вождь орков',        emoji: '⚔️' },
  { name: 'Король-лич',         emoji: '💀' },
  { name: 'Кровавый граф',      emoji: '🩸' },
  { name: 'Повелитель демонов', emoji: '😈' },
  { name: 'Древний дракон',     emoji: '🐉' },
  { name: 'Повелитель джиннов', emoji: '✨' },
  { name: 'Архидемон',          emoji: '🔥' },
  { name: 'Бог Бездны',         emoji: '🕳️' },
];

/** Базовые числа монстра без случайности (нужны и для генерации, и для офлайн-награды). */
export function baseMonsterStats(floor: number, stage: number, isBoss: boolean) {
  const bossMult = isBoss ? 3.5 : 1;
  // Линейный рост + небольшой «процент на процент»: на глубине монстры обгоняют навыки
  // (они ограничены максимумом) — так появляется потолок, который и ломает перерождение.
  const scale = (1 + (floor - 1) * 0.34 + (stage - 1) * 0.05) * Math.pow(1.065, floor - 1);
  return {
    hp:   Math.round((25 + floor * 12)  * scale * bossMult),
    atk:  Math.round((5 + floor * 2.2)  * scale * (isBoss ? 1.6 : 1)),
    def:  Math.round((2 + floor * 0.8)  * scale * (isBoss ? 1.4 : 1)),
    gold: Math.round((8 + floor * 5)    * scale * bossMult),
    xp:   Math.round((10 + floor * 6)   * scale * bossMult),
  };
}

/**
 * Создаёт монстра для этажа и стадии.
 * Чем глубже этаж и стадия — тем сильнее; у босса характеристики умножены.
 * С 2-го этажа у монстров бывают особенности, с 3-го — встречаются элитные.
 */
export function generateMonster(floor: number, stage: number): Monster {
  const isBoss = stage === STAGES_PER_FLOOR;
  const tier = Math.min(10, Math.max(1, Math.ceil(floor / 3)));
  const isElite = !isBoss && floor >= ELITE.minFloor && Math.random() < ELITE.chance;

  let base: { name: string; emoji: string };
  if (isBoss) {
    base = BOSSES[Math.min(BOSSES.length - 1, Math.floor((floor - 1) / 3))];
  } else {
    // обычные монстры — своего тира или тира ниже
    base = pick(MONSTER_POOL.filter(m => m.tier <= tier && m.tier >= Math.max(1, tier - 1)));
  }

  let trait: MonsterTrait | undefined;
  if (isBoss) {
    if (floor >= 4) trait = pick(BOSS_TRAITS);
  } else if (isElite) {
    trait = pick(NORMAL_TRAITS);
  } else if (floor >= 2 && Math.random() < Math.min(0.5, 0.18 + floor * 0.02)) {
    trait = pick(NORMAL_TRAITS);
  }

  const b = baseMonsterStats(floor, stage, isBoss);
  const e = isElite ? ELITE : { hp: 1, atk: 1, def: 1, gold: 1, xp: 1 };
  const armored = trait === 'armored' ? 1.6 : 1;

  return {
    name: base.name,
    emoji: base.emoji,
    hp:   Math.round(b.hp * e.hp),
    atk:  Math.round(b.atk * e.atk),
    def:  Math.round(b.def * e.def * armored),
    gold: Math.round(b.gold * e.gold),
    xp:   Math.round(b.xp * e.xp),
    isBoss, isElite, tier, trait,
  };
}

// ════════════════════════════════════════════════════════════════
//  6. ПРЕДМЕТЫ
// ════════════════════════════════════════════════════════════════

const WEAPON_NAMES = ['Кинжал', 'Меч', 'Секира', 'Молот', 'Клеймор', 'Коса', 'Жезл', 'Копьё', 'Дробитель', 'Клинок бури'];
const WEAPON_EMOJI = ['🗡️', '⚔️', '🪓', '🔨', '🔱', '🏹'];
const ARMOR_NAMES  = ['Кожаный доспех', 'Кольчуга', 'Латы', 'Мантия', 'Доспех рыцаря', 'Броня дракона', 'Роба мага', 'Чешуйчатый доспех'];
const AMULET_NAMES = ['Амулет удачи', 'Талисман ярости', 'Око дракона', 'Сердце великана', 'Руна мощи', 'Камень души', 'Знак Бездны'];

// w — вес (шанс выпадения), bonus — множитель силы предмета
const RARITY_ROLL = [
  { rarity: 'common'    as Rarity, w: 55, bonus: 1.0 },
  { rarity: 'uncommon'  as Rarity, w: 25, bonus: 1.4 },
  { rarity: 'rare'      as Rarity, w: 12, bonus: 1.9 },
  { rarity: 'epic'      as Rarity, w: 6,  bonus: 2.6 },
  { rarity: 'legendary' as Rarity, w: 2,  bonus: 3.8 },
];

/** С боссов (и из сундуков) редкие вещи падают чаще. */
const BOSS_RARITY_BOOST: Record<Rarity, number> = { common: 1, uncommon: 1, rare: 2, epic: 3, legendary: 5 };

function rollRarity(boosted: boolean) {
  const weights = RARITY_ROLL.map(r => r.w * (boosted ? BOSS_RARITY_BOOST[r.rarity] : 1));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < RARITY_ROLL.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RARITY_ROLL[i];
  }
  return RARITY_ROLL[0];
}

type AffixKey = 'crit' | 'critdmg' | 'dodge' | 'vamp';
const AFFIXES: Record<AffixKey, { min: number; max: number }> = {
  crit:    { min: 2,  max: 4 },
  critdmg: { min: 10, max: 25 },
  dodge:   { min: 2,  max: 4 },
  vamp:    { min: 1,  max: 3 },
};
/** Сколько бонусов-аффиксов у предмета каждой редкости (у амулетов — на один больше). */
const AFFIX_COUNT: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 1, epic: 2, legendary: 3 };
const AFFIX_RARITY_MULT: Record<Rarity, number> = { common: 1, uncommon: 1, rare: 1, epic: 1.4, legendary: 1.9 };

function rollAffixes(rarity: Rarity, slot: Item['slot']): Partial<Record<AffixKey, number>> {
  const count = Math.min(4, AFFIX_COUNT[rarity] + (slot === 'amulet' && rarity !== 'common' ? 1 : 0));
  const keys = (Object.keys(AFFIXES) as AffixKey[]).sort(() => Math.random() - 0.5).slice(0, count);
  const out: Partial<Record<AffixKey, number>> = {};
  for (const k of keys) {
    const { min, max } = AFFIXES[k];
    out[k] = Math.max(1, Math.round((min + Math.random() * (max - min)) * AFFIX_RARITY_MULT[rarity]));
  }
  return out;
}

let idCounter = 0;

/**
 * Создаёт предмет. boosted — с боссов и из сундуков (редкие вещи чаще),
 * minRarity — «не хуже этой редкости» (для сундуков).
 */
export function generateItem(floor: number, boosted: boolean, minRarity: Rarity = 'common'): Item {
  let roll = rollRarity(boosted);
  if (RARITY_ORDER.indexOf(roll.rarity) < RARITY_ORDER.indexOf(minRarity)) {
    roll = RARITY_ROLL.find(r => r.rarity === minRarity)!;
  }
  const { rarity, bonus } = roll;
  const slotRoll = Math.random();
  const slot = slotRoll < 0.45 ? 'weapon' : slotRoll < 0.85 ? 'armor' : 'amulet';

  const power = (1 + floor * 0.5) * bonus;
  const id = `item_${++idCounter}_${Date.now()}`;
  const plus = Math.max(1, Math.floor(power));
  const affixes = rollAffixes(rarity, slot);
  const affixPrice = Object.keys(affixes).length * 0.15;

  if (slot === 'weapon') {
    return {
      id, slot, rarity, ...affixes,
      price: Math.round(20 * bonus * (1 + floor * 0.5) * (1 + affixPrice)),
      name: `${pick(WEAPON_NAMES)} +${plus}`,
      emoji: pick(WEAPON_EMOJI),
      atk: Math.round(power * 5 + Math.random() * 3),
    };
  }
  if (slot === 'armor') {
    return {
      id, slot, rarity, ...affixes,
      price: Math.round(20 * bonus * (1 + floor * 0.5) * (1 + affixPrice)),
      name: `${pick(ARMOR_NAMES)} +${plus}`,
      emoji: '🛡️',
      def: Math.round(power * 3 + Math.random() * 2),
      hp: Math.round(power * 8 + Math.random() * 10),
    };
  }
  return {
    id, slot, rarity, ...affixes,
    name: pick(AMULET_NAMES),
    emoji: '📿',
    atk: Math.round(power * 2),
    def: Math.round(power * 1.5),
    hp: Math.round(power * 10),
    price: Math.round(30 * bonus * (1 + floor * 0.6) * (1 + affixPrice)),
  };
}

/** Оценка «полезности» предмета — чтобы сравнивать вещи и подсказывать улучшения. */
export function itemScore(i: Item): number {
  return (i.atk ?? 0) + (i.def ?? 0) * 1.2 + (i.hp ?? 0) * 0.15
    + (i.crit ?? 0) * 3 + (i.critdmg ?? 0) * 0.3 + (i.dodge ?? 0) * 3 + (i.vamp ?? 0) * 4;
}

/** Вещи, которые точно не нужны: не лучше надетой и не выше «редкой». */
export function junkItems(inventory: Item[], equipped: Equipment): Item[] {
  return inventory.filter(i => {
    const cur = equipped[i.slot];
    return !!cur && itemScore(i) <= itemScore(cur)
      && RARITY_ORDER.indexOf(i.rarity) <= RARITY_ORDER.indexOf('rare');
  });
}

// ════════════════════════════════════════════════════════════════
//  7. ДОСТИЖЕНИЯ
// ════════════════════════════════════════════════════════════════

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  target: number;
  stat: (c: { hero: HeroState; meta: Meta }) => number;
  reward: { gold?: number; souls?: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'kills1',     name: 'Первая кровь',      emoji: '🗡️', desc: 'Победи первого врага',          target: 1,     stat: c => c.hero.kills,         reward: { gold: 50 } },
  { id: 'kills100',   name: 'Охотник',           emoji: '🏹', desc: 'Победи 100 врагов',             target: 100,   stat: c => c.hero.kills,         reward: { gold: 300 } },
  { id: 'kills1000',  name: 'Мясник',            emoji: '🪓', desc: 'Победи 1000 врагов',            target: 1000,  stat: c => c.hero.kills,         reward: { souls: 2 } },
  { id: 'floor5',     name: 'Всё глубже',        emoji: '🕯️', desc: 'Достигни 5-го этажа',          target: 5,     stat: c => c.meta.maxFloor,      reward: { gold: 400 } },
  { id: 'floor10',    name: 'Покоритель бездны', emoji: '🏰', desc: 'Достигни 10-го этажа',          target: 10,    stat: c => c.meta.maxFloor,      reward: { souls: 3 } },
  { id: 'floor20',    name: 'Нет пути назад',    emoji: '🌌', desc: 'Достигни 20-го этажа',          target: 20,    stat: c => c.meta.maxFloor,      reward: { souls: 8 } },
  { id: 'boss1',      name: 'Убийца королей',    emoji: '👑', desc: 'Победи первого босса',          target: 1,     stat: c => c.meta.bossKills,     reward: { gold: 200 } },
  { id: 'boss10',     name: 'Гроза боссов',      emoji: '🐉', desc: 'Победи 10 боссов',              target: 10,    stat: c => c.meta.bossKills,     reward: { souls: 3 } },
  { id: 'elite5',     name: 'Охотник за элитой', emoji: '⭐', desc: 'Победи 5 элитных врагов',       target: 5,     stat: c => c.meta.elites,        reward: { gold: 500 } },
  { id: 'crit100',    name: 'Меткий глаз',       emoji: '⚡', desc: 'Нанеси 100 критов',             target: 100,   stat: c => c.meta.crits,         reward: { gold: 400 } },
  { id: 'spells50',   name: 'Мастер приёмов',    emoji: '✨', desc: 'Используй способности 50 раз',  target: 50,    stat: c => c.meta.abilitiesUsed, reward: { gold: 400 } },
  { id: 'legend1',    name: 'Золотой блеск',     emoji: '🏆', desc: 'Найди легендарный предмет',     target: 1,     stat: c => c.meta.legendaries,   reward: { souls: 2 } },
  { id: 'level25',    name: 'Ветеран',           emoji: '🎖️', desc: 'Достигни 25 уровня',           target: 25,    stat: c => c.hero.level,         reward: { gold: 1000 } },
  { id: 'phoenix',    name: 'Феникс',            emoji: '🔥', desc: 'Погибни 10 раз и вернись',      target: 10,    stat: c => c.meta.deaths,        reward: { gold: 300 } },
  { id: 'rich',       name: 'Золотая лихорадка', emoji: '💰', desc: 'Заработай 20 000 золота',       target: 20000, stat: c => c.meta.goldEarned,    reward: { souls: 2 } },
  { id: 'rebirth1',   name: 'Новая жизнь',       emoji: '👻', desc: 'Соверши первое перерождение',   target: 1,     stat: c => c.meta.rebirths,      reward: { souls: 3 } },
];

export function emptyMeta(): Meta {
  return {
    souls: 0, rebirths: 0, maxFloor: 1, bossKills: 0, elites: 0, crits: 0, deaths: 0,
    legendaries: 0, goldEarned: 0, abilitiesUsed: 0, achievements: [],
  };
}
