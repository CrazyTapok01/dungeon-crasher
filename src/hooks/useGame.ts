import { useEffect, useMemo, useReducer, useState } from 'react';
import type { Item, Skill, SkillId, UpgradeKind } from '../types';
import {
  BANNER_DURATION_MS, COMBAT_TICK_MS, FX_DURATION_MS, RESPAWN_DELAY_MS, SKILLS,
} from '../gameData';
import { computeStats } from '../game/stats';
import { gameReducer, loadInitialState } from '../game/reducer';
import { clearSave, saveGame } from '../game/save';

/**
 * Хук — «мост» между правилами игры (reducer) и React.
 * Здесь живёт всё, что связано со временем: таймеры боя, возрождения,
 * исчезновения анимаций и автосохранение. Сами правила — в game/reducer.ts.
 */
export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadInitialState);
  const [autoFight, setAutoFight] = useState(true);

  const stats = useMemo(
    () => computeStats(state.hero, state.skillLevels, state.equipped),
    [state.hero, state.skillLevels, state.equipped],
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

  // Всплывающие числа и тряска исчезают, когда бой затихает
  useEffect(() => {
    if (!state.heroHit && !state.monsterHit) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_FX' }), FX_DURATION_MS);
    return () => clearTimeout(timer);
  }, [state.heroHit, state.monsterHit]);

  // Баннер «Этаж пройден»
  useEffect(() => {
    if (!state.showFloorBanner) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_BANNER' }), BANNER_DURATION_MS);
    return () => clearTimeout(timer);
  }, [state.showFloorBanner]);

  // Автосохранение
  useEffect(() => {
    saveGame({
      hero: state.hero,
      skillLevels: state.skillLevels,
      equipped: state.equipped,
      inventory: state.inventory,
    });
  }, [state.hero, state.skillLevels, state.equipped, state.inventory]);

  // dispatch стабилен, поэтому набор действий создаём один раз
  const actions = useMemo(() => ({
    buySkill: (id: SkillId) => dispatch({ type: 'BUY_SKILL', id }),
    buyPotion: () => dispatch({ type: 'BUY_POTION' }),
    buyUpgrade: (kind: UpgradeKind) => dispatch({ type: 'BUY_UPGRADE', kind }),
    equipItem: (item: Item) => dispatch({ type: 'EQUIP', itemId: item.id }),
    sellItem: (item: Item) => dispatch({ type: 'SELL', itemId: item.id }),
  }), []);

  const resetGame = () => {
    if (!window.confirm('Сбросить весь прогресс?')) return;
    clearSave();
    dispatch({ type: 'RESET' });
  };

  return { state, stats, skills, autoFight, setAutoFight, resetGame, ...actions };
}
