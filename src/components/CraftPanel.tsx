import type { Item, ItemSlot, Rarity } from '../types';
import { CRAFT_RECIPES, RARITY_COLORS, RARITY_NAME, craftGoldCost, craftGroups } from '../gameData';
import { useFmt } from '../game/num';
import { useCoin, useFloor } from './coin';
import ItemCard from './ItemCard';

interface Props {
  inventory: Item[];
  limit: number;
  gold: number;
  onCraft: (slot: ItemSlot, from: Rarity) => void;
}

const SLOT: Record<ItemSlot, string> = { weapon: '⚔️ Оружие', armor: '🛡️ Доспех', amulet: '📿 Амулет' };

/** Крафт: несколько вещей одного слота и качества → одна вещь следующего качества (лучший показатель из материалов +5%). */
export default function CraftPanel({ inventory, limit, gold, onCraft }: Props) {
  const f = useFmt();
  const coin = useCoin();
  const floor = useFloor();
  const groups = craftGroups(inventory);
  return (
    <div className="space-y-3">
      <div className="panel rounded-xl p-3">
        <h2 className="text-xl font-black text-amber-300 text-center text-stroke mb-1">🔨 Крафт</h2>
        <p className="text-xs text-purple-300 text-center leading-snug mb-2">
          Вещи одного слота и качества сплавляются в одну вещь следующего качества. Результат берёт <b>лучший показатель из материалов</b> и усиливает его (+5% сверх качества), а ещё получает новые случайные бонусы.
          В переплавку идут самые слабые из подходящих (заточенные не берутся). Высшие рецепты стоят золота и могут сорваться: тогда сгорают все материалы, кроме лучшего.
        </p>
        <div className="space-y-1.5">
          {CRAFT_RECIPES.map(r => (
            <div key={r.from} className="rounded-lg bg-black/35 border border-purple-700/40 px-3 py-1.5 text-sm text-purple-100 text-center">
              {r.need} × <b className={RARITY_COLORS[r.from].text}>{RARITY_NAME[r.from]}</b> → 1 × <b className={RARITY_COLORS[r.to].text}>{RARITY_NAME[r.to]}</b>
              <span className="text-[11px] text-purple-300"> · {r.chance < 1 ? `шанс ${Math.round(r.chance * 100)}%` : 'успех 100%'}{r.gold ? ` · ${coin} ${f(craftGoldCost(r, floor))}` : ''}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-cyan-200/90 text-center mt-2 leading-snug">
          ✨ Божественные вещи не крафтятся: они только очень редко выпадают (чаще всего с боссов).
        </p>
      </div>

      {CRAFT_RECIPES.map(rec => {
        const cost = craftGoldCost(rec, floor);
        return (
          <div key={rec.from} className="panel rounded-xl p-3">
            <h3 className="text-sm font-bold text-purple-200 mb-2">
              <span className={RARITY_COLORS[rec.from].text}>{RARITY_NAME[rec.from]}</span> → <span className={RARITY_COLORS[rec.to].text}>{RARITY_NAME[rec.to]}</span>
              {rec.chance < 1 && <span className="text-[11px] text-red-300"> · шанс {Math.round(rec.chance * 100)}%</span>}
            </h3>
            <div className="space-y-2">
              {groups.filter(g => g.from === rec.from).map(g => {
                const enough = g.count >= rec.need;
                const room = rec.chance < 1 || inventory.length - rec.need + 1 <= limit;
                const can = enough && gold >= cost && room;
                return (
                  <div key={g.slot} className="rounded-lg bg-black/30 border border-purple-800/50 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-purple-100">{SLOT[g.slot]}</div>
                      <div className={`text-xs font-bold ${enough ? 'text-green-300' : 'text-red-300'}`}>{g.count} / {rec.need}</div>
                      <button disabled={!can} onClick={() => onCraft(g.slot, rec.from)}
                        className="btn-fantasy px-3 py-1.5 rounded-lg text-xs font-black disabled:opacity-40">
                        🔨 {cost ? `${coin} ${f(cost)}` : 'Скрафтить'}
                      </button>
                    </div>
                    {enough && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {g.take.map(i => <ItemCard key={i.id} item={i} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
