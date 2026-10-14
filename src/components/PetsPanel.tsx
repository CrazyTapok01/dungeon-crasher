import { memo } from 'react';
import type { Meta, PetId } from '../types';
import { EGG, PETS, PET_MAX } from '../gameData';

/** Питомцы: яйцо с босса, вылупление за победы, один активный помощник. */
function PetsPanel({ meta, onSet }: { meta: Meta; onSet: (id: PetId | null) => void }) {
  const owned = PETS.filter(p => meta.pets[p.id] > 0).length;
  const incubating = meta.egg >= 0;
  const pct = incubating ? Math.round((meta.egg / EGG.kills) * 100) : 0;
  return (
    <div className="panel rounded-xl p-3 border-pink-600/40">
      <h2 className="text-lg font-black text-pink-200 mb-0.5 text-center text-stroke">🐾 Питомцы</h2>
      <p className="text-center text-xs text-purple-300/80 mb-2 leading-snug">
        С боссов падают яйца ({Math.round(EGG.chance * 100)}%). Через {EGG.kills} побед вылупляется питомец: новый или +1 уровень (до {PET_MAX}).
        Помогает один выбранный питомец. Найдено: {owned}/{PETS.length}.
      </p>
      <div className="rounded-lg bg-black/35 border border-pink-500/30 p-2 mb-2">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-100">
          <span className="text-2xl">🥚</span>
          <span className="flex-1">{incubating ? `Яйцо греется: ${meta.egg} / ${EGG.kills}` : 'Яйца нет — ищи на боссах'}</span>
        </div>
        {incubating && (
          <div className="relative h-2.5 rounded-full bg-black/50 overflow-hidden mt-1.5">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-amber-300" style={{ transform: `translateX(${pct - 100}%)` }} />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        {PETS.map(p => {
          const lvl = meta.pets[p.id];
          const active = meta.activePet === p.id;
          return (
            <div key={p.id} className={`flex items-center gap-2 rounded-lg p-2 border ${lvl ? (active ? 'bg-pink-950/50 border-pink-400' : 'bg-black/30 border-pink-800/50') : 'bg-black/20 border-dashed border-purple-800/40 opacity-60'}`}>
              <span className={`text-3xl ${lvl ? '' : 'grayscale'}`}>{p.emoji}</span>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-sm font-bold text-pink-100">{lvl ? p.name : '???'} {lvl > 0 && <span className="text-xs text-pink-300">ур. {lvl}/{PET_MAX}</span>}</div>
                <div className="text-[11px] text-purple-200">{lvl ? `${p.desc} × ${lvl}` : p.desc}</div>
              </div>
              {lvl > 0 && (
                <button onClick={() => onSet(active ? null : p.id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${active ? 'btn-purple' : 'btn-fantasy'}`}>
                  {active ? '✓ С тобой' : 'Взять'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(PetsPanel);
