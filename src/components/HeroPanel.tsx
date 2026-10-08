import type { HeroState, HeroStats, HitEvent } from '../types';

interface Props {
  hero: HeroState;
  stats: HeroStats;
  hit: HitEvent | null; // последнее событие с героем: удар, лечение, уклонение
}

const FLOAT_COLOR: Record<HitEvent['kind'], string> = {
  damage: 'text-red-400',
  heal: 'text-green-400',
  dodge: 'text-blue-300',
};

export default function HeroPanel({ hero, stats, hit }: Props) {
  const hpPct = Math.min(100, Math.max(0, (hero.hp / stats.maxHp) * 100));
  const xpPct = Math.min(100, (hero.xp / hero.xpToNext) * 100);

  // Новый id удара → новый key → элемент пересоздаётся и CSS-анимация проигрывается заново
  const hurtId = hit?.kind === 'damage' ? hit.id : null;
  const isHurt = hurtId !== null;

  return (
    <div className="flex-1 relative">
      <div className="text-center">
        <div className="text-xs text-purple-300 font-bold uppercase tracking-wider">Крушитель</div>
        <div className="text-amber-300 font-black text-lg">Ур. {hero.level}</div>
      </div>

      <div key={hurtId ?? 'calm'} className={`relative inline-block w-full text-center ${isHurt ? 'shake' : ''}`}>
        <div className="relative mx-auto w-32 h-32 md:w-40 md:h-40 flex items-center justify-center text-7xl md:text-8xl select-none"
             style={{ filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.5))' }}>
          <span className={isHurt ? '' : 'float'}>🧙‍♂️</span>
          {isHurt && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="slash text-6xl">⚔️</div>
            </div>
          )}
          {hit && (
            <div key={hit.id}
                 className={`absolute pop font-black text-3xl text-stroke z-10 ${FLOAT_COLOR[hit.kind]}`}
                 style={{ left: '50%', top: '30%', transform: 'translateX(-50%)' }}>
              {hit.text}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-red-300">❤️ HP</span>
            <span className="text-red-200 font-bold">{hero.hp}/{stats.maxHp}</span>
          </div>
          <div className="h-4 bg-black/60 rounded-full border border-red-900 overflow-hidden relative">
            <div className="h-full transition-all duration-300"
                 style={{ width: `${hpPct}%`, background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 60%, #f87171 100%)' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-blue-300">⭐ Опыт</span>
            <span className="text-blue-200 font-bold">{hero.xp}/{hero.xpToNext}</span>
          </div>
          <div className="h-2 bg-black/60 rounded-full border border-blue-900 overflow-hidden">
            <div className="h-full transition-all duration-300"
                 style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #2563eb, #60a5fa)' }} />
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-purple-300/90 text-center">
        ⚔️ {stats.atk} · 🛡️ {stats.def}
      </div>
    </div>
  );
}
