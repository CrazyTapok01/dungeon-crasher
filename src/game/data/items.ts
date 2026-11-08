import type { ClassId } from '../types';

export interface RelicDef { id: string; name: string; emoji: string; desc: string; rarity: 'common' | 'uncommon' | 'rare' | 'boss' }

export const RELICS: RelicDef[] = [
  { id: 'plate', name: 'Кольчужный амулет', emoji: '📿', desc: 'Каждый бой начинается с 6 блока.', rarity: 'common' },
  { id: 'thornring', name: 'Шипастое кольцо', emoji: '💍', desc: 'Каждый бой начинается с 3 Шипов.', rarity: 'common' },
  { id: 'chalice', name: 'Кровавый кубок', emoji: '🏆', desc: 'После боя восстанавливает 7 HP.', rarity: 'common' },
  { id: 'belt', name: 'Пояс алхимика', emoji: '🎗️', desc: '+1 ячейка для зелий.', rarity: 'common' },
  { id: 'heart', name: 'Сердце великана', emoji: '❤️‍🔥', desc: '+12 к максимуму HP.', rarity: 'common' },
  { id: 'goblin_bag', name: 'Мешок гоблина', emoji: '💰', desc: '+25% золота с боёв и 40 золота сразу.', rarity: 'common' },
  { id: 'coupon', name: 'Купон торговца', emoji: '🎟️', desc: 'Цены в лавках на 25% ниже.', rarity: 'common' },
  { id: 'rage_sign', name: 'Знак ярости', emoji: '🩸', desc: 'Каждый бой начинается с +1 Силы.', rarity: 'uncommon' },
  { id: 'scroll', name: 'Лунный свиток', emoji: '📜', desc: 'В первом ходу боя берёшь на 2 карты больше.', rarity: 'uncommon' },
  { id: 'venom', name: 'Флакон яда', emoji: '🧪', desc: 'Каждое наложение Яда сильнее на 1.', rarity: 'uncommon' },
  { id: 'vine', name: 'Живая лоза', emoji: '🌿', desc: 'В конце каждого хода лечит 2 HP.', rarity: 'uncommon' },
  { id: 'bastion', name: 'Бастион', emoji: '🏯', desc: 'Не больше 8 блока сохраняется до следующего хода.', rarity: 'uncommon' },
  { id: 'prism', name: 'Призма', emoji: '🔮', desc: 'Атаки по стихии-слабости наносят на 2 урона больше.', rarity: 'uncommon' },
  { id: 'wedge', name: 'Ржавый клин', emoji: '🪓', desc: 'Первый ударивший по слабости удар каждого хода снимает ещё 1 Гард.', rarity: 'rare' },
  { id: 'hammer', name: 'Молот крушителя', emoji: '🔨', desc: 'По оглушённым врагам урон ×2 вместо ×1.5.', rarity: 'rare' },
  { id: 'dagger', name: 'Клинок вора', emoji: '🗡️', desc: 'Первая атака в каждом бою наносит двойной урон.', rarity: 'rare' },
  // боссовые
  { id: 'crown', name: 'Корона Бездны', emoji: '👑', desc: '+1 энергии каждый ход, но у врагов на 1 Гарда больше.', rarity: 'boss' },
  { id: 'colossus_heart', name: 'Сердце Колосса', emoji: '🫀', desc: '+30 к максимуму HP и полное исцеление.', rarity: 'boss' },
  { id: 'orb', name: 'Хрустальный шар', emoji: '🔭', desc: '+1 карта в руке каждый ход, но −10 к максимуму HP.', rarity: 'boss' },
  { id: 'horn', name: 'Горн кузнеца', emoji: '📯', desc: 'Каждый бой начинается с +2 Силы и +2 Ловкости.', rarity: 'boss' },
];
export const RELIC: Record<string, RelicDef> = Object.fromEntries(RELICS.map(r => [r.id, r]));

