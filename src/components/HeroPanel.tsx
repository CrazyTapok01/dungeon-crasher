import type { HeroState, HeroStats, HeroStatus } from '../types';
import StatBar from './StatBar';

interface Props {
  hero: HeroState;
  stats: HeroStats;
  status: HeroStatus;
}

/** Плашка героя над сценой: уровень, здоровье, эффекты (яд, щит). */
export default function HeroPanel({ hero, stats, status }: Props) {
  return (
    <div className="hud">
      <div className="hud-title">
        <span className="hud-name">🛡️ Крушитель</span>
        <span className="hud-lvl">Ур. {hero.level}</span>
      </div>
      <StatBar
        value={hero.hp} max={stats.maxHp} height={15}
        fill="linear-gradient(180deg,#f87171 0%,#dc2626 55%,#991b1b 100%)"
        label={`${hero.hp} / ${stats.maxHp}`}
      />
      <div className="hud-chips">
        {status.shieldCharges > 0 && <span className="chip chip-blue">🛡️ ×{status.shieldCharges}</span>}
        {status.poisonTurns > 0 && <span className="chip chip-green">🤢 яд ×{status.poisonTurns}</span>}
      </div>
    </div>
  );
}
