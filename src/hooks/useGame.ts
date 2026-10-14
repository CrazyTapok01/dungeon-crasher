import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AbilityId, ClassId, PetId, Element, Item, ItemSlot, Rarity, Skill, SkillId, UpgradeKind } from '../types';
import { BANNER_DURATION_MS, COMBAT_TICK_MS, RESPAWN_DELAY_MS, SKILLS, skillMaxLevel, skillUnlocked } from '../gameData';
import { computeStats } from '../game/stats';
import { extrasOf, gameReducer, loadInitialState } from '../game/reducer';
import { clearSave, saveGame } from '../game/save';
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
    [state.hero, state.skillLevels, state.equipped, state.meta.souls, state.meta.relics, state.heroClass, state.talents, state.meta.activePet, state.meta.pets],
  );

  const skills = useMemo<Skill[]>(
    () => SKILLS.map(def => ({
      ...def,
      maxLevel: skillMaxLevel(def, state.meta.rebirths),
      level: state.skillLevels[def.id],
      locked: !skillUnlocked(def, state.meta.rebirths),
    })),
    [state.skillLevels, state.meta.rebirths],
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
        meta: st.meta, upgradeCounts: st.upgradeCounts, settings: st.settings, heroClass: st.heroClass, talents: st.talents,
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
  }, [state.hero, state.skillLevels, state.equipped, state.inventory, state.meta, state.upgradeCounts, state.settings, state.heroClass, state.talents]);

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
    enhance: (slot: ItemSlot) => dispatch({ type: 'ENHANCE', slot }),
    buyTalent: (id: string) => dispatch({ type: 'BUY_TALENT', id }),
    setPet: (id: PetId | null) => dispatch({ type: 'SET_PET', id }),
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

  return { state, stats, skills, autoFight, setAutoFight, resetGame, ...actions };
}
