import { useState } from 'react';
import type { GameState } from '../game/reducer';
import type { Item } from '../types';
import type { useGame } from '../hooks/useGame';
import {
  COLL, COLL_REWARDS, DAILY_CHALLENGE, MAX_SOCKETS, RARITY_COLORS, RARITY_NAME, SETS, STONES, STONE_SHOP, STONE_TIERS, TOWER,
  bestiaryList, collectionList, collectionProgress, dailyModFor, dailyReward, parseStone, setBonusText, setCounts, soulsForFloor, stoneDesc,
  stoneKey, stoneName, todayKey, towerBoss, towerKeysNow, towerMech, towerReward,
} from '../gameData';
import { useNow } from './useNow';
import { useFmt } from '../game/num';
import Tip from './Tip';

type Game = ReturnType<typeof useGame>;
type Sub = 'tower' | 'daily' | 'coll' | 'stones' | 'sets' | 'run';
const SUBS: { id: Sub; icon: string; label: string }[] = [
  { id: 'tower', icon: '🗼', label: 'Башня' },
  { id: 'daily', icon: '🎯', label: 'Испытание' },
  { id: 'coll', icon: '📖', label: 'Коллекция' },
  { id: 'stones', icon: '💠', label: 'Камни' },
  { id: 'sets', icon: '🧩', label: 'Наборы' },
  { id: 'run', icon: '📊', label: 'Забег' },
];

const dur = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h > 0 ? `${h} ч ${m} мин` : m > 0 ? `${m} мин ${s} с` : `${s} с`;
};

/** Новые системы: Башня, испытание, коллекция, камни, наборы и статистика забега. */
export default function ExtrasPanel({ state, game }: { state: GameState; game: Game }) {
  const [sub, setSub] = useState<Sub>('tower');
  return (
    <div className="panel rounded-xl p-3 border-amber-500/40">
      <h2 className="text-lg font-black text-amber-300 mb-2 text-center text-stroke">🧭 Испытания и коллекции</h2>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {SUBS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`rounded-lg py-1.5 flex flex-col items-center text-[11px] font-bold border ${sub === t.id ? 'bg-purple-800/60 border-amber-400/70 text-amber-200' : 'bg-black/30 border-purple-900/60 text-purple-300'}`}>
            <span className="text-lg leading-none">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      {sub === 'tower' && <TowerView state={state} game={game} />}
      {sub === 'daily' && <DailyView state={state} game={game} />}
      {sub === 'coll' && <CollectionView state={state} game={game} />}
      {sub === 'stones' && <StonesView state={state} game={game} />}
      {sub === 'sets' && <SetsView state={state} />}
      {sub === 'run' && <RunView state={state} />}
    </div>
  );
}

// ───────────────────────── Башня ─────────────────────────

function TowerView({ state, game }: { state: GameState; game: Game }) {
  const now = useNow();
  const m = state.meta;
  const { keys, nextMs } = towerKeysNow(m, now);
  const next = m.tower.best + 1;
  const boss = towerBoss(next, m.maxFloor);
  const mech = towerMech(next);
  const r = towerReward(next);
  const away = state.world !== 'dungeon';
  return (
    <div>
      <Tip id="tower" text="Башня — бесконечная лестница боссов. Бой проходит сам: у каждого яруса своя механика, здоровье между боями восстанавливается лишь частично. Награда — только за НОВЫЙ рекорд яруса. Ключи копятся со временем." />
      <div className="grid grid-cols-2 gap-2 text-center mb-2">
        <div className="bg-black/40 rounded-lg py-2"><div className="text-xl font-black text-amber-200">{m.tower.best}</div><div className="text-[10px] text-purple-400">рекорд яруса</div></div>
        <div className="bg-black/40 rounded-lg py-2">
          <div className="text-xl font-black text-cyan-200">🗝️ {keys}/{TOWER.maxKeys}</div>
          <div className="text-[10px] text-purple-400">{nextMs > 0 ? `следующий через ${dur(nextMs)}` : 'ключи полны'}</div>
        </div>
      </div>
      <div className="rounded-lg p-2 bg-black/30 border border-purple-900/60 mb-2">
        <div className="text-xs text-purple-300 mb-1">Следующий ярус {next}</div>
        <div className="flex items-center gap-2">
          <span className="text-3xl">{boss.emoji}</span>
          <div className="min-w-0 text-xs">
            <div className="font-bold text-purple-100 truncate">{boss.name}</div>
            <div className="text-amber-300">{mech.emoji} {mech.name}: {mech.desc}</div>
          </div>
        </div>
        <div className="text-[11px] text-green-300 mt-1">Награда за рекорд: 👻 {r.souls}{r.gems ? ` · 💎 ${r.gems}` : ''}{r.stoneTier ? ` · 💠 камень (${STONE_TIERS[r.stoneTier - 1]})` : ''}</div>
      </div>
      <button disabled={keys <= 0 || away || state.isDead} onClick={game.towerRun} className="btn-purple w-full py-2.5 rounded-xl font-black disabled:opacity-50">
        {away ? '🔒 Только в Подземелье' : keys <= 0 ? '🔒 Нет ключей' : '🗼 Подняться по Башне (1 🗝️)'}
      </button>
    </div>
  );
}

