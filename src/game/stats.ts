import type { Equipment, HeroState, HeroStats, SkillLevels } from '../types';
import { BASE_STATS, PRESTIGE, SKILL_BONUS, STAT_CAPS, soulMultiplier } from '../gameData';

/**
 * Итоговые параметры героя = (база + предметы + навыки) × бонус душ.
 * Чистая функция: одни и те же входные данные — один и тот же результат.
 */
export function computeStats(
  hero: HeroState, levels: SkillLevels, equipped: Equipment, souls = 0,
): HeroStats {
  const { weapon, armor, amulet } = equipped;
  const items = [weapon, armor, amulet];
  const sum = (key: 'crit' | 'critdmg' | 'dodge' | 'vamp') =>
    items.reduce((acc, it) => acc + (it?.[key] ?? 0), 0);
  const mult = soulMultiplier(souls);

  const atk = hero.baseAtk + (weapon?.atk ?? 0) + (amulet?.atk ?? 0) + levels.power * SKILL_BONUS.power;
  const maxHp = hero.baseMaxHp + (armor?.hp ?? 0) + (amulet?.hp ?? 0) + levels.vitality * SKILL_BONUS.vitality;

  return {
    atk: Math.round(atk * mult),
    def: hero.baseDef + (armor?.def ?? 0) + (amulet?.def ?? 0) + levels.armor * SKILL_BONUS.armor,
    maxHp: Math.round(maxHp * mult),
    critChance: Math.min(STAT_CAPS.critChance, BASE_STATS.critChance + levels.crit * SKILL_BONUS.crit + sum('crit')),
    critDmg: BASE_STATS.critDmg + levels.critdmg * SKILL_BONUS.critdmg + sum('critdmg'),
    dodge: Math.min(STAT_CAPS.dodge, BASE_STATS.dodge + levels.dodge * SKILL_BONUS.dodge + sum('dodge')),
    lifesteal: BASE_STATS.lifesteal + levels.vamp * SKILL_BONUS.vamp + sum('vamp'),
    regen: levels.regen * SKILL_BONUS.regen,
    goldBonus: levels.fortune * SKILL_BONUS.fortune + Math.round(souls * PRESTIGE.goldPerSoul * 100),
    xpBonus: levels.wisdom * SKILL_BONUS.wisdom,
  };
}
