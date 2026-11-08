import type { Card, CardDef, ClassId, Eff, Elem, StatusId } from '../types';

/*
 * ВСЕ КАРТЫ. Текст на карте не пишется руками: он строится из эффектов (cardText),
 * поэтому цифры в описании никогда не расходятся с реальной игрой.
 */

const dmg = (n: number, hits = 1): Eff => ({ k: 'dmg', n, hits });
const blk = (n: number): Eff => ({ k: 'block', n });
const draw = (n: number): Eff => ({ k: 'draw', n });
const energy = (n: number): Eff => ({ k: 'energy', n });
const heal = (n: number): Eff => ({ k: 'heal', n });
const hurt = (n: number): Eff => ({ k: 'hurt', n });
const crush = (n: number): Eff => ({ k: 'crush', n });
const st = (s: StatusId, n: number, on?: 'self' | 'target'): Eff => ({ k: 'st', s, n, on });

type Def = Omit<CardDef, 'id'>;
const LIST: Record<string, Def> = {
  // ── общие ──
  strike:  { name: 'Удар', art: '⚔️', cls: 'any', rarity: 'starter', type: 'attack', cost: 1, target: 'enemy', el: 'none', fx: [dmg(6)] },
  defend:  { name: 'Защита', art: '🛡️', cls: 'any', rarity: 'starter', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [blk(5)] },
  rush:    { name: 'Рывок', art: '💨', cls: 'any', rarity: 'common', type: 'attack', cost: 0, target: 'enemy', el: 'none', fx: [dmg(3)] },
  bandage: { name: 'Перевязка', art: '🩹', cls: 'any', rarity: 'common', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [heal(5)], exhaust: true },
  crack:   { name: 'Раскол брони', art: '🔨', cls: 'any', rarity: 'common', type: 'attack', cost: 1, target: 'enemy', el: 'none', fx: [dmg(4), crush(1)] },
  ironwall:{ name: 'Железный занавес', art: '🏰', cls: 'any', rarity: 'uncommon', type: 'skill', cost: 2, target: 'self', el: 'none', fx: [blk(14)], retain: true },
  gamble:  { name: 'Азарт', art: '🎲', cls: 'any', rarity: 'uncommon', type: 'skill', cost: 0, target: 'self', el: 'none', fx: [draw(2), hurt(2)] },
  adrenal: { name: 'Адреналин', art: '💉', cls: 'any', rarity: 'uncommon', type: 'skill', cost: 0, target: 'self', el: 'none', fx: [energy(1), draw(1)], exhaust: true },
  earth:   { name: 'Дар земли', art: '🌱', cls: 'any', rarity: 'uncommon', type: 'power', cost: 1, target: 'self', el: 'nature', fx: [st('regen', 2)] },
  thunder: { name: 'Громовой раскат', art: '🌩️', cls: 'any', rarity: 'rare', type: 'attack', cost: 2, target: 'all', el: 'none', fx: [dmg(6), crush(2)] },

  // ── воин ──
  w_bash:   { name: 'Пылающий раскол', art: '🔥', cls: 'warrior', rarity: 'starter', type: 'attack', cost: 2, target: 'enemy', el: 'fire', fx: [dmg(10), st('vuln', 1)] },
  w_break:  { name: 'Крушение', art: '💥', cls: 'warrior', rarity: 'starter', type: 'attack', cost: 1, target: 'enemy', el: 'none', fx: [dmg(5), crush(1)] },
  w_cleave: { name: 'Круговой удар', art: '🌀', cls: 'warrior', rarity: 'common', type: 'attack', cost: 1, target: 'all', el: 'none', fx: [dmg(6)] },
  w_stance: { name: 'Боевая стойка', art: '🧱', cls: 'warrior', rarity: 'common', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [blk(8)], retain: true },
  w_cry:    { name: 'Боевой клич', art: '📣', cls: 'warrior', rarity: 'common', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [st('strength', 2)], exhaust: true },
  w_hammer: { name: 'Тяжёлый молот', art: '🔨', cls: 'warrior', rarity: 'common', type: 'attack', cost: 2, target: 'enemy', el: 'none', fx: [dmg(13), crush(1)] },
  w_slam:   { name: 'Удар щитом', art: '🛡️', cls: 'warrior', rarity: 'uncommon', type: 'attack', cost: 1, target: 'enemy', el: 'none', fx: [{ k: 'slam' }], ucost: 0 },
  w_wave:   { name: 'Огненная волна', art: '🌋', cls: 'warrior', rarity: 'uncommon', type: 'attack', cost: 2, target: 'all', el: 'fire', fx: [dmg(9)] },
  w_reap:   { name: 'Кровавая жатва', art: '🩸', cls: 'warrior', rarity: 'uncommon', type: 'attack', cost: 1, target: 'enemy', el: 'fire', fx: [dmg(9), heal(2)] },
  w_thorns: { name: 'Шипастая броня', art: '🦔', cls: 'warrior', rarity: 'uncommon', type: 'power', cost: 1, target: 'self', el: 'none', fx: [st('thorns', 3)] },
  w_berserk:{ name: 'Берсерк', art: '😡', cls: 'warrior', rarity: 'rare', type: 'power', cost: 2, target: 'self', el: 'none', fx: [st('ritual', 1)], ucost: 1 },
  w_titan:  { name: 'Удар титана', art: '⚡', cls: 'warrior', rarity: 'rare', type: 'attack', cost: 3, target: 'enemy', el: 'none', fx: [dmg(24), crush(2)] },

  // ── маг ──
  m_spark:  { name: 'Искра', art: '✨', cls: 'mage', rarity: 'starter', type: 'attack', cost: 1, target: 'enemy', el: 'fire', fx: [dmg(6)] },
  m_frost:  { name: 'Иней', art: '❄️', cls: 'mage', rarity: 'starter', type: 'attack', cost: 1, target: 'enemy', el: 'ice', fx: [dmg(6)] },
  m_sprout: { name: 'Росток', art: '🌿', cls: 'mage', rarity: 'starter', type: 'attack', cost: 1, target: 'enemy', el: 'nature', fx: [dmg(6)] },
  m_barrier:{ name: 'Барьер', art: '🔰', cls: 'mage', rarity: 'starter', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [blk(7)] },
  m_insight:{ name: 'Озарение', art: '💡', cls: 'mage', rarity: 'starter', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [draw(2)], ucost: 0 },
  m_shatter:{ name: 'Расщепление', art: '🪓', cls: 'mage', rarity: 'starter', type: 'attack', cost: 1, target: 'enemy', el: 'none', fx: [dmg(3), crush(1)] },
  m_fireball:{ name: 'Огненный шар', art: '☄️', cls: 'mage', rarity: 'common', type: 'attack', cost: 2, target: 'enemy', el: 'fire', fx: [dmg(15)] },
  m_lance:  { name: 'Ледяное копьё', art: '🧊', cls: 'mage', rarity: 'common', type: 'attack', cost: 1, target: 'enemy', el: 'ice', fx: [dmg(7), st('weak', 1)] },
  m_whirl:  { name: 'Терновый вихрь', art: '🌪️', cls: 'mage', rarity: 'common', type: 'attack', cost: 2, target: 'all', el: 'nature', fx: [dmg(7)] },
  m_chain:  { name: 'Каскад льда', art: '🔱', cls: 'mage', rarity: 'uncommon', type: 'attack', cost: 2, target: 'random', el: 'ice', fx: [dmg(4, 3)] },
  m_surge:  { name: 'Выброс маны', art: '🔋', cls: 'mage', rarity: 'uncommon', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [energy(2)], exhaust: true, ucost: 0 },
  m_ward:   { name: 'Хрустальная защита', art: '💎', cls: 'mage', rarity: 'uncommon', type: 'power', cost: 1, target: 'self', el: 'none', fx: [st('dex', 2)] },
  m_storm:  { name: 'Шторм стихий', art: '🌈', cls: 'mage', rarity: 'rare', type: 'attack', cost: 2, target: 'all', el: 'fire', fx: [dmg(8), crush(1)] },
  m_meteor: { name: 'Метеор', art: '🌠', cls: 'mage', rarity: 'rare', type: 'attack', cost: 3, target: 'enemy', el: 'fire', fx: [dmg(30)] },

  // ── вор ──
  t_stab:   { name: 'Выпад', art: '🗡️', cls: 'thief', rarity: 'starter', type: 'attack', cost: 1, target: 'enemy', el: 'none', fx: [dmg(5)] },
  t_dodge:  { name: 'Уклон', art: '🌫️', cls: 'thief', rarity: 'starter', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [blk(5)] },
  t_venom:  { name: 'Ядовитый клинок', art: '🐍', cls: 'thief', rarity: 'starter', type: 'attack', cost: 1, target: 'enemy', el: 'nature', fx: [dmg(3), st('poison', 3)] },
  t_roll:   { name: 'Кувырок', art: '🤸', cls: 'thief', rarity: 'starter', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [blk(5), draw(1)] },
  t_flurry: { name: 'Шквал', art: '🌬️', cls: 'thief', rarity: 'common', type: 'attack', cost: 1, target: 'enemy', el: 'none', fx: [dmg(3, 3)] },
  t_shiv:   { name: 'Метательный нож', art: '🔪', cls: 'thief', rarity: 'common', type: 'attack', cost: 0, target: 'enemy', el: 'none', fx: [dmg(4)], exhaust: true },
  t_frost:  { name: 'Ледяной клинок', art: '🥶', cls: 'thief', rarity: 'common', type: 'attack', cost: 1, target: 'enemy', el: 'ice', fx: [dmg(6), st('weak', 1)] },
  t_cunning:{ name: 'Хитрость', art: '🦊', cls: 'thief', rarity: 'common', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [draw(2), blk(3)] },
  t_cloud:  { name: 'Ядовитое облако', art: '☁️', cls: 'thief', rarity: 'uncommon', type: 'skill', cost: 1, target: 'all', el: 'nature', fx: [st('poison', 3)] },
  t_back:   { name: 'Удар в спину', art: '🥷', cls: 'thief', rarity: 'uncommon', type: 'attack', cost: 2, target: 'enemy', el: 'none', fx: [dmg(15), crush(1)], exhaust: true },
  t_smoke:  { name: 'Дымовая завеса', art: '💨', cls: 'thief', rarity: 'uncommon', type: 'skill', cost: 1, target: 'self', el: 'none', fx: [blk(12)], exhaust: true },
  t_fury:   { name: 'Клинки ярости', art: '🌟', cls: 'thief', rarity: 'rare', type: 'attack', cost: 1, target: 'random', el: 'none', fx: [dmg(2, 5)] },
  t_toxic:  { name: 'Токсичный шторм', art: '☣️', cls: 'thief', rarity: 'rare', type: 'skill', cost: 2, target: 'all', el: 'nature', fx: [st('poison', 6)], exhaust: true },

  // ── проклятия и «мусор», который враги подкладывают в колоду ──
  burden:   { name: 'Бремя', art: '⛓️', cls: 'curse', rarity: 'common', type: 'curse', cost: -1, target: 'self', el: 'none', fx: [] },
  wound:    { name: 'Рана', art: '🩸', cls: 'curse', rarity: 'common', type: 'curse', cost: -1, target: 'self', el: 'none', fx: [] },
  burn:     { name: 'Ожог', art: '🔥', cls: 'curse', rarity: 'common', type: 'curse', cost: -1, target: 'self', el: 'none', fx: [], burn: 2 },
};

