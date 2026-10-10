import type { Item, UpgradeCounts, UpgradeKind } from '../types';
import { INVENTORY_LIMIT, SHOP_POTION, SHOP_UPGRADES, chestCost, upgradeCost } from '../gameData';
import ItemCard from './ItemCard';

interface Props {
  gold: number;
  floor: number;
  inventoryCount: number;
  upgradeCounts: UpgradeCounts;
  chestResult: Item | null;
  onBuyPotion: () => void;
  onBuyUpgrade: (kind: UpgradeKind) => void;
  onBuyChest: () => void;
}

export default function ShopPanel({ gold, floor, inventoryCount, upgradeCounts, chestResult, onBuyPotion, onBuyUpgrade, onBuyChest }: Props) {
  const chest = chestCost(floor);
  const bagFull = inventoryCount >= INVENTORY_LIMIT;
  return (
    <div className="panel rounded-xl p-3">
      <h2 className="text-xl font-black text-amber-300 mb-1 text-center text-stroke">🏪 Лавка торговца</h2>
      <p className="text-center text-yellow-300 mb-4 text-sm">💰 Кошелёк: {gold}</p>

      <h3 className="text-sm font-bold text-purple-300 mb-1.5">🎁 Сундук сокровищ</h3>
      <div className="rounded-xl p-3 bg-gradient-to-br from-amber-900/40 to-purple-950/50 border border-amber-600/50 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-5xl drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">🧰</div>
          <div className="flex-1 text-xs text-amber-200/90 leading-snug">
            Гарантированная вещь не хуже «необычной», с хорошим шансом на редкую и эпическую.
            Цена растёт с глубиной.
          </div>
        </div>
        <button disabled={gold < chest || bagFull} onClick={onBuyChest} className="btn-fantasy w-full py-2 rounded-lg font-bold text-sm">
          {bagFull ? 'Сумка полна' : `Открыть · 💰 ${chest}`}
        </button>
        {chestResult && (
          <div className="mt-3 pop-in">
            <div className="text-[11px] text-amber-300 mb-1 text-center">Из сундука выпало:</div>
            <ItemCard item={chestResult} />
          </div>
        )}
      </div>

      <h3 className="text-sm font-bold text-purple-300 mb-1.5">🧪 Зелья</h3>
      <div className="rounded-xl p-3 bg-gradient-to-br from-green-900/40 to-emerald-950/50 border border-green-700/50 mb-4 flex items-center gap-3">
        <div className="text-4xl">{SHOP_POTION.emoji}</div>
        <div className="flex-1">
          <div className="font-bold text-green-200 text-sm">{SHOP_POTION.name}</div>
          <div className="text-xs text-green-300/80">+{SHOP_POTION.heal} HP</div>
        </div>
        <button disabled={gold < SHOP_POTION.cost} onClick={onBuyPotion} className="btn-fantasy py-2 px-3 rounded-lg font-bold text-xs">
          💰 {SHOP_POTION.cost}
        </button>
      </div>

      <h3 className="text-sm font-bold text-purple-300 mb-1.5">🔧 Постоянные улучшения</h3>
      <div className="space-y-2">
        {SHOP_UPGRADES.map(u => {
          const bought = upgradeCounts[u.kind];
          const cost = upgradeCost(u, bought);
          return (
            <div key={u.kind} className="rounded-xl p-3 bg-gradient-to-br from-amber-900/30 to-orange-950/40 border border-amber-700/40 flex items-center gap-3">
              <div className="text-4xl">{u.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-amber-200 text-sm">{u.name} <span className="text-[11px] text-amber-400/70">×{bought}</span></div>
                <div className="text-xs text-amber-300/80">+{u.amount} {u.label}</div>
              </div>
              <button disabled={gold < cost} onClick={() => onBuyUpgrade(u.kind)} className="btn-fantasy py-2 px-3 rounded-lg font-bold text-xs">
                💰 {cost}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-2.5 rounded-lg bg-black/40 border border-purple-800/50 text-center text-xs text-purple-300 italic">
        💡 Совет: босс замахивается раз в 4 хода — ставь «Щит» в ответ на «⚠️ замах!»
      </div>
    </div>
  );
}