// ───────────────────────── Ежедневное испытание ─────────────────────────

function DailyView({ state, game }: { state: GameState; game: Game }) {
  const day = todayKey();
  const mod = dailyModFor(day);
  const done = state.meta.challenge.last === day;
  const away = state.world !== 'dungeon';
  return (
    <div>
      <Tip id="daily" text="Раз в день — забег против 10 врагов с особым условием. Здоровье между боями не лечится. Чем больше побед, тем больше душ, кристаллов и камней." />
      <div className="rounded-lg p-2 bg-black/30 border border-amber-700/50 mb-2 flex items-center gap-2">
        <span className="text-3xl">{mod.emoji}</span>
        <div className="text-xs"><div className="font-bold text-amber-200">Сегодня: {mod.name}</div><div className="text-purple-200">{mod.desc}</div></div>
      </div>
      <div className="text-[11px] text-purple-300 mb-2 leading-snug">
        Награды: 3+ побед — камень; 5+ — 💎1; 8+ — 💎2; все {DAILY_CHALLENGE.foes} — 💎3. Души: {dailyReward(DAILY_CHALLENGE.foes, state.meta.rebirths).souls} за полный забег.
      </div>
      <button disabled={done || away || state.isDead} onClick={game.dailyRun} className="btn-purple w-full py-2.5 rounded-xl font-black disabled:opacity-50">
        {done ? `✓ Сегодня пройдено: ${state.meta.challenge.score}/${DAILY_CHALLENGE.foes}` : away ? '🔒 Только в Подземелье' : '🎯 Начать испытание'}
      </button>
    </div>
  );
}

// ───────────────────────── Бестиарий и коллекция ─────────────────────────

