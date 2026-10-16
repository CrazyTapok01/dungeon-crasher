import { useFmt } from '../game/num';
import { memo } from 'react';
import type { Monster, MonsterAi } from '../types';
import { ELEMENTS, TRAITS } from '../gameData';
import StatBar from './StatBar';

interface Props {
  monster: Monster;
  hp: number;
  ai: MonsterAi;
}

/** Плашка монстра над сценой: имя, здоровье, особенности и состояние. */
function MonsterPanel({ monster, hp, ai }: Props) {
  const f = useFmt();
  const trait = monster.trait ? TRAITS[monster.trait] : null;
  const fill = monster.isBoss
    ? 'linear-gradient(180deg,#fde047 0%,#f59e0b 55%,#b45309 100%)'
    : monster.isElite
      ? 'linear-gradient(180deg,#e9d5ff 0%,#a855f7 55%,#6b21a8 100%)'
      : 'linear-gradient(180deg,#fca5a5 0%,#dc2626 55%,#7f1d1d 100%)';

  return (
    <div className="hud hud-right">
      <div className="hud-title">
        <span className={`hud-name ${monster.isBoss ? 'text-amber-300' : monster.isElite ? 'text-purple-300' : ''}`}>
          {monster.isBoss ? '👑 ' : monster.isElite ? '⭐ ' : ''}{monster.name}
          <span className={`ml-1 ${ELEMENTS[monster.element].color}`} title={ELEMENTS[monster.element].name}>{ELEMENTS[monster.element].emoji}</span>
        </span>
      </div>
      <StatBar value={hp} max={monster.hp} height={15} fill={fill} label={`${f(hp)} / ${f(monster.hp)}`} />
      <div className="hud-chips justify-end">
        {ai.charging && <span className="chip chip-red chip-pulse">⚠️ замах!</span>}
        {ai.enraged && <span className="chip chip-red">😡 ярость</span>}
        {trait && <span className="chip chip-purple" title={trait.desc}>{trait.emoji} {trait.name}</span>}
        {monster.isElite && <span className="chip chip-gold">элита</span>}
      </div>
    </div>
  );
}

export default memo(MonsterPanel);