export const CARDS: Record<string, CardDef> = Object.fromEntries(
  Object.entries(LIST).map(([id, d]) => [id, { ...d, id }]),
);

export const cardDef = (c: Card | string): CardDef => CARDS[typeof c === 'string' ? c : c.id];

// ───────────────────────── улучшение ─────────────────────────

const bump = (n: number) => Math.max(2, Math.ceil(n * 0.3));

/** Улучшенные эффекты: числа растут, а цена иногда падает (ucost). */
export function upgradedFx(fx: Eff[]): Eff[] {
  return fx.map((e): Eff => {
    switch (e.k) {
      case 'dmg': return { ...e, n: e.n + ((e.hits ?? 1) > 1 ? 1 : bump(e.n)) };
      case 'block': return { ...e, n: e.n + bump(e.n) };
      case 'heal': return { ...e, n: e.n + 2 };
      case 'crush': return { ...e, n: e.n + 1 };
      case 'st': return { ...e, n: e.n + (e.n >= 5 ? 2 : 1) };
      default: return e;
    }
  });
}

/** Умеет ли карта улучшаться (у проклятий нет, у улучшенных уже было). */
export function canUpgrade(c: Card): boolean {
  const d = cardDef(c);
  if (c.up || d.type === 'curse') return false;
  return JSON.stringify(upgradedFx(d.fx)) !== JSON.stringify(d.fx) || d.ucost !== undefined;
}

