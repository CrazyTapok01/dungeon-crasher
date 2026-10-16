import { memo } from 'react';
import type { Meta, PetId } from '../types';
import { useNow } from './useNow';
import { EGG, PETS, PET_REBIRTH, petAvailable, petRankOf, PET_CRATES, PET_GEAR_MULT, PET_MAX, PET_SLOTS, RARITY_COLORS, RARITY_NAME, petCrateGoldCost, petGearMult } from '../gameData';

/** Питомцы: яйцо с босса, вылупление за победы, один активный помощник. */
interface Props { onRebirth: (id: PetId) => void; meta: Meta; gold: number; floor: number; coin: string; canBuyWithGold: boolean; onSet: (id: PetId | null) => void; onCrate: (kind: 'basic' | 'gem') => void }

function PetsPanel({ onRebirth, meta, gold, floor, coin, canBuyWithGold, onSet, onCrate }: Props) {
  const goldCost = petCrateGoldCost(floor);
  const waiting = PETS.some(p => !petAvailable(meta, p.id));
  const now = useNow(waiting);
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
      <div className="rounded-lg bg-black/35 border border-pink-500/30 p-2 mb-2">
        <div className="text-xs font-bold text-pink-200 mb-1.5 text-center">🎽 Снаряжение питомца: бонусы ×{petGearMult(meta.petGear).toFixed(2)}</div>
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {PET_SLOTS.map(sl => {
            const r = meta.petGear[sl.id];
            const c = r ? RARITY_COLORS[r] : null;
            return (
              <div key={sl.id} className={`rounded-lg p-1.5 text-center border bg-black/30 ${c ? c.border : 'border-dashed border-purple-800/50'}`}>
                <div className={`text-2xl ${r ? '' : 'grayscale opacity-50'}`}>{sl.emoji}</div>
                <div className="text-[10px] text-purple-200 leading-tight">{sl.name}</div>
                <div className={`text-[10px] font-bold ${c ? c.text : 'text-purple-400'}`}>{r ? `${RARITY_NAME[r]} +${Math.round(PET_GEAR_MULT[r] * 100)}%` : 'пусто'}</div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button disabled={!canBuyWithGold || gold < goldCost} onClick={() => onCrate('basic')} className="btn-fantasy py-2 rounded-lg text-xs font-bold disabled:opacity-50 leading-tight">
            {PET_CRATES.basic.emoji} {PET_CRATES.basic.name}<br />{coin} {goldCost}
          </button>
          <button disabled={meta.gems < PET_CRATES.gem.gemCost} onClick={() => onCrate('gem')} className="btn-purple py-2 rounded-lg text-xs font-bold disabled:opacity-50 leading-tight">
            {PET_CRATES.gem.emoji} {PET_CRATES.gem.name}<br />💎 {PET_CRATES.gem.gemCost}
          </button>
        </div>
        <p className="text-[10px] text-purple-300/70 text-center mt-1 leading-tight">Ящик даёт случайную вещь в случайный слот. Не лучше текущей — золото частично возвращается.</p>
      </div>
      <div className="space-y-1.5">
        {PETS.map(p => {
          const lvl = meta.pets[p.id];
          const rank = petRankOf(meta, p.id);
          const left = Math.max(0, (meta.petReborn[p.id] ?? 0) - now);
          const reborning = lvl > 0 && left > 0;
          const active = meta.activePet === p.id && !reborning;
          const canReborn = lvl >= PET_MAX && rank < PET_REBIRTH.maxRank && !reborning;
          const cost = PET_REBIRTH.gemCost(rank);
          const hms = `${Math.floor(left / 3600000)}:${String(Math.floor(left / 60000) % 60).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
          return (
            <div key={p.id} className={`flex items-center gap-2 rounded-lg p-2 border ${lvl ? (active ? 'bg-pink-950/50 border-pink-400' : 'bg-black/30 border-pink-800/50') : 'bg-black/20 border-dashed border-purple-800/40 opacity-60'}`}>
              <span className={`text-3xl ${lvl ? '' : 'grayscale'}`}>{p.emoji}</span>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-sm font-bold text-pink-100">{lvl ? p.name : '???'} {lvl > 0 && <span className="text-xs text-pink-300">ур. {lvl}/{PET_MAX}{rank > 1 ? ` · ранг ${rank} (×${rank})` : ''}</span>}</div>
                <div className="text-[11px] text-purple-200">{lvl ? `${p.desc} × ${lvl * rank}` : p.desc}</div>
                {reborning && <div className="text-[11px] font-bold text-amber-300">🔄 Перерождается: {hms}</div>}
                {canReborn && <div className="text-[10px] text-cyan-200/90">Макс. уровень: можно переродиться (ранг {rank + 1}, бонусы ×{rank + 1})</div>}
              </div>
              {lvl > 0 && canReborn && (
                <button disabled={meta.gems < cost} onClick={() => onRebirth(p.id)} className="btn-purple px-2 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50 leading-tight">
                  🔄 {PET_REBIRTH.hours} ч<br />💎 {cost}
                </button>
              )}
              {lvl > 0 && !canReborn && !reborning && (
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
