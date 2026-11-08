import { useEffect, useState } from 'react';
import type { GameState } from '../game/reducer';
import type { useGame } from '../hooks/useGame';
import {
  GOODS, ISLANDS, SEA, SELL_RATE, SHIP_MAX, SHIP_PARTS, cargoCount, cargoMax, crewSkill, cannonDmg, foodMax, goodPrice, hullMax, island, neighbors, sailSpeed,
  shipCost, voyageFood, voyageMs,
} from '../game/worldsData';
import { useNow } from './useNow';
import { useFmt } from '../game/num';
import Tip from './Tip';

type Game = ReturnType<typeof useGame>;
const dur = (ms: number) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h > 0 ? `${h} ч ${m} мин` : m > 0 ? `${m} мин ${s} с` : `${s} с`;
};
const TYPE_NAME = { port: 'Порт', treasure: 'Сокровища', wreck: 'Обломки', lair: 'Логово' } as const;

/** «Бездонное море»: карта островов, плавание по таймеру, торговля и левиафаны. */
export default function SeaPanel({ state, game, onClose }: { state: GameState; game: Game; onClose: () => void }) {
  const now = useNow();
  const f = useFmt();
  const m = state.meta;
  const sea = m.sea;
  const [sel, setSel] = useState<string>(sea.at);
  const v = sea.voyage;

  // Корабль добрался — засчитываем прибытие
  useEffect(() => { if (v && v.endAt <= now) game.seaArrive(); }, [v, now, game]);

  const can = m.maxFloor >= SEA.unlockFloor;
  const petLevels = Object.values(m.pets).reduce((a, b) => a + b, 0);
  const sh = island(sel);
  const here = island(sea.at);
  const adj = !v && neighbors(sea.at).includes(sel) && sea.seen.includes(sel);
  const hullPct = Math.round((sea.hull / hullMax(sea)) * 100);

  // положение корабля на карте (во время плавания — между островами)
  let sx = here.x, sy = here.y;
  if (v) {
    const a = island(v.from), b = island(v.to);
    const total = voyageMs(v.from, v.to, sea);
    const k = Math.min(1, Math.max(0, 1 - (v.endAt - now) / total));
    sx = a.x + (b.x - a.x) * k; sy = a.y + (b.y - a.y) * k;
  }

  return (
    <div className="fixed inset-0 z-[85] flex flex-col" style={{ background: 'linear-gradient(180deg,#04223a 0%,#06324f 50%,#021320 100%)' }}>
      <div className="shrink-0 px-3 pt-3 pb-2 flex items-center gap-2 border-b border-cyan-900/60">
        <button onClick={onClose} className="btn-fantasy px-3 py-1.5 rounded-lg text-sm font-bold">← Назад</button>
        <h2 className="flex-1 text-center text-lg font-black text-cyan-200 text-stroke">🌊 Бездонное море</h2>
        <span className="w-16" />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scroll-log">
        {!sea.open ? (
          <div className="rounded-xl p-4 border border-cyan-800/60 bg-black/30 text-center">
            <div className="text-5xl mb-2">🌊</div>
            <p className="text-sm text-cyan-100 mb-3 leading-snug">Океан островов. Здесь нет этажей и монстров по очереди: ты плывёшь по карте, раскапываешь клады, торгуешь между портами и сражаешься с левиафанами. Плавание идёт по таймеру, даже когда игра закрыта. Прокачка корабля усиливает героя во всех мирах.</p>
            <button disabled={!can} onClick={game.seaOpen} className="btn-purple w-full py-2.5 rounded-xl font-black disabled:opacity-50">{can ? '⛵ Спустить корабль' : `🔒 Нужен этаж ${SEA.unlockFloor} (рекорд ${m.maxFloor})`}</button>
          </div>
        ) : (
          <>
            <Tip id="sea" text="Нажимай на острова на карте. Плыть можно только к соседним открытым островам: нужен провиант 🍖. В портах покупают провиант, чинят корабль и торгуют (купи дёшево в одном порту, продай дороже в другом). На островах — раскопки и обломки, в логовах — левиафаны. Монеты 🪙 и жемчуг 🐚 тратятся на корабль." />
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="rounded-lg bg-black/40 border border-cyan-900/50 py-1.5"><div className="text-sm font-black text-yellow-200">🪙 {f(sea.coin)}</div><div className="text-[9px] text-cyan-400">дублоны</div></div>
              <div className="rounded-lg bg-black/40 border border-cyan-900/50 py-1.5"><div className="text-sm font-black text-pink-200">🐚 {sea.pearls}</div><div className="text-[9px] text-cyan-400">жемчуг</div></div>
              <div className="rounded-lg bg-black/40 border border-cyan-900/50 py-1.5"><div className="text-sm font-black text-green-200">🍖 {sea.food}</div><div className="text-[9px] text-cyan-400">из {foodMax(sea)}</div></div>
              <div className="rounded-lg bg-black/40 border border-cyan-900/50 py-1.5"><div className={`text-sm font-black ${hullPct < 35 ? 'text-red-300' : 'text-sky-200'}`}>🛶 {hullPct}%</div><div className="text-[9px] text-cyan-400">корпус</div></div>
            </div>

            {/* карта */}
            <div className="rounded-xl border border-cyan-800/60 overflow-hidden bg-[#031a2c]">
              <svg viewBox="0 0 100 100" className="w-full" style={{ aspectRatio: '1 / 1.05' }}>
                {ISLANDS.flatMap(a => a.links.map(b => [a, island(b)] as const)).filter(([a, b]) => sea.seen.includes(a.id) && sea.seen.includes(b.id)).map(([a, b]) => (
                  <line key={a.id + b.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
                ))}
                {ISLANDS.map(i => {
                  const seen = sea.seen.includes(i.id);
                  if (!seen) return null;
                  const visited = sea.visited.includes(i.id);
                  const cd = (sea.cd[i.id] ?? 0) > now;
                  return (
                    <g key={i.id} onClick={() => setSel(i.id)} style={{ cursor: 'pointer' }}>
                      <circle cx={i.x} cy={i.y} r={sel === i.id ? 6.4 : 5.4} fill={visited ? '#0c4a6e' : '#082f49'} stroke={sel === i.id ? '#fbbf24' : i.type === 'lair' ? '#f87171' : '#38bdf8'} strokeWidth={sel === i.id ? 1 : 0.6} opacity={cd ? 0.6 : 1} />
                      <text x={i.x} y={i.y + 2.4} fontSize="7" textAnchor="middle">{visited ? i.emoji : '❓'}</text>
                    </g>
                  );
                })}
                <text x={sx} y={sy - 5} fontSize="7" textAnchor="middle">⛵</text>
              </svg>
            </div>

            {v && (
              <div className="rounded-lg p-2 bg-cyan-950/60 border border-cyan-600/50 text-xs text-cyan-100 text-center">
                ⛵ В пути к «{island(v.to).name}»: {v.endAt > now ? `осталось ${dur(v.endAt - now)}` : 'прибываем…'}
              </div>
            )}

            {/* выбранный остров */}
            <div className="rounded-xl p-3 border border-cyan-800/60 bg-black/30">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{sea.visited.includes(sh.id) ? sh.emoji : '❓'}</span>
                <div className="flex-1 leading-tight">
                  <div className="font-black text-cyan-100">{sea.visited.includes(sh.id) ? sh.name : 'Неизведанный остров'}</div>
                  <div className="text-[11px] text-cyan-300">{sea.visited.includes(sh.id) ? `${TYPE_NAME[sh.type]} · уровень опасности ${sh.tier}` : 'Доплыви, чтобы узнать'}{sea.at === sh.id ? ' · ты здесь' : ''}</div>
                </div>
              </div>
              {adj && (
                <button disabled={sea.food < voyageFood(sea.at, sh.id) || sea.hull <= 0} onClick={() => game.seaSail(sh.id)} className="btn-purple w-full mt-2 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
                  ⛵ Плыть · {dur(voyageMs(sea.at, sh.id, sea))} · 🍖 {voyageFood(sea.at, sh.id)}{sea.food < voyageFood(sea.at, sh.id) ? ' (не хватает)' : ''}
                </button>
              )}
              {sea.at === sh.id && !v && sh.type !== 'port' && (() => {
                const left = (sea.cd[sh.id] ?? 0) - now;
                const label = sh.type === 'treasure' ? '⛏️ Раскопки' : sh.type === 'wreck' ? '🔍 Обыскать обломки' : `⚔️ Сразиться: ${sh.lair?.name} (HP ${f(sh.lair?.hp ?? 0)}, урон ${sh.lair?.atk})`;
                return (
                  <button disabled={left > 0} onClick={game.seaAct} className="btn-purple w-full mt-2 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
                    {left > 0 ? `⏳ Остров восстановится через ${dur(left)}` : label}
                  </button>
                );
              })()}
              {sea.at === sh.id && !v && sh.type === 'lair' && <div className="text-[10px] text-cyan-300/80 mt-1">Твой корабль: урон за раунд {cannonDmg(sea, petLevels)}, корпус {sea.hull}/{hullMax(sea)}. Побед: {sea.lairs[sh.id] ?? 0}. Первая победа даёт трофей и 💎2.</div>}
            </div>

            {/* порт */}
            {sea.at === here.id && !v && here.type === 'port' && (
              <div className="rounded-xl p-3 border border-yellow-800/50 bg-black/30 space-y-2">
                <h3 className="text-sm font-black text-yellow-200">⚓ {here.name}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={sea.food >= foodMax(sea) || sea.coin < SEA.foodPrice} onClick={() => game.seaFood(10)} className="btn-fantasy py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">🍖 +10 · 🪙 {SEA.foodPrice * 10}</button>
                  <button disabled={sea.hull >= hullMax(sea) || sea.coin < 1} onClick={game.seaRepair} className="btn-fantasy py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">🔧 Починить корпус</button>
                </div>
                <div className="text-[11px] text-cyan-300">Груз: {cargoCount(sea)}/{cargoMax(sea)}. Цены меняются каждые 3 часа и различаются по портам.</div>
                {GOODS.map(g => {
                  const price = goodPrice(here.id, g.id, now);
                  const have = sea.goods[g.id] ?? 0;
                  return (
                    <div key={g.id} className="flex items-center gap-1.5 text-xs">
                      <span className="text-xl w-7">{g.emoji}</span>
                      <div className="flex-1 leading-tight"><b className="text-cyan-100">{g.name}</b> <span className="text-cyan-400">в трюме: {have}</span><div className="text-[10px] text-yellow-200">купить 🪙{price} · продать 🪙{Math.floor(price * SELL_RATE)}</div></div>
                      <button disabled={sea.coin < price} onClick={() => game.seaTrade(g.id, 1)} className="btn-fantasy px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40">+1</button>
                      <button disabled={sea.coin < price * 10} onClick={() => game.seaTrade(g.id, 10)} className="btn-fantasy px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40">+10</button>
                      <button disabled={have < 1} onClick={() => game.seaTrade(g.id, -have)} className="btn-purple px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40">Всё</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* корабль */}
            <h3 className="text-sm font-black text-cyan-200">🚢 Корабль <span className="text-xs text-cyan-400 font-normal">скорость ×{sailSpeed(sea).toFixed(2)} · удача команды {Math.round(crewSkill(sea, petLevels) * 100)}%</span></h3>
            <div className="space-y-1.5">
              {SHIP_PARTS.map(p => {
                const L = sea.ship[p.id] ?? 1;
                const c = shipCost(p.base, L);
                const max = L >= SHIP_MAX;
                return (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg p-2 bg-black/30 border border-cyan-900/50">
                    <span className="text-2xl w-9 text-center">{p.emoji}</span>
                    <div className="flex-1 min-w-0 leading-tight"><div className="text-sm font-bold text-cyan-100">{p.name} <span className="text-xs text-cyan-400">{L}/{SHIP_MAX}</span></div><div className="text-[11px] text-cyan-300/80">{p.desc}</div></div>
                    <button disabled={max || sea.coin < c.coin || sea.pearls < c.pearls || !!v} onClick={() => game.seaUp(p.id)} className="btn-fantasy px-2 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50 shrink-0">{max ? '🏆' : `🪙${f(c.coin)}${c.pearls ? ` 🐚${c.pearls}` : ''}`}</button>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-cyan-300/80 leading-snug">Усиление корабля даёт герою всех миров постоянный бонус к атаке и HP, а победы над левиафанами — ещё +3% за каждого.</div>

            {sea.report.length > 0 && (
              <div className="rounded-lg p-2 bg-black/30 border border-cyan-950 text-[11px] text-cyan-100/90 space-y-0.5">
                <div className="font-bold text-cyan-300">Журнал</div>
                {sea.report.map((t, i) => <div key={i}>{t}</div>)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