export interface Eff2 { cost: number; fx: Eff[]; el: Elem }
/** Итоговые свойства карты с учётом улучшения и перековки. */
export function cardEff(c: Card): Eff2 {
  const d = cardDef(c);
  return {
    cost: c.up && d.ucost !== undefined ? d.ucost : d.cost,
    fx: c.up ? upgradedFx(d.fx) : d.fx,
    el: c.el ?? d.el,
  };
}

// ───────────────────────── текст ─────────────────────────

export const STATUS_NAME: Record<StatusId, string> = {
  strength: 'Сила', dex: 'Ловкость', weak: 'Слабость', vuln: 'Уязвимость',
  poison: 'Яд', thorns: 'Шипы', regen: 'Регенерация', ritual: 'Ритуал',
};
export const STATUS_EMOJI: Record<StatusId, string> = {
  strength: '💪', dex: '🌀', weak: '🥀', vuln: '💢', poison: '☠️', thorns: '🦔', regen: '💚', ritual: '🔮',
};
export const STATUS_HINT: Record<StatusId, string> = {
  strength: 'Каждая атака сильнее на столько очков.',
  dex: 'Каждый блок больше на столько очков.',
  weak: 'Наносит на 25% меньше урона. Спадает с ходами.',
  vuln: 'Получает на 50% больше урона. Спадает с ходами.',
  poison: 'В начале хода теряет столько HP (мимо блока), затем яда становится меньше на 1.',
  thorns: 'Каждый, кто ударит, получает столько урона в ответ.',
  regen: 'В конце хода лечит столько HP.',
  ritual: 'В конце каждого хода даёт столько Силы.',
};

