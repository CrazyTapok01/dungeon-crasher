import type {
  AbilityId, ClassId, PetId, PetSlot, RunSnapshot, WorldId, Cooldowns, Element, Equipment, GameEvent, GameEventBody, HeroState, HeroStats, HeroStatus,
  Item, ItemSlot, LogEntry, Rarity, LogType, Meta, Monster, MonsterAi, OfflineReport, Settings,
  SkillId, SkillLevels, UpgradeCounts, UpgradeKind,
} from '../types';
import {
  ABILITIES, ACHIEVEMENTS, BOSS, DROP, ENRAGE, HEAL_ABILITY, INITIAL_HERO,
  LEVEL_UP, LOG_LIMIT, OFFLINE, PERKS, POISON, PRESTIGE, RAGE, RARITY_NAME, REGEN_FRAC,
  SHIELD, SHOP_POTION, SHOP_UPGRADES, SKILLS, STAGES_PER_FLOOR, STRIKE, SWIFT_DODGE, THORNS_FRAC,
  TRAITS, abilityDef, abilityUnlocked, baseMonsterStats, biomeForFloor, chestCost, chestMinRarity,
  deathGoldKept, emptyCooldowns, emptyMeta, emptySkillLevels, emptyUpgradeCounts, generateItem,
  generateMonster, PET_REBIRTH, petAvailable, petRankOf, HELL_PACTS, SOUL_SHOP, altarCost, altarSouls, craftGoldCost, soulUpLevel, soulUpgradeCost, soulsAvailable, GEM, GEM_SHOP, HELL, PET_CRATES, PET_GEAR_MULT, PET_SLOTS, WORLDS, gemLevel, gemUpgradeCost, petCrateGoldCost, petGearMult, EGG, PET_MAX, PETS, TALENTS, TALENT_MAX, petDef, spentTalents, talentBonus, talentPoints, CLASSES, CLASS_BONUS, CRAFT_RECIPES, counterOf, craftItem, craftGroups, ENHANCE, dailyPreview, enhanceCost, enhanceChance, sellPrice, todayKey, inventoryLimit, RELICS, RELIC_DROP, RELIC_MAX, QUEST_INFO, fillQuests, questProgress, itemScore, junkItems, skillCost, skillMaxLevel, skillUnlocked,
  soulsForFloor, upgradeAmount, upgradeCost,
} from '../gameData';
import { computeStats, type Extras } from './stats';
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
  heroClass: ClassId | null; // null — класс ещё не выбран
  talents: Record<string, number>; // вложенные очки талантов (сбрасываются перерождением)
  world: WorldId;            // в каком мире сейчас герой
  offRun: RunSnapshot | null; // забег другого мира (хранится, пока мы не там)
  heroElement: Element;      // стихия атак героя

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
  | { type: 'ENHANCE'; slot: ItemSlot }
  | { type: 'CLAIM_DAILY' }
  | { type: 'SET_CLASS'; id: ClassId }
  | { type: 'BUY_TALENT'; id: string }
  | { type: 'SET_PET'; id: PetId | null }
  | { type: 'TRAVEL'; to: WorldId }
  | { type: 'OPEN_HELL' }
  | { type: 'BUY_SOUL'; id: string }
  | { type: 'TOGGLE_PACT'; id: string }
  | { type: 'ALTAR' }
  | { type: 'PET_REBIRTH'; id: PetId }
  | { type: 'SET_AUTO_SELL'; rarity: Rarity }
  | { type: 'BUY_GEM'; id: string }
  | { type: 'PET_CRATE'; kind: 'basic' | 'gem' }
  | { type: 'SET_ELEMENT'; element: Element }
  | { type: 'SET_AUTO_ELEMENT'; value: boolean }
  | { type: 'CRAFT'; slot: ItemSlot; from: Rarity }
  | { type: 'REBIRTH' }
  | { type: 'OFFLINE'; seconds: number }       // игрока не было seconds секунд
  | { type: 'DISMISS_OFFLINE' }
  | { type: 'CLEAR_BANNER' }
  | { type: 'RESET' };

// ───────────────────────── вспомогательное ─────────────────────────

let nextId = 0;
const newId = () => ++nextId;

const NO_EVENTS: GameEvent[] = [];

