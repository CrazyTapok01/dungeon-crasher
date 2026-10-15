import { memo } from 'react';
import type { ClassId, HeroState, HeroStats, HeroStatus } from '../types';
import { classDef, heroName } from '../gameData';
import { useWorld } from './coin';
import StatBar from './StatBar';

interface Props {
  hero: HeroState;
  stats: HeroStats;
  status: HeroStatus;
  heroClass: ClassId | null;
}

/** Плашка героя над сценой: уровень, здоровье, эффекты (яд, щит). */
function HeroPanel({ hero, stats, status, heroClass }: Props) {
  const world = useWorld();
  return (
    <div className="hud">
      <div className="hud-title">
        <span className="hud-name">{world === 'hell' ? '😈' : heroClass ? classDef(heroClass).emoji : '🛡️'} {heroName(world)}</span>
        <span className="hud-lvl">Ур. {hero.level}</span>
      </div>
      <StatBar
        value={hero.hp} max={stats.maxHp} height={15}
        fill="linear-gradient(180deg,#f87171 0%,#dc2626 55%,#991b1b 100%)"
        label={`${hero.hp} / ${stats.maxHp}`}
      />
      <div className="hud-chips">
        {world === 'dungeon' && heroClass && <span className="chip chip-gold">{classDef(heroClass).name}</span>}
        {status.rageCharges > 0 && <span className="chip chip-red">😡 ×{status.rageCharges}</span>}
        {status.shieldCharges > 0 && <span className="chip chip-blue">🛡️ ×{status.shieldCharges}</span>}
        {status.poisonTurns > 0 && <span className="chip chip-green">🤢 яд ×{status.poisonTurns}</span>}
      </div>
    </div>
  );
}

export default memo(HeroPanel);
