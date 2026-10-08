import type { HeroState, HeroStats, Monster } from '../types';
import { LEVEL_UP, xpForLevel } from '../gameData';

/** Удар героя по монстру: урон, крит и сколько здоровья вернёт вампиризм. */
export function rollHeroAttack(stats: HeroStats, monster: Monster) {
  const crit = Math.random() * 100 < stats.critChance;
  const rawAttack = stats.atk + Math.floor(Math.random() * 5);              // небольшой разброс 0–4
  const afterArmor = Math.max(1, rawAttack - Math.floor(monster.def * 0.6)); // броня гасит 60% защиты
  const dmg = Math.max(1, Math.round(crit ? afterArmor * (stats.critDmg / 100) : afterArmor));
  const lifestealHeal = Math.round((dmg * stats.lifesteal) / 100);
  return { dmg, crit, lifestealHeal };
}

/** Удар монстра по герою: либо промах (уклонение), либо урон. */
export function rollMonsterAttack(stats: HeroStats, monster: Monster) {
  if (Math.random() * 100 < stats.dodge) return { dodged: true, dmg: 0 };
  const dmg = Math.max(1, monster.atk - Math.floor(stats.def * 0.7) + Math.floor(Math.random() * 3));
  return { dodged: false, dmg };
}

/** Начисляет опыт; если хватает — повышает уровень (иногда сразу несколько). */
export function applyXp(hero: HeroState, amount: number): { hero: HeroState; levelsGained: number } {
  let { xp, level, xpToNext, baseMaxHp } = hero;
  let levelsGained = 0;
  xp += amount;
  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = xpForLevel(level);
    baseMaxHp += LEVEL_UP.hpBonus;
    levelsGained += 1;
  }
  return { hero: { ...hero, xp, level, xpToNext, baseMaxHp }, levelsGained };
}
