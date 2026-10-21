import type {
  AbilityId, ClassId, PetId, PetSlot, RunSnapshot, WorldId, Cooldowns, Element, Equipment, GameEvent, GameEventBody, HeroState, HeroStats, HeroStatus,
  Item, ItemSlot, LogEntry, Rarity, LogType, Meta, Monster, MonsterAi, OfflineReport, Settings,
  SkillId, SkillLevels, UpgradeCounts, UpgradeKind,
} from '../types';
import {
  ABILITIES, ACHIEVEMENTS, BOSS, RARITY_ORDER, activePacts, pactSlots, hellPower, DROP, ENRAGE, HEAL_ABILITY, INITIAL_HERO,
  LEVEL_UP, LOG_LIMIT, OFFLINE, PERKS, POISON, PRESTIGE, RAGE, RARITY_NAME, REGEN_FRAC,
  SHIELD, SHOP_POTION, SHOP_UPGRADES, SKILLS, STAGES_PER_FLOOR, STRIKE, SWIFT_DODGE, THORNS_FRAC,
  TRAITS, abilityDef, abilityUnlocked, baseMonsterStats, biomeForFloor, chestCost, chestMinRarity,
  deathGoldKept, emptyCooldowns, emptyMeta, emptySkillLevels, emptyUpgradeCounts, generateItem,
  generateMonster, FARM, FARMS, HELL_REBIRTH, farmCost, farmPending, farmRate, hellRebirthCost, PET_REBIRTH, petAvailable, petRankOf, HELL_PACTS, SOUL_SHOP, altarCost, altarSouls, craftGoldCost, soulUpLevel, soulUpgradeCost, soulsAvailable, GEM, GEM_SHOP, HELL, PET_CRATES, PET_GEAR_MULT, PET_SLOTS, WORLDS, gemLevel, gemUpgradeCost, petCrateGoldCost, petGearMult, EGG, PET_MAX, PETS, TALENTS, TALENT_MAX, petDef, spentTalents, talentBonus, talentPoints, CLASSES, CLASS_BONUS, CRAFT_RECIPES, counterOf, craftItem, craftGroups, ENHANCE, dailyPreview, enhanceCost, enhanceChance, sellPrice, todayKey, inventoryLimit, RELICS, RELIC_DROP, RELIC_MAX, QUEST_INFO, fillQuests, questProgress, itemScore, junkItems, skillCost, skillMaxLevel, skillUnlocked,
  soulsForFloor, upgradeAmount, upgradeCost,
  RAID, WEEKLY, WEEKLY_REWARDS, makeSetItem, raidBoss, raidReward, weekKey, weeklyFoe, weeklyMod, COLL_REWARDS, DAILY_CHALLENGE, STONE_DROP, STONE_SHOP, MAX_SOCKETS, TOWER, collectionProgress, dailyFoe, dailyModFor, dailyReward, foundKeysOf, monsterKey,
  parseStone, randomStone, stoneKey, stoneName, stoneTierFor, towerBoss, towerKeysNow, towerMech, towerReward,
} from '../gameData';
import type { DailyMod } from '../gameData';
import {
  CITY, GOODS, MARKET, MISSIONS, RESEARCH, SEA, SELL_RATE, buildCost, buildingDef, cargoCount, cargoMax, cityPending, crewSkill, fightLair, foodMax, goodPrice,
  hullMax, island, lv, missionChance, missionMult, neighbors, researchCost, shardGemCost, shipCost, SHIP_MAX, SHIP_PARTS, squadCount, voyageFood, voyageMs, worldBonuses,
  type ShipPart,
} from './worldsData';
import { simulateLadder, type LadderResult } from './ladder';
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
  raidPhase: number;           // фаза рейд-босса (0 — рейда нет)
  ladder: LadderResult | null; // итог последнего забега по Башне или ежедневному испытанию
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
  | { type: 'HELL_REBIRTH' }
  | { type: 'FARM_UPGRADE'; id: string }
  | { type: 'FARM_COLLECT' }
  | { type: 'PET_REBIRTH'; id: PetId }
  | { type: 'SET_AUTO_SELL'; rarity: Rarity }
  | { type: 'BUY_GEM'; id: string }
  | { type: 'PET_CRATE'; kind: 'basic' | 'gem' }
  | { type: 'SET_ELEMENT'; element: Element }
  | { type: 'SET_AUTO_ELEMENT'; value: boolean }
  | { type: 'CRAFT'; slot: ItemSlot; from: Rarity }
  | { type: 'CITY_OPEN' } | { type: 'CITY_COLLECT' } | { type: 'CITY_BUILD'; id: string } | { type: 'CITY_RESEARCH'; id: string }
  | { type: 'CITY_MISSION'; id: string } | { type: 'CITY_CLAIM'; index: number } | { type: 'CITY_SELL'; lots: number } | { type: 'CITY_GEM' }
  | { type: 'SEA_OPEN' } | { type: 'SEA_SAIL'; to: string } | { type: 'SEA_ARRIVE' } | { type: 'SEA_ACT' } | { type: 'SEA_FOOD'; n: number }
  | { type: 'SEA_REPAIR' } | { type: 'SEA_UP'; part: ShipPart } | { type: 'SEA_TRADE'; good: string; n: number }
  | { type: 'TOWER_RUN' }
  | { type: 'DAILY_RUN' }
  | { type: 'CLOSE_LADDER' }
  | { type: 'WEEKLY_RUN' }
  | { type: 'CLAIM_WEEKLY'; need: number }
  | { type: 'RAID_START' }
  | { type: 'SET_AUTO'; key: 'autoEnhance' | 'autoCraft' | 'notify'; value: number | Rarity | null | boolean }
  | { type: 'BUY_STONE' }
  | { type: 'MERGE_STONE'; key: string }
  | { type: 'SOCKET'; itemId: string; key: string }
  | { type: 'UNSOCKET'; itemId: string }
  | { type: 'ADD_SOCKET'; itemId: string }
  | { type: 'CLAIM_COLL'; pct: number }
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
  hellRebirths: s.world === 'hell' ? s.meta.hellRebirths : -1,
  collPct: collectionProgress(s.meta).bonus,
  worldPct: worldBonuses(s.meta.city, s.meta.sea),
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
  if (hp === 0 && !s.isDead && s.monster.raid) {
    next = withLog({ ...next, hero: { ...next.hero, hp: statsOf(next).maxHp } }, '☠️ Рейд провален: босс оказался сильнее. Ты отступаешь невредимым.', 'death');
    next = emit(next, { type: 'quest', text: '☠️ Рейд провален' });
    return spawnMonster({ ...next, raidPhase: 0 });
  }
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
  const meta0 = save?.meta ?? emptyMeta();
  const meta = meta0.run.start > 0 ? meta0 : { ...meta0, run: { ...meta0.run, start: Date.now() } };
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
    settings: save?.settings ?? { autoAbilities: true, autoElement: false, autoSell: [], autoEnhance: 0, autoCraft: null, notify: false },
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
    ladder: null,
    raidPhase: 0,
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
  if (s.world === 'dungeon' && roll.dmg > s.meta.run.bestHit) s = { ...s, meta: { ...s.meta, run: { ...s.meta.run, bestHit: roll.dmg } } };
  if (roll.crit) s = { ...s, meta: { ...s.meta, crits: s.meta.crits + 1 } };
  s = roll.crit
    ? withLog(s, `💥 КРИТ! ${monster.name} получает ${roll.dmg} урона!`, 'crit')
    : withLog(s, `⚔️ Ты наносишь ${roll.dmg} урона ${monster.name}`, 'dmg');
  if (roll.lifestealHeal > 0) s = healHero(s, roll.lifestealHeal, 'lifesteal');

  if (s.monsterHp > 0 && s.monster.raid) s = raidPhases(s);
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
  if (state.monster.raid) return defeatRaid(state);
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
  {
    const mk = monsterKey(s.world, monster.name);
    const run = s.world === 'dungeon' ? { ...s.meta.run, kills: s.meta.run.kills + 1, gold: s.meta.run.gold + gold, bosses: s.meta.run.bosses + (monster.isBoss ? 1 : 0) } : s.meta.run;
    s = { ...s, meta: { ...s.meta, seen: { ...s.meta.seen, [mk]: (s.meta.seen[mk] ?? 0) + 1 }, run } };
  }
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
    const chance = (hell ? HELL.gemBossChance : s.hero.floor >= GEM.minBossFloor ? GEM.bossChance : 0) * luck(s) * (1 + (s.meta.farms.focus ?? 0) * 0.1);
    if (Math.random() < chance) s = addGems(s, 1, 'босс');
  }

  // 3а-2. камень для гнёзд: с боссов (в Преисподней — щедрее) и редко с элиты Преисподней
  {
    const hell = s.world === 'hell';
    const ch = monster.isBoss ? (hell ? STONE_DROP.hellBoss : s.hero.floor >= 10 ? STONE_DROP.dungeonBoss : 0) : monster.isElite && hell ? STONE_DROP.hellElite : 0;
    if (ch > 0 && Math.random() < ch * luck(s)) s = addStone(s, randomStone(stoneTierFor(s.hero.floor, s.world)), 1);
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

  s = autoMaintain(s);

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

/** Фазы рейд-босса: на 66% HP — ярость, на 33% — исцеление. */
function raidPhases(s: GameState): GameState {
  const frac = s.monsterHp / s.monster.hp;
  if (frac <= 0.66 && s.raidPhase < 2) {
    s = { ...s, raidPhase: 2, monsterAi: { ...s.monsterAi, enraged: true } };
    s = emit(withLog(s, `🔥 Фаза 2: ${s.monster.name} впадает в ярость!`, 'boss'), { type: 'enrage' }, { type: 'quest', text: '🔥 Рейд: фаза 2 — ярость!' });
  }
  if (frac <= 0.33 && s.raidPhase < 3) {
    const heal = Math.round(s.monster.hp * RAID.healFrac);
    s = { ...s, raidPhase: 3, monsterHp: Math.min(s.monster.hp, s.monsterHp + heal), monsterAi: { ...s.monsterAi, charging: true } };
    s = emit(withLog(s, `💚 Фаза 3: ${s.monster.name} исцеляется на ${heal} и готовит мощный удар!`, 'boss'), { type: 'monster_regen', amount: heal }, { type: 'quest', text: '💚 Рейд: фаза 3 — исцеление!' });
  }
  return s;
}

function defeatRaid(state: GameState): GameState {
  const { monster } = state;
  const floor = state.hero.floor;
  const r = raidReward(floor);
  const { hero: afterXp } = applyXp(state.hero, monster.xp);
  let s: GameState = {
    ...state,
    hero: { ...afterXp, gold: afterXp.gold + monster.gold, kills: afterXp.kills + 1 },
    meta: { ...state.meta, souls: state.meta.souls + r.souls, gems: state.meta.gems + r.gems, bossKills: state.meta.bossKills + 1, raid: { ...state.meta.raid, wins: state.meta.raid.wins + 1 } },
  };
  s = withLog(s, `🏆 РЕЙД ПРОЙДЕН: ${monster.name}! +${r.souls} душ, +${r.gems} кристаллов, +${monster.gold} золота`, 'boss');
  s = emit(s, { type: 'monster_killed', emoji: monster.emoji, boss: true, elite: false, gold: monster.gold, xp: monster.xp }, { type: 'quest', text: `🏆 Рейд пройден! +${r.souls} 👻 +${r.gems} 💎` });
  s = addStone(s, randomStone(r.stoneTier), 1);
  s = dropItem(s, generateItem(floor, true, 'epic', 'dungeon'));
  if (Math.random() < 0.3) s = dropItem(s, makeSetItem('celestial', 'legendary', floor));
  return spawnMonster({ ...s, raidPhase: 0 });
}

/** Авто-заточка и авто-крафт по настройкам (золото не тратится «в ноль»). */
function autoMaintain(s: GameState): GameState {
  const { autoEnhance, autoCraft } = s.settings;
  const run = (st: GameState, next: GameState): GameState => (next === st ? st : { ...next, events: st.events });
  if (autoCraft) {
    for (const g of craftGroups(s.inventory)) {
      if (RARITY_ORDER.indexOf(g.from) > RARITY_ORDER.indexOf(autoCraft)) continue;
      const rec = CRAFT_RECIPES.find(r => r.from === g.from);
      if (!rec || s.hero.gold < craftGoldCost(rec, s.hero.floor) * 2) continue;
      s = run(s, doCraft(s, { slot: g.slot, from: g.from }));
    }
  }
  if (autoEnhance > 0) {
    for (const slot of ['weapon', 'armor', 'amulet'] as const) {
      const it = s.equipped[slot];
      if (!it || (it.plus ?? 0) >= autoEnhance || s.hero.gold < enhanceCost(it, s.hero.floor) * 2) continue;
      s = run(s, doEnhance(s, { slot }));
    }
  }
  return s;
}

function addStone(s: GameState, key: string, n: number): GameState {
  s = { ...s, meta: { ...s.meta, stones: { ...s.meta.stones, [key]: (s.meta.stones[key] ?? 0) + n } } };
  return emit(withLog(s, `💠 Найден камень: ${stoneName(key)}`, 'boss'), { type: 'quest', text: `💠 ${stoneName(key)}` });
}

/** Запоминает находку в коллекции. */
function noteFound(s: GameState, item: Item): GameState {
  const add = foundKeysOf(item).filter(k => !s.meta.found.includes(k));
  if (add.length === 0) return s;
  return { ...s, meta: { ...s.meta, found: [...s.meta.found, ...add] } };
}

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
  s = noteFound(s, item);
  if (s.world === 'dungeon') {
    const b = s.meta.run.best;
    if (!b || RARITY_ORDER.indexOf(item.rarity) > RARITY_ORDER.indexOf(b.rarity) || (item.rarity === b.rarity && item.price > b.price)) {
      s = { ...s, meta: { ...s.meta, run: { ...s.meta.run, best: { name: item.name, emoji: item.emoji, rarity: item.rarity, price: item.price } } } };
    }
  }
  if (item.rarity === 'secret') s = emit(s, { type: 'quest', text: `✨ ??? SECRET: ${item.name}!!!` });
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

type WorldAction = Extract<Action, { type: `CITY_${string}` | `SEA_${string}` }>;

const pushReport = (list: string[], text: string) => [text, ...list].slice(0, 6);

/** Ржавый город и Бездонное море: всё, что не связано с боем героя. */
function doWorld(state: GameState, action: WorldAction): GameState {
  const now = Date.now();
  const m0 = state.meta;
  const toast = (s: GameState, text: string) => emit(withLog(s, text, 'boss'), { type: 'quest', text });

  // ── город: сначала забираем накопленное, чтобы смена уровней не «пересчитывала» прошлое ──
  if (action.type.startsWith('CITY_')) {
    if (action.type === 'CITY_OPEN') {
      if (m0.city.open || m0.maxFloor < CITY.unlockFloor) return state;
      return toast({ ...state, meta: { ...m0, city: { ...m0.city, open: true, at: now } } }, '🏙️ Ржавый город основан! Рудник и генератор уже работают.');
    }
    if (!m0.city.open) return state;
    const p = cityPending(m0.city, now);
    let city = { ...m0.city, res: { metal: m0.city.res.metal + p.metal, energy: m0.city.res.energy + p.energy, shards: m0.city.res.shards + p.shards }, at: now };
    let s: GameState = { ...state, meta: { ...m0, city } };
    const setCity = (c: typeof city, st: GameState = s): GameState => ({ ...st, meta: { ...st.meta, city: c } });
    switch (action.type) {
      case 'CITY_COLLECT':
        return emit(withLog(setCity(city), `🏙️ Собрано: ⛏️ ${Math.floor(p.metal)} · ⚡ ${Math.floor(p.energy)}${p.shards >= 1 ? ` · 🔷 ${Math.floor(p.shards)}` : ''}`, 'loot'), { type: 'ui', kind: 'buy' });
      case 'CITY_BUILD': {
        const d = buildingDef(action.id);
        const level = lv(city, action.id);
        if (!d || level >= d.max) return state;
        const c = buildCost(d, level);
        if (city.res.metal < c.metal || city.res.energy < c.energy) return setCity(city);
        city = { ...city, res: { ...city.res, metal: city.res.metal - c.metal, energy: city.res.energy - c.energy }, bld: { ...city.bld, [d.id]: level + 1 } };
        return emit(withLog(setCity(city), `${d.emoji} ${d.name} → ур. ${level + 1}`, 'ability'), { type: 'ui', kind: 'buy' });
      }
      case 'CITY_RESEARCH': {
        const d = RESEARCH.find(r => r.id === action.id);
        if (!d || lv(city, 'lab') < 1) return state;
        const level = city.research[d.id] ?? 0;
        const cost = researchCost(level);
        if (level >= d.max || city.res.shards < cost) return setCity(city);
        city = { ...city, res: { ...city.res, shards: city.res.shards - cost }, research: { ...city.research, [d.id]: level + 1 } };
        return emit(withLog(setCity(city), `${d.emoji} Исследование «${d.name}» → ур. ${level + 1}`, 'ability'), { type: 'ui', kind: 'buy' });
      }
      case 'CITY_MISSION': {
        const d = MISSIONS.find(x => x.id === action.id);
        if (!d || lv(city, 'barracks') < d.barracks || city.missions.length >= squadCount(city)) return setCity(city);
        city = { ...city, missions: [...city.missions, { id: d.id, endAt: now + d.ms }] };
        return emit(withLog(setCity(city), `${d.emoji} Отряд ушёл: ${d.name}`, 'info'), { type: 'ui', kind: 'equip' });
      }
      case 'CITY_CLAIM': {
        const ms = city.missions[action.index];
        const d = ms && MISSIONS.find(x => x.id === ms.id);
        if (!ms || !d || ms.endAt > now) return setCity(city);
        const ok = Math.random() < missionChance(d, city, m0.rebirths);
        const k = missionMult(city) * (0.9 + Math.random() * 0.2) * (ok ? 1 : 0.3);
        const gain = { metal: Math.round(d.metal * k), energy: Math.round(d.energy * k), shards: ok ? Math.round(d.shards * (0.8 + Math.random() * 0.4)) : 0 };
        city = {
          ...city, done: city.done + 1, missions: city.missions.filter((_, i) => i !== action.index),
          res: { metal: city.res.metal + gain.metal, energy: city.res.energy + gain.energy, shards: city.res.shards + gain.shards },
        };
        let gems = 0, stone = false;
        if (ok && Math.random() < d.gem) gems = 1;
        if (ok && Math.random() < d.stone) stone = true;
        const text = `${d.emoji} ${d.name}: ${ok ? 'успех' : 'отряд отступил'} · ⛏️${gain.metal} ⚡${gain.energy}${gain.shards ? ` 🔷${gain.shards}` : ''}${gems ? ' 💎1' : ''}`;
        city = { ...city, report: pushReport(city.report, text) };
        s = setCity(city, gems ? { ...s, meta: { ...s.meta, gems: s.meta.gems + gems } } : s);
        if (stone) s = addStone(s, randomStone(stoneTierFor(Math.max(10, s.meta.maxFloor), 'dungeon')), 1);
        return toast(s, text);
      }
      case 'CITY_SELL': {
        const need = action.lots * MARKET.lot;
        if (action.lots < 1 || city.res.metal < need) return setCity(city);
        const gold = need * MARKET.goldPerMetal(s.hero.floor);
        s = withGold(setCity({ ...city, res: { ...city.res, metal: city.res.metal - need } }), gold);
        return emit(withLog(s, `⚙️ Продано ${need} металла за ${gold}`, 'loot'), { type: 'ui', kind: 'sell' });
      }
      case 'CITY_GEM': {
        const cost = shardGemCost(city);
        if (city.gemsBought >= MARKET.gemMax || city.res.shards < cost) return setCity(city);
        s = setCity({ ...city, gemsBought: city.gemsBought + 1, res: { ...city.res, shards: city.res.shards - cost } });
        return addGems(s, 1, 'Ржавый город');
      }
    }
    return state;
  }

  // ── море ──
  if (action.type === 'SEA_OPEN') {
    if (m0.sea.open || m0.maxFloor < SEA.unlockFloor) return state;
    return toast({ ...state, meta: { ...m0, sea: { ...m0.sea, open: true } } }, '🌊 Корабль спущен на воду! Порт Ржавый Якорь ждёт.');
  }
  let sea = m0.sea;
  if (!sea.open) return state;
  const petLevels = Object.values(m0.pets).reduce((a, b) => a + b, 0);
  const setSea = (x: typeof sea, st: GameState = state): GameState => ({ ...st, meta: { ...st.meta, sea: x } });
  const rep = (x: typeof sea, text: string) => ({ ...x, report: pushReport(x.report, text) });
  const here = island(sea.at);

  switch (action.type) {
    case 'SEA_SAIL': {
      if (sea.voyage || !neighbors(sea.at).includes(action.to) || !sea.seen.includes(action.to)) return state;
      const food = voyageFood(sea.at, action.to);
      if (sea.food < food || sea.hull <= 0) return state;
      sea = { ...sea, food: sea.food - food, voyage: { from: sea.at, to: action.to, endAt: now + voyageMs(sea.at, action.to, sea), food } };
      return emit(setSea(sea), { type: 'ui', kind: 'equip' });
    }
    case 'SEA_ARRIVE': {
      const v = sea.voyage;
      if (!v || v.endAt > now) return state;
      const to = island(v.to);
      let text = `⛵ Прибыли: ${to.emoji} ${to.name}`;
      let hull = sea.hull;
      if (Math.random() < 0.12 * to.tier * (1 - crewSkill(sea, petLevels))) {
        const dmg = Math.min(hull - 1, Math.round(hullMax(sea) * (0.05 + Math.random() * 0.1)));
        hull -= Math.max(0, dmg);
        text += ` · шторм: корпус −${Math.max(0, dmg)}`;
      }
      sea = rep({
        ...sea, at: v.to, voyage: null, hull, trips: sea.trips + 1,
        visited: sea.visited.includes(v.to) ? sea.visited : [...sea.visited, v.to],
        seen: [...new Set([...sea.seen, v.to, ...neighbors(v.to)])],
      }, text);
      return toast(setSea(sea), text);
    }
    case 'SEA_FOOD': {
      if (sea.voyage || here.type !== 'port' || action.n < 1) return state;
      const n = Math.min(action.n, foodMax(sea) - sea.food, Math.floor(sea.coin / SEA.foodPrice));
      if (n < 1) return state;
      return emit(setSea({ ...sea, food: sea.food + n, coin: sea.coin - n * SEA.foodPrice }), { type: 'ui', kind: 'buy' });
    }
    case 'SEA_REPAIR': {
      if (sea.voyage || here.type !== 'port') return state;
      const miss = hullMax(sea) - sea.hull;
      const n = Math.min(miss, Math.floor(sea.coin / SEA.repairPer));
      if (n < 1) return state;
      return emit(setSea({ ...sea, hull: sea.hull + n, coin: sea.coin - Math.ceil(n * SEA.repairPer) }), { type: 'ui', kind: 'buy' });
    }
    case 'SEA_UP': {
      const part = SHIP_PARTS.find(p => p.id === action.part);
      const level = sea.ship[action.part] ?? 1;
      if (!part || sea.voyage || level >= SHIP_MAX) return state;
      const c = shipCost(part.base, level);
      if (sea.coin < c.coin || sea.pearls < c.pearls) return state;
      const before = hullMax(sea);
      sea = { ...sea, coin: sea.coin - c.coin, pearls: sea.pearls - c.pearls, ship: { ...sea.ship, [part.id]: level + 1 } };
      if (part.id === 'hull') sea = { ...sea, hull: sea.hull + hullMax(sea) - before };
      return emit(withLog(setSea(sea), `${part.emoji} ${part.name} → ур. ${level + 1}`, 'ability'), { type: 'ui', kind: 'buy' });
    }
    case 'SEA_TRADE': {
      if (sea.voyage || here.type !== 'port' || !GOODS.some(g => g.id === action.good) || action.n === 0) return state;
      const price = goodPrice(here.id, action.good, now);
      const have = sea.goods[action.good] ?? 0;
      if (action.n > 0) {
        const n = Math.min(action.n, cargoMax(sea) - cargoCount(sea), Math.floor(sea.coin / price));
        if (n < 1) return state;
        return emit(setSea({ ...sea, coin: sea.coin - n * price, goods: { ...sea.goods, [action.good]: have + n } }), { type: 'ui', kind: 'buy' });
      }
      const n = Math.min(-action.n, have);
      if (n < 1) return state;
      return emit(setSea({ ...sea, coin: sea.coin + n * Math.floor(price * SELL_RATE), goods: { ...sea.goods, [action.good]: have - n } }), { type: 'ui', kind: 'sell' });
    }
    case 'SEA_ACT': {
      if (sea.voyage || here.type === 'port' || (sea.cd[here.id] ?? 0) > now) return state;
      const cs = crewSkill(sea, petLevels);
      const t = here.tier;
      const roll = () => 0.7 + Math.random() * 0.6;
      let s: GameState = state;
      let text = '';
      if (here.type === 'treasure') {
        const coin = Math.round(210 * Math.pow(t, 1.8) * roll() * (1 + cs));
        const pearl = Math.random() < 0.12 * t ? 1 : 0;
        sea = { ...sea, coin: sea.coin + coin, pearls: sea.pearls + pearl, cd: { ...sea.cd, [here.id]: now + SEA.cooldownMs.treasure } };
        text = `${here.emoji} Раскопки: 🪙${coin}${pearl ? ' 🐚1' : ''}`;
        s = setSea(rep(sea, text));
        if (Math.random() < 0.06 * t) s = addStone(s, randomStone(Math.min(3, t - 1 || 1)), 1);
      } else if (here.type === 'wreck') {
        let hull = sea.hull;
        let dmgText = '';
        if (Math.random() < (1 - cs * 0.8) * (0.35 + 0.1 * t)) {
          const dmg = Math.min(hull - 1, Math.round(hullMax(sea) * (0.08 + Math.random() * 0.12) * (0.6 + 0.2 * t)));
          hull -= Math.max(0, dmg);
          dmgText = ` · корпус −${Math.max(0, dmg)}`;
        }
        const coin = Math.round(360 * Math.pow(t, 1.8) * roll() * (1 + cs));
        const pearl = 1 + (t >= 3 ? 1 : 0);
        sea = { ...sea, hull, coin: sea.coin + coin, pearls: sea.pearls + pearl, cd: { ...sea.cd, [here.id]: now + SEA.cooldownMs.wreck } };
        text = `${here.emoji} Обломки: 🪙${coin} 🐚${pearl}${dmgText}`;
        s = setSea(rep(sea, text));
      } else if (here.lair) {
        const r = fightLair(sea, here.lair, petLevels, Math.random);
        if (r.win) {
          const first = (sea.lairs[here.id] ?? 0) === 0;
          const coin = Math.round(1200 * t * t * roll());
          const pearls = 2 + t;
          const gems = first ? 2 : Math.random() < 0.12 ? 1 : 0;
          sea = { ...sea, hull: Math.max(1, r.hullLeft), coin: sea.coin + coin, pearls: sea.pearls + pearls, lairs: { ...sea.lairs, [here.id]: (sea.lairs[here.id] ?? 0) + 1 }, cd: { ...sea.cd, [here.id]: now + SEA.cooldownMs.lair } };
          text = `${here.emoji} ${here.lair.name} повержен за ${r.rounds} раундов! 🪙${coin} 🐚${pearls}${gems ? ` 💎${gems}` : ''}${first ? ' · трофей +3% к атаке и HP' : ''}`;
          s = setSea(rep(sea, text), gems ? { ...state, meta: { ...state.meta, gems: state.meta.gems + gems } } : state);
          s = addStone(s, randomStone(Math.min(3, t - 1)), 1);
        } else {
          sea = { ...sea, hull: Math.max(1, Math.round(hullMax(sea) * 0.15)), coin: Math.floor(sea.coin * 0.8), cd: { ...sea.cd, [here.id]: now + 3600000 } };
          text = `${here.emoji} ${here.lair.name} оказался сильнее: корабль едва ушёл, потеряна часть монет`;
          s = setSea(rep(sea, text));
        }
      }
      return toast(s, text);
    }
  }
  return state;
}

function applyHeroMods(base: HeroStats, mod: DailyMod): HeroStats {
  const h = mod.hero ?? {};
  return {
    ...base,
    atk: Math.round(base.atk * (h.atk ?? 1)), def: Math.round(base.def * (h.def ?? 1)), maxHp: Math.round(base.maxHp * (h.hp ?? 1)),
    critChance: h.noCrit ? 0 : base.critChance, dodge: h.noDodge ? 0 : base.dodge,
  };
}

function doCraft(state: GameState, action: { slot: ItemSlot; from: Rarity }): GameState {
  const fresh = state.events === NO_EVENTS ? state : { ...state, events: NO_EVENTS };
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
      const s = noteFound({ ...paid, inventory: [result, ...state.inventory.filter(i => !ids.has(i.id))] }, result);
      const done = emit(withLog(s, `🔨 Создано: ${result.name} (${RARITY_NAME[rec.to]})`, 'loot'), { type: 'loot', rarity: rec.to });
      return rec.to === 'legendary' || rec.to === 'divine' ? emit(done, { type: 'quest', text: `🔨 ${RARITY_NAME[rec.to]}: ${result.name}!` }) : done;
    
}

function doEnhance(state: GameState, action: { slot: ItemSlot }): GameState {
  const fresh = state.events === NO_EVENTS ? state : { ...state, events: NO_EVENTS };
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

    case 'CRAFT':
      return doCraft(state, action);

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
      if (action.rarity === 'divine' || action.rarity === 'secret') return state;
      const cur = state.settings.autoSell;
      const autoSell = cur.includes(action.rarity) ? cur.filter(r => r !== action.rarity) : [...cur, action.rarity];
      return { ...fresh, settings: { ...state.settings, autoSell } };
    }

    case 'HELL_REBIRTH': {
      if (state.world !== 'hell' || state.hero.floor < HELL_REBIRTH.minFloor) return state;
      const n = state.meta.hellRebirths;
      const cost = hellRebirthCost(n);
      if (state.meta.gems < cost) return state;
      const meta: Meta = { ...state.meta, gems: state.meta.gems - cost, hellRebirths: n + 1 };
      const fresh0 = state.offRun; // забег Подземелья сохраняется
      let s = createState({
        hero: { ...HELL.hero },
        skillLevels: emptySkillLevels(),
        equipped: {},
        inventory: [],
        meta,
        upgradeCounts: emptyUpgradeCounts(),
        settings: state.settings,
        world: 'hell',
        offRun: fresh0,
      });
      const txt = `🔥 Перерождение в Преисподней #${n + 1}: атака, здоровье, защита ×${hellPower(n + 1).toFixed(1)}, крит +${n + 1}%, крит. урон +${(n + 1) * 25}%`;
      s = withLog(s, txt, 'boss');
      return emit(emit(s, { type: 'rebirth', souls: 0 }), { type: 'quest', text: txt });
    }

    case 'FARM_UPGRADE': {
      const d = FARMS.find(x => x.id === action.id);
      if (!d || state.world !== 'hell' || state.meta.hellMax < FARM.unlockFloor) return state;
      const lvl = state.meta.farms[d.id] ?? 0;
      const cost = farmCost(d, lvl);
      if (lvl >= d.max || state.hero.gold < cost) return state;
      const now = Date.now();
      const got = Math.floor(farmPending(state.meta, now));
      const meta = { ...state.meta, gems: state.meta.gems + got, farms: { ...state.meta.farms, [d.id]: lvl + 1 }, farmAt: now };
      return emit(withLog(withGold({ ...fresh, meta }, -cost), `${d.emoji} ${d.name} → ур. ${lvl + 1}`, 'ability'), { type: 'ui', kind: 'buy' });
    }

    case 'FARM_COLLECT': {
      if (state.meta.hellMax < FARM.unlockFloor) return state;
      const now = Date.now();
      const pend = farmPending(state.meta, now);
      const whole = Math.floor(pend);
      if (whole < 1) return state;
      const rate = farmRate(state.meta.farms);
      const leftoverMs = rate > 0 ? ((pend - whole) / rate) * 3600000 : 0;
      const meta = { ...state.meta, gems: state.meta.gems + whole, farmAt: now - leftoverMs };
      const txt = `💎 С фермы собрано кристаллов: ${whole}`;
      return emit(withLog({ ...fresh, meta }, txt, 'loot'), { type: 'quest', text: txt });
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
      const on = !!state.meta.pacts[action.id];
      const slots = pactSlots(state.meta.hellRebirths);
      let pacts = { ...state.meta.pacts, [action.id]: !on };
      if (!on && activePacts(state.meta.pacts).length >= slots) {
        if (slots > 1) return emit(withLog(fresh, '📜 Нет свободных слотов договоров — расторгни один из действующих', 'info'), { type: 'quest', text: '📜 Нет свободных слотов договоров' });
        pacts = { [action.id]: true }; // единственный слот: новый договор заменяет прежний
      }
      const meta = { ...state.meta, pacts };
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

    case 'ENHANCE':
      return doEnhance(state, action);

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
      const meta: Meta = { ...state.meta, souls: state.meta.souls + gain, rebirths: state.meta.rebirths + 1, run: { start: Date.now(), kills: 0, gold: 0, bosses: 0, bestHit: 0, best: null } };
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

    case 'CLOSE_LADDER':
      return { ...state, ladder: null };

    case 'SET_AUTO': {
      const settings = { ...state.settings };
      if (action.key === 'autoEnhance') settings.autoEnhance = Number(action.value) || 0;
      else if (action.key === 'autoCraft') settings.autoCraft = (action.value as Rarity | null) ?? null;
      else settings.notify = action.value === true;
      return { ...fresh, settings };
    }

    case 'RAID_START': {
      const now = Date.now();
      if (state.world !== 'dungeon' || state.isDead || state.monster.raid || now - state.meta.raid.at < RAID.cooldownMs) return state;
      const monster = raidBoss(statsOf(state), state.hero.floor, state.meta.rebirths);
      let s: GameState = {
        ...fresh, monster, monsterId: newId(), monsterHp: monster.hp, monsterAi: freshAi(), turn: 'hero', raidPhase: 1,
        hero: { ...state.hero, hp: statsOf(state).maxHp }, heroElement: s0Element(fresh, monster), meta: { ...state.meta, raid: { ...state.meta.raid, at: now } },
      };
      s = withLog(s, `⚠️ РЕЙД! Появился ${monster.name}. Три фазы: на 66% ярость, на 33% исцеление. Если погибнешь — отступишь без потерь.`, 'boss');
      return emit(s, { type: 'boss_spawn' });
    }

    case 'WEEKLY_RUN': {
      if (state.world !== 'dungeon' || state.isDead) return state;
      const day = todayKey();
      const wk = weekKey();
      const w = state.meta.weekly.week === wk ? state.meta.weekly : { week: wk, best: 0, claimed: [] as number[], lastDay: '' };
      if (w.lastDay === day) return state;
      const mod = weeklyMod(wk);
      const stats = applyHeroMods(statsOf(state), mod);
      const { steps, cleared } = simulateLadder({
        stats, element: state.heroElement, count: WEEKLY.foes, healFrac: WEEKLY.heal,
        foe: i => weeklyFoe(i, state.meta.maxFloor), heroDot: mod.hero?.dot, foeMul: mod.foe,
      });
      const best = Math.max(w.best, cleared);
      const lines = [`Лучший результат недели: ${best}/${WEEKLY.foes}`, 'Награды за рубежи забирай в панели «Неделя».'];
      const s = { ...fresh, meta: { ...state.meta, weekly: { ...w, best, lastDay: day } }, ladder: { kind: 'weekly' as const, steps, cleared, lines } };
      return emit(withLog(s, `📅 Испытание недели: ${cleared}/${WEEKLY.foes} (рекорд недели ${best})`, 'boss'), { type: 'ui', kind: 'buy' });
    }

    case 'CLAIM_WEEKLY': {
      const r = WEEKLY_REWARDS.find(x => x.need === action.need);
      const w = state.meta.weekly;
      if (!r || w.week !== weekKey() || w.best < r.need || w.claimed.includes(r.need)) return state;
      let s: GameState = { ...fresh, meta: { ...state.meta, gems: state.meta.gems + r.gems, souls: state.meta.souls + r.souls, weekly: { ...w, claimed: [...w.claimed, r.need] } } };
      if (r.piece) {
        const it = makeSetItem('celestial', r.piece.rarity, Math.max(state.hero.floor, 10));
        s = noteFound({ ...s, inventory: [it, ...s.inventory] }, it);
        s = withLog(s, `🌟 Награда недели: ${it.emoji} ${it.name} (${RARITY_NAME[it.rarity]})`, 'loot');
      }
      return emit(withLog(s, `📅 Рубеж ${r.need}: +${r.gems} 💎, +${r.souls} 👻`, 'boss'), { type: 'quest', text: `📅 Неделя ${r.need}: +${r.gems} 💎 +${r.souls} 👻` });
    }

    case 'CITY_OPEN': case 'CITY_COLLECT': case 'CITY_BUILD': case 'CITY_RESEARCH': case 'CITY_MISSION': case 'CITY_CLAIM': case 'CITY_SELL': case 'CITY_GEM':
    case 'SEA_OPEN': case 'SEA_SAIL': case 'SEA_ARRIVE': case 'SEA_ACT': case 'SEA_FOOD': case 'SEA_REPAIR': case 'SEA_UP': case 'SEA_TRADE': {
      const out = doWorld(fresh, action);
      return out === fresh ? state : out;
    }

    case 'TOWER_RUN': {
      if (state.world !== 'dungeon' || state.isDead) return state;
      const now = Date.now();
      const { keys } = towerKeysNow(state.meta, now);
      if (keys <= 0) return state;
      const stats = statsOf(state);
      const best = state.meta.tower.best;
      const { steps, cleared } = simulateLadder({
        stats, element: state.heroElement, count: 200, healFrac: TOWER.heal,
        foe: i => towerBoss(i, state.meta.maxFloor),
        mech: i => towerMech(i).id,
      });
      let meta: Meta = { ...state.meta, tower: { best: Math.max(best, cleared), keys: keys - 1, at: keys >= TOWER.maxKeys ? now : state.meta.tower.at + Math.floor((now - state.meta.tower.at) / TOWER.keyMs) * TOWER.keyMs } };
      const lines: string[] = [];
      let souls = 0, gems = 0;
      for (let n = best + 1; n <= cleared; n++) {
        const r = towerReward(n);
        souls += r.souls; gems += r.gems;
        if (r.stoneTier) { const k = randomStone(r.stoneTier); meta = { ...meta, stones: { ...meta.stones, [k]: (meta.stones[k] ?? 0) + 1 } }; lines.push(`Ярус ${n}: ${stoneName(k)}`); }
      }
      meta = { ...meta, souls: meta.souls + souls, gems: meta.gems + gems };
      if (souls) lines.unshift(`👻 +${souls} душ за новые ярусы`);
      if (gems) lines.unshift(`💎 +${gems} кристаллов`);
      if (cleared <= best) lines.push('Рекорд не побит — награды за повторные ярусы нет. Усиль героя и приходи снова.');
      const s = { ...fresh, meta, ladder: { kind: 'tower' as const, steps, cleared, lines } };
      return emit(withLog(s, `🗼 Башня: пройдено ярусов ${cleared} (рекорд ${meta.tower.best})`, 'boss'), { type: 'ui', kind: cleared > best ? 'buy' : 'fail' });
    }

    case 'DAILY_RUN': {
      if (state.world !== 'dungeon' || state.isDead) return state;
      const day = todayKey();
      if (state.meta.challenge.last === day) return state;
      const mod = dailyModFor(day);
      const h = mod.hero ?? {};
      const stats = applyHeroMods(statsOf(state), mod);
      const { steps, cleared } = simulateLadder({
        stats, element: state.heroElement, count: DAILY_CHALLENGE.foes, healFrac: 0,
        foe: i => dailyFoe(i, state.meta.maxFloor), heroDot: h.dot, foeMul: mod.foe,
      });
      const r = dailyReward(cleared, state.meta.rebirths);
      let meta: Meta = { ...state.meta, challenge: { last: day, score: cleared }, souls: state.meta.souls + r.souls, gems: state.meta.gems + r.gems };
      const lines: string[] = [];
      if (r.souls) lines.push(`👻 +${r.souls} душ`);
      if (r.gems) lines.push(`💎 +${r.gems} кристаллов`);
      if (r.stone) { const k = randomStone(1 + (cleared >= 8 ? 1 : 0)); meta = { ...meta, stones: { ...meta.stones, [k]: (meta.stones[k] ?? 0) + 1 } }; lines.push(`💠 ${stoneName(k)}`); }
      if (!lines.length) lines.push('Награды нет: нужно победить хотя бы 3 врагов.');
      const s = { ...fresh, meta, ladder: { kind: 'daily' as const, steps, cleared, lines } };
      return emit(withLog(s, `🎯 Ежедневное испытание: побеждено ${cleared}/${DAILY_CHALLENGE.foes}`, 'boss'), { type: 'ui', kind: 'buy' });
    }

    case 'BUY_STONE': {
      if (state.meta.gems < STONE_SHOP.cost) return state;
      const k = randomStone(1);
      const meta = { ...state.meta, gems: state.meta.gems - STONE_SHOP.cost, stones: { ...state.meta.stones, [k]: (state.meta.stones[k] ?? 0) + 1 } };
      return emit(withLog({ ...fresh, meta }, `💠 Куплен камень: ${stoneName(k)}`, 'loot'), { type: 'ui', kind: 'buy' });
    }

    case 'MERGE_STONE': {
      const p = parseStone(action.key);
      if (!p || p.tier >= 3 || (state.meta.stones[action.key] ?? 0) < STONE_SHOP.mergeNeed) return state;
      const up = stoneKey(p.def.type, p.tier + 1);
      const stones = { ...state.meta.stones, [action.key]: state.meta.stones[action.key] - STONE_SHOP.mergeNeed, [up]: (state.meta.stones[up] ?? 0) + 1 };
      return emit(withLog({ ...fresh, meta: { ...state.meta, stones } }, `💠 Огранка: ${stoneName(up)}`, 'ability'), { type: 'ui', kind: 'buy' });
    }

    case 'SOCKET':
    case 'UNSOCKET':
    case 'ADD_SOCKET': {
      const find = (): { item: Item; worn: boolean } | null => {
        const w = (Object.values(state.equipped) as (Item | undefined)[]).find(i => i?.id === action.itemId);
        if (w) return { item: w, worn: true };
        const i = state.inventory.find(x => x.id === action.itemId);
        return i ? { item: i, worn: false } : null;
      };
      const f = find();
      if (!f) return state;
      const it = f.item;
      let next: Item = it;
      let meta = state.meta;
      if (action.type === 'SOCKET') {
        if (!parseStone(action.key) || (meta.stones[action.key] ?? 0) < 1 || (it.stones?.length ?? 0) >= (it.sockets ?? 0)) return state;
        next = { ...it, stones: [...(it.stones ?? []), action.key] };
        meta = { ...meta, stones: { ...meta.stones, [action.key]: meta.stones[action.key] - 1 } };
      } else if (action.type === 'UNSOCKET') {
        if (!it.stones?.length) return state;
        const back = { ...meta.stones };
        for (const k of it.stones) back[k] = (back[k] ?? 0) + 1;
        meta = { ...meta, stones: back };
        next = { ...it, stones: [] };
      } else {
        if ((it.sockets ?? 0) >= MAX_SOCKETS || meta.gems < STONE_SHOP.socketCost) return state;
        next = { ...it, sockets: (it.sockets ?? 0) + 1 };
        meta = { ...meta, gems: meta.gems - STONE_SHOP.socketCost };
      }
      const s = f.worn
        ? { ...fresh, meta, equipped: { ...state.equipped, [it.slot]: next } }
        : { ...fresh, meta, inventory: state.inventory.map(i => (i.id === it.id ? next : i)) };
      return emit(s, { type: 'ui', kind: 'equip' });
    }

    case 'CLAIM_COLL': {
      const r = COLL_REWARDS.find(x => x.pct === action.pct);
      if (!r || state.meta.collClaimed.includes(r.pct) || collectionProgress(state.meta).pct < r.pct) return state;
      let s: GameState = { ...fresh, meta: { ...state.meta, collClaimed: [...state.meta.collClaimed, r.pct], gems: state.meta.gems + r.gems, souls: state.meta.souls + r.souls } };
      if (r.stone) s = addStone(s, r.stone, 1);
      return emit(withLog(s, `📖 Коллекция ${r.pct}%: +${r.gems} 💎, +${r.souls} 👻`, 'boss'), { type: 'quest', text: `📖 Коллекция ${r.pct}%! +${r.gems} 💎 +${r.souls} 👻` });
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
