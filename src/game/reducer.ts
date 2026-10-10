import type {
  AbilityId, Cooldowns, Equipment, GameEvent, GameEventBody, HeroState, HeroStats, HeroStatus,
  Item, LogEntry, LogType, Meta, Monster, MonsterAi, OfflineReport, Settings,
  SkillId, SkillLevels, UpgradeCounts, UpgradeKind,
} from '../types';
import {
  ABILITIES, ACHIEVEMENTS, BOSS, DEATH_GOLD_KEPT, DROP, ENRAGE, HEAL_ABILITY, INITIAL_HERO,
  INVENTORY_LIMIT, LEVEL_UP, LOG_LIMIT, OFFLINE, POISON, PRESTIGE, RARITY_NAME, REGEN_FRAC,
  SHIELD, SHOP_POTION, SHOP_UPGRADES, SKILLS, STAGES_PER_FLOOR, STRIKE, SWIFT_DODGE, THORNS_FRAC,
  TRAITS, abilityDef, baseMonsterStats, biomeForFloor, chestCost, emptyCooldowns, emptyMeta,
  emptySkillLevels, emptyUpgradeCounts, generateItem, generateMonster, itemScore, junkItems,
  skillCost, soulsForFloor, upgradeCost,
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
 *
 * Всё, что нужно показать на экране (удар, крит, лут…), reducer складывает в
 * state.events. Сцена боя и звук читают эти события и сами решают, как их показать.
 */

export interface GameState {
  // ── сохраняется в localStorage ──
  hero: HeroState;
  skillLevels: SkillLevels;
  equipped: Equipment;
  inventory: Item[];
  meta: Meta;
  upgradeCounts: UpgradeCounts;
  settings: Settings;

  // ── текущий бой (не сохраняется) ──
  monster: Monster;
  monsterId: number;        // у каждого нового монстра свой номер (для анимации появления)
  monsterHp: number;
  monsterAi: MonsterAi;
  turn: 'hero' | 'monster'; // чей сейчас ход
  isDead: boolean;
  heroStatus: HeroStatus;
  cooldowns: Cooldowns;

  // ── интерфейс ──
  log: LogEntry[];          // новые записи — в начале массива
  events: GameEvent[];      // что произошло в последнем действии
  showFloorBanner: boolean;
  offlineReport: OfflineReport | null;
  chestResult: Item | null; // что выпало из последнего сундука
}

export type Action =
  | { type: 'TICK' }                           // ход героя или монстра
  | { type: 'RESPAWN' }                        // возрождение после смерти
  | { type: 'USE_ABILITY'; id: AbilityId }
  | { type: 'SET_AUTO_ABILITIES'; value: boolean }
  | { type: 'BUY_SKILL'; id: SkillId }
  | { type: 'BUY_POTION' }
  | { type: 'BUY_UPGRADE'; kind: UpgradeKind }
  | { type: 'BUY_CHEST' }
  | { type: 'EQUIP'; itemId: string }
  | { type: 'EQUIP_BEST' }
  | { type: 'SELL'; itemId: string }
  | { type: 'SELL_JUNK' }
  | { type: 'REBIRTH' }
  | { type: 'OFFLINE'; seconds: number }       // игрока не было seconds секунд
  | { type: 'DISMISS_OFFLINE' }
  | { type: 'CLEAR_BANNER' }
  | { type: 'RESET' };

// ───────────────────────── вспомогательное ─────────────────────────

let nextId = 0;
const newId = () => ++nextId;

const NO_EVENTS: GameEvent[] = [];

const statsOf = (s: GameState): HeroStats =>
  computeStats(s.hero, s.skillLevels, s.equipped, s.meta.souls);

function withLog(s: GameState, text: string, type: LogType = 'info'): GameState {
  return { ...s, log: [{ id: newId(), text, type }, ...s.log].slice(0, LOG_LIMIT) };
}

/** Добавляет события для анимации и звука. */
function emit(s: GameState, ...bodies: GameEventBody[]): GameState {
  const added = bodies.map(b => ({ ...b, id: newId() }) as GameEvent);
  return { ...s, events: [...s.events, ...added] };
}

/** Здоровье не может быть больше максимума (например, после снятия брони). */
function clampHp(s: GameState): GameState {
  const hp = Math.min(s.hero.hp, statsOf(s).maxHp);
  return hp === s.hero.hp ? s : { ...s, hero: { ...s.hero, hp } };
}

function withGold(s: GameState, delta: number): GameState {
  return { ...s, hero: { ...s.hero, gold: s.hero.gold + delta } };
}

function healHero(s: GameState, amount: number, source: 'lifesteal' | 'regen' | 'potion' | 'ability' | 'levelup'): GameState {
  const max = statsOf(s).maxHp;
  const hp = Math.min(max, s.hero.hp + amount);
  const healed = hp - s.hero.hp;
  if (healed <= 0) return s;
  return emit({ ...s, hero: { ...s.hero, hp } }, { type: 'heal', amount: healed, source });
}

function damageHero(s: GameState, dmg: number): GameState {
  const hp = Math.max(0, s.hero.hp - dmg);
  let next: GameState = { ...s, hero: { ...s.hero, hp } };
  if (hp === 0 && !s.isDead) {
    next = { ...next, isDead: true, meta: { ...next.meta, deaths: next.meta.deaths + 1 } };
    next = withLog(next, '💀 Ты повержен! Возрождение...', 'death');
    next = emit(next, { type: 'hero_died' });
  }
  return next;
}

const NO_STATUS: HeroStatus = { poisonTurns: 0, poisonDmg: 0, shieldCharges: 0 };

function freshAi(): MonsterAi {
  return { turnsUntilHeavy: BOSS.heavyEvery, charging: false, enraged: false };
}

// ───────────────────────── создание состояния ─────────────────────────

function announceMonster(s: GameState): GameState {
  const m = s.monster;
  const tag = m.trait ? ` [${TRAITS[m.trait].emoji} ${TRAITS[m.trait].name}]` : '';
  if (m.isBoss) {
    return emit(withLog(s, `⚠️ БОСС: ${m.name} на этаже ${s.hero.floor}!${tag}`, 'boss'), { type: 'boss_spawn' });
  }
  if (m.isElite) return withLog(s, `⭐ Элитный враг: ${m.name}!${tag}`, 'boss');
  return withLog(s, `➡️ ${m.name} преграждает путь!${tag}`);
}

/** Выставляет на текущем этаже и стадии нового монстра; первым бьёт герой. */
function spawnMonster(s: GameState): GameState {
  const monster = generateMonster(s.hero.floor, s.hero.stage);
  return announceMonster({
    ...s,
    monster, monsterId: newId(), monsterHp: monster.hp, monsterAi: freshAi(), turn: 'hero',
    heroStatus: { ...s.heroStatus, poisonTurns: 0, poisonDmg: 0 }, // яд проходит после победы
  });
}

function createState(save: SaveData | null): GameState {
  const meta = save?.meta ?? emptyMeta();
  const hero = save?.hero ?? INITIAL_HERO;
  const monster = generateMonster(hero.floor, hero.stage);

  let s: GameState = {
    hero,
    skillLevels: save?.skillLevels ?? emptySkillLevels(),
    equipped: save?.equipped ?? {},
    inventory: save?.inventory ?? [],
    meta: { ...meta, maxFloor: Math.max(meta.maxFloor, hero.floor) },
    upgradeCounts: save?.upgradeCounts ?? emptyUpgradeCounts(),
    settings: save?.settings ?? { autoAbilities: true },
    monster,
    monsterId: newId(),
    monsterHp: monster.hp,
    monsterAi: freshAi(),
    turn: 'hero',
    isDead: false,
    heroStatus: { ...NO_STATUS },
    cooldowns: emptyCooldowns(),
    log: [],
    events: NO_EVENTS,
    showFloorBanner: false,
    offlineReport: null,
    chestResult: null,
  };

  // Если сохранились на нуле HP — стартуем хотя бы с 1 HP
  const hp = Math.min(Math.max(hero.hp, 1), statsOf(s).maxHp);
  s = { ...s, hero: { ...hero, hp } };

  s = withLog(s, '⚔️ Ты вошёл в подземелье...');
  s = withLog(s, 'Круши врагов и становись сильнее!');
  s = announceMonster(s);

  // Пока игра была закрыта, герой продолжал «работать» — выдаём награду
  if (save?.lastSeen) s = applyOffline(s, (Date.now() - save.lastSeen) / 1000);
  return checkAchievements(s);
}

/** Начальное состояние: из сохранения, если оно есть. */
export const loadInitialState = (): GameState => createState(loadGame());

/** Стартовый герой после перерождения: чуть больше золота за каждую душу. */
function startHero(meta: Meta): HeroState {
  return { ...INITIAL_HERO, hp: 99999, gold: INITIAL_HERO.gold + meta.souls * PRESTIGE.startGoldPerSoul };
}

// ───────────────────────── офлайн-прогресс ─────────────────────────

/** Пока игрока нет, герой «фармит» медленнее обычного: только золото и опыт, без лута. */
function applyOffline(s: GameState, seconds: number): GameState {
  if (!(seconds >= OFFLINE.minSeconds) || s.isDead) return s;
  const capped = Math.min(seconds, OFFLINE.maxHours * 3600);
  const kills = Math.floor((capped / OFFLINE.secondsPerKill) * OFFLINE.efficiency);
  if (kills <= 0) return s;

  const stats = statsOf(s);
  const ref = baseMonsterStats(s.hero.floor, 5, false);
  const gold = Math.round(kills * ref.gold * 1.15 * (1 + stats.goldBonus / 100));
  const xp = Math.round(kills * ref.xp * (1 + stats.xpBonus / 100));
  const { hero: afterXp, levelsGained } = applyXp(s.hero, xp);

  const next: GameState = {
    ...s,
    hero: { ...afterXp, gold: afterXp.gold + gold, kills: afterXp.kills + kills },
    meta: { ...s.meta, goldEarned: s.meta.goldEarned + gold },
    offlineReport: { seconds: capped, kills, gold, xp, levels: levelsGained },
  };
  // герой отдохнул
  return clampHp({ ...next, hero: { ...next.hero, hp: statsOf(next).maxHp } });
}

// ───────────────────────── достижения ─────────────────────────

function checkAchievements(s: GameState): GameState {
  const done = new Set(s.meta.achievements);
  let next = s;
  for (const a of ACHIEVEMENTS) {
    if (done.has(a.id)) continue;
    if (a.stat({ hero: next.hero, meta: next.meta }) < a.target) continue;
    done.add(a.id);
    next = {
      ...next,
      meta: {
        ...next.meta,
        achievements: [...next.meta.achievements, a.id],
        souls: next.meta.souls + (a.reward.souls ?? 0),
      },
    };
    if (a.reward.gold) next = withGold(next, a.reward.gold);
    const reward = [a.reward.gold && `${a.reward.gold} золота`, a.reward.souls && `${a.reward.souls} душ`]
      .filter(Boolean).join(', ');
    next = withLog(next, `🏆 Достижение «${a.name}»! Награда: ${reward}`, 'boss');
    next = emit(next, { type: 'achievement', id: a.id });
  }
  return next;
}

// ───────────────────────── способности ─────────────────────────

const canCast = (s: GameState, id: AbilityId): boolean =>
  !s.isDead && s.hero.level >= abilityDef(id).unlockLevel && s.cooldowns[id] === 0;

function castAbility(state: GameState, id: AbilityId): GameState {
  const def = abilityDef(id);
  let s: GameState = {
    ...state,
    cooldowns: { ...state.cooldowns, [id]: def.cooldownTicks },
    meta: { ...state.meta, abilitiesUsed: state.meta.abilitiesUsed + 1 },
  };
  s = emit(s, { type: 'ability', ability: id });

  switch (id) {
    case 'strike': {
      const roll = rollHeroAttack(statsOf(s), s.monster, { mult: STRIKE.mult, ignoreDef: STRIKE.ignoreDef });
      return hitMonster(withLog(s, `💥 Сокрушающий удар!`, 'ability'), roll, true);
    }
    case 'heal': {
      const amount = Math.round(statsOf(s).maxHp * HEAL_ABILITY.frac);
      s = { ...s, heroStatus: { ...s.heroStatus, poisonTurns: 0 } };
      return healHero(withLog(s, `✨ Исцеление! +${amount} HP`, 'heal'), amount, 'ability');
    }
    case 'shield':
      return withLog(
        { ...s, heroStatus: { ...s.heroStatus, shieldCharges: SHIELD.charges } },
        `🛡️ Щит поднят: ${SHIELD.charges} удара будут слабее`, 'ability',
      );
  }
}

/** Режим «авто»: герой сам применяет способности, когда это разумно. */
function autoCast(state: GameState): GameState {
  let s = state;
  const hpPct = s.hero.hp / statsOf(s).maxHp;
  if (canCast(s, 'heal') && hpPct < 0.4) s = castAbility(s, 'heal');
  if (canCast(s, 'shield') && s.heroStatus.shieldCharges === 0
      && (s.monsterAi.charging || hpPct < 0.55 || (s.monster.isBoss && hpPct < 0.8))) {
    s = castAbility(s, 'shield');
  }
  if (canCast(s, 'strike')) s = castAbility(s, 'strike');
  return s;
}

// ───────────────────────── бой ─────────────────────────

/** Попадание по монстру: общий код для обычного удара и «Сокрушающего удара». */
function hitMonster(
  state: GameState,
  roll: { dmg: number; crit: boolean; lifestealHeal: number },
  heavy: boolean,
): GameState {
  const { monster } = state;
  let s: GameState = { ...state, monsterHp: Math.max(0, state.monsterHp - roll.dmg) };
  s = emit(s, { type: 'hero_attack', dmg: roll.dmg, crit: roll.crit, heavy });
  if (roll.crit) s = { ...s, meta: { ...s.meta, crits: s.meta.crits + 1 } };
  s = roll.crit
    ? withLog(s, `💥 КРИТ! ${monster.name} получает ${roll.dmg} урона!`, 'crit')
    : withLog(s, `⚔️ Ты наносишь ${roll.dmg} урона ${monster.name}`, 'dmg');
  if (roll.lifestealHeal > 0) s = healHero(s, roll.lifestealHeal, 'lifesteal');

  if (s.monsterHp === 0) return defeatMonster(s);

  // «Шипастый» возвращает часть урона (но не добивает героя)
  if (monster.trait === 'thorns') {
    const reflect = Math.max(1, Math.round(roll.dmg * THORNS_FRAC));
    const hp = Math.max(1, s.hero.hp - reflect);
    const lost = s.hero.hp - hp;
    s = withLog({ ...s, hero: { ...s.hero, hp } }, `🌵 Шипы ранят тебя на ${lost}`, 'dmg');
    s = emit(s, { type: 'thorns', dmg: lost });
  }
  // «Берсерк» звереет, когда здоровья мало
  if (monster.trait === 'enrage' && !s.monsterAi.enraged && s.monsterHp / monster.hp < ENRAGE.hpFrac) {
    s = { ...s, monsterAi: { ...s.monsterAi, enraged: true } };
    s = emit(withLog(s, `😡 ${monster.name} впадает в ярость!`, 'boss'), { type: 'enrage' });
  }
  return s;
}

function heroAttack(state: GameState): GameState {
  const stats = statsOf(state);
  const { monster } = state;
  let s: GameState = { ...state, turn: 'monster' };

  if (stats.regen > 0) s = healHero(s, stats.regen, 'regen');

  // «Проворный» враг иногда уворачивается
  if (monster.trait === 'swift' && Math.random() * 100 < SWIFT_DODGE) {
    return withLog(emit(s, { type: 'monster_dodge' }), `💨 ${monster.name} уворачивается!`, 'dodge');
  }
  return hitMonster(s, rollHeroAttack(stats, monster), false);
}

function monsterAttack(state: GameState): GameState {
  const { monster } = state;
  const stats = statsOf(state);
  let s: GameState = { ...state, turn: 'hero' };

  // 1. яд тикает в начале хода монстра
  if (s.heroStatus.poisonTurns > 0) {
    const dmg = s.heroStatus.poisonDmg;
    s = { ...s, heroStatus: { ...s.heroStatus, poisonTurns: s.heroStatus.poisonTurns - 1 } };
    s = emit(withLog(s, `🤢 Яд жжёт тебя: -${dmg}`, 'dmg'), { type: 'poison_tick', dmg });
    s = damageHero(s, dmg);
    if (s.isDead) return s;
  }

  // 2. регенерация монстра
  if (monster.trait === 'regen' && s.monsterHp < monster.hp) {
    const amount = Math.max(1, Math.round(monster.hp * REGEN_FRAC));
    s = emit({ ...s, monsterHp: Math.min(monster.hp, s.monsterHp + amount) }, { type: 'monster_regen', amount });
  }

  // 3. босс: копит мощный удар. Ход замаха — без атаки, следующий — ×2.5
  let heavy = false;
  if (monster.isBoss) {
    if (s.monsterAi.charging) {
      heavy = true;
      s = { ...s, monsterAi: { ...s.monsterAi, charging: false, turnsUntilHeavy: BOSS.heavyEvery } };
    } else if (s.monsterAi.turnsUntilHeavy <= 1) {
      s = { ...s, monsterAi: { ...s.monsterAi, charging: true } };
      s = emit(s, { type: 'boss_charge' });
      return withLog(s, `⚠️ ${monster.name} заряжает мощный удар! Подними щит!`, 'boss');
    } else {
      s = { ...s, monsterAi: { ...s.monsterAi, turnsUntilHeavy: s.monsterAi.turnsUntilHeavy - 1 } };
    }
  }

  // 4. сама атака
  const roll = rollMonsterAttack(stats, monster, { heavy, enraged: s.monsterAi.enraged });
  let dmg = roll.dmg;
  if (roll.dodged) {
    s = emit(s, { type: 'monster_attack', dmg: 0, heavy, dodged: true, blocked: false });
    return withLog(s, '💨 Ты уклонился от атаки!', 'dodge');
  }

  // «Щит» смягчает удар
  let blocked = false;
  if (s.heroStatus.shieldCharges > 0) {
    blocked = true;
    dmg = Math.max(1, Math.round(dmg * (1 - SHIELD.reduction)));
    s = { ...s, heroStatus: { ...s.heroStatus, shieldCharges: s.heroStatus.shieldCharges - 1 } };
  }

  s = emit(s, { type: 'monster_attack', dmg, heavy, dodged: false, blocked });
  s = withLog(
    s,
    heavy ? `💢 ${monster.name} обрушивает мощный удар: -${dmg}!` : `🩸 ${monster.name} бьёт тебя на ${dmg}`,
    heavy ? 'boss' : 'dmg',
  );
  s = damageHero(s, dmg);
  if (s.isDead) return s;

  // «Ядовитый» отравляет при попадании
  if (monster.trait === 'poison') {
    const poisonDmg = Math.max(1, Math.round(monster.atk * POISON.dmgFrac));
    s = { ...s, heroStatus: { ...s.heroStatus, poisonTurns: POISON.turns, poisonDmg } };
    s = emit(withLog(s, `🤢 Ты отравлен!`, 'dmg'), { type: 'poisoned' });
  }
  return s;
}

/** Монстр убит: награда, лут, переход на следующую стадию и новый монстр. */
function defeatMonster(state: GameState): GameState {
  const { monster } = state;
  const stats = statsOf(state);
  let s = withLog(state, `☠️ ${monster.name} повержен!`);

  // 1. золото и опыт (с бонусами навыков и душ)
  const rawGold = monster.gold + Math.floor(Math.random() * monster.gold * 0.3);
  const gold = Math.round(rawGold * (1 + stats.goldBonus / 100));
  const xp = Math.round(monster.xp * (1 + stats.xpBonus / 100));
  const { hero: afterXp, levelsGained } = applyXp(s.hero, xp);
  s = {
    ...s,
    hero: { ...afterXp, gold: afterXp.gold + gold, kills: afterXp.kills + 1 },
    meta: {
      ...s.meta,
      goldEarned: s.meta.goldEarned + gold,
      bossKills: s.meta.bossKills + (monster.isBoss ? 1 : 0),
      elites: s.meta.elites + (monster.isElite ? 1 : 0),
    },
  };
  s = withLog(s, `💰 +${gold} золота, +${xp} опыта`, 'loot');
  s = emit(s, { type: 'monster_killed', emoji: monster.emoji, boss: monster.isBoss, elite: monster.isElite, gold, xp });

  // 2. новый уровень: немного лечит
  if (levelsGained > 0) {
    s = healHero(s, LEVEL_UP.hpBonus * levelsGained, 'levelup');
    s = emit(s, { type: 'level_up', level: s.hero.level });
    for (let lvl = s.hero.level - levelsGained + 1; lvl <= s.hero.level; lvl++) {
      const unlocked = ABILITIES.find(a => a.unlockLevel === lvl);
      s = withLog(s, `🎉 Уровень ${lvl}! +${LEVEL_UP.hpBonus} к макс. HP`);
      if (unlocked) s = withLog(s, `${unlocked.emoji} Открыта способность: ${unlocked.name}!`, 'ability');
    }
  }

  // 3. предмет (с боссов — всегда, с элитных — почти всегда)
  const dropChance = monster.isBoss ? DROP.bossItemChance : monster.isElite ? DROP.eliteItemChance : DROP.itemChance;
  if (Math.random() < dropChance) {
    s = dropItem(s, generateItem(s.hero.floor, monster.isBoss || monster.isElite));
  }

  // 4. зелье
  if (Math.random() < DROP.potionChance) {
    s = withLog(s, `🧪 Найдено зелье! +${DROP.potionHeal} HP`, 'heal');
    s = healHero(s, DROP.potionHeal, 'potion');
  }

  // 5. следующая стадия или следующий этаж
  const { floor, stage } = s.hero;
  if (stage >= STAGES_PER_FLOOR) {
    const biome = biomeForFloor(floor + 1);
    s = withLog(s, `🏰 Ты покорил этаж ${floor}! Новый этаж: ${floor + 1} — ${biome.name}`, 'boss');
    s = {
      ...s,
      showFloorBanner: true,
      hero: { ...s.hero, floor: floor + 1, stage: 1 },
      meta: { ...s.meta, maxFloor: Math.max(s.meta.maxFloor, floor + 1) },
    };
    s = emit(s, { type: 'floor_cleared', floor });
  } else {
    s = { ...s, hero: { ...s.hero, stage: stage + 1 } };
  }
  return spawnMonster(s);
}

/** Кладёт предмет в сумку; если сумка полна — сразу продаёт. */
function dropItem(s: GameState, item: Item): GameState {
  const label = `${item.emoji} ${item.name} (${RARITY_NAME[item.rarity]})`;
  const meta = item.rarity === 'legendary' ? { ...s.meta, legendaries: s.meta.legendaries + 1 } : s.meta;
  s = emit({ ...s, meta }, { type: 'loot', rarity: item.rarity });
  if (s.inventory.length >= INVENTORY_LIMIT) {
    return withLog(withGold(s, item.price), `🎒 Сумка полна — ${label} продан за ${item.price} золота`, 'loot');
  }
  return withLog({ ...s, inventory: [item, ...s.inventory] }, `🎁 Выпало: ${label}`, 'loot');
}

function respawnHero(state: GameState): GameState {
  const hero: HeroState = {
    ...state.hero,
    floor: Math.max(1, state.hero.floor - 1),
    stage: 1,
    gold: Math.floor(state.hero.gold * DEATH_GOLD_KEPT),
  };
  const lostPercent = Math.round((1 - DEATH_GOLD_KEPT) * 100);
  let s: GameState = { ...state, hero, isDead: false, heroStatus: { ...NO_STATUS } };
  s = { ...s, hero: { ...s.hero, hp: statsOf(s).maxHp } };
  s = withLog(s, `✨ Ты возродился! Потеряно ${lostPercent}% золота.`, 'heal');
  s = emit(s, { type: 'respawn' });
  return spawnMonster(s);
}

// ───────────────────────── экипировка ─────────────────────────

function equipItem(state: GameState, item: Item): GameState {
  const previous = state.equipped[item.slot]; // уйдёт обратно в сумку
  const rest = state.inventory.filter(i => i.id !== item.id);
  return clampHp({
    ...state,
    equipped: { ...state.equipped, [item.slot]: item },
    inventory: previous ? [previous, ...rest] : rest,
  });
}

function sellItems(state: GameState, items: Item[]): GameState {
  if (items.length === 0) return state;
  const ids = new Set(items.map(i => i.id));
  const total = items.reduce((sum, i) => sum + i.price, 0);
  const s = withGold({ ...state, inventory: state.inventory.filter(i => !ids.has(i.id)) }, total);
  return withLog(
    s,
    items.length === 1 ? `💰 Продано: ${items[0].name} за ${total} золота` : `💰 Продано вещей: ${items.length} за ${total} золота`,
    'loot',
  );
}

// ───────────────────────── редьюсер ─────────────────────────

function reduce(state: GameState, action: Action): GameState {
  // Большинство действий начинают «с чистого листа» событий для анимаций
  const fresh: GameState = state.events === NO_EVENTS ? state : { ...state, events: NO_EVENTS };

  switch (action.type) {
    case 'TICK': {
      if (state.isDead) return state;
      let s: GameState = {
        ...fresh,
        cooldowns: {
          strike: Math.max(0, state.cooldowns.strike - 1),
          shield: Math.max(0, state.cooldowns.shield - 1),
          heal: Math.max(0, state.cooldowns.heal - 1),
        },
      };
      if (s.settings.autoAbilities) s = autoCast(s);
      if (s.isDead) return s;
      return s.turn === 'hero' ? heroAttack(s) : monsterAttack(s);
    }

    case 'RESPAWN':
      return state.isDead ? respawnHero(fresh) : state;

    case 'USE_ABILITY':
      return canCast(state, action.id) ? castAbility(fresh, action.id) : state;

    case 'SET_AUTO_ABILITIES':
      return { ...state, settings: { ...state.settings, autoAbilities: action.value } };

    case 'BUY_SKILL': {
      const def = SKILLS.find(d => d.id === action.id);
      if (!def) return state;
      const level = state.skillLevels[def.id];
      const cost = skillCost(def, level);
      if (level >= def.maxLevel || state.hero.gold < cost) return state;
      return clampHp(emit({
        ...withGold(fresh, -cost),
        skillLevels: { ...state.skillLevels, [def.id]: level + 1 },
      }, { type: 'ui', kind: 'buy' }));
    }

    case 'BUY_POTION': {
      const { cost, heal } = SHOP_POTION;
      if (state.hero.gold < cost) return state;
      const s = withLog(withGold(fresh, -cost), `🧪 Зелье выпито! +${heal} HP`, 'heal');
      return healHero(s, heal, 'potion');
    }

    case 'BUY_UPGRADE': {
      const up = SHOP_UPGRADES.find(u => u.kind === action.kind);
      if (!up) return state;
      const cost = upgradeCost(up, state.upgradeCounts[up.kind]);
      if (state.hero.gold < cost) return state;
      const hero = { ...state.hero, gold: state.hero.gold - cost };
      if (up.kind === 'atk') hero.baseAtk += up.amount;
      if (up.kind === 'def') hero.baseDef += up.amount;
      if (up.kind === 'hp') { hero.baseMaxHp += up.amount; hero.hp += up.amount; }
      const counts = { ...state.upgradeCounts, [up.kind]: state.upgradeCounts[up.kind] + 1 };
      return emit(withLog({ ...fresh, hero, upgradeCounts: counts }, `🔧 Куплено: ${up.name}`), { type: 'ui', kind: 'buy' });
    }

    case 'BUY_CHEST': {
      const cost = chestCost(state.hero.floor);
      if (state.hero.gold < cost || state.inventory.length >= INVENTORY_LIMIT) return state;
      const item = generateItem(state.hero.floor, true, 'uncommon');
      let s = withGold(fresh, -cost);
      s = dropItem(s, item);
      return { ...s, chestResult: item };
    }

    case 'EQUIP': {
      const item = state.inventory.find(i => i.id === action.itemId);
      return item ? emit(equipItem(fresh, item), { type: 'ui', kind: 'equip' }) : state;
    }

    case 'EQUIP_BEST': {
      let s = fresh;
      let changed = false;
      for (const slot of ['weapon', 'armor', 'amulet'] as const) {
        const cur = s.equipped[slot];
        const best = s.inventory.filter(i => i.slot === slot)
          .reduce<Item | null>((b, i) => (!b || itemScore(i) > itemScore(b) ? i : b), null);
        if (best && (!cur || itemScore(best) > itemScore(cur))) { s = equipItem(s, best); changed = true; }
      }
      return changed ? emit(withLog(s, '🧰 Надеты лучшие вещи'), { type: 'ui', kind: 'equip' }) : state;
    }

    case 'SELL': {
      const item = state.inventory.find(i => i.id === action.itemId);
      return item ? emit(sellItems(fresh, [item]), { type: 'ui', kind: 'sell' }) : state;
    }

    case 'SELL_JUNK': {
      const junk = junkItems(state.inventory, state.equipped);
      return junk.length ? emit(sellItems(fresh, junk), { type: 'ui', kind: 'sell' }) : state;
    }

    case 'REBIRTH': {
      const { floor } = state.hero;
      const gain = soulsForFloor(floor);
      if (gain <= 0) return state;
      const meta: Meta = { ...state.meta, souls: state.meta.souls + gain, rebirths: state.meta.rebirths + 1 };
      let s = createState({
        hero: startHero(meta),
        skillLevels: emptySkillLevels(),
        equipped: {},
        inventory: [],
        meta,
        upgradeCounts: emptyUpgradeCounts(),
        settings: state.settings,
      });
      s = withLog(s, `👻 ПЕРЕРОЖДЕНИЕ! Получено душ: ${gain}. Всего: ${meta.souls}`, 'boss');
      return emit(s, { type: 'rebirth', souls: gain });
    }

    case 'OFFLINE':
      return applyOffline(fresh, action.seconds);

    case 'DISMISS_OFFLINE':
      return { ...state, offlineReport: null };

    case 'CLEAR_BANNER':
      return { ...state, showFloorBanner: false };

    case 'RESET':
      return createState(null);
  }
}

export function gameReducer(state: GameState, action: Action): GameState {
  const next = reduce(state, action);
  return next === state ? state : checkAchievements(next);
}