export interface PotionDef { id: string; name: string; emoji: string; desc: string; target: 'self' | 'enemy' | 'all'; price: number }
export const POTIONS: PotionDef[] = [
  { id: 'heal', name: 'Красное зелье', emoji: '🧪', desc: 'Лечит 35% максимума HP.', target: 'self', price: 45 },
  { id: 'steel', name: 'Эликсир стали', emoji: '🛡️', desc: '+16 блока.', target: 'self', price: 35 },
  { id: 'poison', name: 'Яд змеи', emoji: '🐍', desc: 'Цель получает 9 Яда.', target: 'enemy', price: 40 },
  { id: 'bomb', name: 'Бомба', emoji: '💣', desc: '16 урона всем врагам.', target: 'all', price: 45 },
  { id: 'acid', name: 'Кислота', emoji: '⚗️', desc: 'Снимает 3 Гарда у всех врагов.', target: 'all', price: 50 },
  { id: 'might', name: 'Настой ярости', emoji: '💪', desc: '+3 Силы до конца боя.', target: 'self', price: 40 },
  { id: 'clarity', name: 'Ясность', emoji: '🔮', desc: 'Возьми 3 карты и получи +2 энергии.', target: 'self', price: 45 },
];
export const POTION: Record<string, PotionDef> = Object.fromEntries(POTIONS.map(p => [p.id, p]));

export interface ClassInfo { id: ClassId; name: string; emoji: string; hp: number; pitch: string; passive: string; style: string }
export const CLASSES: ClassInfo[] = [
  { id: 'warrior', name: 'Воин', emoji: '🛡️', hp: 88, pitch: 'Крепкий и прямой: копит Силу, строит броню и ломает Гард тяжёлыми ударами.', passive: 'После каждого боя восстанавливает 6 HP.', style: 'Прощает ошибки' },
  { id: 'mage', name: 'Маг', emoji: '🔮', hp: 70, pitch: 'Хрупкий, но владеет всеми тремя стихиями с первого хода и ломает любого врага по слабости.', passive: 'Берёт в руку на 1 карту больше (6).', style: 'Тактика стихий' },
  { id: 'thief', name: 'Вор', emoji: '🗡️', hp: 72, pitch: 'Быстрый и коварный: яд, серии ударов и дешёвые карты. Побеждает умом, а не силой.', passive: 'В первом ходу каждого боя +1 энергия.', style: 'Для опытных' },
];
export const CLASS: Record<ClassId, ClassInfo> = Object.fromEntries(CLASSES.map(c => [c.id, c])) as Record<ClassId, ClassInfo>;

export interface PerkDef { id: string; name: string; emoji: string; desc: string; max: number; cost: (lvl: number) => number }
export const PERKS: PerkDef[] = [
  { id: 'hp', name: 'Закалка', emoji: '❤️', desc: '+4 к стартовому HP за уровень', max: 5, cost: l => 25 + l * 25 },
  { id: 'gold', name: 'Подорожник', emoji: '🪙', desc: '+20 стартового золота за уровень', max: 5, cost: l => 20 + l * 20 },
  { id: 'potion', name: 'Ремень', emoji: '🧴', desc: '+1 ячейка для зелий', max: 2, cost: l => 60 + l * 80 },
  { id: 'rest', name: 'Крепкий сон', emoji: '🛏️', desc: '+5% к лечению у костра за уровень', max: 3, cost: l => 40 + l * 40 },
  { id: 'trade', name: 'Торг', emoji: '🤝', desc: '−8% к ценам в лавках за уровень', max: 3, cost: l => 50 + l * 50 },
  { id: 'card', name: 'Наследие', emoji: '🃏', desc: 'Старт забега с редкой картой своего класса', max: 1, cost: () => 120 },
  { id: 'relic', name: 'Талисман', emoji: '🔱', desc: 'Старт забега со случайной обычной реликвией', max: 1, cost: () => 160 },
  { id: 'hunter', name: 'Охотник на панцири', emoji: '🪓', desc: 'У каждого врага на 1 Гарда меньше (минимум 1)', max: 1, cost: () => 260 },
];

export const MAX_ASC = 8;
/** Что добавляет каждый уровень сложности (уровни складываются). */
export function ascText(a: number): string {
  const extra: Record<number, string> = {
    3: ' Золота с боёв на 15% меньше.',
    4: ' Костры лечат 25% вместо 30%.',
    5: ' У врагов на 1 Гард больше.',
    7: ' Забег начинается с проклятием «Бремя».',
  };
  if (a === 0) return 'Обычная сложность.';
  return `Враги: +${8 * a}% HP, +${5 * a}% урона.${extra[a] ?? ''}`;
}