/** Что ещё усиливает героя: реликвии, класс, таланты, питомец. */
export const extrasOf = (s: Pick<GameState, 'heroClass' | 'talents' | 'meta' | 'world'>): Extras => ({
  relics: s.meta.relics,
  heroClass: s.world === 'hell' ? null : s.heroClass, // в Преисподней свой герой — без класса
  talents: s.talents,
  petMult: petGearMult(s.meta.petGear),
  gemUps: s.meta.gemUps,
  soulUps: s.meta.soulUps,
  pacts: s.world === 'hell' ? s.meta.pacts : {},
  pet: s.meta.activePet && s.meta.pets[s.meta.activePet] > 0 && petAvailable(s.meta, s.meta.activePet)
    ? { id: s.meta.activePet, level: s.meta.pets[s.meta.activePet] * petRankOf(s.meta, s.meta.activePet) } : null,
});

const statsOf = (s: GameState): HeroStats =>
  computeStats(s.hero, s.skillLevels, s.equipped, s.meta.souls, extrasOf(s));

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

const NO_STATUS: HeroStatus = { poisonTurns: 0, poisonDmg: 0, shieldCharges: 0, rageCharges: 0 };

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
  const monster = generateMonster(s.hero.floor, s.hero.stage, s.world);
  return announceMonster({
    ...s,
    heroElement: s.settings.autoElement ? counterOf(monster.element) : s.heroElement,
    monster, monsterId: newId(), monsterHp: monster.hp, monsterAi: freshAi(), turn: 'hero',
    heroStatus: { ...s.heroStatus, poisonTurns: 0, poisonDmg: 0 }, // яд проходит после победы
  });
}

/** Стихия героя при смене мира: авто — выигрышная против нового монстра. */
function s0Element(s: GameState, m: Monster): Element {
  return s.settings.autoElement ? counterOf(m.element) : s.heroElement;
}

function createState(save: SaveData | null): GameState {
  const meta = save?.meta ?? emptyMeta();
  const hero = save?.hero ?? INITIAL_HERO;
  const world: WorldId = save?.world ?? 'dungeon';
  const monster = generateMonster(hero.floor, hero.stage, world);

  let s: GameState = {
    hero,
    skillLevels: save?.skillLevels ?? emptySkillLevels(),
    equipped: save?.equipped ?? {},
    inventory: save?.inventory ?? [],
    meta: fillQuests(world === 'dungeon' ? { ...meta, maxFloor: Math.max(meta.maxFloor, hero.floor) } : meta),
    upgradeCounts: save?.upgradeCounts ?? emptyUpgradeCounts(),
    settings: save?.settings ?? { autoAbilities: true, autoElement: false, autoSell: [] },
    heroClass: save?.heroClass ?? null,
    talents: save?.talents ?? {},
    world: save?.world ?? 'dungeon',
    offRun: save?.offRun ?? null,
    heroElement: counterOf(monster.element),
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
  return { ...INITIAL_HERO, hp: 99999, gold: INITIAL_HERO.gold + meta.souls * PRESTIGE.startGoldPerSoul + soulUpLevel(meta.soulUps, 'start') * 250 };
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
  const hk = s.world === 'hell' ? HELL.monster : { gold: 1, xp: 1 };
  const gold = Math.round(kills * ref.gold * hk.gold * 1.15 * (1 + stats.goldBonus / 100));
  const xp = Math.round(kills * ref.xp * hk.xp * (1 + stats.xpBonus / 100));
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
    next = emit(next, { type: 'achievement', key: a.id });
  }
  return next;
}

// ───────────────────────── способности ─────────────────────────