function CollectionView({ state, game }: { state: GameState; game: Game }) {
  const m = state.meta;
  const p = collectionProgress(m);
  const found = new Set(m.found);
  const bestiary = bestiaryList();
  const items = collectionList();
  return (
    <div>
      <Tip id="coll" text="Здесь отмечаются все монстры, которых ты победил, и все типы вещей, что находил (Secret-вещи дают бонус в 10 раз больше обычных). Заполнение коллекции даёт постоянный бонус к атаке и HP и награды." />
      <div className="text-center mb-2">
        <div className="text-sm font-bold text-amber-200">Заполнено {p.done}/{p.total} ({p.pct}%)</div>
        <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-purple-900/60 mt-1"><div className="h-full bg-gradient-to-r from-purple-500 to-amber-300" style={{ width: `${p.pct}%` }} /></div>
        <div className="text-[11px] text-green-300 mt-1">Бонус коллекции: +{p.bonus.toFixed(2).replace(/\.?0+$/, '')}% к атаке и HP (находка = +{COLL.perEntry}%, Secret = +{COLL.perSecret}%)</div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {COLL_REWARDS.map(r => {
          const got = m.collClaimed.includes(r.pct);
          const can = !got && p.pct >= r.pct;
          return (
            <button key={r.pct} disabled={!can} onClick={() => game.claimColl(r.pct)}
              className={`rounded-lg p-1.5 text-[11px] border text-left disabled:opacity-100 ${got ? 'bg-green-950/40 border-green-700/60 text-green-300' : can ? 'btn-fantasy' : 'bg-black/30 border-purple-900/60 text-purple-400'}`}>
              <b>{got ? '✓' : can ? '🎁' : '🔒'} {r.pct}%</b><br />💎{r.gems} 👻{r.souls}{r.stone ? ` 💠${STONE_TIERS[Number(r.stone.slice(-1)) - 1]}` : ''}
            </button>
          );
        })}
      </div>
      <h3 className="text-sm font-black text-purple-200 mb-1">👹 Бестиарий {p.monsters}/{p.monstersTotal}</h3>
      <div className="grid grid-cols-6 gap-1 mb-3">
        {bestiary.map(e => {
          const n = m.seen[e.key] ?? 0;
          return (
            <div key={e.key} title={n ? `${e.name}: ${n}` : '???'} className={`rounded-md aspect-square flex flex-col items-center justify-center border text-center ${n ? (e.world === 'hell' ? 'bg-red-950/50 border-red-700/60' : 'bg-purple-900/40 border-purple-500/50') : 'bg-black/40 border-purple-950'} ${e.boss ? 'ring-1 ring-amber-500/60' : ''}`}>
              <span className={`text-xl leading-none ${n ? '' : 'grayscale brightness-0 opacity-40'}`}>{e.emoji}</span>
              <span className="text-[8px] text-purple-300 leading-tight mt-0.5 px-0.5 truncate w-full">{n ? e.name : '???'}</span>
            </div>
          );
        })}
      </div>
      <h3 className="text-sm font-black text-purple-200 mb-1">🎒 Коллекция вещей</h3>
      <div className="grid grid-cols-3 gap-1">
        {items.map(e => {
          const ok = found.has(e.key);
          const c = e.rarity ? RARITY_COLORS[e.rarity] : null;
          return (
            <div key={e.key} className={`rounded-md p-1 text-center border text-[9px] leading-tight ${ok ? `${c ? `bg-gradient-to-br ${c.bg} ${c.border}` : 'bg-purple-900/40 border-purple-500/50'} ${e.rarity === 'secret' ? 'ring-1 ring-fuchsia-400' : ''}` : 'bg-black/40 border-purple-950 text-purple-500'}`}>
              <div className={`text-lg ${ok ? '' : 'grayscale brightness-0 opacity-40'}`}>{e.emoji}</div>
              <div className={ok ? (c?.text ?? 'text-purple-100') : ''}>{ok ? e.label : e.rarity === 'secret' ? '??? ???' : '???'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Камни и гнёзда ─────────────────────────

function StonesView({ state, game }: { state: GameState; game: Game }) {
  const m = state.meta;
  const stock = Object.keys(m.stones).filter(k => m.stones[k] > 0 && parseStone(k)).sort();
  const worn = (Object.values(state.equipped) as (Item | undefined)[]).filter((i): i is Item => !!i);
  const rows = [...worn.map(i => ({ item: i, worn: true })), ...state.inventory.filter(i => (i.sockets ?? 0) > 0).slice(0, 20).map(i => ({ item: i, worn: false }))];
  return (
    <div>
      <Tip id="stones" text="Камни вставляются в гнёзда вещей (у эпических и выше они бывают с рождения). Камни падают с боссов, особенно в Преисподней, и продаются за кристаллы. 3 одинаковых камня можно огранить в камень следующего качества. Вынуть камни можно бесплатно." />
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold text-cyan-200">💎 {m.gems}</div>
        <button disabled={m.gems < STONE_SHOP.cost} onClick={game.buyStone} className="btn-fantasy px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">Случайный камень · 💎 {STONE_SHOP.cost}</button>
      </div>
      <h3 className="text-sm font-black text-purple-200 mb-1">Запас камней</h3>
      {stock.length === 0 ? <p className="text-xs text-purple-400 mb-3">Пока пусто. Побеждай боссов — особенно в Преисподней.</p> : (
        <div className="space-y-1 mb-3">
          {stock.map(k => {
            const p = parseStone(k)!;
            return (
              <div key={k} className="flex items-center gap-2 rounded-lg px-2 py-1 bg-black/30 border border-cyan-900/50 text-xs">
                <div className="flex-1 min-w-0"><b className="text-cyan-100">{stoneName(k)}</b> ×{m.stones[k]}<div className="text-[10px] text-purple-300">{stoneDesc(k)}</div></div>
                {p.tier < 3 && <button disabled={m.stones[k] < STONE_SHOP.mergeNeed} onClick={() => game.mergeStone(k)} className="btn-fantasy px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40">Огранить {STONE_SHOP.mergeNeed}→1</button>}
              </div>
            );
          })}
        </div>
      )}
      <h3 className="text-sm font-black text-purple-200 mb-1">Вещи с гнёздами</h3>
      <div className="space-y-1.5">
        {rows.map(({ item, worn: w }) => {
          const c = RARITY_COLORS[item.rarity];
          const used = item.stones ?? [];
          const total = item.sockets ?? 0;
          return (
            <div key={item.id} className={`rounded-lg p-2 bg-gradient-to-br ${c.bg} border ${c.border}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.emoji}</span>
                <div className="flex-1 min-w-0"><div className={`text-xs font-bold truncate ${c.text}`}>{item.name}</div><div className="text-[10px] text-purple-300">{RARITY_NAME[item.rarity]}{w ? ' · надето' : ''}</div></div>
                <div className="flex gap-0.5">{Array.from({ length: total }, (_, i) => <span key={i} className="w-6 h-6 rounded-full bg-black/50 border border-cyan-700/60 flex items-center justify-center text-sm">{used[i] ? parseStone(used[i])!.def.emoji : '◦'}</span>)}</div>
              </div>
              {used.length > 0 && <div className="text-[10px] text-cyan-200 mt-1">{used.map(stoneDesc).join(' · ')}</div>}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {used.length < total && stock.map(k => <button key={k} onClick={() => game.socket(item.id, k)} className="btn-fantasy px-1.5 py-0.5 rounded text-[11px] font-bold">+{stoneName(k).slice(0, 2)}{parseStone(k)!.tier}</button>)}
                {used.length > 0 && <button onClick={() => game.unsocket(item.id)} className="px-1.5 py-0.5 rounded text-[11px] font-bold border border-purple-700 text-purple-300">Вынуть</button>}
                {total < MAX_SOCKETS && <button disabled={m.gems < STONE_SHOP.socketCost} onClick={() => game.addSocket(item.id)} className="btn-fantasy px-1.5 py-0.5 rounded text-[11px] font-bold disabled:opacity-40">Новое гнездо · 💎 {STONE_SHOP.socketCost}</button>}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-xs text-purple-400">Нет вещей. Надень предмет — и сможешь пробить в нём гнездо.</p>}
      </div>
      <div className="text-[10px] text-purple-400 mt-2 leading-snug">
        Виды: {STONES.map(s => `${s.emoji} ${s.name} — ${s.label}`).join('; ')}. Качество: {STONE_TIERS.map((t, i) => `${t} (${stoneKey(STONES[0].type, i + 1).slice(-1)})`).join(', ')}.
      </div>
    </div>
  );
}

// ───────────────────────── Наборы ─────────────────────────

function SetsView({ state }: { state: GameState }) {
  const counts = setCounts(state.equipped);
  const found = new Set(state.meta.found);
  return (
    <div>
      <Tip id="sets" text="Вещи из наборов выпадают начиная с редких. Две вещи одного набора дают малый бонус, три — большой. Иногда вещь поменьше по редкости с нужным набором лучше." />
      <div className="space-y-1.5">
        {SETS.map(st => {
          const n = counts[st.id] ?? 0;
          return (
            <div key={st.id} className={`rounded-lg p-2 border ${n >= 2 ? 'bg-amber-900/25 border-amber-500/60' : 'bg-black/30 border-purple-900/60'}`}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-purple-100">{st.emoji} {st.name}</div>
                <div className="text-xs font-bold text-amber-300">{n}/3 надето</div>
              </div>
              <div className="text-[10px] text-purple-300 mt-0.5">{(['weapon', 'armor', 'amulet'] as const).map(sl => `${found.has(`set:${st.id}:${sl}`) ? '✓' : '✗'} ${st.pieces[sl]}`).join(' · ')}</div>
              <div className={`text-[11px] mt-1 ${n >= 2 ? 'text-green-300' : 'text-purple-400'}`}>2 вещи: {setBonusText(st.two)}</div>
              <div className={`text-[11px] ${n >= 3 ? 'text-green-300' : 'text-purple-400'}`}>3 вещи: {setBonusText(st.three)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Статистика забега ─────────────────────────

function RunView({ state }: { state: GameState }) {
  const now = useNow();
  const f = useFmt();
  const r = state.meta.run;
  const ms = Math.max(1, now - r.start);
  const hours = ms / 3600000;
  const gain = soulsForFloor(state.world === 'dungeon' ? state.hero.floor : 1, state.meta.rebirths);
  const c = r.best ? RARITY_COLORS[r.best.rarity] : null;
  const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between text-xs py-1 border-b border-purple-900/40"><span className="text-purple-300">{k}</span><b className="text-amber-100">{v}</b></div>;
  return (
    <div>
      <Tip id="run" text="Статистика текущего забега в Подземелье: сбрасывается при перерождении. Помогает понять, когда выгоднее переродиться (смотри «души в час»)." />
      <Row k="⏱️ Время забега" v={dur(ms)} />
      <Row k="👻 Души при перерождении" v={`${gain}`} />
      <Row k="👻 Душ в час" v={f(Math.round((gain / Math.max(hours, 0.05)) * 10) / 10)} />
      <Row k="⚔️ Убито врагов" v={f(r.kills)} />
      <Row k="👑 Убито боссов" v={f(r.bosses)} />
      <Row k="💰 Золота в час" v={f(Math.round(r.gold / Math.max(hours, 0.05)))} />
      <Row k="⚔️ Врагов в минуту" v={(r.kills / (ms / 60000)).toFixed(1)} />
      <Row k="💥 Самый сильный удар" v={f(r.bestHit)} />
      <div className="mt-2 text-xs text-purple-300">Лучшая находка:</div>
      {r.best && c ? (
        <div className={`rounded-lg p-2 mt-1 flex items-center gap-2 bg-gradient-to-br ${c.bg} border ${c.border}`}>
          <span className="text-2xl">{r.best.emoji}</span>
          <div className="min-w-0"><div className={`text-sm font-bold truncate ${c.text}`}>{r.best.name}</div><div className="text-[10px] text-purple-200">{RARITY_NAME[r.best.rarity]}</div></div>
        </div>
      ) : <div className="text-xs text-purple-500 mt-1">пока ничего</div>}
    </div>
  );
}
