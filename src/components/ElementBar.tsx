import { memo } from 'react';
import type { Element, Monster } from '../types';
import { ELEMENTS, ELEMENT_LIST, elementMult } from '../gameData';

interface Props {
  monster: Monster;
  current: Element;
  auto: boolean;
  onPick: (e: Element) => void;
  onToggleAuto: () => void;
}

/** Стихия атак героя: огонь > лёд > природа > огонь. Правильная стихия: +50% урона, неправильная: -25%. */
function ElementBar({ monster, current, auto, onPick, onToggleAuto }: Props) {
  const mult = elementMult(current, monster.element);
  const hint = mult > 1 ? `+${Math.round((mult - 1) * 100)}% урона` : mult < 1 ? `${Math.round((mult - 1) * 100)}% урона` : 'обычный урон';
  const hintColor = mult > 1 ? 'text-green-300' : mult < 1 ? 'text-red-300' : 'text-purple-300';
  return (
    <div className="panel rounded-xl p-2">
      <div className="flex items-center justify-between mb-1.5 text-[11px]">
        <span className="text-purple-300 font-bold">Стихия атаки</span>
        <span className={`font-bold ${hintColor}`}>{ELEMENTS[monster.element].emoji} враг · {hint}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {ELEMENT_LIST.map(e => (
          <button key={e} onClick={() => onPick(e)}
            className={`rounded-lg py-1.5 text-xs font-bold border ${current === e && !auto ? 'bg-purple-700/70 border-amber-400 text-amber-100' : current === e ? 'bg-purple-900/70 border-amber-400/60 text-amber-100' : 'bg-black/40 border-purple-800/60 text-purple-300'}`}>
            <span className="text-lg leading-none block">{ELEMENTS[e].emoji}</span>{ELEMENTS[e].name}
          </button>
        ))}
        <button onClick={onToggleAuto}
          className={`rounded-lg py-1.5 text-xs font-bold border ${auto ? 'bg-green-800/60 border-green-400 text-green-100' : 'bg-black/40 border-purple-800/60 text-purple-300'}`}>
          <span className="text-lg leading-none block">🎯</span>{auto ? 'Авто' : 'Ручн.'}
        </button>
      </div>
    </div>
  );
}

export default memo(ElementBar);
