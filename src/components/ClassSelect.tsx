import { CLASSES } from '../gameData';
import type { ClassId } from '../types';

/** Выбор класса: показывается при первом запуске и после каждого перерождения. */
export default function ClassSelect({ onPick, rebirths }: { onPick: (id: ClassId) => void; rebirths: number }) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/85 flex items-center justify-center p-4 fade-in overflow-y-auto">
      <div className="panel rounded-2xl p-4 max-w-sm w-full pop-in my-auto">
        <h2 className="text-2xl font-black text-amber-300 text-center text-stroke">🎭 Выбери класс</h2>
        <p className="text-xs text-purple-300 text-center mb-3 leading-snug">
          {rebirths > 0 ? 'Новая жизнь — новый путь. Класс можно поменять только при следующем перерождении.' : 'Класс можно поменять только при следующем перерождении.'}
        </p>
        <div className="space-y-2.5">
          {CLASSES.map(c => (
            <button key={c.id} onClick={() => onPick(c.id)}
              className="w-full text-left rounded-xl p-3 bg-gradient-to-br from-purple-900/70 to-indigo-950/80 border border-purple-500/50 active:scale-[0.98] transition">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl">{c.emoji}</span>
                <div>
                  <div className="font-black text-lg text-amber-200 leading-none">{c.name}</div>
                  <div className="text-[11px] text-purple-300">{c.desc}</div>
                </div>
              </div>
              <ul className="text-xs text-purple-100 space-y-0.5 pl-1">
                {c.perks.map(p => <li key={p}>• {p}</li>)}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
