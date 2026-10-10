import { useEffect, useMemo, useReducer, useState } from 'react';
import type { AbilityId, Item, Skill, SkillId, UpgradeKind } from '../types';
import { BANNER_DURATION_MS, COMBAT_TICK_MS, RESPAWN_DELAY_MS, SKILLS } from '../gameData';
import { computeStats } from '../game/stats';
import { gameReducer, loadInitialState } from '../game/reducer';
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
    () => computeStats(state.hero, state.skillLevels, state.equipped, state.meta.souls),
    [state.hero, state.skillLevels, state.equipped, state.meta.souls],
  );

  const skills = useMemo<Skill[]>(
    () => SKILLS.map(def => ({ ...def, level: state.skillLevels[def.id] })),
    [state.skillLevels],
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

  // Автосохранение
  useEffect(() => {
    saveGame({
      hero: state.hero,
      skillLevels: state.skillLevels,
      equipped: state.equipped,
      inventory: state.inventory,
      meta: state.meta,
      upgradeCounts: state.upgradeCounts,
      settings: state.settings,
    });
  }, [state.hero, state.skillLevels, state.equipped, state.inventory, state.meta, state.upgradeCounts, state.settings]);

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
