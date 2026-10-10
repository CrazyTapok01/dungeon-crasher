import type { AbilityId, Cooldowns } from '../types';
import { ABILITIES, COMBAT_TICK_MS } from '../gameData';

interface Props {
  level: number;
  cooldowns: Cooldowns;
  auto: boolean;
  onUse: (id: AbilityId) => void;
  onToggleAuto: () => void;
}

/** Три кнопки-способности с кружком перезарядки и переключатель «Авто». */
export default function AbilityBar({ level, cooldowns, auto, onUse, onToggleAuto }: Props) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid grid-cols-3 gap-3 flex-1 justify-items-center">
        {ABILITIES.map(a => {
          const locked = level < a.unlockLevel;
          const cd = cooldowns[a.id];
          const ready = !locked && cd === 0;
          const pct = (cd / a.cooldownTicks) * 100;
          const secs = Math.ceil((cd * COMBAT_TICK_MS) / 1000);
          return (
            <div key={a.id} className="flex flex-col items-center w-full">
              <button
                className={`ability ${ready ? 'ready' : ''} ${locked ? 'locked' : ''} flex items-center justify-center`}
                disabled={!ready}
                onClick={() => onUse(a.id)}
                aria-label={a.name}
                title={a.desc}
              >
                <span className="text-3xl drop-shadow">{locked ? '🔒' : a.emoji}</span>
                {!locked && cd > 0 && (
                  <>
                    <div className="ability-cd" style={{ '--p': pct } as React.CSSProperties} />
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white text-stroke">{secs}</span>
                  </>
                )}
              </button>
              <div className="text-[10px] mt-1 text-center leading-tight text-purple-200/90 font-bold">
                {locked ? `Ур. ${a.unlockLevel}` : a.name}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onToggleAuto}
        className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black leading-tight border-2 transition ${
          auto ? 'btn-purple' : 'btn-fantasy opacity-80'
        }`}
        title="Автоматически применять способности"
      >
        <div className="text-xl">{auto ? '⚡' : '✋'}</div>
        <div>{auto ? 'АВТО' : 'РУЧН.'}</div>
      </button>
    </div>
  );
}
