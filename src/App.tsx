import { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { ACHIEVEMENTS, PRESTIGE, SKILLS, itemScore, skillCost, soulsForFloor } from './gameData';
import { isMuted, play, setMuted, unlockAudio } from './game/audio';
import BattleScene from './components/BattleScene';
import AbilityBar from './components/AbilityBar';
import CombatLog from './components/CombatLog';
import SkillsPanel from './components/SkillsPanel';
import InventoryPanel from './components/InventoryPanel';
import ShopPanel from './components/ShopPanel';
import MorePanel from './components/MorePanel';
import ConfirmModal from './components/ConfirmModal';
import OfflineModal from './components/OfflineModal';
import SplashScreen from './components/SplashScreen';

type Tab = 'combat' | 'hero' | 'inventory' | 'shop' | 'more';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'combat',    icon: '⚔️', label: 'Бой' },
  { id: 'hero',      icon: '✨', label: 'Герой' },
  { id: 'inventory', icon: '🎒', label: 'Сумка' },
  { id: 'shop',      icon: '🏪', label: 'Лавка' },
  { id: 'more',      icon: '👻', label: 'Ещё' },
];

/**
 * App только раскладывает экран. Вся игра — в хуке useGame
 * (правила: game/reducer.ts, данные и баланс: gameData.ts).
 */
