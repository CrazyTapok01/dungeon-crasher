import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { NodeKind, Run } from '../game/types';
import type { Action } from '../game/engine';
import { ACTS } from '../game/data/enemies';
import { play } from '../game/audio';

const ICON: Record<NodeKind, string> = { fight: '⚔️', elite: '☠️', event: '❓', shop: '🛒', rest: '🔥', treasure: '💎', boss: '👑' };
const NAME: Record<NodeKind, string> = { fight: 'Бой', elite: 'Элитный враг', event: 'Событие', shop: 'Лавка', rest: 'Костёр', treasure: 'Сокровище', boss: 'Босс' };
const RH = 84;

export default function MapView({ run, dispatch }: { run: Run; dispatch: Dispatch<Action> }) {
  const rows = run.map.length;
  const H = rows * RH + 30;
  const act = ACTS[run.act];
  const box = useRef<HTMLDivElement>(null);
  const options = run.row < 0 ? run.map[0].map((_, i) => i) : run.map[run.row][run.col].next;
  const nextRow = run.row + 1;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const y = (rows - 1 - Math.max(run.row, 0)) * RH + 15;
    el.scrollTop = Math.max(0, y - el.clientHeight * 0.55);
  }, [run.row, run.act, rows]);

  const pos = (r: number, col: number) => ({ x: ((col + 0.5) / 4) * 100, y: (rows - 1 - r) * RH + 45 });

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 pt-1 pb-1 text-center">
        <div className="text-xs text-[var(--dim)] font-bold tracking-widest uppercase">Акт {run.act} из 3</div>
        <div className="font-black text-lg" style={{ color: act.hue }}>{act.emoji} {act.name}</div>
      </div>
      <div ref={box} className="flex-1 min-h-0 overflow-y-auto scroll relative mx-3 rounded-2xl glass">
        <div className="relative" style={{ height: H }}>
          <svg className="absolute inset-0 w-full" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none">
            {run.map.map((row, r) => row.map((n, i) => n.next.map(j => {
              const a = pos(r, n.col), b = pos(r + 1, run.map[r + 1][j].col);
              const live = r === run.row && i === run.col;
              return <line key={`${r}-${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={live ? '#ffd25e' : 'rgba(255,255,255,.18)'}
                strokeWidth={live ? 3 : 2} strokeDasharray={live ? '' : '4 5'} vectorEffect="non-scaling-stroke" />;
            })))}
          </svg>
          {run.map.map((row, r) => row.map((n, i) => {
            const p = pos(r, n.col);
            const reach = run.pane === 'map' && r === nextRow && options.includes(i);
            const here = r === run.row && i === run.col;
            const done = r < run.row || (r === run.row && !here);
            return (
              <button key={`${r}-${i}`} aria-label={NAME[n.kind]} disabled={!reach}
                onClick={() => { play('click'); dispatch({ type: 'PICK_NODE', i }); }}
                className={`node ${n.kind === 'boss' ? 'boss' : ''} ${reach ? 'reach' : ''} ${here ? 'here' : ''} ${done ? 'done' : ''} ${!reach && !here && !done ? 'far' : ''}`}
                style={{ left: `${p.x}%`, top: p.y }}>
                {ICON[n.kind]}
              </button>
            );
          }))}
        </div>
      </div>
      <div className="shrink-0 px-3 py-2 flex flex-wrap gap-x-3 gap-y-0.5 justify-center text-[11px] text-[var(--dim)]" style={{ paddingBottom: 'max(var(--sab), 8px)' }}>
        {(['fight', 'elite', 'event', 'shop', 'rest', 'treasure'] as NodeKind[]).map(k => <span key={k}>{ICON[k]} {NAME[k]}</span>)}
      </div>
    </div>
  );
}