const canCast = (s: GameState, id: AbilityId): boolean =>
  !s.isDead && abilityUnlocked(abilityDef(id), s.hero.level, s.meta.rebirths) && s.cooldowns[id] === 0;

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
      const roll = rollHeroAttack(statsOf(s), s.monster, { mult: STRIKE.mult, ...atkOpts(s, STRIKE.ignoreDef) });
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
    case 'rage':
      return withLog(
        { ...s, heroStatus: { ...s.heroStatus, rageCharges: RAGE.charges } },
        `😡 Берсерк! Следующие ${RAGE.charges} удара сильнее на ${Math.round((RAGE.mult - 1) * 100)}%`, 'ability',
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
  if (canCast(s, 'rage') && s.heroStatus.rageCharges === 0
      && (s.monster.isBoss || s.monster.isElite || s.monsterHp / s.monster.hp > 0.5)) {
    s = castAbility(s, 'rage');
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

/** Общие параметры удара героя: стихия и магия мага (игнор брони). */
function atkOpts(s: GameState, ignoreDef = 0) {
  const pierce = (s.heroClass === 'mage' ? CLASS_BONUS.magePierce : 0) + talentBonus(s.talents, 'pierce') / 100;
  return { element: s.heroElement, ignoreDef: 1 - (1 - ignoreDef) * (1 - pierce) };
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
  // «Берсерк» усиливает несколько обычных ударов подряд
  const raging = s.heroStatus.rageCharges > 0;
  if (raging) s = { ...s, heroStatus: { ...s.heroStatus, rageCharges: s.heroStatus.rageCharges - 1 } };
  s = hitMonster(s, rollHeroAttack(stats, monster, { ...atkOpts(s), ...(raging ? { mult: RAGE.mult } : {}) }), false);
  // Вор: шанс ударить ещё раз подряд
  if (s.heroClass === 'thief' && !s.isDead && s.monsterId === state.monsterId && Math.random() < CLASS_BONUS.thiefSpeed + talentBonus(s.talents, 'speed') / 100) {
    s = { ...s, turn: 'hero' };
  }
  return s;
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
      kills: s.meta.kills + 1,
      goblins: s.meta.goblins + (monster.goblin ? 1 : 0),
      bossKills: s.meta.bossKills + (monster.isBoss ? 1 : 0),
      elites: s.meta.elites + (monster.isElite ? 1 : 0),
    },
  };
  s = withLog(s, `💰 +${gold} золота, +${xp} опыта`, 'loot');
  if (monster.goblin) s = withLog(s, '👺 Гоблин-казначей выронил мешок с золотом!', 'loot');
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
    s = dropItem(s, generateItem(s.hero.floor, monster.isBoss || monster.isElite, 'common', s.world));
  }

  // 3а-1. кристалл бездны с босса (редко)
  if (monster.isBoss) {
    const hell = s.world === 'hell';
    const chance = (hell ? HELL.gemBossChance : s.hero.floor >= GEM.minBossFloor ? GEM.bossChance : 0) * luck(s);
    if (Math.random() < chance) s = addGems(s, 1, 'босс');
  }

  // 3а. яйцо питомца: с босса, потом греется убийствами
  s = tickEgg(s, monster.isBoss);

  // 3б. реликвия (боссы — часто, элитные — редко)
  const relicChance = (monster.isBoss ? RELIC_DROP.boss : monster.isElite ? RELIC_DROP.elite : 0) * luck(s);
  if (relicChance > 0 && Math.random() < relicChance) s = dropRelic(s);

  // 4. зелье
  if (Math.random() < DROP.potionChance) {
    s = withLog(s, `🧪 Найдено зелье! +${DROP.potionHeal} HP`, 'heal');
    s = healHero(s, DROP.potionHeal, 'potion');
  }

  // 5. следующая стадия или следующий этаж
  const { floor, stage } = s.hero;
  if (stage >= STAGES_PER_FLOOR) {
    const biome = biomeForFloor(floor + 1, s.world);
    s = withLog(s, `🏰 Ты покорил этаж ${floor}! Новый этаж: ${floor + 1} — ${biome.name}`, 'boss');
    const hell = s.world === 'hell';
    const record = floor + 1 > (hell ? s.meta.hellMax : s.meta.maxFloor); // кристалл только за новый рекорд этажа
    s = {
      ...s,
      showFloorBanner: true,
      hero: { ...s.hero, floor: floor + 1, stage: 1 },
      meta: hell
        ? { ...s.meta, hellMax: Math.max(s.meta.hellMax, floor + 1) }
        : { ...s.meta, maxFloor: Math.max(s.meta.maxFloor, floor + 1) },
    };
    s = emit(s, { type: 'floor_cleared', floor });
    // кристаллы за «круглые» этажи
    if (record && floor % (hell ? HELL.gemEveryFloors : GEM.everyFloors) === 0) s = addGems(s, 1, `этаж ${floor}`);
  } else {
    s = { ...s, hero: { ...s.hero, stage: stage + 1 } };
  }
  return spawnMonster(s);
}

/** Бонус «Печати удачи» к шансам реликвий и яиц. */
const luck = (s: GameState): number => 1 + gemLevel(s.meta.gemUps, 'luck') * 0.1;

