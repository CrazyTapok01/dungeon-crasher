import type {
  Equipment, HeroState, HitEvent, Item, LogEntry, LogType, Monster, SkillId, SkillLevels, UpgradeKind,
} from '../types';
import {
  DEATH_GOLD_KEPT, DROP, INITIAL_HERO, INVENTORY_LIMIT, LEVEL_UP, LOG_LIMIT, RARITY_NAME,
  SHOP_POTION, SHOP_UPGRADES, SKILLS, STAGES_PER_FLOOR,
  emptySkillLevels, generateItem, generateMonster, skillCost,
} from '../gameData';
import { computeStats } from './stats';
import { applyXp, rollHeroAttack, rollMonsterAttack } from './combat';
import { loadGame, type SaveData } from './save';

/*
 * ЕДИНОЕ СОСТОЯНИЕ ИГРЫ И ВСЕ ПРАВИЛА.
 *
 * Идея: состояние меняется только через gameReducer(state, action).
 * Любое событие (удар, покупка, смерть…) — это action, а результат — новое состояние.
 * Внутри нет таймеров и setState — только «взяли старое состояние, вернули новое».
 * Благодаря этому правила легко читать и они не ломаются в React StrictMode.
 */

export interface GameState {
  // ── сохраняется в localStorage ──
  hero: HeroState;
  skillLevels: SkillLevels;
  equipped: Equipment;
  inventory: Item[];

  // ── текущий бой (не сохраняется) ──
  monster: Monster;
  monsterHp: number;
  turn: 'hero' | 'monster'; // чей сейчас ход
  isDead: boolean;

  // ── интерфейс ──
  log: LogEntry[];               // новые записи — в начале массива
  heroHit: HitEvent | null;      // что только что случилось с героем
  monsterHit: HitEvent | null;   // что только что случилось с монстром
  showFloorBanner: boolean;
}

export type Action =
  | { type: 'TICK' }                           // ход героя или монстра
  | { type: 'RESPAWN' }                        // возрождение после смерти
  | { type: 'BUY_SKILL'; id: SkillId }
  | { type: 'BUY_POTION' }
  | { type: 'BUY_UPGRADE'; kind: UpgradeKind }
  | { type: 'EQUIP'; itemId: string }
  | { type: 'SELL'; itemId: string }
  | { type: 'CLEAR_FX' }
  | { type: 'CLEAR_BANNER' }
  | { type: 'RESET' };

// ───────────────────────── вспомогательное ─────────────────────────

let nextId = 0;
const newId = () => ++nextId;

const statsOf = (s: GameState) => computeStats(s.hero, s.skillLevels, s.equipped);

function withLog(s: GameState, text: string, type: LogType = 'info'): GameState {
  return { ...s, log: [{ id: newId(), text, type }, ...s.log].slice(0, LOG_LIMIT) };
}

/** Здоровье не может быть больше максимума (например, после снятия брони). */
function clampHp(s: GameState): GameState {
  const hp = Math.min(s.hero.hp, statsOf(s).maxHp);
  return hp === s.hero.hp ? s : { ...s, hero: { ...s.hero, hp } };
}

function withGold(s: GameState, delta: number): GameState {
  return { ...s, hero: { ...s.hero, gold: s.hero.gold + delta } };
}

// ───────────────────────── создание состояния ─────────────────────────

function announceMonster(s: GameState): GameState {
  return s.monster.isBoss
    ? withLog(s, `⚠️ БОСС: ${s.monster.name} на этаже ${s.hero.floor}!`, 'boss')
    : withLog(s, `➡️ ${s.monster.name} преграждает путь!`);
}

/** Выставляет на текущем этаже и стадии нового монстра; первым бьёт герой. */
function spawnMonster(s: GameState): GameState {
  const monster = generateMonster(s.hero.floor, s.hero.stage);
  return announceMonster({ ...s, monster, monsterHp: monster.hp, turn: 'hero' });
}

function createState(save: SaveData | null): GameState {
  const hero = save?.hero ?? INITIAL_HERO;
  const monster = generateMonster(hero.floor, hero.stage);

  let s: GameState = {
    hero,
    skillLevels: save?.skillLevels ?? emptySkillLevels(),
    equipped: save?.equipped ?? {},
    inventory: save?.inventory ?? [],
    monster,
    monsterHp: monster.hp,
    turn: 'hero',
    isDead: false,
    log: [],
    heroHit: null,
    monsterHit: null,
    showFloorBanner: false,
  };

  // Если сохранились на нуле HP — стартуем хотя бы с 1 HP
  const hp = Math.min(Math.max(hero.hp, 1), statsOf(s).maxHp);
  s = { ...s, hero: { ...hero, hp } };

  s = withLog(s, '⚔️ Ты вошёл в подземелье...');
  s = withLog(s, 'Круши врагов и становись сильнее!');
  return announceMonster(s);
}

