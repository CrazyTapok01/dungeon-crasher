import type { HeroState, Meta } from '../types';
import { setGfxSetting, useGfx, type GfxSetting } from '../game/perf';
import QuestsPanel from './QuestsPanel';
import PetsPanel from './PetsPanel';
import { setNumMode, useFmt } from '../game/num';
import { getNumMode } from '../game/num';
import GemShopPanel from './GemShopPanel';
import SoulShopPanel from './SoulShopPanel';
import HellPanel from './HellPanel';
import { useCoin, useWorld } from './coin';
import type { GameState } from '../game/reducer';
import type { useGame } from '../hooks/useGame';
import ExtrasPanel from './ExtrasPanel';
import Tip from './Tip';
import { useState } from 'react';
import { AUTO_CRAFT_STEPS, AUTO_ENHANCE_STEPS, RARITY_NAME } from '../gameData';
import { enableNotifications } from '../game/notify';
import { ACHIEVEMENTS, PERKS, PRESTIGE, soulsForFloor } from '../gameData';

interface Props {
  hero: HeroState;
  meta: Meta;
  muted: boolean;
  autoAbilities: boolean;
  onRebirth: () => void;
  onClaimDaily: () => void;
  onSetPet: (id: import('../types').PetId | null) => void;
  onPetRebirth: (id: import('../types').PetId) => void;
  onReset: () => void;
  onBuyGem: (id: string) => void;
  onBuySoul: (id: string) => void;
  onPact: (id: string) => void;
  onAltar: () => void;
  onHellRebirth: () => void;
  onFarmUpgrade: (id: string) => void;
  onFarmCollect: () => void;
  onPetCrate: (kind: 'basic' | 'gem') => void;
  onToggleSound: () => void;
  onToggleAuto: () => void;
  onScreen: (s: 'city' | 'sea') => void;
  state: GameState;
  game: ReturnType<typeof useGame>;
}

/** Перенос сохранения: код копируется и вставляется на другом устройстве или в APK. */
function SaveTransfer({ game }: { game: ReturnType<typeof useGame> }) {
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code ?? ''); setMsg('Скопировано!'); } catch { setMsg('Выдели код вручную и скопируй'); }
  };
  return (
    <div className="mt-2 rounded-lg border border-purple-800/60 p-2 bg-black/20">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { setCode(game.exportCode()); setOpen(true); setMsg(''); }} className="btn-fantasy py-2 rounded-lg text-xs font-bold">📤 Код сохранения</button>
        <button onClick={() => { setOpen(true); setCode(null); setMsg(''); }} className="btn-fantasy py-2 rounded-lg text-xs font-bold">📥 Загрузить</button>
      </div>
      {open && code !== null && (
        <div className="mt-2">
          <textarea readOnly value={code} onFocus={e => e.currentTarget.select()} className="w-full h-20 text-[10px] bg-black/50 text-purple-100 rounded p-1 border border-purple-800" />
          <button onClick={copy} className="btn-purple w-full py-1.5 rounded-lg text-xs font-bold mt-1">Копировать</button>
        </div>
      )}
      {open && code === null && (
        <div className="mt-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Вставь код сохранения (начинается с DC1:)" className="w-full h-20 text-[10px] bg-black/50 text-purple-100 rounded p-1 border border-purple-800" />
          <button disabled={!input.trim()} onClick={() => {
            if (!window.confirm('Текущий прогресс на этом устройстве будет заменён загруженным. Продолжить?')) return;
            if (game.importCode(input)) location.reload(); else setMsg('Код не подходит или повреждён');
          }} className="btn-purple w-full py-1.5 rounded-lg text-xs font-bold mt-1 disabled:opacity-50">Загрузить сохранение</button>
        </div>
      )}
      {msg && <p className="text-[11px] text-amber-300 text-center mt-1">{msg}</p>}
    </div>
  );
}

const GFX_LABEL: Record<GfxSetting, string> = { auto: 'Авто', high: 'Высокая', low: 'Низкая' };
const NEXT_GFX: Record<GfxSetting, GfxSetting> = { auto: 'high', high: 'low', low: 'auto' };

