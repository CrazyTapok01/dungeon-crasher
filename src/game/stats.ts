import type { Equipment, HeroState, HeroStats, SkillLevels } from '../types';
import { BASE_STATS, SKILL_BONUS, STAT_CAPS } from '../gameData';

/**
 * Итоговые параметры героя = база + надетые предметы + навыки.
 * Чистая функция: одни и те же входные данные — один и тот же результат.
 */
export function computeStats(hero: HeroState, levels: SkillLevels, equipped: Equipment): HeroStats {
  const { weapon, armor, amulet } = equipped;
  return {
    atk: hero.baseAtk + (weapon?.atk ?? 0) + (amulet?.atk ?? 0) + levels.power * SKILL_BONUS.power,
    def: hero.baseDef + (armor?.def ?? 0) + (amulet?.def ?? 0) + levels.armor * SKILL_BONUS.armor,
    maxHp: hero.baseMaxHp + (armor?.hp ?? 0) + (amulet?.hp ?? 0) + levels.vitality * SKILL_BONUS.vitality,
    critChance: Math.min(STAT_CAPS.critChance, BASE_STATS.critChance + levels.crit * SKILL_BONUS.crit),
    critDmg: BASE_STATS.critDmg + levels.critdmg * SKILL_BONUS.critdmg,
    dodge: Math.min(STAT_CAPS.dodge, BASE_STATS.dodge + levels.dodge * SKILL_BONUS.dodge),
    lifesteal: BASE_STATS.lifesteal + levels.vamp * SKILL_BONUS.vamp,
  };
}
