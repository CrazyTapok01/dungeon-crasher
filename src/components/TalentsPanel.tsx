import { memo } from 'react';
import type { ClassId } from '../types';
import { TALENTS, TALENT_MAX, classDef, spentTalents, talentPoints } from '../gameData';

interface Props {
  heroClass: ClassId | null;
  level: number;
  talents: Record<string, number>;
  onBuy: (id: string) => void;
}

/** Таланты класса: очки даёт уровень героя (1 за 2 уровня), перерождение их сбрасывает. */
function TalentsPanel({ heroClass, level, talents, onBuy }: Props) {
  if (!heroClass) return null;
  const free = talentPoints(level) - spentTalents(talents);
  const list = TALENTS.filter(t => t.cls === heroClass);
  return (
    <div className="panel rounded-xl p-3 mb-3 border-amber-600/40">
      <div className="flex items-center justify-between mb-0.5">
        <h2 className="text-lg font-black text-amber-300 text-stroke">{classDef(heroClass).emoji} Таланты: {classDef(heroClass).name}</h2>
        <span className={`text-sm font-black px-2 py-0.5 rounded-full border ${free > 0 ? 'bg-amber-700/50 border-amber-400 text-amber-100 animate-pulse' : 'bg-black/40 border-purple-800 text-purple-400'}`}>
          ⭐ {free}
        </span>
      </div>
      <p className="text-[11px] text-purple-300/80 mb-2 leading-snug">1 очко за каждые 2 уровня. Всё не взять — выбирай. После перерождения очки возвращаются.</p>
      <div className="grid grid-cols-2 gap-2">
        {list.map(t => {
          const lvl = talents[t.id] ?? 0;
          const maxed = lvl >= TALENT_MAX;
          return (
            <button key={t.id} disabled={free <= 0 || maxed} onClick={() => onBuy(t.id)}
              className={`text-left rounded-lg p-2 border transition active:scale-[0.98] disabled:active:scale-100 ${lvl > 0 ? 'bg-amber-950/40 border-amber-500/50' : 'bg-black/30 border-purple-800/50'} ${free > 0 && !maxed ? 'ring-1 ring-amber-400/40' : 'opacity-90'}`}>
              <div className="flex items-center gap-1.5">
                <span className="text-xl">{t.emoji}</span>
                <div className="min-w-0 leading-tight">
                  <div className="text-xs font-bold text-amber-100 truncate">{t.name}</div>
                  <div className="text-[10px] text-amber-300">{lvl}/{t.max}</div>
                </div>
              </div>
              <div className="text-[11px] text-purple-200 mt-1">{t.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(TalentsPanel);
