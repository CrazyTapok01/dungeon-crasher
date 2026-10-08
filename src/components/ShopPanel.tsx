import type { UpgradeKind } from '../types';
import { SHOP_POTION, SHOP_UPGRADES } from '../gameData';

interface Props {
  gold: number;
  onBuyPotion: () => void;
  onBuyUpgrade: (kind: UpgradeKind) => void;
}

export default function ShopPanel({ gold, onBuyPotion, onBuyUpgrade }: Props) {
  return (
    <div className="lg:col-span-3 panel rounded-lg p-4">
      <h2 className="text-2xl font-black text-amber-300 mb-1 text-center text-stroke">🏪 Лавка торговца</h2>
      <p className="text-center text-yellow-300 mb-4">💰 Кошелёк: {gold} золота</p>

      <h3 className="text-lg font-bold text-purple-300 mb-2">🧪 Зелья</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="panel rounded-lg p-3 bg-gradient-to-br from-green-900/40 to-emerald-950/50 border border-green-700/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-4xl">{SHOP_POTION.emoji}</div>
            <div>
              <div className="font-bold text-green-200">{SHOP_POTION.name}</div>
              <div className="text-xs text-green-300/80">+{SHOP_POTION.heal} HP</div>
            </div>
          </div>
          <button disabled={gold < SHOP_POTION.cost} onClick={onBuyPotion}
                  className="btn-fantasy w-full py-1.5 rounded font-bold text-sm">
            Купить · 💰 {SHOP_POTION.cost}
          </button>
        </div>
      </div>

      <h3 className="text-lg font-bold text-purple-300 mb-2">🔧 Постоянные улучшения</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SHOP_UPGRADES.map(u => (
          <div key={u.kind} className="panel rounded-lg p-3 bg-gradient-to-br from-amber-900/30 to-orange-950/40 border border-amber-700/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-4xl">{u.emoji}</div>
              <div>
                <div className="font-bold text-amber-200">{u.name}</div>
                <div className="text-xs text-amber-300/80">+{u.amount} {u.label}</div>
              </div>
            </div>
            <button disabled={gold < u.cost} onClick={() => onBuyUpgrade(u.kind)}
                    className="btn-fantasy w-full py-1.5 rounded font-bold text-sm">
              Купить · 💰 {u.cost}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 rounded-lg bg-black/40 border border-purple-800/50 text-center text-sm text-purple-300 italic">
        💡 Совет: вложись в «Критический удар» и «Вампиризм» — они перевернут ход битвы!
      </div>
    </div>
  );
}
