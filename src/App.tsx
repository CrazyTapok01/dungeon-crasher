import { useState } from 'react';
import { useGame } from './hooks/useGame';
import HeroPanel from './components/HeroPanel';
import MonsterPanel from './components/MonsterPanel';
import CombatLog from './components/CombatLog';
import InventoryPanel from './components/InventoryPanel';
import SkillsPanel from './components/SkillsPanel';
import ShopPanel from './components/ShopPanel';

type Tab = 'combat' | 'skills' | 'inventory' | 'shop';

const TABS: { id: Tab; label: string }[] = [
  { id: 'combat',    label: '⚔️ Бой' },
  { id: 'skills',    label: '✨ Навыки' },
  { id: 'inventory', label: '🎒 Инвентарь' },
  { id: 'shop',      label: '🏪 Лавка' },
];

/**
 * App только раскладывает экран. Вся игра — в хуке useGame
 * (правила: game/reducer.ts, данные и баланс: gameData.ts).
 */
export default function App() {
  const game = useGame();
  const { state, stats } = game;
  const { hero } = state;
  const [tab, setTab] = useState<Tab>('combat');

  return (
    <div className="min-h-screen p-3 md:p-5 max-w-7xl mx-auto">
      <header className="text-center mb-4">
        <h1 className="text-3xl md:text-5xl font-black tracking-wider text-stroke"
            style={{ background: 'linear-gradient(180deg, #fde047 0%, #f59e0b 50%, #b45309 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⚔️ КРУШИТЕЛИ ПОДЗЕМЕЛИЙ ⚔️
        </h1>
        <p className="text-purple-300/80 text-sm mt-1 italic">Dungeon Crasher — Руби, круши, качайся!</p>
      </header>

      {/* Верхняя панель */}
      <div className="panel rounded-lg p-3 mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-yellow-400 font-bold">🏰 Этаж {hero.floor}</span>
          <span className="text-purple-300">Стадия {hero.stage}/10</span>
          <span className="text-yellow-300">💰 {hero.gold}</span>
          <span className="text-red-300">☠️ Убийств: {hero.kills}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => game.setAutoFight(a => !a)}
            className={`btn-fantasy px-3 py-1 rounded text-sm font-bold ${game.autoFight ? 'text-green-300' : 'text-gray-400'}`}>
            {game.autoFight ? '⏸ Пауза' : '▶ Продолжить бой'}
          </button>
          <button onClick={game.resetGame} className="btn-fantasy px-2 py-1 rounded text-xs text-red-300">↻ Сброс</button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 mb-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 btn-fantasy py-2 rounded-t-lg font-bold text-sm transition ${tab === t.id ? 'ring-2 ring-amber-400/60 text-amber-200' : 'text-purple-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {tab === 'combat' && (
          <>
            <div className="lg:col-span-2 space-y-3">
              <div className="panel rounded-lg p-4 relative overflow-hidden" style={{ minHeight: 340 }}>
                {state.showFloorBanner && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="text-6xl font-black text-amber-300 text-stroke fade-in">🏆 ЭТАЖ ПРОЙДЕН!</div>
                  </div>
                )}
                {state.isDead && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                    <div className="text-center">
                      <div className="text-6xl mb-2">💀</div>
                      <div className="text-3xl font-black text-red-400 text-stroke">ТЫ ПАЛ В БОЮ</div>
                      <div className="text-purple-300 mt-2">Возрождение...</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <HeroPanel hero={hero} stats={stats} hit={state.heroHit} />
                  <div className="text-4xl text-red-500 font-black text-stroke float">VS</div>
                  <MonsterPanel monster={state.monster} hp={state.monsterHp} hit={state.monsterHit} />
                </div>
              </div>

              <CombatLog log={state.log} />
            </div>

            <div className="panel rounded-lg p-3 text-sm">
              <h3 className="font-black text-amber-300 mb-2 text-center">📊 Статистика</h3>
              <div className="space-y-1">
                <StatRow label="⚔️ Атака" value={stats.atk} />
                <StatRow label="🛡️ Защита" value={stats.def} />
                <StatRow label="❤️ HP" value={`${hero.hp}/${stats.maxHp}`} />
                <StatRow label="⚡ Шанс крит." value={`${stats.critChance}%`} />
                <StatRow label="💥 Крит. урон" value={`${stats.critDmg}%`} />
                <StatRow label="💨 Уклонение" value={`${stats.dodge}%`} />
                <StatRow label="🩸 Вампиризм" value={`${stats.lifesteal}%`} />
                <StatRow label="⭐ Уровень" value={hero.level} />
                <StatRow label="🎯 Опыт" value={`${hero.xp}/${hero.xpToNext}`} />
              </div>
              <div className="mt-3 pt-3 border-t border-purple-800/50 text-xs text-purple-300/80 space-y-1">
                <div>🎯 Бей монстров, получай золото и лут</div>
                <div>🏆 Каждый 10-й враг — БОСС</div>
                <div>✨ Прокачивай навыки и экипировку</div>
              </div>
            </div>
          </>
        )}

        {tab === 'skills' && (
          <SkillsPanel skills={game.skills} gold={hero.gold} onBuy={game.buySkill} />
        )}

        {tab === 'inventory' && (
          <InventoryPanel
            inventory={state.inventory}
            equipped={state.equipped}
            onEquip={game.equipItem}
            onSell={game.sellItem}
          />
        )}

        {tab === 'shop' && (
          <ShopPanel gold={hero.gold} onBuyPotion={game.buyPotion} onBuyUpgrade={game.buyUpgrade} />
        )}
      </div>

      <footer className="text-center text-purple-400/50 text-xs mt-6 italic">
        Сделано с любовью к жанру hack &amp; slash ⚔️
      </footer>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-purple-900/40 py-0.5">
      <span className="text-purple-300">{label}</span>
      <span className="text-amber-200 font-bold">{value}</span>
    </div>
  );
}
