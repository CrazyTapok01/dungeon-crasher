import type { HeroState, HeroStats, Skill, SkillId } from '../types';
import { PRESTIGE, skillCost } from '../gameData';

interface Props {
  skills: Skill[];
  gold: number;
  hero: HeroState;
  stats: HeroStats;
  souls: number;
  onBuy: (id: SkillId) => void;
}

const TINT: Record<string, string> = {
  power: 'from-red-800/70 to-red-950/80', vitality: 'from-pink-800/70 to-rose-950/80',
  armor: 'from-slate-700/70 to-slate-900/80', crit: 'from-yellow-800/70 to-amber-950/80',
  critdmg: 'from-orange-800/70 to-red-950/80', dodge: 'from-sky-800/70 to-cyan-950/80',
  vamp: 'from-rose-900/70 to-red-950/80', regen: 'from-green-800/70 to-emerald-950/80',
  fortune: 'from-yellow-700/70 to-yellow-950/80', wisdom: 'from-indigo-800/70 to-indigo-950/80',
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-purple-900/40 py-1 text-[13px]">
      <span className="text-purple-300">{label}</span>
      <span className="text-amber-200 font-bold">{value}</span>
    </div>
  );
}

export default function SkillsPanel({ skills, gold, hero, stats, souls, onBuy }: Props) {
  return (
    <div className="space-y-3">
      <div className="panel rounded-xl p-3">
        <h2 className="text-xl font-black text-amber-300 mb-2 text-center text-stroke">🛡️ Герой</h2>
        <div className="grid grid-cols-2 gap-x-4">
          <Stat label="⚔️ Атака" value={stats.atk} />
          <Stat label="🛡️ Защита" value={stats.def} />
          <Stat label="❤️ Макс. HP" value={stats.maxHp} />
          <Stat label="🌿 Регенерация" value={`${stats.regen}/ход`} />
          <Stat label="⚡ Шанс крита" value={`${stats.critChance}%`} />
          <Stat label="💥 Крит. урон" value={`${stats.critDmg}%`} />
          <Stat label="💨 Уклонение" value={`${stats.dodge}%`} />
          <Stat label="🩸 Вампиризм" value={`${stats.lifesteal}%`} />
          <Stat label="🪙 Бонус золота" value={`+${stats.goldBonus}%`} />
          <Stat label="📖 Бонус опыта" value={`+${stats.xpBonus}%`} />
          <Stat label="⭐ Уровень" value={hero.level} />
          <Stat label="☠️ Убийств" value={hero.kills} />
        </div>
        {souls > 0 && (
          <div className="mt-2 text-center text-xs text-purple-300 bg-purple-950/50 border border-purple-700/50 rounded-lg py-1.5">
            👻 Души ({souls}): +{Math.round(souls * PRESTIGE.atkHpPerSoul * 100)}% к атаке и HP
          </div>
        )}
      </div>

      <div className="panel rounded-xl p-3">
        <h2 className="text-xl font-black text-amber-300 mb-1 text-center text-stroke">✨ Навыки</h2>
        <p className="text-center text-purple-300/80 text-xs mb-3">Прокачивай навыки за золото — они сбрасываются при перерождении</p>
        <div className="space-y-2">
          {skills.map(s => {
            const cost = skillCost(s, s.level);
            const maxed = s.level >= s.maxLevel;
            const canBuy = !maxed && gold >= cost;
            return (
              <div key={s.id} className={`rounded-xl p-2.5 bg-gradient-to-br ${TINT[s.id]} border ${maxed ? 'border-amber-400/80' : 'border-purple-600/40'} flex items-center gap-3`}>
                <div className="text-3xl bg-black/30 rounded-xl w-12 h-12 flex items-center justify-center shrink-0">{s.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-black text-white text-sm truncate">{s.name}</h4>
                    <span className="text-[11px] bg-black/40 px-2 py-0.5 rounded-full text-amber-300 font-bold shrink-0">{s.level}/{s.maxLevel}</span>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-tight">{s.desc}</p>
                  <div className="h-1.5 bg-black/50 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${(s.level / s.maxLevel) * 100}%` }} />
                  </div>
                  <p className="text-xs text-green-300 mt-0.5 font-bold">▸ {s.effect(s.level)}</p>
                </div>
                <button disabled={!canBuy} onClick={() => onBuy(s.id)}
                        className="btn-fantasy shrink-0 w-[84px] py-2 rounded-lg font-bold text-xs leading-tight">
                  {maxed ? '🏆 МАКС' : <>Улучшить<br />💰 {cost}</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
