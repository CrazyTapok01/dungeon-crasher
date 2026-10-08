import type {
  HeroState, Item, Monster, Rarity, ShopUpgrade, SkillDef, SkillId, SkillLevels,
} from './types';

// ════════════════════════════════════════════════════════════════
//  1. БАЛАНС — все «магические числа» игры собраны здесь
// ════════════════════════════════════════════════════════════════

export const STAGES_PER_FLOOR = 10;   // на 10-й стадии — босс
export const INVENTORY_LIMIT = 40;
export const LOG_LIMIT = 80;

// Тайминги (мс)
export const COMBAT_TICK_MS = 700;    // один удар (героя или монстра) раз в 700 мс
export const FX_DURATION_MS = 900;    // сколько живёт всплывающее число
export const BANNER_DURATION_MS = 2000;
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

// ════════════════════════════════════════════════════════════════
//  2. НАВЫКИ
// ════════════════════════════════════════════════════════════════

/** Сколько даёт один уровень навыка (используется и в расчёте, и в описании). */
export const SKILL_BONUS: Record<SkillId, number> = {
  power: 3, vitality: 15, armor: 2, crit: 2, critdmg: 20, dodge: 2, vamp: 3,
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
];

export function emptySkillLevels(): SkillLevels {
  return { power: 0, vitality: 0, armor: 0, crit: 0, critdmg: 0, dodge: 0, vamp: 0 };
}

/** Цена следующего уровня навыка растёт по геометрической прогрессии. */
export function skillCost(def: SkillDef, level: number): number {
  return Math.round(def.baseCost * Math.pow(def.costMult, level));
}

// ════════════════════════════════════════════════════════════════
//  3. РЕДКОСТЬ ПРЕДМЕТОВ (названия и цвета для интерфейса)
// ════════════════════════════════════════════════════════════════

export const RARITY_NAME: Record<Rarity, string> = {
  common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий',
  epic: 'Эпический', legendary: 'Легендарный',
};

export const RARITY_COLORS: Record<Rarity, { text: string; border: string; bg: string; glow: string }> = {
  common:    { text: 'text-gray-300',   border: 'border-gray-500',   bg: 'from-gray-700/50 to-gray-900/50',     glow: 'shadow-gray-500/30' },
  uncommon:  { text: 'text-green-400',  border: 'border-green-500',  bg: 'from-green-900/40 to-gray-900/50',    glow: 'shadow-green-500/40' },
  rare:      { text: 'text-blue-400',   border: 'border-blue-500',   bg: 'from-blue-900/40 to-gray-900/50',     glow: 'shadow-blue-500/40' },
  epic:      { text: 'text-purple-400', border: 'border-purple-500', bg: 'from-purple-900/40 to-gray-900/50',   glow: 'shadow-purple-500/50' },
  legendary: { text: 'text-amber-300',  border: 'border-amber-400',  bg: 'from-amber-900/40 to-gray-900/50',    glow: 'shadow-amber-400/60' },
};

// ════════════════════════════════════════════════════════════════
//  4. МОНСТРЫ
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

/**
 * Создаёт монстра для этажа и стадии.
 * Чем глубже этаж и стадия — тем сильнее; у босса характеристики умножены.
 */
export function generateMonster(floor: number, stage: number): Monster {
  const isBoss = stage === STAGES_PER_FLOOR;
  const tier = Math.min(10, Math.max(1, Math.ceil(floor / 3)));

  let base: { name: string; emoji: string };
  if (isBoss) {
    base = BOSSES[Math.min(BOSSES.length - 1, Math.floor((floor - 1) / 3))];
  } else {
    // обычные монстры — своего тира или тира ниже
    base = pick(MONSTER_POOL.filter(m => m.tier <= tier && m.tier >= Math.max(1, tier - 1)));
  }

  const scale = 1 + (floor - 1) * 0.35 + (stage - 1) * 0.05;
  const bossMult = isBoss ? 3.5 : 1;

  return {
    name: base.name,
    emoji: base.emoji,
    hp:   Math.round((25 + floor * 12)  * scale * bossMult),
    atk:  Math.round((5 + floor * 2.2)  * scale * (isBoss ? 1.6 : 1)),
    def:  Math.round((2 + floor * 0.8)  * scale * (isBoss ? 1.4 : 1)),
    gold: Math.round((8 + floor * 5)    * scale * bossMult),
    xp:   Math.round((10 + floor * 6)   * scale * bossMult),
    isBoss,
    tier,
  };
}

// ════════════════════════════════════════════════════════════════
//  5. ПРЕДМЕТЫ
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

/** С боссов редкие вещи падают чаще. */
const BOSS_RARITY_BOOST: Record<Rarity, number> = { common: 1, uncommon: 1, rare: 2, epic: 3, legendary: 5 };

function rollRarity(fromBoss: boolean) {
  const weights = RARITY_ROLL.map(r => r.w * (fromBoss ? BOSS_RARITY_BOOST[r.rarity] : 1));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < RARITY_ROLL.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RARITY_ROLL[i];
  }
  return RARITY_ROLL[0];
}

let idCounter = 0;

export function generateItem(floor: number, fromBoss: boolean): Item {
  const { rarity, bonus } = rollRarity(fromBoss);
  const slotRoll = Math.random();
  const slot = slotRoll < 0.45 ? 'weapon' : slotRoll < 0.85 ? 'armor' : 'amulet';

  const power = (1 + floor * 0.5) * bonus;
  const id = `item_${++idCounter}_${Date.now()}`;
  const plus = Math.max(1, Math.floor(power));
  const price = Math.round(20 * bonus * (1 + floor * 0.5));

  if (slot === 'weapon') {
    return {
      id, slot, rarity, price,
      name: `${pick(WEAPON_NAMES)} +${plus}`,
      emoji: pick(WEAPON_EMOJI),
      atk: Math.round(power * 5 + Math.random() * 3),
    };
  }
  if (slot === 'armor') {
    return {
      id, slot, rarity, price,
      name: `${pick(ARMOR_NAMES)} +${plus}`,
      emoji: '🛡️',
      def: Math.round(power * 3 + Math.random() * 2),
      hp: Math.round(power * 8 + Math.random() * 10),
    };
  }
  return {
    id, slot, rarity,
    name: pick(AMULET_NAMES),
    emoji: '📿',
    atk: Math.round(power * 2),
    def: Math.round(power * 1.5),
    hp: Math.round(power * 10),
    price: Math.round(30 * bonus * (1 + floor * 0.6)),
  };
}
