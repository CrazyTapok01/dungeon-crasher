import { memo } from 'react';
import type { Meta } from '../types';
import { SOUL_SHOP, soulUpLevel, soulUpgradeCost, soulsAvailable } from '../gameData';
import { useFmt } from '../game/num';

/** Лавка душ: души можно тратить на постоянные улучшения (бонус «за душу» от этого не уменьшается). */
function SoulShopPanel({ meta, onBuy }: { meta: Meta; onBuy: (id: string) => void }) {
  const f = useFmt();
  return (
    <div className="panel rounded-xl p-3 border-purple-400/40">
      <h2 className="text-lg font-black text-purple-200 mb-0.5 text-center text-stroke">👻 Лавка душ</h2>
      <p className="text-center text-xs text-purple-300/80 mb-2 leading-snug">
        Тратьте души на вечные улучшения. Бонус «за каждую душу» считается от всех заработанных душ, так что покупки его не уменьшают. Не сбрасывается перерождением.
      </p>
      <div className="text-center text-xl font-black text-purple-200 mb-2">👻 {f(soulsAvailable(meta))} <span className="text-xs text-purple-400 font-bold">доступно</span></div>
      <div className="space-y-1.5">
        {SOUL_SHOP.map(d => {
          const lvl = soulUpLevel(meta.soulUps, d.id);
          const maxed = lvl >= d.max;
          const cost = soulUpgradeCost(d, lvl);
          return (
            <div key={d.id} className="flex items-center gap-2 rounded-lg p-2 bg-black/30 border border-purple-800/60">
              <span className="text-2xl w-9 text-center">{d.emoji}</span>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-sm font-bold text-purple-100">{d.name} <span className="text-xs text-purple-300">{lvl}/{d.max}</span></div>
                <div className="text-[11px] text-purple-200">{d.desc}</div>
              </div>
              <button disabled={maxed || soulsAvailable(meta) < cost} onClick={() => onBuy(d.id)} className="btn-fantasy px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 shrink-0">
                {maxed ? '🏆 МАКС' : `👻 ${f(cost)}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default memo(SoulShopPanel);
