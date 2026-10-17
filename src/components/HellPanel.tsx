import { memo } from 'react';
import type { Meta, WorldId } from '../types';
import { FARM, FARMS, HELL_PACTS, HELL_REBIRTH, altarCost, altarSouls, farmCost, farmPending, farmRate, hellAffix, hellMult, hellRebirthCost } from '../gameData';
import { useNow } from './useNow';
import { useFmt } from '../game/num';

interface Props {
  meta: Meta; world: WorldId; coals: number; floor: number;
  onPact: (id: string) => void; onAltar: () => void;
  onHellRebirth: () => void; onFarmUpgrade: (id: string) => void; onFarmCollect: () => void;
}

/** Особые механики Преисподней: закон этажа, договоры и алтарь жертвоприношений. */
function HellPanel({ meta, world, coals, floor, onPact, onAltar, onHellRebirth, onFarmUpgrade, onFarmCollect }: Props) {
  const f = useFmt();
  const farmOpen = meta.hellMax >= FARM.unlockFloor;
  const now = useNow(farmOpen);
  const pending = farmPending(meta, now);
  const rate = farmRate(meta.farms);
  const rebirthCost = hellRebirthCost(meta.hellRebirths);
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

      <div className="rounded-lg bg-gradient-to-br from-red-950/70 to-black/50 border border-orange-500/60 p-2 mb-3">
        <h3 className="text-sm font-black text-orange-200 text-center">🔥 Перерождение Охотника</h3>
        <p className="text-[11px] text-orange-100/80 text-center leading-snug my-1">
          Сбрасывает забег Преисподней (этаж, угли, навыки, вещи). Навсегда даёт ×{hellMult(meta.hellRebirths + 1)} ко всем характеристикам Охотника (сейчас ×{hellMult(meta.hellRebirths)}).
          Следующее перерождение дороже: 20, 40, 60… 💎. Нужен этаж {HELL_REBIRTH.minFloor}+. Совершено: {meta.hellRebirths}.
        </p>
        <button disabled={!inHell || floor < HELL_REBIRTH.minFloor || meta.gems < rebirthCost} onClick={onHellRebirth} className="btn-purple w-full py-2.5 rounded-xl text-sm font-black disabled:opacity-50">
          🔥 Переродиться · 💎 {rebirthCost} (у вас {meta.gems})
        </button>
      </div>

      <div className="rounded-lg bg-black/35 border border-cyan-700/50 p-2 mb-3">
        <h3 className="text-sm font-black text-cyan-200 text-center">💎 Кристальные фермы</h3>
        {!farmOpen ? (
          <p className="text-[11px] text-cyan-100/70 text-center leading-snug mt-1">
            🔒 Откроются, когда рекорд этажа в Преисподней достигнет {FARM.unlockFloor} (сейчас {meta.hellMax}). Фермы улучшаются углями и приносят кристаллы со временем, даже когда игра закрыта.
          </p>
        ) : (
          <>
            <p className="text-[11px] text-cyan-100/80 text-center leading-snug my-1">
              Копят кристаллы в реальном времени (до {FARM.capHours} ч запаса). Улучшаются углями в Преисподней. Сейчас: {rate.toFixed(1)} 💎/ч.
            </p>
            <button disabled={pending < 1} onClick={onFarmCollect} className="btn-fantasy w-full py-2 rounded-lg text-sm font-black disabled:opacity-50 mb-1.5">
              💎 Собрать: {Math.floor(pending)} <span className="text-[11px] font-normal">(накоплено {pending.toFixed(2)})</span>
            </button>
            <div className="space-y-1.5">
              {FARMS.map(d => {
                const lvl = meta.farms[d.id] ?? 0;
                const maxed = lvl >= d.max;
                const cost = farmCost(d, lvl);
                return (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg p-2 bg-black/30 border border-cyan-900/60">
                    <span className="text-2xl w-9 text-center">{d.emoji}</span>
                    <div className="flex-1 min-w-0 leading-tight">
                      <div className="text-sm font-bold text-cyan-100">{d.name} <span className="text-xs text-cyan-300">{lvl}/{d.max}</span></div>
                      <div className="text-[11px] text-purple-200">{d.desc}</div>
                    </div>
                    <button disabled={!inHell || maxed || coals < cost} onClick={() => onFarmUpgrade(d.id)} className="btn-fantasy px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 shrink-0">
                      {maxed ? '🏆 МАКС' : `🔥 ${f(cost)}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

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
