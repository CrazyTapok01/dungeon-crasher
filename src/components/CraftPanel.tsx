import type { Item, ItemSlot } from '../types';
import { CRAFT_RECIPES, RARITY_NAME, craftGroups } from '../gameData';
import type { Rarity } from '../types';
import ItemCard from './ItemCard';

interface Props {
  inventory: Item[];
  limit: number;
  onCraft: (slot: ItemSlot, from: Rarity) => void;
}

const SLOT: Record<ItemSlot, string> = { weapon: '⚔️ Оружие', armor: '🛡️ Доспех', amulet: '📿 Амулет' };
const RARITY_TEXT: Partial<Record<Rarity, string>> = { common: 'обычных', uncommon: 'необычных' };

/** Крафт: две вещи одного слота и качества → одна вещь следующего качества. */
export default function CraftPanel({ inventory, limit, onCraft }: Props) {
  const groups = craftGroups(inventory);
  const full = inventory.length - 1 >= limit; // две вещи уходят, одна приходит — место нужно только если сумка переполнена
  return (
    <div className="space-y-3">
      <div className="panel rounded-xl p-3">
        <h2 className="text-xl font-black text-amber-300 text-center text-stroke mb-1">🔨 Крафт</h2>
        <p className="text-xs text-purple-300 text-center leading-snug mb-2">
          Две вещи одного слота и качества сплавляются в одну вещь следующего качества. В переплавку идут две самые слабые из подходящих (заточенные вещи не берутся).
        </p>
        <div className="space-y-1.5">
          {CRAFT_RECIPES.map(r => (
            <div key={r.from} className="rounded-lg bg-black/35 border border-purple-700/40 px-3 py-2 text-sm text-purple-100 text-center">
              2 × <b className="text-amber-200">{RARITY_NAME[r.from]}</b> → 1 × <b className="text-amber-200">{RARITY_NAME[r.to]}</b>
            </div>
          ))}
        </div>
      </div>

      {CRAFT_RECIPES.map(rec => (
        <div key={rec.from} className="panel rounded-xl p-3">
          <h3 className="text-sm font-bold text-purple-200 mb-2">
            {RARITY_NAME[rec.from]} → {RARITY_NAME[rec.to]}
          </h3>
          <div className="space-y-2">
            {groups.filter(g => g.from === rec.from).map(g => {
              const can = g.count >= 2 && !full;
              return (
                <div key={g.slot} className="rounded-lg bg-black/30 border border-purple-800/50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-purple-100">{SLOT[g.slot]}</div>
                    <div className={`text-xs font-bold ${g.count >= 2 ? 'text-green-300' : 'text-red-300'}`}>
                      {RARITY_TEXT[rec.from]}: {g.count} / 2
                    </div>
                    <button disabled={!can} onClick={() => onCraft(g.slot, rec.from)}
                      className="btn-fantasy px-3 py-1.5 rounded-lg text-xs font-black disabled:opacity-40">
                      🔨 Скрафтить
                    </button>
                  </div>
                  {g.count >= 2 && (
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {g.pair.map(i => <ItemCard key={i.id} item={i} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
