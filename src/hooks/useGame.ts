import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AbilityId, ClassId, PetId, WorldId, Element, Item, ItemSlot, Rarity, Skill, SkillId, UpgradeKind } from '../types';
import { BANNER_DURATION_MS, COMBAT_TICK_MS, RESPAWN_DELAY_MS, SKILLS, skillMaxLevel, skillUnlocked } from '../gameData';
import { computeStats } from '../game/stats';
import { extrasOf, gameReducer, loadInitialState } from '../game/reducer';
import { clearSave, exportSave, importSave, saveGame } from '../game/save';
import { cancelAllNotifications, scheduleNotifications } from '../game/notify';
import { playForEvent } from '../game/audio';

/**
 * Хук — «мост» между правилами игры (reducer) и React.
 * Здесь живёт всё, что связано со временем: таймеры боя, возрождения,
 * исчезновения баннера, автосохранение, звук и офлайн-награда.
 * Сами правила — в game/reducer.ts.
 */
export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadInitialState);
  const [autoFight, setAutoFight] = useState(true);

  const stats = useMemo(
    () => computeStats(state.hero, state.skillLevels, state.equipped, state.meta.souls, extrasOf(state)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.hero, state.skillLevels, state.equipped, state.meta.souls, state.meta.relics, state.heroClass, state.talents, state.meta.activePet, state.meta.pets, state.meta.petRank, state.meta.petReborn, state.meta.found, state.meta.seen],
  );

  const skills = useMemo<Skill[]>(
    () => SKILLS.map(def => ({
      ...def,
      maxLevel: skillMaxLevel(def, state.meta.rebirths, state.world),
      level: state.skillLevels[def.id],
      locked: !skillUnlocked(def, state.meta.rebirths),
    })),
    [state.skillLevels, state.meta.rebirths, state.world],
  );

  // Бой: раз в COMBAT_TICK_MS ходит то герой, то монстр.
  // Зависимости только autoFight и isDead — поэтому покупки и смена экипировки
  // не перезапускают таймер и не дают лишних ударов.
  useEffect(() => {
    if (!autoFight || state.isDead) return;
    const timer = setInterval(() => dispatch({ type: 'TICK' }), COMBAT_TICK_MS);
    return () => clearInterval(timer);
  }, [autoFight, state.isDead]);

  // Возрождение через пару секунд после смерти
  useEffect(() => {
    if (!state.isDead) return;
    const timer = setTimeout(() => dispatch({ type: 'RESPAWN' }), RESPAWN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.isDead]);

  // Баннер «Этаж пройден»
  useEffect(() => {
    if (!state.showFloorBanner) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_BANNER' }), BANNER_DURATION_MS);
    return () => clearTimeout(timer);
  }, [state.showFloorBanner]);

  // Звук: каждое новое событие боя озвучивается
  useEffect(() => {
    state.events.forEach(playForEvent);
  }, [state.events]);

  // Автосохранение. Писать в память телефона каждые 0.7 с (на каждый ход боя) — лишняя нагрузка,
  // поэтому сохраняем не чаще раза в 5 секунд, а также сразу при сворачивании игры и закрытии.
  const latest = useRef(state);
  latest.current = state;
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const flush = () => {
      if (saveTimer.current !== null) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      const st = latest.current;
      saveGame({
        hero: st.hero, skillLevels: st.skillLevels, equipped: st.equipped, inventory: st.inventory,
        meta: st.meta, upgradeCounts: st.upgradeCounts, settings: st.settings, heroClass: st.heroClass, talents: st.talents, world: st.world, offRun: st.offRun,
      });
    };
    if (saveTimer.current === null) saveTimer.current = window.setTimeout(flush, 5000);

    const onHide = () => { if (document.hidden) flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [state.hero, state.skillLevels, state.equipped, state.inventory, state.meta, state.upgradeCounts, state.settings, state.heroClass, state.talents, state.world, state.offRun]);

  // Свернул игру на телефоне и вернулся — выдаём награду за отсутствие
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt) {
        const seconds = (Date.now() - hiddenAt) / 1000;
        hiddenAt = 0;
        dispatch({ type: 'OFFLINE', seconds });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Уведомления в приложении: ставим при сворачивании, снимаем при возвращении
  useEffect(() => {
    const onVis = () => {
      const st = latest.current;
      if (document.hidden) { if (st.settings.notify) void scheduleNotifications(st.meta); } else void cancelAllNotifications();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // dispatch стабилен, поэтому набор действий создаём один раз
  const actions = useMemo(() => ({
    buySkill: (id: SkillId) => dispatch({ type: 'BUY_SKILL', id }),
    buyPotion: () => dispatch({ type: 'BUY_POTION' }),
    buyUpgrade: (kind: UpgradeKind) => dispatch({ type: 'BUY_UPGRADE', kind }),
    buyChest: () => dispatch({ type: 'BUY_CHEST' }),
    equipItem: (item: Item) => dispatch({ type: 'EQUIP', itemId: item.id }),
    sellItem: (item: Item) => dispatch({ type: 'SELL', itemId: item.id }),
    equipBest: () => dispatch({ type: 'EQUIP_BEST' }),
    sellJunk: () => dispatch({ type: 'SELL_JUNK' }),
    petRebirth: (id: PetId) => dispatch({ type: 'PET_REBIRTH', id }),
    setAutoSell: (rarity: Rarity) => dispatch({ type: 'SET_AUTO_SELL', rarity }),
    hellRebirth: () => dispatch({ type: 'HELL_REBIRTH' }),
    farmUpgrade: (id: string) => dispatch({ type: 'FARM_UPGRADE', id }),
    farmCollect: () => dispatch({ type: 'FARM_COLLECT' }),
    buySoul: (id: string) => dispatch({ type: 'BUY_SOUL', id }),
    togglePact: (id: string) => dispatch({ type: 'TOGGLE_PACT', id }),
    altar: () => dispatch({ type: 'ALTAR' }),
    enhance: (slot: ItemSlot) => dispatch({ type: 'ENHANCE', slot }),
    buyTalent: (id: string) => dispatch({ type: 'BUY_TALENT', id }),
    setPet: (id: PetId | null) => dispatch({ type: 'SET_PET', id }),
    travel: (to: WorldId) => dispatch({ type: 'TRAVEL', to }),
    openHell: () => dispatch({ type: 'OPEN_HELL' }),
    buyGem: (id: string) => dispatch({ type: 'BUY_GEM', id }),
    setAuto: (key: 'autoEnhance' | 'autoCraft' | 'notify', value: number | Rarity | null | boolean) => dispatch({ type: 'SET_AUTO', key, value }),
    raidStart: () => dispatch({ type: 'RAID_START' }),
    weeklyRun: () => dispatch({ type: 'WEEKLY_RUN' }),
    claimWeekly: (need: number) => dispatch({ type: 'CLAIM_WEEKLY', need }),
    towerRun: () => dispatch({ type: 'TOWER_RUN' }),
    dailyRun: () => dispatch({ type: 'DAILY_RUN' }),
    closeLadder: () => dispatch({ type: 'CLOSE_LADDER' }),
    buyStone: () => dispatch({ type: 'BUY_STONE' }),
    mergeStone: (key: string) => dispatch({ type: 'MERGE_STONE', key }),
    socket: (itemId: string, key: string) => dispatch({ type: 'SOCKET', itemId, key }),
    unsocket: (itemId: string) => dispatch({ type: 'UNSOCKET', itemId }),
    addSocket: (itemId: string) => dispatch({ type: 'ADD_SOCKET', itemId }),
    claimColl: (pct: number) => dispatch({ type: 'CLAIM_COLL', pct }),
    petCrate: (kind: 'basic' | 'gem') => dispatch({ type: 'PET_CRATE', kind }),
    setClass: (id: ClassId) => dispatch({ type: 'SET_CLASS', id }),
    setElement: (element: Element) => dispatch({ type: 'SET_ELEMENT', element }),
    setAutoElement: (value: boolean) => dispatch({ type: 'SET_AUTO_ELEMENT', value }),
    craft: (slot: ItemSlot, from: Rarity) => dispatch({ type: 'CRAFT', slot, from }),
    claimDaily: () => dispatch({ type: 'CLAIM_DAILY' }),
    useAbility: (id: AbilityId) => dispatch({ type: 'USE_ABILITY', id }),
    setAutoAbilities: (value: boolean) => dispatch({ type: 'SET_AUTO_ABILITIES', value }),
    rebirth: () => dispatch({ type: 'REBIRTH' }),
    dismissOffline: () => dispatch({ type: 'DISMISS_OFFLINE' }),
  }), []);

  const resetGame = () => {
    clearSave();
    dispatch({ type: 'RESET' });
  };

  const exportCode = () => {
    const st = latest.current;
    saveGame({ hero: st.hero, skillLevels: st.skillLevels, equipped: st.equipped, inventory: st.inventory, meta: st.meta, upgradeCounts: st.upgradeCounts, settings: st.settings, heroClass: st.heroClass, talents: st.talents, world: st.world, offRun: st.offRun });
    return exportSave();
  };

  return { state, stats, skills, autoFight, setAutoFight, resetGame, exportCode, importCode: importSave, ...actions };
}