export default function MorePanel({ hero, meta, muted, autoAbilities, onRebirth, onClaimDaily, onSetPet, onPetRebirth, onReset, onBuyGem, onBuySoul, onPact, onAltar, onHellRebirth, onFarmUpgrade, onFarmCollect, onPetCrate, onToggleSound, onToggleAuto, state, game, onScreen }: Props) {
  const gfx = useGfx();
  useFmt();
  const numMode = getNumMode();
  const world = useWorld();
  const coin = useCoin();
  const inHell = world === 'hell';
  const gain = soulsForFloor(hero.floor, meta.rebirths);
  const nextPerk = PERKS.find(p => p.rebirths > meta.rebirths);
  const canRebirth = gain > 0 && !inHell;
  const done = new Set(meta.achievements);

  return (
    <div className="space-y-3">
      {/* ── перерождение ── */}
      <div className="rounded-xl p-3 bg-gradient-to-br from-purple-900/60 to-indigo-950/80 border border-purple-500/50 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
        <h2 className="text-xl font-black text-purple-200 text-center text-stroke mb-1">👻 Перерождение</h2>
        {inHell && <p className="text-xs text-orange-300 text-center mb-2 font-bold">🔥 Перерождение доступно только в Подземелье. Вернись через 🗺️ карту — прогресс Преисподней сохранится.</p>}
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
          {canRebirth ? `👻 Переродиться (+${gain} душ)` : inHell ? '🔒 Только в Подземелье' : '🔒 Пока недоступно'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onScreen('city')} className="rounded-xl p-2.5 border border-orange-800/70 bg-orange-950/40 text-center">
          <div className="text-3xl">🏙️</div><div className="font-black text-orange-200 text-sm">Ржавый город</div>
          <div className="text-[10px] text-orange-300/90 leading-tight">{meta.city.open ? 'База, вылазки, исследования' : 'Откроется с этажа 15'}</div>
        </button>
        <button onClick={() => onScreen('sea')} className="rounded-xl p-2.5 border border-cyan-800/70 bg-cyan-950/40 text-center">
          <div className="text-3xl">🌊</div><div className="font-black text-cyan-200 text-sm">Бездонное море</div>
          <div className="text-[10px] text-cyan-300/90 leading-tight">{meta.sea.open ? 'Корабль, острова, торговля' : 'Откроется с этажа 25'}</div>
        </button>
      </div>

      <QuestsPanel meta={meta} onClaimDaily={onClaimDaily} />

      <ExtrasPanel state={state} game={game} />

      <Tip id="soulshop" text="Лавка душ: души тратятся на постоянные улучшения. Бонус душ при этом не падает — он считается от всех заработанных." />
      <SoulShopPanel meta={meta} onBuy={onBuySoul} />

      {meta.hellOpen && <Tip id="hell" text="Преисподняя: у охотника свой герой и валюта (угли 🔥). Здесь выпадает больше кристаллов и камней, а навыки не ограничены. Прогресс не сбрасывается перерождением в Подземелье." />}
      {meta.hellOpen && <HellPanel meta={meta} world={world} coals={hero.gold} floor={hero.floor} onPact={onPact} onAltar={onAltar} onHellRebirth={onHellRebirth} onFarmUpgrade={onFarmUpgrade} onFarmCollect={onFarmCollect} />}

      <GemShopPanel meta={meta} onBuy={onBuyGem} />

      <Tip id="pets" text="Питомцы дают пассивные бонусы. Яйца падают с боссов; за кристаллы и золото можно купить ящики со снаряжением питомца. Питомец 10/10 может переродиться для усиленных бонусов." />
      <PetsPanel onRebirth={onPetRebirth} meta={meta} gold={hero.gold} floor={hero.floor} coin={coin} canBuyWithGold onSet={onSetPet} onCrate={onPetCrate} />

      {/* ── путь перерождений ── */}
      <div className="panel rounded-xl p-3 border-purple-600/40">
        <h2 className="text-lg font-black text-purple-200 mb-0.5 text-center text-stroke">🌟 Путь перерождений</h2>
        <p className="text-center text-xs text-purple-300/80 mb-2 leading-snug">
          Каждое перерождение приближает новые постоянные награды. Они остаются навсегда.
        </p>
        {nextPerk ? (
          <div className="mb-3">
            <div className="flex justify-between text-[11px] text-purple-300 mb-1">
              <span>Следующая награда — после {nextPerk.rebirths}-го перерождения</span>
              <span className="font-bold text-amber-300">{meta.rebirths}/{nextPerk.rebirths}</span>
            </div>
            <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-purple-900/60">
              <div className="h-full bg-gradient-to-r from-purple-500 to-amber-300" style={{ width: `${Math.min(100, (meta.rebirths / nextPerk.rebirths) * 100)}%` }} />
            </div>
          </div>
        ) : (
          <div className="mb-3 text-center text-xs text-amber-300 font-bold">🏆 Все награды пути открыты!</div>
        )}
        <div className="space-y-1.5">
          {PERKS.map(p => {
            const ok = meta.rebirths >= p.rebirths;
            return (
              <div key={p.id} className={`rounded-lg p-2 flex items-center gap-2.5 border ${ok ? 'bg-purple-900/40 border-purple-400/60' : 'bg-black/30 border-purple-900/50'}`}>
                <div className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ok ? 'bg-purple-500/20' : 'bg-black/40 grayscale opacity-60'}`}>{p.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${ok ? 'text-purple-100' : 'text-purple-300/80'}`}>{p.name}</div>
                  <div className="text-[11px] text-purple-300/80 leading-tight">{p.desc}</div>
                </div>
                <div className={`text-[11px] shrink-0 font-bold text-right ${ok ? 'text-green-300' : 'text-amber-300'}`}>
                  {ok ? '✓' : <>🔒<br />{p.rebirths}</>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── настройки ── */}
      <div className="panel rounded-xl p-3">
        <h2 className="text-lg font-black text-amber-300 mb-2 text-center text-stroke">⚙️ Настройки</h2>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onToggleSound} className="btn-fantasy py-2.5 rounded-lg text-sm font-bold">{muted ? '🔇 Звук выкл.' : '🔊 Звук вкл.'}</button>
          <button onClick={onToggleAuto} className="btn-fantasy py-2.5 rounded-lg text-sm font-bold">{autoAbilities ? '⚡ Авто-навыки: да' : '✋ Авто-навыки: нет'}</button>
        </div>
        <button
          onClick={() => setGfxSetting(NEXT_GFX[gfx.setting])}
          className="btn-fantasy w-full mt-2 py-2.5 rounded-lg text-sm font-bold"
        >
          🎨 Графика: {GFX_LABEL[gfx.setting]}{gfx.setting === 'auto' ? ` (сейчас: ${gfx.low ? 'низкая' : 'высокая'})` : ''}
        </button>
        <button
          onClick={() => setNumMode(numMode === 'full' ? 'short' : 'full')}
          className="btn-fantasy w-full mt-2 py-2.5 rounded-lg text-sm font-bold"
        >
          🔢 Числа: {numMode === 'full' ? 'полные' : 'сокращённые (от 1E+9)'}
        </button>
        <button
          onClick={() => game.setAuto('autoEnhance', AUTO_ENHANCE_STEPS[(AUTO_ENHANCE_STEPS.indexOf(state.settings.autoEnhance) + 1) % AUTO_ENHANCE_STEPS.length])}
          className="btn-fantasy w-full mt-2 py-2.5 rounded-lg text-sm font-bold"
        >
          ⚒️ Авто-заточка: {state.settings.autoEnhance ? `до +${state.settings.autoEnhance}` : 'выкл.'}
        </button>
        <button
          onClick={() => game.setAuto('autoCraft', AUTO_CRAFT_STEPS[(AUTO_CRAFT_STEPS.indexOf(state.settings.autoCraft) + 1) % AUTO_CRAFT_STEPS.length])}
          className="btn-fantasy w-full mt-2 py-2.5 rounded-lg text-sm font-bold"
        >
          🔨 Авто-крафт: {state.settings.autoCraft ? `до «${RARITY_NAME[state.settings.autoCraft]}»` : 'выкл.'}
        </button>
        <p className="text-[11px] text-purple-300/70 text-center mt-1 leading-tight">
          Авто-функции работают после каждой победы и тратят золото, только если его хватает минимум вдвое (кроме неудачных попыток).
        </p>
        <button
          onClick={async () => {
            if (state.settings.notify) { game.setAuto('notify', false); return; }
            const ok = await enableNotifications();
            game.setAuto('notify', true);
            if (!ok) alert('Уведомления работают только в приложении (APK) и после разрешения в системе.');
          }}
          className="btn-fantasy w-full mt-2 py-2.5 rounded-lg text-sm font-bold"
        >
          🔔 Уведомления: {state.settings.notify ? 'вкл.' : 'выкл.'}
        </button>
        <SaveTransfer game={game} />
        <p className="text-[11px] text-purple-300/70 text-center mt-1 leading-tight">
          Если игра тормозит — выберите «Низкая»: меньше эффектов, заметно легче для телефона.
        </p>
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