export default function App() {
  const game = useGame();
  const { state, stats } = game;
  const { hero } = state;

  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState<Tab>('combat');
  const [muted, setMutedState] = useState(isMuted());
  const [confirm, setConfirm] = useState<'rebirth' | 'reset' | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  // Всплывающая плашка при получении достижения
  useEffect(() => {
    const ev = state.events.find(e => e.type === 'achievement');
    if (!ev || ev.type !== 'achievement') return;
    const a = ACHIEVEMENTS.find(x => x.id === ev.id);
    if (!a) return;
    setToast({ id: ev.id, text: `${a.emoji} ${a.name}` });
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [state.events]);

  const start = () => { unlockAudio(); play('click'); setStarted(true); };
  const go = (t: Tab) => { if (t !== tab) { play('click'); setTab(t); } };
  const toggleSound = () => { setMuted(!muted); setMutedState(!muted); };

  // Точки-подсказки на вкладках
  const cheapest = Math.min(...SKILLS.filter(d => state.skillLevels[d.id] < d.maxLevel).map(d => skillCost(d, state.skillLevels[d.id])));
  const badge: Partial<Record<Tab, boolean>> = {
    hero: hero.gold >= cheapest,
    inventory: (['weapon', 'armor', 'amulet'] as const).some(slot =>
      state.inventory.some(i => i.slot === slot && (!state.equipped[slot] || itemScore(i) > itemScore(state.equipped[slot]!)))),
    more: soulsForFloor(hero.floor) > 0 && hero.floor >= PRESTIGE.minFloor + 4,
  };

  return (
    <div className="h-full flex flex-col max-w-xl mx-auto" style={{ paddingTop: 'var(--sat)', paddingLeft: 'var(--sal)', paddingRight: 'var(--sar)' }}>
      {!started && <SplashScreen onStart={start} />}

      {/* ── верхняя панель ── */}
      <header className="shrink-0 px-3 pt-2 pb-1.5">
        <div className="panel rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap min-w-0">
            <span className="text-yellow-400 font-black">🏰 Этаж {hero.floor}</span>
            <span className="text-purple-300 text-xs">{hero.stage}/10</span>
            <span className="text-yellow-300 font-bold">💰 {hero.gold}</span>
            {state.meta.souls > 0 && <span className="text-purple-300 text-xs">👻 {state.meta.souls}</span>}
          </div>
          <button
            onClick={() => game.setAutoFight(a => !a)}
            className={`btn-fantasy shrink-0 px-3 py-1 rounded-lg text-xs font-bold ${game.autoFight ? '' : 'opacity-80'}`}
          >
            {game.autoFight ? '⏸ Пауза' : '▶ Бой'}
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-2 px-1">
          <span className="text-[11px] text-blue-300 font-bold shrink-0">⭐ {hero.level}</span>
          <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden border border-blue-900/70">
            <div className="h-full transition-all duration-300" style={{ width: `${Math.min(100, (hero.xp / hero.xpToNext) * 100)}%`, background: 'linear-gradient(90deg,#2563eb,#60a5fa)' }} />
          </div>
          <span className="text-[10px] text-blue-300/80 shrink-0">{hero.xp}/{hero.xpToNext}</span>
        </div>
      </header>

      {/* ── содержимое вкладки ── */}
      <main className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 scroll-log">
        {tab === 'combat' && (
          <div className="flex flex-col gap-2.5 min-h-full">
            <BattleScene state={state} stats={stats} />
            <AbilityBar
              level={hero.level}
              cooldowns={state.cooldowns}
              auto={state.settings.autoAbilities}
              onUse={game.useAbility}
              onToggleAuto={() => game.setAutoAbilities(!state.settings.autoAbilities)}
            />
            <CombatLog log={state.log} />
          </div>
        )}
        {tab === 'hero' && (
          <SkillsPanel skills={game.skills} gold={hero.gold} hero={hero} stats={stats} souls={state.meta.souls} onBuy={game.buySkill} />
        )}
        {tab === 'inventory' && (
          <InventoryPanel
            inventory={state.inventory} equipped={state.equipped}
            onEquip={game.equipItem} onSell={game.sellItem}
            onEquipBest={game.equipBest} onSellJunk={game.sellJunk}
          />
        )}
        {tab === 'shop' && (
          <ShopPanel
            gold={hero.gold} floor={hero.floor} inventoryCount={state.inventory.length}
            upgradeCounts={state.upgradeCounts} chestResult={state.chestResult}
            onBuyPotion={game.buyPotion} onBuyUpgrade={game.buyUpgrade} onBuyChest={game.buyChest}
          />
        )}
        {tab === 'more' && (
          <MorePanel
            hero={hero} meta={state.meta} muted={muted} autoAbilities={state.settings.autoAbilities}
            onRebirth={() => setConfirm('rebirth')} onReset={() => setConfirm('reset')}
            onToggleSound={toggleSound} onToggleAuto={() => game.setAutoAbilities(!state.settings.autoAbilities)}
          />
        )}
      </main>

      {/* ── нижняя навигация ── */}
      <nav className="shrink-0 grid grid-cols-5 gap-1 px-2 pt-1.5 border-t border-purple-900/60 bg-black/50 backdrop-blur"
           style={{ paddingBottom: 'max(var(--sab), 6px)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => go(t.id)}
            className={`relative rounded-xl py-1.5 flex flex-col items-center transition ${tab === t.id ? 'bg-purple-800/50 ring-1 ring-amber-400/60 text-amber-200' : 'text-purple-300/80'}`}>
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[10px] font-bold mt-0.5">{t.label}</span>
            {badge[t.id] && tab !== t.id && <span className="absolute top-1 right-3 w-2.5 h-2.5 rounded-full bg-amber-400 border border-black animate-pulse" />}
          </button>
        ))}
      </nav>

      {/* ── окна ── */}
      {toast && (
        <div key={toast.id} className="toast fixed left-1/2 z-[90] px-4 py-2 rounded-full bg-amber-900/95 border border-amber-400 text-amber-100 font-black text-sm shadow-lg"
             style={{ top: 'calc(var(--sat) + 10px)' }}>
          🏆 Достижение: {toast.text}
        </div>
      )}
      {state.offlineReport && <OfflineModal report={state.offlineReport} onClose={game.dismissOffline} />}
      {confirm === 'rebirth' && (
        <ConfirmModal
          title="👻 Переродиться?"
          text={`Ты получишь ${soulsForFloor(hero.floor)} душ — они навсегда усилят героя.\nЭтаж, золото, навыки и вещи сбросятся.`}
          confirmLabel="Переродиться"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { setConfirm(null); setTab('combat'); game.rebirth(); }}
        />
      )}
      {confirm === 'reset' && (
        <ConfirmModal
          title="Сбросить всё?"
          text={'Весь прогресс будет удалён, включая души и достижения.\nЭто нельзя отменить.'}
          confirmLabel="Удалить всё" danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { setConfirm(null); setTab('combat'); game.resetGame(); }}
        />
      )}
    </div>
  );
}
