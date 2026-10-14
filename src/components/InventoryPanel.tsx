import type { ClassId, Equipment, Item, ItemSlot } from '../types';
import { RARITY_ORDER, itemScore, junkItems } from '../gameData';
import ItemCard from './ItemCard';
import PaperDoll from './PaperDoll';

interface Props {
  inventory: Item[];
  limit: number;
  equipped: Equipment;
  onEquip: (item: Item) => void;
  onSell: (item: Item) => void;
  onEquipBest: () => void;
  onSellJunk: () => void;
  gold: number;
  onEnhance: (slot: ItemSlot) => void;
  heroClass: ClassId | null;
}

const SLOTS: { key: ItemSlot; label: string; emoji: string }[] = [
  { key: 'weapon', label: 'Оружие', emoji: '⚔️' },
  { key: 'armor',  label: 'Доспех', emoji: '🛡️' },
  { key: 'amulet', label: 'Амулет', emoji: '📿' },
];

export default function InventoryPanel({ inventory, limit, equipped, onEquip, onSell, onEquipBest, onSellJunk, gold, onEnhance, heroClass }: Props) {
  // лучшие и редкие — сверху
  const sorted = [...inventory].sort((a, b) =>
    RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || itemScore(b) - itemScore(a));
  const junk = junkItems(inventory, equipped);
  const junkGold = junk.reduce((s, i) => s + i.price, 0);
  const hasUpgrade = SLOTS.some(({ key }) =>
    inventory.some(i => i.slot === key && (!equipped[key] || itemScore(i) > itemScore(equipped[key]!))));

  return (
    <div className="panel rounded-xl p-3">
      <h2 className="text-xl font-black text-amber-300 mb-3 text-center text-stroke">🎒 Инвентарь и экипировка</h2>

      <PaperDoll equipped={equipped} gold={gold} heroClass={heroClass} onEnhance={onEnhance} />

      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-purple-300">В сумке ({inventory.length}/{limit})</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={onEquipBest} disabled={!hasUpgrade} className="btn-purple py-2 rounded-lg text-xs font-bold">
          🧰 Надеть лучшее
        </button>
        <button onClick={onSellJunk} disabled={junk.length === 0} className="btn-fantasy py-2 rounded-lg text-xs font-bold">
          🧹 Продать хлам{junk.length > 0 ? ` (${junk.length} · +${junkGold})` : ''}
        </button>
      </div>

      {inventory.length === 0 ? (
        <div className="text-center text-purple-400/70 italic py-8 text-sm">Сумка пуста. Убивай монстров — они роняют экипировку!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sorted.map(item => (
            <ItemCard key={item.id} item={item} compareTo={equipped[item.slot]}
              onEquip={() => onEquip(item)} onSell={() => onSell(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
