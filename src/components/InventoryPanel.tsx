import type { Equipment, Item, ItemSlot } from '../types';
import { INVENTORY_LIMIT, RARITY_COLORS, RARITY_NAME } from '../gameData';

interface Props {
  inventory: Item[];
  equipped: Equipment;
  onEquip: (item: Item) => void;
  onSell: (item: Item) => void;
}

const SLOTS: { key: ItemSlot; label: string; emoji: string }[] = [
  { key: 'weapon', label: 'Оружие', emoji: '⚔️' },
  { key: 'armor',  label: 'Доспех', emoji: '🛡️' },
  { key: 'amulet', label: 'Амулет', emoji: '📿' },
];

function ItemCard({ item, equipped, onEquip, onSell }: {
  item: Item; equipped?: boolean; onEquip?: () => void; onSell?: () => void;
}) {
  const c = RARITY_COLORS[item.rarity];
  return (
    <div className={`p-2 rounded bg-gradient-to-br ${c.bg} border ${c.border} ${c.glow} shadow-md ${equipped ? 'ring-2 ring-amber-400' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="text-3xl bg-black/30 rounded w-10 h-10 flex items-center justify-center flex-shrink-0">
          {item.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-sm ${c.text} truncate`}>{item.name}</div>
          <div className={`text-[10px] uppercase tracking-wide ${c.text} opacity-80`}>{RARITY_NAME[item.rarity]}</div>
          <div className="text-xs text-purple-200 mt-0.5 flex flex-wrap gap-x-2">
            {item.atk ? <span className="text-red-300">⚔️ {item.atk}</span> : null}
            {item.def ? <span className="text-blue-300">🛡️ {item.def}</span> : null}
            {item.hp ? <span className="text-green-300">❤️ {item.hp}</span> : null}
          </div>
        </div>
      </div>
      {(onEquip || onSell) && (
        <div className="mt-2 flex gap-1">
          {onEquip && <button onClick={onEquip} className="btn-fantasy flex-1 py-1 rounded text-xs font-bold">Надеть</button>}
          {onSell && <button onClick={onSell} className="btn-fantasy flex-1 py-1 rounded text-xs font-bold">💰 {item.price}</button>}
        </div>
      )}
    </div>
  );
}

export default function InventoryPanel({ inventory, equipped, onEquip, onSell }: Props) {
  return (
    <div className="lg:col-span-3 panel rounded-lg p-4">
      <h2 className="text-2xl font-black text-amber-300 mb-3 text-center text-stroke">🎒 Инвентарь и экипировка</h2>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-purple-300 mb-2">Надетые вещи</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {SLOTS.map(slot => {
            const item = equipped[slot.key];
            return (
              <div key={slot.key}>
                <div className="text-xs text-purple-300 mb-1">{slot.emoji} {slot.label}</div>
                {item ? (
                  <ItemCard item={item} equipped />
                ) : (
                  <div className="p-2 rounded bg-black/30 border border-purple-800/50 text-purple-400/60 text-center text-sm h-24 flex items-center justify-center italic">
                    Пусто
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <h3 className="text-lg font-bold text-purple-300 mb-2">В сумке ({inventory.length}/{INVENTORY_LIMIT})</h3>
      {inventory.length === 0 ? (
        <div className="text-center text-purple-400/70 italic py-8">
          Твоя сумка пуста. Убивай монстров — они роняют экипировку!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {inventory.map(item => (
            <ItemCard key={item.id} item={item}
              onEquip={() => onEquip(item)}
              onSell={() => onSell(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
