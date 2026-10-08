import type { Skill, SkillId } from '../types';
import { skillCost } from '../gameData';

interface Props {
  skills: Skill[];
  gold: number;
  onBuy: (id: SkillId) => void;
}

const EMOJI_BG: Record<string, string> = {
  power: 'from-red-700 to-red-900',
  vitality: 'from-pink-700 to-rose-900',
  armor: 'from-slate-700 to-slate-900',
  crit: 'from-yellow-700 to-amber-900',
  critdmg: 'from-orange-700 to-red-900',
  dodge: 'from-sky-700 to-cyan-900',
  vamp: 'from-rose-800 to-red-950',
};

export default function SkillsPanel({ skills, gold, onBuy }: Props) {
  return (
    <div className="lg:col-span-3 panel rounded-lg p-4">
      <h2 className="text-2xl font-black text-amber-300 mb-3 text-center text-stroke">✨ Навыки героя</h2>
      <p className="text-center text-purple-300 text-sm mb-4">Прокачивай навыки за золото и стань сильнее!</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {skills.map(s => {
          const cost = skillCost(s, s.level);
          const maxed = s.level >= s.maxLevel;
          const canBuy = !maxed && gold >= cost;
          return (
            <div key={s.id}
                 className={`panel rounded-lg p-3 bg-gradient-to-br ${EMOJI_BG[s.id]||'from-purple-800 to-purple-950'} border-2 ${maxed ? 'border-amber-400/70' : 'border-purple-600/40'}`}>
              <div className="flex items-start gap-3">
                <div className="text-4xl bg-black/30 rounded-lg w-14 h-14 flex items-center justify-center flex-shrink-0">
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-black text-white">{s.name}</h4>
                    <span className="text-xs bg-black/40 px-2 py-0.5 rounded-full text-amber-300 font-bold">
                      {s.level}/{s.maxLevel}
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/90 mt-0.5">{s.desc}</p>
                  <p className="text-sm text-green-300 mt-1 font-bold">▸ {s.effect(s.level)}</p>
                </div>
              </div>
              <button
                disabled={!canBuy}
                onClick={() => onBuy(s.id)}
                className="btn-fantasy w-full mt-3 py-1.5 rounded font-bold text-sm">
                {maxed ? '🏆 МАКСИМУМ' : `💰 ${cost} · Улучшить`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
