import type { Equipment, HeroState, HeroStats, ClassId, PetId, RelicId, SkillLevels } from '../types';
import { BASE_STATS, CLASS_BONUS, enhanced, petBonus, PRESTIGE, SKILL_BONUS, STAT_CAPS, soulMultiplier, talentBonus } from '../gameData';

/** Всё, что усиливает героя помимо навыков и вещей. */
export interface Extras {
  relics?: Partial<Record<RelicId, number>>;
  heroClass?: ClassId | null;
  talents?: Record<string, number>;
  pet?: { id: PetId; level: number } | null;
}

/**
 * Итоговые параметры героя = (база + предметы + навыки) × бонус душ.
 * Чистая функция: одни и те же входные данные — один и тот же результат.
 */
export function computeStats(
  hero: HeroState, levels: SkillLevels, equipped: Equipment, souls = 0,
  extras: Extras = {},
): HeroStats {
  const { relics = {}, heroClass: cls = null, talents = {}, pet = null } = extras;
  const tb = (k: Parameters<typeof talentBonus>[1]) => talentBonus(talents, k) + petBonus(pet, k);
  const rl = (id: RelicId) => relics[id] ?? 0;
  const { weapon, armor, amulet } = {
    weapon: equipped.weapon && enhanced(equipped.weapon),
    armor: equipped.armor && enhanced(equipped.armor),
    amulet: equipped.amulet && enhanced(equipped.amulet),
  };
  const items = [weapon, armor, amulet];
  const sum = (key: 'crit' | 'critdmg' | 'dodge' | 'vamp') =>
    items.reduce((acc, it) => acc + (it?.[key] ?? 0), 0);
  const mult = soulMultiplier(souls);

  const atk = hero.baseAtk + (weapon?.atk ?? 0) + (amulet?.atk ?? 0) + levels.power * SKILL_BONUS.power;
  const maxHp = hero.baseMaxHp + (armor?.hp ?? 0) + (amulet?.hp ?? 0) + levels.vitality * SKILL_BONUS.vitality;

  return {
    atk: Math.round(atk * mult * (1 + (levels.fury * SKILL_BONUS.fury) / 100) * (1 + rl('fang') * 0.03) * (1 + tb('atk') / 100)),
    def: Math.round((hero.baseDef + (armor?.def ?? 0) + (amulet?.def ?? 0) + levels.armor * SKILL_BONUS.armor + rl('scale') * 2)
      * (1 + tb('def') / 100) * (cls === 'warrior' ? CLASS_BONUS.warriorDef : cls === 'thief' ? CLASS_BONUS.thiefDef : 1)),
    maxHp: Math.round(maxHp * mult * (1 + rl('heart') * 0.04) * (1 + tb('hp') / 100) * (cls === 'warrior' ? CLASS_BONUS.warriorHp : cls === 'mage' ? CLASS_BONUS.mageHp : 1)),
    critChance: Math.min(STAT_CAPS.critChance, BASE_STATS.critChance + levels.crit * SKILL_BONUS.crit + sum('crit') + rl('eye') + tb('crit')),
    critDmg: BASE_STATS.critDmg + levels.critdmg * SKILL_BONUS.critdmg + sum('critdmg') + (cls === 'mage' ? CLASS_BONUS.mageCritDmg : 0) + tb('critdmg'),
    dodge: Math.min(STAT_CAPS.dodge, BASE_STATS.dodge + levels.dodge * SKILL_BONUS.dodge + sum('dodge') + rl('wind') * 0.5 + (cls === 'thief' ? CLASS_BONUS.thiefDodge : 0) + tb('dodge')),
    lifesteal: BASE_STATS.lifesteal + levels.vamp * SKILL_BONUS.vamp + sum('vamp') + rl('blood') * 0.4,
    regen: levels.regen * SKILL_BONUS.regen + tb('regen'),
    goldBonus: levels.fortune * SKILL_BONUS.fortune + Math.round(souls * PRESTIGE.goldPerSoul * 100) + rl('coin') * 4 + tb('gold'),
    xpBonus: levels.wisdom * SKILL_BONUS.wisdom + rl('tome') * 4 + tb('xp'),
  };
}