function addGems(s: GameState, n: number, why: string): GameState {
  s = { ...s, meta: { ...s.meta, gems: s.meta.gems + n } };
  return emit(withLog(s, `💎 Кристалл бездны! +${n} (${why})`, 'boss'), { type: 'quest', text: `💎 +${n} кристалл бездны` });
}

function tickEgg(s: GameState, boss: boolean): GameState {
  let { egg } = s.meta;
  if (egg < 0) {
    if (!boss || Math.random() >= EGG.chance * luck(s)) return s;
    s = withLog(s, `🥚 С босса упало яйцо! Оно проклюнется через ${EGG.kills} побед`, 'boss');
    return emit({ ...s, meta: { ...s.meta, egg: 0 } }, { type: 'quest', text: '🥚 Найдено яйцо питомца!' });
  }
  egg += 1;
  if (egg < EGG.kills) return { ...s, meta: { ...s.meta, egg } };
  const def = PETS[Math.floor(Math.random() * PETS.length)];
  const lvl = s.meta.pets[def.id];
  const meta = {
    ...s.meta, egg: -1,
    pets: { ...s.meta.pets, [def.id]: Math.min(PET_MAX, lvl + 1) },
    activePet: s.meta.activePet ?? def.id,
  };
  s = { ...s, meta };
  const text = lvl === 0 ? `${def.emoji} Вылупился питомец: ${def.name}!` : lvl >= PET_MAX ? `${def.emoji} ${def.name} уже на максимуме` : `${def.emoji} ${def.name} вырос до уровня ${lvl + 1}!`;
  return emit(withLog(s, text, 'boss'), { type: 'quest', text });
}

/** Реликвия: новая или +1 уровень; на максимуме — души. */
function dropRelic(s: GameState): GameState {
  const def = RELICS[Math.floor(Math.random() * RELICS.length)];
  const lvl = s.meta.relics[def.id];
  if (lvl >= RELIC_MAX) {
    const bonus = RELIC_DROP.maxedGoldPerFloor * s.hero.floor;
    return withLog(withGold(s, bonus), `${def.emoji} Реликвия «${def.name}» уже на максимуме: +${bonus} золота`, 'boss');
  }
  s = { ...s, meta: { ...s.meta, relics: { ...s.meta.relics, [def.id]: lvl + 1 } } };
  s = withLog(s, `${def.emoji} РЕЛИКВИЯ! «${def.name}» → уровень ${lvl + 1} (${def.desc})`, 'boss');
  return emit(s, { type: 'relic', key: def.id, level: lvl + 1 });
}

// ───────────────────────── задания ─────────────────────────

function checkQuests(s: GameState): GameState {
  if (!s.meta.quests.some(q => questProgress(q, s.meta) >= q.target)) return s;
  let next = s;
  const active = [];
  for (const q of s.meta.quests) {
    if (questProgress(q, next.meta) < q.target) { active.push(q); continue; }
    const info = QUEST_INFO[q.kind];
    next = { ...next, meta: { ...next.meta, souls: next.meta.souls + q.souls, questsDone: next.meta.questsDone + 1 } };
    next = withGold(next, q.gold);
    next = withLog(next, `📜 Задание выполнено: ${info.text(q.target)}. Награда: ${q.gold} золота${q.souls ? `, ${q.souls} душ` : ''}`, 'boss');
    next = emit(next, { type: 'quest', text: `📜 Задание выполнено! +${q.gold} 💰${q.souls ? ` +${q.souls} 👻` : ''}` });
  }
  // Новые задания делаем после того, как пересчитали счётчики — база уже актуальна
  let meta = { ...next.meta, quests: active };
  meta = fillQuests(meta);
  return { ...next, meta };
}