export const ELEM_EMOJI: Record<Elem, string> = { fire: '🔥', ice: '❄️', nature: '🌿', none: '⚔️' };
export const ELEM_NAME: Record<Elem, string> = { fire: 'Огонь', ice: 'Лёд', nature: 'Природа', none: 'Сталь' };

export function fxText(fx: Eff[], target: string): string[] {
  const who = target === 'all' ? ' всем' : target === 'random' ? ' случайным' : '';
  return fx.map(e => {
    switch (e.k) {
      case 'dmg': return `Урон ${e.n}${(e.hits ?? 1) > 1 ? `×${e.hits}` : ''}${who}`;
      case 'slam': return 'Урон = блоку';
      case 'block': return `Блок ${e.n}`;
      case 'draw': return `Возьми ${e.n} ${e.n === 1 ? 'карту' : 'карты'}`;
      case 'energy': return `+${e.n} энергии`;
      case 'heal': return `Лечение ${e.n}`;
      case 'hurt': return `Потеряй ${e.n} HP`;
      case 'crush': return `Гард −${e.n}${who}`;
      case 'st': {
        const onSelf = e.on === 'self' || (e.on === undefined && target === 'self');
        return onSelf ? `${STATUS_NAME[e.s]} +${e.n}` : `${STATUS_NAME[e.s]} ${e.n}${who || ' цели'}`;
      }
    }
  });
}

export function cardText(c: Card): string {
  const d = cardDef(c);
  if (d.type === 'curse') {
    return d.burn ? `Нельзя сыграть. Если в руке в конце хода: −${d.burn} HP.` : 'Нельзя сыграть. Занимает место в колоде.';
  }
  const e = cardEff(c);
  const parts = fxText(e.fx, d.target);
  const tags: string[] = [];
  if (d.exhaust) tags.push('Исчезает');
  if (d.retain) tags.push('Остаётся');
  return parts.join('. ') + '.' + (tags.length ? ` ${tags.join('. ')}.` : '');
}

// ───────────────────────── наборы ─────────────────────────

export const STARTER_DECK: Record<ClassId, string[]> = {
  warrior: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'w_bash', 'w_break'],
  mage: ['m_spark', 'm_spark', 'm_frost', 'm_frost', 'm_sprout', 'm_sprout', 'm_barrier', 'm_barrier', 'm_shatter', 'm_insight'],
  thief: ['t_stab', 't_stab', 't_stab', 't_stab', 't_dodge', 't_dodge', 't_dodge', 't_dodge', 't_venom', 't_roll'],
};

export const REWARD_IDS = Object.values(CARDS).filter(d => d.rarity !== 'starter' && d.cls !== 'curse').map(d => d.id);
export const poolFor = (cls: ClassId, rarity: 'common' | 'uncommon' | 'rare'): string[] =>
  Object.values(CARDS).filter(d => d.rarity === rarity && (d.cls === cls || d.cls === 'any')).map(d => d.id);
