import type { HitEvent, Monster } from '../types';

interface Props {
  monster: Monster;
  hp: number;
  hit: HitEvent | null; // последний удар героя по монстру
}

export default function MonsterPanel({ monster, hp, hit }: Props) {
  const hpPct = Math.min(100, Math.max(0, (hp / monster.hp) * 100));
  const isHurt = hit?.kind === 'damage';

  return (
    <div className="flex-1 relative">
      <div className="text-center">
        <div className={`text-xs font-bold uppercase tracking-wider ${monster.isBoss ? 'text-amber-400 animate-pulse' : 'text-red-300'}`}>
          {monster.isBoss ? '👑 БОСС' : 'Враг'}
        </div>
        <div className={`font-black text-lg ${monster.isBoss ? 'text-amber-300' : 'text-red-200'}`}>
          {monster.name}
        </div>
      </div>

      {/* key = id удара: каждый новый удар пересоздаёт блок и заново запускает анимацию */}
      <div key={hit?.id ?? 'calm'} className={`relative inline-block w-full text-center ${isHurt ? 'shake hit-flash' : ''}`}>
        <div className={`relative mx-auto w-32 h-32 md:w-40 md:h-40 flex items-center justify-center text-7xl md:text-8xl select-none ${monster.isBoss ? 'glow-boss rounded-full' : ''}`}>
          <span className={isHurt ? '' : 'float'} style={{
            filter: monster.isBoss
              ? 'drop-shadow(0 0 20px #f59e0b)'
              : 'drop-shadow(0 0 15px rgba(239,68,68,0.6))'
          }}>{monster.emoji}</span>
          {isHurt && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="slash text-6xl">⚔️</div>
            </div>
          )}
          {hit && (
            <div className={`absolute pop font-black text-3xl text-stroke z-10 ${hit.crit ? 'text-yellow-300 text-4xl' : 'text-red-400'}`}
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
            <span className="text-red-200 font-bold">{hp}/{monster.hp}</span>
          </div>
          <div className="h-4 bg-black/60 rounded-full border border-red-900 overflow-hidden relative">
            <div className="h-full transition-all duration-200"
                 style={{
                   width: `${hpPct}%`,
                   background: monster.isBoss
                     ? 'linear-gradient(90deg, #b45309, #f59e0b, #fde047)'
                     : 'linear-gradient(90deg, #7f1d1d, #dc2626, #f87171)'
                 }} />
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-red-300/90 text-center">
        ⚔️ {monster.atk} · 🛡️ {monster.def} · 💰 {monster.gold} · ⭐ {monster.xp}
      </div>
    </div>
  );
}
