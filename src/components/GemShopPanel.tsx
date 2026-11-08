import { memo } from 'react';
import type { Meta } from '../types';
import { GEM, GEM_SHOP, HELL, gemLevel, gemUpgradeCost } from '../gameData';

/** Кристаллы бездны: редкая валюта и постоянные покупки для обоих миров. */
function GemShopPanel({ meta, onBuy }: { meta: Meta; onBuy: (id: string) => void }) {
  return (
    <div className="panel rounded-xl p-3 border-cyan-500/40">
      <h2 className="text-lg font-black text-cyan-200 mb-0.5 text-center text-stroke">💎 Кристаллы бездны</h2>
      <p className="text-center text-xs text-purple-300/80 mb-2 leading-snug">
        Очень редкие: с боссов от {GEM.minBossFloor}-го этажа (шанс {Math.round(GEM.bossChance * 100)}%, в Преисподней {Math.round(HELL.gemBossChance * 100)}%)
        и за новый рекорд на каждом {GEM.everyFloors}-м этаже ({HELL.gemEveryFloors}-м в Преисподней). Улучшения вечные и работают в обоих мирах.
      </p>
      <div className="text-center text-2xl font-black text-cyan-300 mb-2">💎 {meta.gems}</div>
      <div className="space-y-1.5">
        {GEM_SHOP.map(d => {
          const lvl = gemLevel(meta.gemUps, d.id);
          const maxed = lvl >= d.max;
          const cost = gemUpgradeCost(d, lvl);
          return (
            <div key={d.id} className="flex items-center gap-2 rounded-lg p-2 bg-black/30 border border-cyan-900/60">
              <span className="text-2xl w-9 text-center">{d.emoji}</span>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-sm font-bold text-cyan-100">{d.name} <span className="text-xs text-cyan-300">{lvl}/{d.max}</span></div>
                <div className="text-[11px] text-purple-200">{d.desc}</div>
              </div>
              <button disabled={maxed || meta.gems < cost} onClick={() => onBuy(d.id)} className="btn-fantasy px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 shrink-0">
                {maxed ? '🏆 МАКС' : `💎 ${cost}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default memo(GemShopPanel);
