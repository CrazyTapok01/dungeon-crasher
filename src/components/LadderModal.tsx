import type { LadderResult } from '../game/ladder';
import { TOWER_MECHS } from '../gameData';
import { useFmt } from '../game/num';

/** Отчёт о забеге по Башне или ежедневному испытанию. */
export default function LadderModal({ result, onClose }: { result: LadderResult; onClose: () => void }) {
  const f = useFmt();
  const tower = result.kind === 'tower';
  const shown = result.steps.slice(-12);
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-5 fade-in" onClick={onClose}>
      <div className="panel rounded-2xl p-4 max-w-sm w-full pop-in max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-amber-300 text-center text-stroke">{tower ? '🗼 Башня испытаний' : result.kind === 'weekly' ? '📅 Испытание недели' : '🎯 Ежедневное испытание'}</h3>
        <p className="text-center text-sm text-purple-200 mb-2">{tower ? 'Пройдено ярусов' : 'Побеждено врагов'}: <b className="text-amber-200">{result.cleared}</b></p>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1 mb-3 scroll-log">
          {result.steps.length > shown.length && <div className="text-center text-[10px] text-purple-400">…ещё {result.steps.length - shown.length} ярусов выше</div>}
          {shown.map(st => {
            const m = TOWER_MECHS.find(x => x.id === st.mech);
            return (
              <div key={st.i} className={`rounded-lg px-2 py-1 flex items-center gap-2 text-xs border ${st.won ? 'bg-green-950/40 border-green-700/50' : 'bg-red-950/40 border-red-700/60'}`}>
                <span className="text-lg">{st.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-purple-100 truncate">{st.name}</div>
                  {tower && m && <div className="text-[10px] text-amber-300/90">{m.emoji} {m.name}: {m.desc}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className={st.won ? 'text-green-300 font-bold' : 'text-red-300 font-bold'}>{st.won ? '✓' : '☠'}</div>
                  <div className="text-[10px] text-purple-400">{st.turns} ход. · ❤️ {f(st.hpLeft)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded-lg bg-black/40 border border-amber-700/40 p-2 text-xs text-amber-100 space-y-0.5 mb-3">
          {result.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <button onClick={onClose} className="btn-purple w-full py-2.5 rounded-xl font-bold">Закрыть</button>
      </div>
    </div>
  );
}
