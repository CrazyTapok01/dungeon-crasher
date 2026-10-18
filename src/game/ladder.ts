import type { Element, HeroStats, Monster } from '../types';
import { BOSS } from '../gameData';
import { rollHeroAttack, rollMonsterAttack } from './combat';

/*
 * Симуляция «лестниц»: Башня испытаний и ежедневное испытание.
 * Герой по очереди сражается с врагами, пока не погибнет. Бой считается мгновенно,
 * а на экране показывается отчёт по каждому врагу.
 */

export interface LadderOpts {
  stats: HeroStats;
  element: Element;
  count: number;                       // максимум врагов
  foe: (i: number) => Monster;         // i начинается с 1
  mech?: (i: number) => string | undefined; // механика врага (id из TOWER_MECHS)
  healFrac: number;                    // какую долю макс. HP герой восстанавливает после победы
  heroDot?: number;                    // доля макс. HP, теряемая каждый ход (ядовитый туман)
  foeMul?: { hp?: number; atk?: number; def?: number };
}

export interface LadderStep {
  i: number; name: string; emoji: string; mech?: string;
  won: boolean; hpLeft: number; turns: number;
}

export interface LadderResult {
  kind: 'tower' | 'daily';
  steps: LadderStep[];
  cleared: number;
  lines: string[];  // награды (заполняет reducer)
}

export function simulateLadder(o: LadderOpts): { steps: LadderStep[]; cleared: number } {
  const steps: LadderStep[] = [];
  let hp = o.stats.maxHp;
  let cleared = 0;
  for (let i = 1; i <= o.count; i++) {
    const base = o.foe(i);
    const mech = o.mech?.(i);
    const m: Monster = {
      ...base,
      hp: Math.round(base.hp * (o.foeMul?.hp ?? 1) * (mech === 'giant' ? 1.8 : 1)),
      atk: Math.round(base.atk * (o.foeMul?.atk ?? 1) * (mech === 'giant' ? 0.8 : 1)),
      def: Math.round(base.def * (o.foeMul?.def ?? 1) * (mech === 'armor' ? 1.7 : 1)),
    };
    const stats = mech === 'frost' ? { ...o.stats, dodge: 0 } : o.stats;
    let mhp = m.hp;
    let turns = 0;
    while (hp > 0 && mhp > 0 && turns < 400) {
      turns++;
      // ход героя
      const r = rollHeroAttack(stats, m, { element: o.element });
      let dmg = mech === 'ward' ? Math.max(1, Math.round(r.dmg * 0.65)) : r.dmg;
      dmg = Math.min(dmg, mhp);
      mhp -= dmg;
      hp = Math.min(stats.maxHp, hp + r.lifestealHeal + stats.regen);
      if (mech === 'thorns') hp -= Math.round(dmg * 0.12);
      if (mhp <= 0 || hp <= 0) break;
      if (mech === 'regen') mhp = Math.min(m.hp, mhp + Math.round(m.hp * 0.03));
      // ход врага
      const enraged = mech === 'fury' && mhp < m.hp * 0.5;
      const atk = rollMonsterAttack(stats, m, { heavy: m.isBoss && turns % BOSS.heavyEvery === 0, enraged });
      hp -= atk.dmg;
      if (mech === 'venom') hp -= Math.round(stats.maxHp * 0.025);
      if (o.heroDot) hp -= Math.round(stats.maxHp * o.heroDot);
    }
    const won = mhp <= 0 && hp > 0;
    steps.push({ i, name: m.name, emoji: m.emoji, mech, won, hpLeft: Math.max(0, Math.round(hp)), turns });
    if (!won) break;
    cleared++;
    hp = Math.min(stats.maxHp, hp + Math.round(stats.maxHp * o.healFrac));
  }
  return { steps, cleared };
}
