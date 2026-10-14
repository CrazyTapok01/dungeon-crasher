import type {
  AbilityDef, AbilityId, BonusKey, PetDef, PetId, TalentDef, ClassDef, ClassId, Cooldowns, Element, Equipment, HeroState, Item, Meta, Monster, MonsterTrait,
  Quest, QuestKind, Rarity, RelicDef, RelicId, ShopUpgrade, SkillDef, SkillId, SkillLevels,
  UpgradeCounts, UpgradeKind,
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
export function upgradeCost(up: ShopUpgrade, bought: number, rebirths = 0): number {
  return Math.round(up.cost * Math.pow(UPGRADE_COST_GROWTH, bought) * upgradeDiscount(rebirths));
}
/** Сколько даёт одна покупка улучшения (с наградой «Мастер-кузнец»). */
export function upgradeAmount(up: ShopUpgrade, rebirths = 0): number {
  return Math.max(1, Math.round(up.amount * upgradeBoost(rebirths)));
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
export const RAGE = { charges: 4, mult: 1.6 };

export const ABILITIES: AbilityDef[] = [
  { id: 'strike', name: 'Сокрушающий удар', emoji: '💥', desc: `Мгновенный удар ×${STRIKE.mult}, игнорирует половину брони`, cooldownTicks: 8,  unlockLevel: 1 },
  { id: 'shield', name: 'Щит',              emoji: '🛡️', desc: `Следующие ${SHIELD.charges} удара врага слабее на ${SHIELD.reduction * 100}%`,   cooldownTicks: 20, unlockLevel: 4 },
  { id: 'heal',   name: 'Исцеление',        emoji: '✨', desc: `Лечит ${HEAL_ABILITY.frac * 100}% макс. HP и снимает яд`,                       cooldownTicks: 26, unlockLevel: 7 },
  { id: 'rage',   name: 'Берсерк',          emoji: '😡', desc: `Следующие ${RAGE.charges} удара героя сильнее на ${Math.round((RAGE.mult - 1) * 100)}%`, cooldownTicks: 24, unlockLevel: 1, unlockRebirths: 5 },
];
export function emptyCooldowns(): Cooldowns {
  return { strike: 0, shield: 0, heal: 0, rage: 0 };
}
export const abilityDef = (id: AbilityId): AbilityDef => ABILITIES.find(a => a.id === id)!;

// ── Перерождение ─────────────────────────────────────────────────

export const PRESTIGE = {
  minFloor: 8,
  atkHpPerSoul: 0.05,   // +5% к атаке и HP за каждую душу
  goldPerSoul: 0.02,    // +2% к золоту
  startGoldPerSoul: 10, // стартовое золото после перерождения
};
export function soulsForFloor(floor: number, rebirths = 0): number {
  if (floor < PRESTIGE.minFloor) return 0;
  const base = Math.max(1, Math.floor(Math.pow(floor, 1.45) / 2));
  return Math.max(1, Math.floor(base * soulHarvest(rebirths)));
}
export const soulMultiplier = (souls: number) => 1 + souls * PRESTIGE.atkHpPerSoul;

// ── ПУТЬ ПЕРЕРОЖДЕНИЙ ────────────────────────────────────────────
// Награды за количество совершённых перерождений. Они постоянные и переживают любое перерождение.
// Здесь собраны и сами награды (для экрана «Ещё»), и функции, которые читает остальная игра.

/** После скольких перерождений открывается каждая награда. */
const REB = { train1: 1, haggle: 2, fury: 3, train2: 4, rage: 5, chest: 6, bag: 7, train3: 8, smith: 10, harvest: 12, phoenix: 15 } as const;

/** Сколько уровней навыков максимум добавляет «Расширенное обучение» (I+II+III) — нужно для проверки сохранений. */
export const MAX_PERK_LEVELS = 15;
export const skillLevelBonus = (r: number) => (r >= REB.train1 ? 5 : 0) + (r >= REB.train2 ? 5 : 0) + (r >= REB.train3 ? 5 : 0);
export const skillMaxLevel = (def: SkillDef, r: number) => def.maxLevel + (def.noPerkLevels ? 0 : skillLevelBonus(r));
export const skillUnlocked = (def: SkillDef, r: number) => r >= (def.unlockRebirths ?? 0);
export const abilityUnlocked = (a: AbilityDef, level: number, r: number) => level >= a.unlockLevel && r >= (a.unlockRebirths ?? 0);
export const upgradeDiscount = (r: number) => (r >= REB.haggle ? 0.85 : 1);
export const upgradeBoost = (r: number) => (r >= REB.smith ? 1.5 : 1);
export const inventoryLimit = (r: number) => INVENTORY_LIMIT + (r >= REB.bag ? 20 : 0);
export const chestMinRarity = (r: number): Rarity => (r >= REB.chest ? 'rare' : 'uncommon');
export const soulHarvest = (r: number) => (r >= REB.harvest ? 1.25 : 1);
export const deathGoldKept = (r: number) => (r >= REB.phoenix ? 1 : DEATH_GOLD_KEPT);

export interface PerkDef { id: string; rebirths: number; emoji: string; name: string; desc: string }

export const PERKS: PerkDef[] = [
  { id: 'train1',  rebirths: REB.train1,  emoji: '📚', name: 'Расширенное обучение I',   desc: '+5 к максимальному уровню навыков (кроме крита, уклонения и вампиризма)' },
  { id: 'haggle',  rebirths: REB.haggle,  emoji: '🤝', name: 'Торговая смекалка',         desc: 'Улучшения в лавке на 15% дешевле' },
  { id: 'fury',    rebirths: REB.fury,    emoji: '🔥', name: 'Новый навык: Неистовство',  desc: 'Открывается навык «Неистовство»: +2% к итоговому урону за уровень' },
  { id: 'train2',  rebirths: REB.train2,  emoji: '📖', name: 'Расширенное обучение II',  desc: 'Ещё +5 к максимальному уровню навыков' },
  { id: 'rage',    rebirths: REB.rage,    emoji: '😡', name: 'Новая способность: Берсерк', desc: 'Четвёртая кнопка в бою: 4 удара подряд сильнее на 60%' },
  { id: 'chest',   rebirths: REB.chest,   emoji: '🧰', name: 'Сундук мастера',            desc: 'Из сундуков сокровищ выпадают вещи не хуже «редких»' },
  { id: 'bag',     rebirths: REB.bag,     emoji: '🎒', name: 'Просторная сумка',          desc: '+20 мест в сумке' },
  { id: 'train3',  rebirths: REB.train3,  emoji: '🎓', name: 'Расширенное обучение III', desc: 'Ещё +5 к максимальному уровню навыков' },
  { id: 'smith',   rebirths: REB.smith,   emoji: '⚒️', name: 'Мастер-кузнец',             desc: 'Улучшения в лавке дают на 50% больше за покупку' },
  { id: 'harvest', rebirths: REB.harvest, emoji: '👻', name: 'Жатва душ',                 desc: '+25% душ при каждом перерождении' },
  { id: 'phoenix', rebirths: REB.phoenix, emoji: '🔥', name: 'Феникс',                    desc: 'После смерти герой больше не теряет золото' },
];

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
  regen: 1, fortune: 5, wisdom: 5, fury: 2,
};
const B = SKILL_BONUS;

export const SKILLS: SkillDef[] = [
  { id: 'power',    name: 'Сила',      emoji: '💪', desc: `+${B.power} к атаке за уровень`,           maxLevel: 50, baseCost: 50,  costMult: 1.35, effect: l => `+${l * B.power} к атаке` },
  { id: 'vitality', name: 'Живучесть', emoji: '❤️', desc: `+${B.vitality} к макс. HP за уровень`,     maxLevel: 50, baseCost: 60,  costMult: 1.35, effect: l => `+${l * B.vitality} HP` },
  { id: 'armor',    name: 'Стойкость', emoji: '🛡️', desc: `+${B.armor} к защите за уровень`,          maxLevel: 40, baseCost: 55,  costMult: 1.35, effect: l => `+${l * B.armor} защиты` },
  { id: 'crit',     name: 'Критический удар', emoji: '⚡', desc: `+${B.crit}% шанс крита за уровень`,  maxLevel: 25, baseCost: 100, costMult: 1.45, effect: l => `${l * B.crit}% шанс крита` , noPerkLevels: true },
  { id: 'critdmg',  name: 'Мощь крита', emoji: '💥', desc: `+${B.critdmg}% урона крита за уровень`,   maxLevel: 25, baseCost: 120, costMult: 1.45, effect: l => `+${l * B.critdmg}% крит. урона` },
  { id: 'dodge',    name: 'Уклонение', emoji: '💨', desc: `+${B.dodge}% шанс уклонения за уровень`,   maxLevel: 20, baseCost: 150, costMult: 1.5,  effect: l => `${l * B.dodge}% уклонение` , noPerkLevels: true },
  { id: 'vamp',     name: 'Вампиризм', emoji: '🩸', desc: `+${B.vamp}% кражи жизни за уровень`,       maxLevel: 15, baseCost: 250, costMult: 1.6,  effect: l => `${l * B.vamp}% вампиризм` , noPerkLevels: true },
  { id: 'regen',    name: 'Регенерация', emoji: '🌿', desc: `+${B.regen} HP за ход героя за уровень`, maxLevel: 30, baseCost: 90,  costMult: 1.4,  effect: l => `+${l * B.regen} HP за ход` },
  { id: 'fortune',  name: 'Золотоискатель', emoji: '🪙', desc: `+${B.fortune}% золота за уровень`,    maxLevel: 30, baseCost: 120, costMult: 1.42, effect: l => `+${l * B.fortune}% золота` },
  { id: 'wisdom',   name: 'Мудрость',  emoji: '📖', desc: `+${B.wisdom}% опыта за уровень`,           maxLevel: 30, baseCost: 120, costMult: 1.42, effect: l => `+${l * B.wisdom}% опыта` },
  { id: 'fury',    name: 'Неистовство', emoji: '🔥', desc: `+${B.fury}% к итоговому урону за уровень`, maxLevel: 30, baseCost: 150, costMult: 1.4,  effect: l => `+${l * B.fury}% урона`, unlockRebirths: 3 },
];

export function emptySkillLevels(): SkillLevels {
  return { power: 0, vitality: 0, armor: 0, crit: 0, critdmg: 0, dodge: 0, vamp: 0, regen: 0, fortune: 0, wisdom: 0, fury: 0 };
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
  if (!isBoss && !isElite && floor >= GOBLIN.minFloor && Math.random() < GOBLIN.chance) {
    return {
      name: 'Гоблин-казначей', emoji: '👺', hp: Math.round(b.hp * GOBLIN.hp), atk: Math.round(b.atk * GOBLIN.atk),
      def: b.def, gold: Math.round(b.gold * GOBLIN.gold), xp: Math.round(b.xp * GOBLIN.xp),
      isBoss: false, isElite: false, tier, goblin: true, element: pick(ELEMENT_LIST),
    };
  }
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
    isBoss, isElite, tier, trait, element: pick(ELEMENT_LIST),
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
export function itemScore(raw: Item): number {
  const i = enhanced(raw);
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
  { id: 'rebirth5',   name: 'Вечный странник',   emoji: '🌀', desc: 'Соверши 5 перерождений',        target: 5,     stat: c => c.meta.rebirths,      reward: { souls: 5 } },
  { id: 'rebirth10',  name: 'Бессмертный',       emoji: '♾️', desc: 'Соверши 10 перерождений',       target: 10,    stat: c => c.meta.rebirths,      reward: { souls: 10 } },
];

export function emptyMeta(): Meta {
  return {
    souls: 0, rebirths: 0, maxFloor: 1, bossKills: 0, elites: 0, crits: 0, deaths: 0,
    legendaries: 0, goldEarned: 0, abilitiesUsed: 0, achievements: [],
    kills: 0, relics: emptyRelics(), quests: [], questsDone: 0,
    daily: { last: '', streak: 0 }, goblins: 0,
    pets: emptyPets(), activePet: null, egg: -1,
  };
}


// ───────────────────────── реликвии ─────────────────────────
// Падают с боссов (и редко с элитных), остаются после перерождения.
// Повторная находка повышает уровень; на максимуме даёт души.

export const RELIC_MAX = 10;
export const RELIC_DROP = { boss: 0.45, elite: 0.05, maxedGoldPerFloor: 300 };

export const RELICS: RelicDef[] = [
  { id: 'fang',  name: 'Клык Бездны',        emoji: '🦷', desc: '+3% к атаке',          maxLevel: RELIC_MAX },
  { id: 'heart', name: 'Сердце великана',    emoji: '🫀', desc: '+4% к макс. HP',       maxLevel: RELIC_MAX },
  { id: 'coin',  name: 'Древняя монета',     emoji: '🪙', desc: '+4% к золоту',         maxLevel: RELIC_MAX },
  { id: 'eye',   name: 'Глаз провидца',      emoji: '👁️', desc: '+1% к шансу крита',    maxLevel: RELIC_MAX },
  { id: 'tome',  name: 'Запретный фолиант',  emoji: '📖', desc: '+4% к опыту',          maxLevel: RELIC_MAX },
  { id: 'scale', name: 'Чешуя дракона',      emoji: '🐉', desc: '+2 к защите',          maxLevel: RELIC_MAX },
  { id: 'blood', name: 'Кровавый камень',    emoji: '🩸', desc: '+0.4% вампиризма',     maxLevel: RELIC_MAX },
  { id: 'wind',  name: 'Перо ветра',         emoji: '🪶', desc: '+0.5% к уклонению',    maxLevel: RELIC_MAX },
];

export function emptyRelics(): Record<RelicId, number> {
  return { fang: 0, heart: 0, coin: 0, eye: 0, tome: 0, scale: 0, blood: 0, wind: 0 };
}

export const relicDef = (id: RelicId): RelicDef => RELICS.find(r => r.id === id)!;

// ───────────────────────── задания ─────────────────────────
// Всегда активны 3 задания. Выполнил — награда (души и золото), выдаётся новое, чуть сложнее.

export const QUEST_SLOTS = 3;

export const QUEST_INFO: Record<QuestKind, { emoji: string; text: (n: number) => string }> = {
  kills:     { emoji: '⚔️', text: n => `Победи монстров: ${n}` },
  bosses:    { emoji: '👑', text: n => `Победи боссов: ${n}` },
  elites:    { emoji: '💀', text: n => `Победи элитных врагов: ${n}` },
  crits:     { emoji: '💥', text: n => `Нанеси критических ударов: ${n}` },
  abilities: { emoji: '✨', text: n => `Применить способностей: ${n}` },
  floor:     { emoji: '🏰', text: n => `Достигни этажа ${n}` },
};

/** Новое задание нужного вида; сложность растёт с числом выполненных. */
export function makeQuest(kind: QuestKind, meta: Meta): Quest {
  const n = meta.questsDone;
  const g = 1 + n * 0.12;
  const counters: Record<QuestKind, number> = {
    kills: meta.kills, bosses: meta.bossKills, elites: meta.elites,
    crits: meta.crits, abilities: meta.abilitiesUsed, floor: 0,
  };
  const targets: Record<QuestKind, number> = {
    kills: Math.round(40 * g), bosses: 2 + Math.floor(n / 4), elites: 5 + Math.floor(n / 2),
    crits: Math.round(50 * g), abilities: 12 + n, floor: meta.maxFloor + 2 + Math.floor(n / 6),
  };
  const weight: Record<QuestKind, number> = { kills: 1, bosses: 2, elites: 1.5, crits: 1, abilities: 1, floor: 2.5 };
  return {
    kind, target: targets[kind], base: counters[kind],
    souls: kind === 'bosses' || kind === 'floor' ? 1 + Math.floor(n / 20) : kind === 'elites' ? 1 : 0,
    gold: Math.round(120 * meta.maxFloor * weight[kind] * g),
  };
}

export function questProgress(q: Quest, meta: Meta): number {
  const cur: Record<QuestKind, number> = {
    kills: meta.kills, bosses: meta.bossKills, elites: meta.elites,
    crits: meta.crits, abilities: meta.abilitiesUsed, floor: meta.maxFloor,
  };
  return Math.min(q.target, Math.max(0, cur[q.kind] - q.base));
}

/** Добирает недостающие задания (разных видов). */
export function fillQuests(meta: Meta): Meta {
  if (meta.quests.length >= QUEST_SLOTS) return meta;
  const kinds = Object.keys(QUEST_INFO) as QuestKind[];
  const quests = [...meta.quests];
  while (quests.length < QUEST_SLOTS) {
    const free = kinds.filter(k => !quests.some(q => q.kind === k));
    quests.push(makeQuest(free[Math.floor(Math.random() * free.length)], meta));
  }
  return { ...meta, quests };
}


// ───────────────────────── заточка предметов ─────────────────────────
// Надетую вещь можно усилить за золото: +10% к атаке, защите и HP предмета за уровень.
// Заточка остаётся на вещи (даже если её снять), при продаже повышает цену.

export const ENHANCE = { max: 10, perLevel: 0.1, costBase: 2, costGrowth: 1.5, sellPerLevel: 0.3 };

/** Копия предмета с учётом заточки (для расчётов и показа). */
export function enhanced(i: Item): Item {
  const p = i.plus ?? 0;
  if (p <= 0) return i;
  const k = 1 + p * ENHANCE.perLevel;
  const sc = (v?: number) => (v === undefined ? undefined : Math.round(v * k));
  return { ...i, atk: sc(i.atk), def: sc(i.def), hp: sc(i.hp) };
}

export const enhanceCost = (i: Item): number =>
  Math.round(i.price * ENHANCE.costBase * Math.pow(ENHANCE.costGrowth, i.plus ?? 0));

export const sellPrice = (i: Item): number =>
  Math.round(i.price * (1 + (i.plus ?? 0) * ENHANCE.sellPerLevel));

// ───────────────────────── гоблин-казначей и ежедневная награда ─────────────────────────

export const GOBLIN = { chance: 0.04, minFloor: 2, hp: 0.6, atk: 0.4, gold: 10, xp: 2 };

export const DAILY = { goldPerFloor: 400, streakCap: 7, soulsEvery: 7, soulsBonus: 3 };

/** Сегодняшняя дата по часам игрока: «2026-10-12». */
export const todayKey = (): string => new Date().toLocaleDateString('sv');

/** Награда за следующий заход: считаем серию дней подряд. */
export function dailyPreview(meta: Meta, today = todayKey()): { available: boolean; streak: number; gold: number; souls: number } {
  const last = meta.daily.last;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const continues = last === y.toLocaleDateString('sv');
  const streak = last === today ? meta.daily.streak : continues ? meta.daily.streak + 1 : 1;
  const gold = Math.round(DAILY.goldPerFloor * meta.maxFloor * (1 + (Math.min(streak, DAILY.streakCap) - 1) * 0.25));
  return { available: last !== today, streak, gold, souls: streak % DAILY.soulsEvery === 0 ? DAILY.soulsBonus : 0 };
}


// ───────────────────────── классы ─────────────────────────

export const CLASSES: ClassDef[] = [
  { id: 'warrior', name: 'Воин', emoji: '🛡️', desc: 'Крепкий боец, который держит удар.',
    perks: ['+30% к здоровью', '+20% к защите', 'Обычный шанс крита'] },
  { id: 'mage', name: 'Маг', emoji: '🔮', desc: 'Стеклянная пушка с магическими атаками.',
    perks: ['+40% к крит. урону', 'Магические атаки: игнорируют 30% брони врага', '-10% к здоровью'] },
  { id: 'thief', name: 'Вор', emoji: '🗡️', desc: 'Быстрый и неуловимый, но хрупкий.',
    perks: ['+25% скорость атаки (шанс ударить дважды)', '+30% к уклонению', '-15% к защите'] },
];

export const CLASS_BONUS = {
  warriorHp: 1.3, warriorDef: 1.2,
  mageCritDmg: 40, mageHp: 0.9, magePierce: 0.3,
  thiefSpeed: 0.25, thiefDodge: 30, thiefDef: 0.85,
};

export const classDef = (id: ClassId): ClassDef => CLASSES.find(c => c.id === id)!;

// ───────────────────────── стихии ─────────────────────────

export const ELEMENT_LIST: Element[] = ['fire', 'ice', 'nature'];

export const ELEMENTS: Record<Element, { name: string; emoji: string; color: string }> = {
  fire:   { name: 'Огонь',   emoji: '🔥', color: 'text-orange-300' },
  ice:    { name: 'Лёд',     emoji: '❄️', color: 'text-cyan-300' },
  nature: { name: 'Природа', emoji: '🌿', color: 'text-green-300' },
};

export const ELEMENT_RULE = { strong: 1.5, weak: 0.75 };

/** Огонь > Лёд > Природа > Огонь. */
export const beats = (a: Element, b: Element): boolean =>
  (a === 'fire' && b === 'ice') || (a === 'ice' && b === 'nature') || (a === 'nature' && b === 'fire');

/** Множитель урона героя нужной стихии по врагу. */
export const elementMult = (hero: Element, enemy: Element): number =>
  beats(hero, enemy) ? ELEMENT_RULE.strong : beats(enemy, hero) ? ELEMENT_RULE.weak : 1;

/** Какая стихия бьёт данного врага. */
export const counterOf = (enemy: Element): Element => ELEMENT_LIST.find(e => beats(e, enemy))!;

// ───────────────────────── крафт ─────────────────────────
// 2 вещи одного слота и одного качества → 1 вещь следующего качества.

export const CRAFT_RECIPES: { from: Rarity; to: Rarity }[] = [
  { from: 'common', to: 'uncommon' },
  { from: 'uncommon', to: 'rare' },
];

const rollBonus = (r: Rarity) => RARITY_ROLL.find(x => x.rarity === r)!.bonus;

/** Материалы для крафта: вещи без заточки, сгруппированные по слоту и качеству; в паре — две самые слабые. */
export function craftGroups(inventory: Item[]) {
  return CRAFT_RECIPES.flatMap(rec =>
    (['weapon', 'armor', 'amulet'] as const).map(slot => {
      const items = inventory.filter(i => i.slot === slot && i.rarity === rec.from && !i.plus)
        .sort((a, b) => itemScore(a) - itemScore(b));
      return { ...rec, slot, count: items.length, pair: items.slice(0, 2) };
    }));
}

/** Результат крафта: средние статьи двух вещей, усиленные качеством, плюс новые бонусы. */
export function craftItem(a: Item, b: Item, to: Rarity): Item {
  const k = rollBonus(to) / rollBonus(a.rarity);
  const avg = (x?: number, y?: number) => (x === undefined && y === undefined ? undefined : Math.max(1, Math.round((((x ?? 0) + (y ?? 0)) / 2) * k)));
  const base = a.name.replace(/\s*\+\d+$/, '');
  const lvl = Math.max(...[a, b].map(i => Number(/\+(\d+)$/.exec(i.name)?.[1] ?? 0))) + 1;
  return {
    id: `item_${++idCounter}_${Date.now()}`,
    slot: a.slot, rarity: to, emoji: a.emoji,
    name: a.slot === 'amulet' ? base : `${base} +${lvl}`,
    atk: avg(a.atk, b.atk), def: avg(a.def, b.def), hp: avg(a.hp, b.hp),
    ...rollAffixes(to, a.slot),
    price: Math.round((a.price + b.price) * 0.75 * k),
  };
}


// ───────────────────────── таланты классов ─────────────────────────
// Очки: 1 за каждые 2 уровня героя. По 4 таланта на класс, до 5 уровней — всё не взять, приходится выбирать.

export const TALENT_MAX = 5;
export const talentPoints = (heroLevel: number): number => Math.floor(heroLevel / 2);

export const TALENTS: TalentDef[] = [
  { id: 'w_hp',    cls: 'warrior', name: 'Несокрушимость', emoji: '❤️', desc: '+5% к здоровью',        max: TALENT_MAX, per: { hp: 5 } },
  { id: 'w_def',   cls: 'warrior', name: 'Стальная кожа',  emoji: '🛡️', desc: '+4% к защите',          max: TALENT_MAX, per: { def: 4 } },
  { id: 'w_atk',   cls: 'warrior', name: 'Мощь удара',     emoji: '💪', desc: '+3% к атаке',            max: TALENT_MAX, per: { atk: 3 } },
  { id: 'w_regen', cls: 'warrior', name: 'Второе дыхание', emoji: '🌬️', desc: '+2 HP за ход',           max: TALENT_MAX, per: { regen: 2 } },
  { id: 'm_atk',   cls: 'mage',    name: 'Арканная мощь',  emoji: '🔮', desc: '+4% к атаке',            max: TALENT_MAX, per: { atk: 4 } },
  { id: 'm_crit',  cls: 'mage',    name: 'Фокус',          emoji: '🎯', desc: '+1.5% к шансу крита',    max: TALENT_MAX, per: { crit: 1.5 } },
  { id: 'm_cdmg',  cls: 'mage',    name: 'Разрушение',     emoji: '💥', desc: '+8% к крит. урону',      max: TALENT_MAX, per: { critdmg: 8 } },
  { id: 'm_pierce',cls: 'mage',    name: 'Пронзание',      emoji: '🌀', desc: '+5% игнора брони',       max: TALENT_MAX, per: { pierce: 5 } },
  { id: 't_speed', cls: 'thief',   name: 'Проворство',     emoji: '⚡', desc: '+3% шанс второго удара', max: TALENT_MAX, per: { speed: 3 } },
  { id: 't_dodge', cls: 'thief',   name: 'Тень',           emoji: '👤', desc: '+2% к уклонению',        max: TALENT_MAX, per: { dodge: 2 } },
  { id: 't_crit',  cls: 'thief',   name: 'Меткость',       emoji: '🗡️', desc: '+1.5% к шансу крита',    max: TALENT_MAX, per: { crit: 1.5 } },
  { id: 't_gold',  cls: 'thief',   name: 'Ограбление',     emoji: '💰', desc: '+6% к золоту',           max: TALENT_MAX, per: { gold: 6 } },
];

export function bonusFrom(levels: Record<string, number>, defs: { id: string; per: PetDef['per'] }[], key: BonusKey): number {
  return defs.reduce((sum, d) => sum + (levels[d.id] ?? 0) * (d.per[key] ?? 0), 0);
}

export const talentBonus = (talents: Record<string, number>, key: BonusKey) => bonusFrom(talents, TALENTS, key);

export const spentTalents = (talents: Record<string, number>): number =>
  Object.values(talents).reduce((a, b) => a + b, 0);

// ───────────────────────── питомцы ─────────────────────────
// С босса падает яйцо (шанс EGG.chance, если оно ещё не греется). Через EGG.kills убийств вылупляется питомец:
// новый вид или +1 уровень уже имеющемуся. Помогает один активный питомец.

export const PET_MAX = 10;
export const EGG = { chance: 0.3, kills: 60 };

export const PETS: PetDef[] = [
  { id: 'wolf',   name: 'Волчонок',  emoji: '🐺', desc: '+2% к атаке',                      per: { atk: 2 } },
  { id: 'hawk',   name: 'Ястреб',    emoji: '🦅', desc: '+0.8% крита, +3% крит. урона',     per: { crit: 0.8, critdmg: 3 } },
  { id: 'turtle', name: 'Черепаха',  emoji: '🐢', desc: '+3% к здоровью, +1% к защите',     per: { hp: 3, def: 1 } },
  { id: 'fox',    name: 'Лисёнок',   emoji: '🦊', desc: '+3% к золоту, +2% к опыту',        per: { gold: 3, xp: 2 } },
  { id: 'drake',  name: 'Дракончик', emoji: '🐲', desc: '+1.5% к атаке и здоровью',         per: { atk: 1.5, hp: 1.5 } },
];

export function emptyPets(): Record<PetId, number> {
  return { wolf: 0, hawk: 0, turtle: 0, fox: 0, drake: 0 };
}

export const petDef = (id: PetId): PetDef => PETS.find(p => p.id === id)!;

export const petBonus = (pet: { id: PetId; level: number } | null, key: BonusKey): number =>
  pet ? (petDef(pet.id).per[key] ?? 0) * pet.level : 0;