/** Кладёт предмет в сумку; если сумка полна — сразу продаёт. */
function dropItem(s: GameState, item: Item): GameState {
  const label = `${item.emoji} ${item.name} (${RARITY_NAME[item.rarity]})`;
  const meta = item.rarity === 'legendary' || item.rarity === 'divine' ? { ...s.meta, legendaries: s.meta.legendaries + 1 } : s.meta;
  s = emit({ ...s, meta }, { type: 'loot', rarity: item.rarity });
  // авто-продажа: выбранное качество и не лучше надетого в этом слоте
  const worn = s.equipped[item.slot];
  if (s.settings.autoSell.includes(item.rarity) && worn && itemScore(item) <= itemScore(worn)) {
    return withLog(withGold(s, item.price), `🗑️ Авто-продажа: ${label} за ${item.price}`, 'loot');
  }
  if (s.inventory.length >= inventoryLimit(s.meta.rebirths)) {
    return withLog(withGold(s, item.price), `🎒 Сумка полна — ${label} продан за ${item.price} золота`, 'loot');
  }
  return withLog({ ...s, inventory: [item, ...s.inventory] }, `🎁 Выпало: ${label}`, 'loot');
}

function respawnHero(state: GameState): GameState {
  const hero: HeroState = {
    ...state.hero,
    floor: Math.max(1, state.hero.floor - 1),
    stage: 1,
    gold: Math.floor(state.hero.gold * deathGoldKept(state.meta.rebirths)),
  };
  const lostPercent = Math.round((1 - deathGoldKept(state.meta.rebirths)) * 100);
  let s: GameState = { ...state, hero, isDead: false, heroStatus: { ...NO_STATUS } };
  s = { ...s, hero: { ...s.hero, hp: statsOf(s).maxHp } };
  s = withLog(s, lostPercent > 0 ? `✨ Ты возродился! Потеряно ${lostPercent}% золота.` : '✨ Ты возродился! Золото осталось при тебе.', 'heal');
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
  const total = items.reduce((sum, i) => sum + sellPrice(i), 0);
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
      if (state.isDead || (state.world === 'dungeon' && state.heroClass === null)) return state;
      let s: GameState = {
        ...fresh,
        cooldowns: {
          strike: Math.max(0, state.cooldowns.strike - 1),
          shield: Math.max(0, state.cooldowns.shield - 1),
          heal: Math.max(0, state.cooldowns.heal - 1),
          rage: Math.max(0, state.cooldowns.rage - 1),
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
      if (!def || !skillUnlocked(def, state.meta.rebirths)) return state;
      const level = state.skillLevels[def.id];
      const cost = skillCost(def, level);
      if (level >= skillMaxLevel(def, state.meta.rebirths, state.world) || state.hero.gold < cost) return state;
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
      const cost = upgradeCost(up, state.upgradeCounts[up.kind], state.meta.rebirths);
      if (state.hero.gold < cost) return state;
      const amount = upgradeAmount(up, state.meta.rebirths);
      const hero = { ...state.hero, gold: state.hero.gold - cost };
      if (up.kind === 'atk') hero.baseAtk += amount;
      if (up.kind === 'def') hero.baseDef += amount;
      if (up.kind === 'hp') { hero.baseMaxHp += amount; hero.hp += amount; }
      const counts = { ...state.upgradeCounts, [up.kind]: state.upgradeCounts[up.kind] + 1 };
      return emit(withLog({ ...fresh, hero, upgradeCounts: counts }, `🔧 Куплено: ${up.name}`), { type: 'ui', kind: 'buy' });
    }

    case 'BUY_CHEST': {
      const cost = chestCost(state.hero.floor);
      if (state.hero.gold < cost || state.inventory.length >= inventoryLimit(state.meta.rebirths)) return state;
      const item = generateItem(state.hero.floor, true, chestMinRarity(state.meta.rebirths), state.world);
      let s = withGold(fresh, -cost);
      s = dropItem(s, item);
      return { ...s, chestResult: item };
    }

    case 'SET_CLASS': {
      if (state.heroClass !== null || state.world !== 'dungeon') return state;
      const s = { ...fresh, heroClass: action.id };
      const hp = statsOf(s).maxHp;
      return emit(withLog({ ...s, hero: { ...s.hero, hp } }, `🎭 Выбран класс: ${CLASSES.find(c => c.id === action.id)!.name}`, 'boss'), { type: 'ui', kind: 'equip' });
    }

    case 'SET_ELEMENT':
      return { ...fresh, heroElement: action.element, settings: { ...state.settings, autoElement: false } };

    case 'SET_AUTO_ELEMENT': {
      const settings = { ...state.settings, autoElement: action.value };
      return { ...fresh, settings, heroElement: action.value ? counterOf(state.monster.element) : state.heroElement };
    }

    case 'CRAFT': {
      const rec = CRAFT_RECIPES.find(r => r.from === action.from);
      const group = craftGroups(state.inventory).find(g => g.slot === action.slot && g.from === action.from);
      if (!rec || !group || group.take.length < rec.need) return state;
      const cost = craftGoldCost(rec, state.hero.floor);
      if (state.hero.gold < cost) return state;
      const mats = group.take;
      const ids = new Set(mats.map(m => m.id));
      const paid = withGold({ ...fresh }, -cost);
      if (Math.random() >= rec.chance) {
        // неудача: остаётся лучшая из материалов, остальные сгорают
        const keep = mats[mats.length - 1];
        const lost = new Set(mats.filter(m => m.id !== keep.id).map(m => m.id));
        const txt = `🔥 Крафт сорвался: сгорело ${lost.size}, «${keep.name}» уцелел`;
        const s = { ...paid, inventory: state.inventory.filter(i => !lost.has(i.id)) };
        return emit(emit(withLog(s, txt, 'loot'), { type: 'ui', kind: 'fail' }), { type: 'quest', text: txt });
      }
      const result = craftItem(mats, rec.to);
      const s = { ...paid, inventory: [result, ...state.inventory.filter(i => !ids.has(i.id))] };
      const done = emit(withLog(s, `🔨 Создано: ${result.name} (${RARITY_NAME[rec.to]})`, 'loot'), { type: 'loot', rarity: rec.to });
      return rec.to === 'legendary' || rec.to === 'divine' ? emit(done, { type: 'quest', text: `🔨 ${RARITY_NAME[rec.to]}: ${result.name}!` }) : done;
    }

    case 'PET_REBIRTH': {
      const id = action.id;
      const rank = petRankOf(state.meta, id);
      const cost = PET_REBIRTH.gemCost(rank);
      if (state.meta.pets[id] < PET_MAX || rank >= PET_REBIRTH.maxRank || !petAvailable(state.meta, id) || state.meta.gems < cost) return state;
      const meta = {
        ...state.meta, gems: state.meta.gems - cost,
        pets: { ...state.meta.pets, [id]: 1 },
        petRank: { ...state.meta.petRank, [id]: rank + 1 },
        petReborn: { ...state.meta.petReborn, [id]: Date.now() + PET_REBIRTH.hours * 3600 * 1000 },
      };
      const txt = `🔄 ${petDef(id).name} переродился: ранг ${rank + 1}, вернётся через ${PET_REBIRTH.hours} ч`;
      return emit(withLog({ ...fresh, meta }, txt, 'boss'), { type: 'quest', text: txt });
    }

    case 'SET_AUTO_SELL': {
      if (action.rarity === 'divine') return state;
      const cur = state.settings.autoSell;
      const autoSell = cur.includes(action.rarity) ? cur.filter(r => r !== action.rarity) : [...cur, action.rarity];
      return { ...fresh, settings: { ...state.settings, autoSell } };
    }

    case 'BUY_SOUL': {
      const d = SOUL_SHOP.find(x => x.id === action.id);
      if (!d) return state;
      const lvl = soulUpLevel(state.meta.soulUps, d.id);
      const cost = soulUpgradeCost(d, lvl);
      if (lvl >= d.max || soulsAvailable(state.meta) < cost) return state;
      const meta = { ...state.meta, soulsSpent: state.meta.soulsSpent + cost, soulUps: { ...state.meta.soulUps, [d.id]: lvl + 1 } };
      const s = clampHp({ ...fresh, meta });
      return emit(withLog(s, `${d.emoji} ${d.name} → ур. ${lvl + 1}`, 'ability'), { type: 'ui', kind: 'buy' });
    }

    case 'TOGGLE_PACT': {
      if (state.world !== 'hell' || !HELL_PACTS.some(p => p.id === action.id)) return state;
      const meta = { ...state.meta, pacts: { ...state.meta.pacts, [action.id]: !state.meta.pacts[action.id] } };
      const s = clampHp({ ...fresh, meta });
      return emit(withLog(s, `${HELL_PACTS.find(p => p.id === action.id)!.emoji} Договор ${meta.pacts[action.id] ? 'заключён' : 'расторгнут'}`, 'ability'), { type: 'ui', kind: 'equip' });
    }

    case 'ALTAR': {
      if (state.world !== 'hell') return state;
      const cost = altarCost(state.meta.altar, state.hero.floor);
      if (state.hero.gold < cost) return state;
      const gain = altarSouls(state.hero.floor);
      const s = withGold({ ...fresh, meta: { ...state.meta, souls: state.meta.souls + gain, altar: state.meta.altar + 1 } }, -cost);
      const txt = `🕯️ Жертва принята: +${gain} 👻`;
      return emit(withLog(s, txt, 'boss'), { type: 'quest', text: txt });
    }

    case 'BUY_TALENT': {
      const t = TALENTS.find(x => x.id === action.id);
      if (!t || t.cls !== state.heroClass) return state;
      if ((state.talents[t.id] ?? 0) >= TALENT_MAX || talentPoints(state.hero.level) - spentTalents(state.talents) <= 0) return state;
      const s = { ...fresh, talents: { ...state.talents, [t.id]: (state.talents[t.id] ?? 0) + 1 } };
      return emit(withLog(s, `${t.emoji} Талант «${t.name}» → ур. ${s.talents[t.id]}`, 'ability'), { type: 'ui', kind: 'buy' });
    }

    case 'OPEN_HELL': {
      if (state.meta.hellOpen || state.meta.gems < HELL.openCost) return state;
      const s = { ...fresh, meta: { ...state.meta, gems: state.meta.gems - HELL.openCost, hellOpen: true } };
      return emit(withLog(s, '🔥 Портал в Преисподнюю открыт!', 'boss'), { type: 'quest', text: '🔥 Портал в Преисподнюю открыт!' });
    }

    case 'TRAVEL': {
      if (action.to === state.world || (action.to === 'hell' && !state.meta.hellOpen)) return state;
      const here: RunSnapshot = {
        hero: state.hero, skillLevels: state.skillLevels, equipped: state.equipped, inventory: state.inventory,
        upgradeCounts: state.upgradeCounts, talents: state.talents, heroClass: state.heroClass,
      };
      const there: RunSnapshot = state.offRun ?? {
        hero: { ...HELL.hero }, skillLevels: emptySkillLevels(), equipped: {}, inventory: [],
        upgradeCounts: emptyUpgradeCounts(), talents: {}, heroClass: null,
      };
      const monster = generateMonster(there.hero.floor, there.hero.stage, action.to);
      let s: GameState = {
        ...fresh, ...there, world: action.to, offRun: here,
        monster, monsterId: newId(), monsterHp: monster.hp, monsterAi: freshAi(), turn: 'hero', isDead: false,
        heroStatus: { ...NO_STATUS }, cooldowns: emptyCooldowns(), showFloorBanner: false, chestResult: null,
        heroElement: s0Element(state, monster),
      };
      s = { ...s, hero: { ...s.hero, hp: Math.max(1, Math.min(s.hero.hp || 1, statsOf(s).maxHp)) } };
      s = withLog(s, `${WORLDS[action.to].emoji} Ты переместился: ${WORLDS[action.to].name}`, 'boss');
      return announceMonster(emit(s, { type: 'ui', kind: 'equip' }));
    }

    case 'BUY_GEM': {
      const d = GEM_SHOP.find(x => x.id === action.id);
      if (!d) return state;
      const lvl = gemLevel(state.meta.gemUps, d.id);
      const cost = gemUpgradeCost(d, lvl);
      if (lvl >= d.max || state.meta.gems < cost) return state;
      const meta = { ...state.meta, gems: state.meta.gems - cost, gemUps: { ...state.meta.gemUps, [d.id]: lvl + 1 } };
      const s = clampHp({ ...fresh, meta });
      return emit(withLog(s, `${d.emoji} ${d.name} → ур. ${lvl + 1}`, 'ability'), { type: 'ui', kind: 'buy' });
    }

    case 'PET_CRATE': {
      const crate = PET_CRATES[action.kind];
      const goldCost = action.kind === 'basic' ? petCrateGoldCost(state.hero.floor) : 0;
      if (state.meta.gems < crate.gemCost || state.hero.gold < goldCost) return state;
      const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'divine'];
      const total = crate.weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * total;
      let ri = 0;
      for (; ri < crate.weights.length - 1; ri++) { roll -= crate.weights[ri]; if (roll < 0) break; }
      const rarity = order[ri];
      const slot: PetSlot = PET_SLOTS[Math.floor(Math.random() * PET_SLOTS.length)].id;
      const cur = state.meta.petGear[slot];
      const better = !cur || PET_GEAR_MULT[rarity] > PET_GEAR_MULT[cur];
      const def = PET_SLOTS.find(x => x.id === slot)!;
      let s = withGold({ ...fresh, meta: { ...state.meta, gems: state.meta.gems - crate.gemCost } }, -goldCost);
      let text: string;
      if (better) {
        s = { ...s, meta: { ...s.meta, petGear: { ...s.meta.petGear, [slot]: rarity } } };
        text = `${def.emoji} ${def.name} питомца: ${RARITY_NAME[rarity]}! (+${Math.round(PET_GEAR_MULT[rarity] * 100)}% к бонусам)`;
      } else {
        const refund = Math.round(goldCost * 0.4);
        s = withGold(s, refund);
        text = `${def.emoji} ${def.name}: ${RARITY_NAME[rarity]} — не лучше имеющегося${refund ? ` (возврат ${refund} золота)` : ''}`;
      }
      return emit(withLog(s, text, 'loot'), { type: 'quest', text });
    }

    case 'SET_PET': {
      if (action.id !== null && (state.meta.pets[action.id] <= 0 || !petAvailable(state.meta, action.id))) return state;
      const s = { ...fresh, meta: { ...state.meta, activePet: action.id } };
      return action.id ? emit(withLog(s, `${petDef(action.id).emoji} ${petDef(action.id).name} теперь с тобой`), { type: 'ui', kind: 'equip' }) : s;
    }

    case 'ENHANCE': {
      const item = state.equipped[action.slot];
      if (!item || (item.plus ?? 0) >= ENHANCE.max) return state;
      const cost = enhanceCost(item, state.hero.floor);
      if (state.hero.gold < cost) return state;
      if (Math.random() >= enhanceChance(item.plus ?? 0)) {
        const f = withGold({ ...fresh }, -cost);
        const txt = `💥 Заточка не удалась! ${item.name.replace(/\s*\+\d+$/, '')} остался +${item.plus ?? 0}`;
        return emit(emit(withLog(f, `${txt} (потеряно ${cost})`, 'loot'), { type: 'ui', kind: 'fail' }), { type: 'quest', text: txt });
      }
      const upgraded: Item = { ...item, plus: (item.plus ?? 0) + 1 };
      const s = withGold({ ...fresh, equipped: { ...state.equipped, [action.slot]: upgraded } }, -cost);
      return emit(withLog(s, `⚒️ ${item.name} заточен до +${upgraded.plus}!`, 'loot'), { type: 'ui', kind: 'buy' });
    }

    case 'CLAIM_DAILY': {
      const d = dailyPreview(state.meta);
      if (!d.available) return state;
      let s = withGold(fresh, d.gold);
      s = { ...s, meta: { ...s.meta, souls: s.meta.souls + d.souls, daily: { last: todayKey(), streak: d.streak } } };
      s = withLog(s, `🎁 Ежедневная награда (день ${d.streak}): ${d.gold} золота${d.souls ? `, ${d.souls} душ` : ''}`, 'boss');
      return emit(s, { type: 'quest', text: `🎁 День ${d.streak}: +${d.gold} 💰${d.souls ? ` +${d.souls} 👻` : ''}` });
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
      if (state.world !== 'dungeon') return state; // перерождение — только в основном мире
      const { floor } = state.hero;
      const gain = Math.floor(soulsForFloor(floor, state.meta.rebirths) * (1 + gemLevel(state.meta.gemUps, 'souls') * 0.1));
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
        world: 'dungeon',
        offRun: state.offRun, // забег Преисподней не сбрасывается
      });
      s = withLog(s, `👻 ПЕРЕРОЖДЕНИЕ #${meta.rebirths}! Получено душ: ${gain}. Всего: ${meta.souls}`, 'boss');
      s = emit(s, { type: 'rebirth', souls: gain });
      // награды «Пути перерождений», открывшиеся именно сейчас
      for (const perk of PERKS.filter(p => p.rebirths === meta.rebirths)) {
        s = withLog(s, `🌟 Открыто: ${perk.emoji} ${perk.name} — ${perk.desc}`, 'boss');
        s = emit(s, { type: 'perk', key: perk.id });
      }
      return s;
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
  return next === state ? state : checkQuests(checkAchievements(next));
}
