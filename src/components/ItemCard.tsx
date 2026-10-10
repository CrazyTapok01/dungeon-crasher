import type { Item } from '../types';
import { RARITY_COLORS, RARITY_NAME, itemScore } from '../gameData';

interface Props {
  item: Item;
  compareTo?: Item;      // что надето в этом слоте — для сравнения
  equipped?: boolean;
  onEquip?: () => void;
  onSell?: () => void;
}

/** Строка бонусов предмета: «⚔️ 12 · 🛡️ 4 · ⚡ +3% крита …» */
function Stats({ item }: { item: Item }) {
  const parts: [string, string, string][] = [];
  if (item.atk) parts.push(['⚔️', `${item.atk}`, 'text-red-300']);
  if (item.def) parts.push(['🛡️', `${item.def}`, 'text-blue-300']);
  if (item.hp) parts.push(['❤️', `${item.hp}`, 'text-green-300']);
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

export default function ItemCard({ item, compareTo, equipped, onEquip, onSell }: Props) {
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
          <div className={`font-bold text-sm ${c.text} truncate`}>{item.name}</div>
          <div className={`text-[10px] uppercase tracking-wide ${c.text} opacity-80`}>{RARITY_NAME[item.rarity]}</div>
          <Stats item={item} />
        </div>
      </div>
      {(onEquip || onSell) && (
        <div className="mt-2 flex gap-1.5">
          {onEquip && <button onClick={onEquip} className="btn-fantasy flex-1 py-1.5 rounded-lg text-xs font-bold">Надеть</button>}
          {onSell && <button onClick={onSell} className="btn-fantasy flex-1 py-1.5 rounded-lg text-xs font-bold">💰 {item.price}</button>}
        </div>
      )}
    </div>
  );
}
