import type { Meta, WorldId } from '../types';
import { HELL, WORLDS } from '../gameData';

interface Props {
  world: WorldId;
  meta: Meta;
  offFloor: number;      // этаж в «другом» мире
  onTravel: (to: WorldId) => void;
  onOpen: () => void;
  onClose: () => void;
}

/** Карта миров: Подземелье и Преисподняя. Прогресс каждого мира хранится отдельно. */
export default function WorldMap({ world, meta, offFloor, onTravel, onOpen, onClose }: Props) {
  const dungeonFloor = world === 'dungeon' ? null : offFloor;
  const canOpen = meta.gems >= HELL.openCost;
  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="panel rounded-2xl p-3 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-amber-300 text-center text-stroke">🗺️ Карта миров</h2>
        <p className="text-[11px] text-purple-300/80 text-center mb-3 leading-snug">
          У каждого мира свой герой, валюта и монстры. Перерождение в Подземелье не трогает Преисподнюю.
        </p>

        <div className={`rounded-xl p-3 mb-2.5 border ${world === 'dungeon' ? 'border-amber-400 bg-purple-900/40' : 'border-purple-700/50 bg-black/30'}`}>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{WORLDS.dungeon.emoji}</span>
            <div className="flex-1 leading-tight">
              <div className="font-black text-purple-100">{WORLDS.dungeon.name}</div>
              <div className="text-[11px] text-purple-300">Герой: {WORLDS.dungeon.hero} · валюта: {WORLDS.dungeon.coin} {WORLDS.dungeon.currency}</div>
              <div className="text-[11px] text-green-300">Рекорд этажа: {meta.maxFloor}{dungeonFloor ? ` · сейчас ${dungeonFloor}` : ''}</div>
            </div>
          </div>
          {world === 'dungeon'
            ? <div className="mt-2 text-center text-xs font-bold text-amber-300">📍 Ты здесь</div>
            : <button onClick={() => { onTravel('dungeon'); onClose(); }} className="btn-fantasy w-full mt-2 py-2 rounded-lg text-sm font-bold">🏰 Вернуться в Подземелье</button>}
        </div>

        <div className={`rounded-xl p-3 border ${world === 'hell' ? 'border-orange-400 bg-red-950/60' : 'border-red-900/60 bg-red-950/30'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-3xl ${meta.hellOpen ? '' : 'grayscale opacity-70'}`}>{WORLDS.hell.emoji}</span>
            <div className="flex-1 leading-tight">
              <div className="font-black text-orange-200">{WORLDS.hell.name}</div>
              <div className="text-[11px] text-orange-300/90">Герой: {WORLDS.hell.hero} · валюта: {WORLDS.hell.coin} {WORLDS.hell.currency}</div>
              <div className="text-[11px] text-orange-300/90">Демоны сильнее в ~1.5 раза, но и награды выше.</div>
              {meta.hellOpen && <div className="text-[11px] text-green-300">Рекорд этажа: {meta.hellMax}</div>}
            </div>
          </div>
          {!meta.hellOpen ? (
            <>
              <div className="text-[11px] text-center text-orange-200 mt-2">Портал закрыт. Нужно {HELL.openCost} 💎 (сейчас {meta.gems}).</div>
              <button disabled={!canOpen} onClick={onOpen} className="btn-purple w-full mt-1.5 py-2 rounded-lg text-sm font-bold">
                {canOpen ? `🔥 Открыть портал · ${HELL.openCost} 💎` : '🔒 Не хватает кристаллов'}
              </button>
            </>
          ) : world === 'hell'
            ? <div className="mt-2 text-center text-xs font-bold text-orange-300">📍 Ты здесь</div>
            : <button onClick={() => { onTravel('hell'); onClose(); }} className="btn-purple w-full mt-2 py-2 rounded-lg text-sm font-bold">🔥 Войти в Преисподнюю</button>}
        </div>

        <button onClick={onClose} className="btn-fantasy w-full mt-3 py-2 rounded-lg text-sm font-bold">Закрыть</button>
      </div>
    </div>
  );
}
