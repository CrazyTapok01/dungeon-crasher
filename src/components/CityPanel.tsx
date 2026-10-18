import type { GameState } from '../game/reducer';
import type { useGame } from '../hooks/useGame';
import { BUILDINGS, CITY, MARKET, MISSIONS, RESEARCH, buildCost, cityCapHours, cityPending, cityRates, lv, missionChance, missionMult, researchCost, researchMult, shardGemCost, squadCount, squadPower } from '../game/worldsData';
import { useNow } from './useNow';
import { useFmt } from '../game/num';
import Tip from './Tip';

type Game = ReturnType<typeof useGame>;
const dur = (ms: number) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h > 0 ? `${h} ч ${m} мин` : m > 0 ? `${m} мин ${s} с` : `${s} с`;
};

/** «Ржавый город»: добыча по таймеру, отряды, исследования. Прогресс идёт и когда игра закрыта. */
export default function CityPanel({ state, game, onClose }: { state: GameState; game: Game; onClose: () => void }) {
  const now = useNow();
  const f = useFmt();
  const m = state.meta;
  const c = m.city;
  const can = m.maxFloor >= CITY.unlockFloor;
  return (
    <div className="fixed inset-0 z-[85] flex flex-col" style={{ background: 'linear-gradient(180deg,#2a1608 0%,#14100c 60%,#0a0807 100%)' }}>
      <div className="shrink-0 px-3 pt-3 pb-2 flex items-center gap-2 border-b border-orange-900/60" style={{ paddingTop: 'max(var(--sat, 0px), 12px)' }}>
        <button onClick={onClose} className="btn-fantasy px-3 py-1.5 rounded-lg text-sm font-bold">← Назад</button>
        <h2 className="flex-1 text-center text-lg font-black text-orange-300 text-stroke">🏙️ Ржавый город</h2>
        <span className="w-16" />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scroll-log">
        {!c.open ? (
          <div className="rounded-xl p-4 border border-orange-800/60 bg-black/40 text-center">
            <div className="text-5xl mb-2">🏙️</div>
            <p className="text-sm text-orange-100 mb-3 leading-snug">Заброшенный город машин. Здесь не бьют монстров: ты строишь базу, отправляешь отряды в вылазки и изучаешь технологии, которые навсегда усиливают героя во всех мирах. Всё работает, даже когда игра закрыта.</p>
            <button disabled={!can} onClick={game.cityOpen} className="btn-purple w-full py-2.5 rounded-xl font-black disabled:opacity-50">{can ? '🏙️ Основать город' : `🔒 Нужен этаж ${CITY.unlockFloor} (рекорд ${m.maxFloor})`}</button>
          </div>
        ) : (() => {
          const p = cityPending(c, now);
          const r = cityRates(c);
          const squads = squadCount(c);
          const power = squadPower(c, m.rebirths);
          return (
            <>
              <Tip id="city" text="Рудник и генератор копят металл и энергию, даже пока игра закрыта (но не дольше, чем вмещает склад). Строй здания, отправляй отряды в вылазки (нужна казарма) и изучай технологии в лаборатории за осколки." />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-black/40 border border-orange-900/50 py-2"><div className="text-base font-black text-orange-200">⛏️ {f(Math.floor(c.res.metal))}</div><div className="text-[10px] text-orange-400">металл · +{f(Math.round(r.metal))}/ч</div></div>
                <div className="rounded-lg bg-black/40 border border-orange-900/50 py-2"><div className="text-base font-black text-yellow-200">⚡ {f(Math.floor(c.res.energy))}</div><div className="text-[10px] text-orange-400">энергия · +{f(Math.round(r.energy))}/ч</div></div>
                <div className="rounded-lg bg-black/40 border border-orange-900/50 py-2"><div className="text-base font-black text-cyan-200">🔷 {f(Math.floor(c.res.shards))}</div><div className="text-[10px] text-orange-400">осколки{r.shards > 0 ? ` · +${r.shards.toFixed(1)}/ч` : ''}</div></div>
              </div>

              <div className="rounded-xl p-3 border border-orange-800/50 bg-black/30">
                <div className="flex justify-between text-xs text-orange-200 mb-1">
                  <span>Накоплено за {p.hours.toFixed(1)} ч из {cityCapHours(c)} ч{p.full ? ' — склад полон!' : ''}</span>
                  <span>⛏️ {f(Math.floor(p.metal))} · ⚡ {f(Math.floor(p.energy))}{p.shards >= 1 ? ` · 🔷 ${Math.floor(p.shards)}` : ''}</span>
                </div>
                <div className="h-2 bg-black/60 rounded-full overflow-hidden mb-2"><div className={`h-full ${p.full ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${(p.hours / cityCapHours(c)) * 100}%` }} /></div>
                <button onClick={game.cityCollect} className="btn-purple w-full py-2 rounded-lg text-sm font-black">📥 Собрать добычу</button>
              </div>

              <h3 className="text-sm font-black text-orange-300">🏗️ Здания</h3>
              <div className="space-y-1.5">
                {BUILDINGS.map(b => {
                  const L = lv(c, b.id);
                  const cost = buildCost(b, L);
                  const maxed = L >= b.max;
                  const ok = c.res.metal >= cost.metal && c.res.energy >= cost.energy;
                  return (
                    <div key={b.id} className="flex items-center gap-2 rounded-lg p-2 bg-black/30 border border-orange-900/50">
                      <span className="text-2xl w-9 text-center">{b.emoji}</span>
                      <div className="flex-1 min-w-0 leading-tight">
                        <div className="text-sm font-bold text-orange-100">{b.name} <span className="text-xs text-orange-400">ур. {L}/{b.max}</span></div>
                        <div className="text-[11px] text-orange-300/80">{b.desc}</div>
                      </div>
                      <button disabled={maxed || !ok} onClick={() => game.cityBuild(b.id)} className="btn-fantasy px-2 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50 shrink-0 text-right leading-tight">
                        {maxed ? '🏆 МАКС' : <>{L === 0 ? 'Построить' : 'Улучшить'}<br />⛏️{f(cost.metal)}{cost.energy ? ` ⚡${f(cost.energy)}` : ''}</>}
                      </button>
                    </div>
                  );
                })}
              </div>

              <h3 className="text-sm font-black text-orange-300">🪖 Вылазки <span className="text-xs text-orange-400 font-normal">отрядов: {c.missions.length}/{squads} · сила {f(Math.round(power))}</span></h3>
              {squads === 0 && <p className="text-xs text-orange-300/80">Построй казарму, чтобы собрать первый отряд.</p>}
              {c.missions.map((ms, i) => {
                const d = MISSIONS.find(x => x.id === ms.id)!;
                const left = ms.endAt - now;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-lg p-2 bg-orange-950/40 border border-orange-700/50">
                    <span className="text-2xl">{d.emoji}</span>
                    <div className="flex-1 text-xs"><div className="font-bold text-orange-100">{d.name}</div><div className="text-orange-300">{left > 0 ? `вернётся через ${dur(left)}` : 'отряд вернулся!'}</div></div>
                    <button disabled={left > 0} onClick={() => game.cityClaim(i)} className="btn-purple px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40">Забрать</button>
                  </div>
                );
              })}
              <div className="space-y-1.5">
                {MISSIONS.map(d => {
                  const locked = lv(c, 'barracks') < d.barracks;
                  const chance = Math.round(missionChance(d, c, m.rebirths) * 100);
                  const k = missionMult(c);
                  return (
                    <div key={d.id} className={`flex items-center gap-2 rounded-lg p-2 border ${locked ? 'bg-black/20 border-orange-950 opacity-60' : 'bg-black/30 border-orange-900/50'}`}>
                      <span className="text-2xl w-9 text-center">{d.emoji}</span>
                      <div className="flex-1 min-w-0 leading-tight">
                        <div className="text-sm font-bold text-orange-100">{d.name} <span className="text-[11px] text-orange-400">{dur(d.ms)}</span></div>
                        <div className="text-[11px] text-orange-300/90">⛏️{f(Math.round(d.metal * k))} ⚡{f(Math.round(d.energy * k))}{d.shards ? ` 🔷${d.shards}` : ''}{d.gem ? ` · 💎 ${Math.round(d.gem * 100)}%` : ''} · успех {chance}%</div>
                      </div>
                      <button disabled={locked || c.missions.length >= squads} onClick={() => game.cityMission(d.id)} className="btn-fantasy px-2 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 shrink-0">{locked ? `🔒 каз. ${d.barracks}` : 'Отправить'}</button>
                    </div>
                  );
                })}
              </div>

              <h3 className="text-sm font-black text-orange-300">🔬 Исследования <span className="text-xs text-orange-400 font-normal">навсегда, во всех мирах</span></h3>
              {lv(c, 'lab') < 1 ? <p className="text-xs text-orange-300/80">Построй лабораторию.</p> : (
                <div className="space-y-1.5">
                  {RESEARCH.map(d => {
                    const L = c.research[d.id] ?? 0;
                    const cost = researchCost(L);
                    const eff = (L * d.per * researchMult(c));
                    return (
                      <div key={d.id} className="flex items-center gap-2 rounded-lg p-2 bg-black/30 border border-cyan-900/50">
                        <span className="text-2xl w-9 text-center">{d.emoji}</span>
                        <div className="flex-1 min-w-0 leading-tight">
                          <div className="text-sm font-bold text-cyan-100">{d.name} <span className="text-xs text-cyan-300">{L}/{d.max}</span></div>
                          <div className="text-[11px] text-orange-300/90">Сейчас +{eff.toFixed(1)}% · за уровень +{(d.per * researchMult(c)).toFixed(1)}%</div>
                        </div>
                        <button disabled={L >= d.max || c.res.shards < cost} onClick={() => game.cityResearch(d.id)} className="btn-fantasy px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 shrink-0">{L >= d.max ? '🏆' : `🔷 ${cost}`}</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <h3 className="text-sm font-black text-orange-300">🏪 Рынок</h3>
              <div className="rounded-xl p-3 border border-orange-800/50 bg-black/30 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-xs text-orange-200 leading-tight">⛏️ {MARKET.lot} металла → {state.world === 'hell' ? '🔥' : '💰'} {f(MARKET.lot * MARKET.goldPerMetal(state.hero.floor))}<div className="text-[10px] text-orange-400">зависит от этажа текущего мира</div></div>
                  <button disabled={c.res.metal < MARKET.lot} onClick={() => game.citySell(1)} className="btn-fantasy px-2 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">Продать</button>
                  <button disabled={c.res.metal < MARKET.lot * 10} onClick={() => game.citySell(10)} className="btn-fantasy px-2 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">×10</button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-xs text-orange-200 leading-tight">🔷 {f(shardGemCost(c))} осколков → 💎 1<div className="text-[10px] text-orange-400">куплено {c.gemsBought}/{MARKET.gemMax}, цена растёт</div></div>
                  <button disabled={c.gemsBought >= MARKET.gemMax || c.res.shards < shardGemCost(c)} onClick={game.cityGem} className="btn-purple px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">Обменять</button>
                </div>
              </div>

              {c.report.length > 0 && (
                <div className="rounded-lg p-2 bg-black/30 border border-orange-950 text-[11px] text-orange-200/90 space-y-0.5">
                  <div className="font-bold text-orange-300">Последние события</div>
                  {c.report.map((t, i) => <div key={i}>{t}</div>)}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
