import type { HeroState, HeroStats, Monster } from '../types';
import { BOSS, ENRAGE, LEVEL_UP, xpForLevel } from '../gameData';

interface HeroAttackOptions {
  mult?: number;      // множитель урона (для «Сокрушающего удара»)
  ignoreDef?: number; // какую долю брони монстра игнорировать (0–1)
}

/** Удар героя по монстру: урон, крит и сколько здоровья вернёт вампиризм. */
export function rollHeroAttack(stats: HeroStats, monster: Monster, opts: HeroAttackOptions = {}) {
  const crit = Math.random() * 100 < stats.critChance;
  const rawAttack = stats.atk + Math.floor(Math.random() * 5);                  // небольшой разброс 0–4
  const armor = Math.floor(monster.def * 0.6 * (1 - (opts.ignoreDef ?? 0)));    // броня гасит 60% защиты
  const afterArmor = Math.max(1, rawAttack - armor);
  const base = crit ? afterArmor * (stats.critDmg / 100) : afterArmor;
  const dmg = Math.max(1, Math.round(base * (opts.mult ?? 1)));
  const lifestealHeal = Math.round((dmg * stats.lifesteal) / 100);
  return { dmg, crit, lifestealHeal };
}

interface MonsterAttackOptions {
  heavy?: boolean;   // заряженный удар босса
  enraged?: boolean; // берсерк в ярости
}

/** Удар монстра по герою: либо промах (уклонение), либо урон. */
export function rollMonsterAttack(stats: HeroStats, monster: Monster, opts: MonsterAttackOptions = {}) {
  if (Math.random() * 100 < stats.dodge) return { dodged: true, dmg: 0 };
  const atk = Math.round(monster.atk * (opts.enraged ? ENRAGE.atkMult : 1));
  let dmg = Math.max(1, atk - Math.floor(stats.def * 0.7) + Math.floor(Math.random() * 3));
  if (opts.heavy) dmg = Math.round(dmg * BOSS.heavyMult);
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
