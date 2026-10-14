import { memo } from 'react';
import type { ClassId, HeroState, HeroStats, HeroStatus } from '../types';
import { classDef } from '../gameData';
import StatBar from './StatBar';

interface Props {
  hero: HeroState;
  stats: HeroStats;
  status: HeroStatus;
  heroClass: ClassId | null;
}

/** Плашка героя над сценой: уровень, здоровье, эффекты (яд, щит). */
function HeroPanel({ hero, stats, status, heroClass }: Props) {
  return (
    <div className="hud">
      <div className="hud-title">
        <span className="hud-name">{heroClass ? classDef(heroClass).emoji : '🛡️'} Крушитель{heroClass && <span className="text-amber-300 text-xs font-bold"> · {classDef(heroClass).name}</span>}</span>
        <span className="hud-lvl">Ур. {hero.level}</span>
      </div>
      <StatBar
        value={hero.hp} max={stats.maxHp} height={15}
        fill="linear-gradient(180deg,#f87171 0%,#dc2626 55%,#991b1b 100%)"
        label={`${hero.hp} / ${stats.maxHp}`}
      />
      <div className="hud-chips">
        {status.rageCharges > 0 && <span className="chip chip-red">😡 ×{status.rageCharges}</span>}
        {status.shieldCharges > 0 && <span className="chip chip-blue">🛡️ ×{status.shieldCharges}</span>}
        {status.poisonTurns > 0 && <span className="chip chip-green">🤢 яд ×{status.poisonTurns}</span>}
      </div>
    </div>
  );
}

export default memo(HeroPanel);
