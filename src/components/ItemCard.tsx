import type { Equipment, Item } from '../types';
import { useFmt } from '../game/num';
import { useCoin, useFloor } from './coin';
import { ENHANCE, setCounts, parseStone, setDef, stoneDesc, setBonusText, RARITY_COLORS, RARITY_NAME, enhanceChance, enhanceCost, enhanced, itemScore, sellPrice } from '../gameData';

interface Props {
  item: Item;
  compareTo?: Item;      // что надето в этом слоте — для сравнения
  equipped?: boolean;
  gold?: number;
  onEnhance?: () => void;
  onEquip?: () => void;
  onSell?: () => void;
  equippedAll?: Equipment;                // всё надетое — для подсказки о наборах
  stock?: Record<string, number>;         // камни в запасе
  onSocket?: (key: string) => void;       // вставить камень
}

/** Строка бонусов предмета: «⚔️ 12 · 🛡️ 4 · ⚡ +3% крита …» */
function Stats({ item }: { item: Item }) {
  const f = useFmt();
  const parts: [string, string, string][] = [];
  if (item.atk) parts.push(['⚔️', f(item.atk), 'text-red-300']);
  if (item.def) parts.push(['🛡️', f(item.def), 'text-blue-300']);
  if (item.hp) parts.push(['❤️', f(item.hp), 'text-green-300']);
  if (item.crit) parts.push(['⚡', `+${item.crit}% крит`, 'text-yellow-300']);
  if (item.critdmg) parts.push(['💥', `+${item.critdmg}% крит.урон`, 'text-orange-300']);
  if (item.dodge) parts.push(['💨', `+${item.dodge}% уклон.`, 'text-sky-300']);
  if (item.vamp) parts.push(['🩸', `+${item.vamp}% вампир.`, 'text-rose-300']);
  return (
    <div className="text-xs mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
      {parts.map(([icon, text, cls]) => <span key={icon} className={cls}>{icon} {text}</span>)}
    </div>
  );
}

export default function ItemCard({ item: raw, compareTo, equipped, onEquip, onSell, gold = 0, onEnhance, equippedAll, stock, onSocket }: Props) {
  const coin = useCoin();
  const f = useFmt();
  const floor = useFloor();
  const item = enhanced(raw);
  const plus = raw.plus ?? 0;
  const c = RARITY_COLORS[item.rarity];
  const diff = onEquip ? Math.round(itemScore(item) - (compareTo ? itemScore(compareTo) : 0)) : 0;
  return (
    <div className={`relative p-2 rounded-lg bg-gradient-to-br ${c.bg} border ${c.border} ${c.glow} shadow-md ${equipped ? 'ring-2 ring-amber-400' : ''}`}>
      {onEquip && diff !== 0 && (
        <div className={`absolute -top-2 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded-full border ${diff > 0 ? 'bg-green-900 text-green-300 border-green-500' : 'bg-red-950 text-red-300 border-red-700'}`}>
          {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="text-3xl bg-black/30 rounded-lg w-11 h-11 flex items-center justify-center shrink-0">{item.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm ${c.text} truncate`}>{item.name}{plus > 0 && <span className="text-amber-300"> +{plus}</span>}</div>
          <div className={`text-[10px] uppercase tracking-wide ${c.text} opacity-80`}>{RARITY_NAME[item.rarity]}</div>
          <Stats item={item} />
          {item.set && (() => { const d = setDef(item.set); return d ? <div className="text-[10px] text-amber-300 mt-0.5 leading-tight">{d.emoji} Набор «{d.name}»: 2 — {setBonusText(d.two)}; 3 — {setBonusText(d.three)}</div> : null; })()}
          {(item.sockets ?? 0) > 0 && (
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-cyan-200">
              {Array.from({ length: item.sockets ?? 0 }, (_, i) => <span key={i} className="w-4 h-4 rounded-full bg-black/50 border border-cyan-700/60 flex items-center justify-center">{item.stones?.[i] ? parseStone(item.stones[i])?.def.emoji : '◦'}</span>)}
              {(item.stones?.length ?? 0) > 0 && <span className="truncate">{item.stones!.map(stoneDesc).join(' · ')}</span>}
            </div>
          )}
        </div>
      </div>
      {onEquip && equippedAll && (() => {
        const cnt = setCounts(equippedAll);
        const gain = item.set && compareTo?.set !== item.set ? (cnt[item.set] ?? 0) + 1 : 0;
        const loss = compareTo?.set && compareTo.set !== item.set ? cnt[compareTo.set] ?? 0 : 0;
        const a = gain >= 2 ? `🧩 С этой вещью набор «${setDef(item.set)?.name}» будет ${gain}/3` : '';
        const b = loss >= 2 ? `⚠️ Потеряешь бонус набора «${setDef(compareTo?.set)?.name}» (${loss}/3)` : '';
        return (a || b) ? <div className="mt-1 text-[10px] font-bold leading-tight">{a && <div className="text-green-300">{a}</div>}{b && <div className="text-red-300">{b}</div>}</div> : null;
      })()}
      {onSocket && stock && (item.sockets ?? 0) > (item.stones?.length ?? 0) && Object.keys(stock).some(k => stock[k] > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1 items-center text-[10px] text-cyan-200">💠 Вставить:
          {Object.keys(stock).filter(k => stock[k] > 0 && parseStone(k)).sort().map(k => (
            <button key={k} onClick={() => onSocket(k)} className="btn-fantasy px-1.5 py-0.5 rounded font-bold">{parseStone(k)!.def.emoji}{parseStone(k)!.tier} ×{stock[k]}</button>
          ))}
        </div>
      )}
      {onEnhance && (
        plus >= ENHANCE.max
          ? <div className="mt-2 text-center text-[11px] font-bold text-amber-300">⚒️ Максимальная заточка</div>
          : <button onClick={onEnhance} disabled={gold < enhanceCost(raw, floor)}
              className="btn-fantasy w-full mt-2 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
              ⚒️ Заточить +{plus + 1} · {Math.round(enhanceChance(plus) * 100)}% · {coin} {f(enhanceCost(raw, floor))}
            </button>
      )}
      {(onEquip || onSell) && (
        <div className="mt-2 flex gap-1.5">
          {onEquip && <button onClick={onEquip} className="btn-fantasy flex-1 py-1.5 rounded-lg text-xs font-bold">Надеть</button>}
          {onSell && <button onClick={onSell} className="btn-fantasy flex-1 py-1.5 rounded-lg text-xs font-bold">{coin} {f(sellPrice(raw))}</button>}
        </div>
      )}
    </div>
  );
}