/** Начальное состояние: из сохранения, если оно есть. */
export const loadInitialState = (): GameState => createState(loadGame());

// ───────────────────────── бой ─────────────────────────

function heroAttack(state: GameState): GameState {
  const stats = statsOf(state);
  const { monster } = state;
  const { dmg, crit, lifestealHeal } = rollHeroAttack(stats, monster);

  let s: GameState = {
    ...state,
    turn: 'monster',
    monsterHp: Math.max(0, state.monsterHp - dmg),
    monsterHit: { id: newId(), kind: 'damage', text: `-${dmg}${crit ? '!' : ''}`, crit },
  };
  s = crit
    ? withLog(s, `💥 КРИТ! ${monster.name} получает ${dmg} урона!`, 'crit')
    : withLog(s, `⚔️ Ты наносишь ${dmg} урона ${monster.name}`, 'dmg');

  if (lifestealHeal > 0) {
    s = {
      ...s,
      hero: { ...s.hero, hp: Math.min(stats.maxHp, s.hero.hp + lifestealHeal) },
      heroHit: { id: newId(), kind: 'heal', text: `+${lifestealHeal}` },
    };
  }

  return s.monsterHp === 0 ? defeatMonster(s) : s;
}

function monsterAttack(state: GameState): GameState {
  const { monster } = state;
  const { dodged, dmg } = rollMonsterAttack(statsOf(state), monster);
  const s: GameState = { ...state, turn: 'hero' };

  if (dodged) {
    return withLog(
      { ...s, heroHit: { id: newId(), kind: 'dodge', text: 'УКЛОН' } },
      '💨 Ты уклонился от атаки!', 'dodge',
    );
  }

  const hp = Math.max(0, s.hero.hp - dmg);
  let next: GameState = {
    ...s,
    hero: { ...s.hero, hp },
    heroHit: { id: newId(), kind: 'damage', text: `-${dmg}` },
  };
  next = withLog(next, `🩸 ${monster.name} бьёт тебя на ${dmg}`, 'dmg');
  if (hp === 0) {
    next = withLog({ ...next, isDead: true }, '💀 Ты повержен! Возрождение...', 'death');
  }
  return next;
}

/** Монстр убит: награда, лут, переход на следующую стадию и новый монстр. */
function defeatMonster(state: GameState): GameState {
  const { monster } = state;
  let s = withLog(state, `☠️ ${monster.name} повержен!`);

  // 1. золото и опыт
  const gold = monster.gold + Math.floor(Math.random() * monster.gold * 0.3);
  const { hero: afterXp, levelsGained } = applyXp(s.hero, monster.xp);
  s = { ...s, hero: { ...afterXp, gold: afterXp.gold + gold, kills: afterXp.kills + 1 } };
  s = withLog(s, `💰 +${gold} золота, +${monster.xp} опыта`, 'loot');

  // 2. новый уровень: немного лечит
  if (levelsGained > 0) {
    const heal = LEVEL_UP.hpBonus * levelsGained;
    s = { ...s, hero: { ...s.hero, hp: Math.min(statsOf(s).maxHp, s.hero.hp + heal) } };
    for (let lvl = s.hero.level - levelsGained + 1; lvl <= s.hero.level; lvl++) {
      s = withLog(s, `🎉 Уровень ${lvl}! +${LEVEL_UP.hpBonus} к макс. HP`);
    }
  }

  // 3. предмет (с боссов — всегда)
  const dropChance = monster.isBoss ? DROP.bossItemChance : DROP.itemChance;
  if (Math.random() < dropChance) s = dropItem(s, generateItem(s.hero.floor, monster.isBoss));

  // 4. зелье
  if (Math.random() < DROP.potionChance) {
    const hp = Math.min(statsOf(s).maxHp, s.hero.hp + DROP.potionHeal);
    s = withLog({ ...s, hero: { ...s.hero, hp } }, `🧪 Найдено зелье! +${DROP.potionHeal} HP`, 'heal');
  }

  // 5. следующая стадия или следующий этаж
  const { floor, stage } = s.hero;
  if (stage >= STAGES_PER_FLOOR) {
    s = withLog(s, `🏰 Ты покорил этаж ${floor}! Новый этаж: ${floor + 1}`, 'boss');
    s = { ...s, showFloorBanner: true, hero: { ...s.hero, floor: floor + 1, stage: 1 } };
  } else {
    s = { ...s, hero: { ...s.hero, stage: stage + 1 } };
  }
  return spawnMonster(s);
}

