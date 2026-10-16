import { memo } from 'react';
import type { Meta, WorldId } from '../types';
import { HELL_PACTS, altarCost, altarSouls, hellAffix } from '../gameData';
import { useFmt } from '../game/num';

interface Props { meta: Meta; world: WorldId; coals: number; floor: number; onPact: (id: string) => void; onAltar: () => void }

/** Особые механики Преисподней: закон этажа, договоры и алтарь жертвоприношений. */
function HellPanel({ meta, world, coals, floor, onPact, onAltar }: Props) {
  const f = useFmt();
  const inHell = world === 'hell';
  const af = hellAffix(floor);
  const cost = altarCost(meta.altar, floor);
  return (
    <div className="panel rounded-xl p-3 border-orange-500/50">
      <h2 className="text-lg font-black text-orange-300 mb-0.5 text-center text-stroke">🔥 Тайны Преисподней</h2>
      {!inHell && <p className="text-center text-xs text-orange-200/80 mb-2">Договоры и алтарь работают, когда ты в Преисподней (карта 🗺️).</p>}

      {inHell && (
        <div className="rounded-lg bg-black/35 border border-orange-600/40 p-2 mb-2 text-center">
          <div className="text-sm font-black text-orange-200">{af.emoji} Закон этажа {floor}: {af.name}</div>
          <div className="text-[11px] text-orange-100/80 leading-tight">{af.desc}. Закон меняется каждые 2 этажа.</div>
        </div>
      )}

      <h3 className="text-sm font-bold text-orange-200 mb-1">📜 Договоры <span className="text-[11px] font-normal text-orange-300/70">(включай любые, бесплатно)</span></h3>
      <div className="space-y-1.5 mb-3">
        {HELL_PACTS.map(p => {
          const on = !!meta.pacts[p.id];
          return (
            <div key={p.id} className={`flex items-center gap-2 rounded-lg p-2 border ${on ? 'bg-orange-950/60 border-orange-400' : 'bg-black/30 border-orange-900/50'}`}>
              <span className="text-2xl w-9 text-center">{p.emoji}</span>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-sm font-bold text-orange-100">{p.name}</div>
                <div className="text-[11px] text-orange-200/80">{p.desc}</div>
              </div>
              <button disabled={!inHell} onClick={() => onPact(p.id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 shrink-0 ${on ? 'btn-purple' : 'btn-fantasy'}`}>
                {on ? '✓ Действует' : 'Заключить'}
              </button>
            </div>
          );
        })}
      </div>

      <h3 className="text-sm font-bold text-orange-200 mb-1">🕯️ Алтарь жертв</h3>
      <p className="text-[11px] text-orange-200/80 leading-snug mb-1.5">
        Принеси угли в жертву и получи души — они усиливают героя в обоих мирах и их можно тратить в лавке душ. Цена растёт с каждой жертвой и с этажом, награда — тоже с этажом. Принесено жертв: {meta.altar}.
      </p>
      <button disabled={!inHell || coals < cost} onClick={onAltar} className="btn-purple w-full py-2.5 rounded-xl text-sm font-black disabled:opacity-50">
        🕯️ Принести жертву · 🔥 {f(cost)} → +{altarSouls(floor)} 👻
      </button>
    </div>
  );
}
export default memo(HellPanel);
