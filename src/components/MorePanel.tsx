import type { HeroState, Meta } from '../types';
import { ACHIEVEMENTS, PRESTIGE, soulsForFloor } from '../gameData';

interface Props {
  hero: HeroState;
  meta: Meta;
  muted: boolean;
  autoAbilities: boolean;
  onRebirth: () => void;
  onReset: () => void;
  onToggleSound: () => void;
  onToggleAuto: () => void;
}

export default function MorePanel({ hero, meta, muted, autoAbilities, onRebirth, onReset, onToggleSound, onToggleAuto }: Props) {
  const gain = soulsForFloor(hero.floor);
  const canRebirth = gain > 0;
  const done = new Set(meta.achievements);

  return (
    <div className="space-y-3">
      {/* ── перерождение ── */}
      <div className="rounded-xl p-3 bg-gradient-to-br from-purple-900/60 to-indigo-950/80 border border-purple-500/50 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
        <h2 className="text-xl font-black text-purple-200 text-center text-stroke mb-1">👻 Перерождение</h2>
        <p className="text-xs text-purple-300/90 text-center mb-3 leading-snug">
          Начни путь заново и получи <b>души</b> — они навсегда усиливают героя.
          Сбрасываются этаж, золото, навыки и вещи.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="bg-black/40 rounded-lg py-2"><div className="text-lg font-black text-purple-200">{meta.souls}</div><div className="text-[10px] text-purple-400">душ</div></div>
          <div className="bg-black/40 rounded-lg py-2"><div className="text-lg font-black text-amber-200">{meta.rebirths}</div><div className="text-[10px] text-purple-400">перерождений</div></div>
          <div className="bg-black/40 rounded-lg py-2"><div className="text-lg font-black text-green-200">{meta.maxFloor}</div><div className="text-[10px] text-purple-400">рекорд этажа</div></div>
        </div>
        <div className="text-xs text-center text-purple-200 mb-3 space-y-0.5">
          <div>Сейчас: +{Math.round(meta.souls * PRESTIGE.atkHpPerSoul * 100)}% к атаке и HP, +{Math.round(meta.souls * PRESTIGE.goldPerSoul * 100)}% к золоту</div>
          {canRebirth
            ? <div className="text-green-300 font-bold">Если переродиться сейчас: +{gain} душ → итого {meta.souls + gain}</div>
            : <div className="text-purple-400">Доступно с этажа {PRESTIGE.minFloor} (сейчас {hero.floor})</div>}
        </div>
        <button disabled={!canRebirth} onClick={onRebirth} className="btn-purple w-full py-3 rounded-xl font-black">
          {canRebirth ? `👻 Переродиться (+${gain} душ)` : '🔒 Пока недоступно'}
        </button>
      </div>

      {/* ── настройки ── */}
      <div className="panel rounded-xl p-3">
        <h2 className="text-lg font-black text-amber-300 mb-2 text-center text-stroke">⚙️ Настройки</h2>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onToggleSound} className="btn-fantasy py-2.5 rounded-lg text-sm font-bold">{muted ? '🔇 Звук выкл.' : '🔊 Звук вкл.'}</button>
          <button onClick={onToggleAuto} className="btn-fantasy py-2.5 rounded-lg text-sm font-bold">{autoAbilities ? '⚡ Авто-навыки: да' : '✋ Авто-навыки: нет'}</button>
        </div>
        <button onClick={onReset} className="w-full mt-2 py-2 rounded-lg text-xs font-bold text-red-300 border border-red-900/60 bg-red-950/30">
          ↻ Сбросить весь прогресс
        </button>
      </div>

      {/* ── достижения ── */}
      <div className="panel rounded-xl p-3">
        <h2 className="text-lg font-black text-amber-300 mb-0.5 text-center text-stroke">🏆 Достижения</h2>
        <p className="text-center text-xs text-purple-300/80 mb-3">{done.size} из {ACHIEVEMENTS.length}</p>
        <div className="space-y-1.5">
          {ACHIEVEMENTS.map(a => {
            const ok = done.has(a.id);
            const cur = Math.min(a.target, a.stat({ hero, meta }));
            const reward = [a.reward.gold && `💰${a.reward.gold}`, a.reward.souls && `👻${a.reward.souls}`].filter(Boolean).join(' ');
            return (
              <div key={a.id} className={`rounded-lg p-2 flex items-center gap-2.5 border ${ok ? 'bg-amber-900/30 border-amber-500/60' : 'bg-black/30 border-purple-900/50'}`}>
                <div className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ok ? 'bg-amber-500/20' : 'bg-black/40 grayscale opacity-60'}`}>{a.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${ok ? 'text-amber-200' : 'text-purple-200'}`}>{a.name}</div>
                  <div className="text-[11px] text-purple-300/80">{a.desc}</div>
                  {!ok && (
                    <div className="h-1.5 bg-black/50 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${(cur / a.target) * 100}%` }} />
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-right shrink-0 font-bold text-amber-300">
                  {ok ? '✓' : `${Math.floor(cur)}/${a.target}`}
                  <div className="text-[10px] text-purple-300 font-normal">{reward}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