/** Кладёт предмет в сумку; если сумка полна — сразу продаёт. */
function dropItem(s: GameState, item: Item): GameState {
  const label = `${item.emoji} ${item.name} (${RARITY_NAME[item.rarity]})`;
  if (s.inventory.length >= INVENTORY_LIMIT) {
    return withLog(withGold(s, item.price), `🎒 Сумка полна — ${label} продан за ${item.price} золота`, 'loot');
  }
  return withLog({ ...s, inventory: [item, ...s.inventory] }, `🎁 Выпало: ${label}`, 'loot');
}

function respawnHero(state: GameState): GameState {
  const hero: HeroState = {
    ...state.hero,
    hp: statsOf(state).maxHp,
    floor: Math.max(1, state.hero.floor - 1),
    stage: 1,
    gold: Math.floor(state.hero.gold * DEATH_GOLD_KEPT),
  };
  const lostPercent = Math.round((1 - DEATH_GOLD_KEPT) * 100);
  let s: GameState = { ...state, hero, isDead: false, heroHit: null, monsterHit: null };
  s = withLog(s, `✨ Ты возродился! Потеряно ${lostPercent}% золота.`, 'heal');
  return spawnMonster(s);
}

// ───────────────────────── редьюсер ─────────────────────────

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TICK':
      if (state.isDead) return state;
      return state.turn === 'hero' ? heroAttack(state) : monsterAttack(state);

    case 'RESPAWN':
      return state.isDead ? respawnHero(state) : state;

    case 'BUY_SKILL': {
      const def = SKILLS.find(d => d.id === action.id);
      if (!def) return state;
      const level = state.skillLevels[def.id];
      const cost = skillCost(def, level);
      if (level >= def.maxLevel || state.hero.gold < cost) return state;
      return {
        ...withGold(state, -cost),
        skillLevels: { ...state.skillLevels, [def.id]: level + 1 },
      };
    }

    case 'BUY_POTION': {
      const { cost, heal } = SHOP_POTION;
      if (state.hero.gold < cost) return state;
      const hp = Math.min(statsOf(state).maxHp, state.hero.hp + heal);
      const s = withGold(state, -cost);
      return withLog({ ...s, hero: { ...s.hero, hp } }, `🧪 Зелье выпито! +${heal} HP`, 'heal');
    }

    case 'BUY_UPGRADE': {
      const up = SHOP_UPGRADES.find(u => u.kind === action.kind);
      if (!up || state.hero.gold < up.cost) return state;
      const hero = { ...state.hero, gold: state.hero.gold - up.cost };
      if (up.kind === 'atk') hero.baseAtk += up.amount;
      if (up.kind === 'def') hero.baseDef += up.amount;
      if (up.kind === 'hp') { hero.baseMaxHp += up.amount; hero.hp += up.amount; }
      return withLog({ ...state, hero }, `🔧 Куплено: ${up.name}`);
    }

    case 'EQUIP': {
      const item = state.inventory.find(i => i.id === action.itemId);
      if (!item) return state;
      const previous = state.equipped[item.slot]; // уйдёт обратно в сумку
      const rest = state.inventory.filter(i => i.id !== item.id);
      return clampHp({
        ...state,
        equipped: { ...state.equipped, [item.slot]: item },
        inventory: previous ? [previous, ...rest] : rest,
      });
    }

    case 'SELL': {
      const item = state.inventory.find(i => i.id === action.itemId);
      if (!item) return state;
      const s = withGold({ ...state, inventory: state.inventory.filter(i => i.id !== item.id) }, item.price);
      return withLog(s, `💰 Продано: ${item.name} за ${item.price} золота`, 'loot');
    }

    case 'CLEAR_FX':
      return { ...state, heroHit: null, monsterHit: null };

    case 'CLEAR_BANNER':
      return { ...state, showFloorBanner: false };

    case 'RESET':
      return createState(null);
  }
}
