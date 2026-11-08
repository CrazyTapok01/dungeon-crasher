import { memo } from 'react';
import type { Meta } from '../types';
import { DAILY, QUEST_INFO, dailyPreview, RELICS, RELIC_DROP, RELIC_MAX, questProgress } from '../gameData';

/** Задания и реликвии — долгие цели, которые не сбрасываются перерождением. */
function QuestsPanel({ meta, onClaimDaily }: { meta: Meta; onClaimDaily: () => void }) {
  const daily = dailyPreview(meta);
  const owned = RELICS.filter(r => meta.relics[r.id] > 0).length;
  return (
    <>
      <div className="panel rounded-xl p-3 border-green-600/40">
        <h2 className="text-lg font-black text-green-300 mb-0.5 text-center text-stroke">🎁 Ежедневная награда</h2>
        <p className="text-center text-xs text-purple-300/80 mb-2 leading-snug">
          Заходи каждый день: серия растёт, награда тоже (до {DAILY.streakCap} дней), а каждый {DAILY.soulsEvery}-й день дарит ещё и {DAILY.soulsBonus} души.
        </p>
        <div className="flex gap-1 justify-center mb-2">
          {Array.from({ length: DAILY.streakCap }, (_, i) => (
            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border ${i < (meta.daily.streak % DAILY.streakCap || (meta.daily.streak > 0 && !daily.available ? DAILY.streakCap : 0)) ? 'bg-green-700/70 border-green-400 text-white' : 'bg-black/40 border-purple-800/60 text-purple-400'}`}>
              {i + 1}
            </div>
          ))}
        </div>
        <button disabled={!daily.available} onClick={onClaimDaily} className="btn-fantasy w-full py-2.5 rounded-xl font-black disabled:opacity-50">
          {daily.available
            ? `🎁 Забрать (день ${daily.streak}): 💰 ${daily.gold}${daily.souls ? ` · 👻 ${daily.souls}` : ''}`
            : '✅ Сегодня уже получено — приходи завтра'}
        </button>
      </div>

      <div className="panel rounded-xl p-3 border-amber-600/40">
        <h2 className="text-lg font-black text-amber-300 mb-0.5 text-center text-stroke">📜 Задания</h2>
        <p className="text-center text-xs text-purple-300/80 mb-2 leading-snug">
          Выполнено: {meta.questsDone}. Каждое следующее задание немного сложнее, а награда больше.
        </p>
        <div className="space-y-2">
          {meta.quests.map((q, i) => {
            const info = QUEST_INFO[q.kind];
            const p = questProgress(q, meta);
            const pct = Math.round((p / q.target) * 100);
            return (
              <div key={i} className="rounded-lg bg-black/35 border border-amber-500/30 p-2">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-100">
                  <span className="text-xl">{info.emoji}</span>
                  <span className="flex-1 leading-tight">{info.text(q.target)}</span>
                </div>
                <div className="relative h-3 rounded-full bg-black/50 overflow-hidden my-1.5">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-yellow-300" style={{ transform: `translateX(${pct - 100}%)` }} />
                </div>
                <div className="flex justify-between text-[11px] text-purple-200">
                  <span>{p} / {q.target}</span>
                  <span className="text-amber-300 font-bold">💰 {q.gold}{q.souls > 0 ? ` · 👻 ${q.souls}` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel rounded-xl p-3 border-cyan-600/40">
        <h2 className="text-lg font-black text-cyan-200 mb-0.5 text-center text-stroke">🗝️ Реликвии</h2>
        <p className="text-center text-xs text-purple-300/80 mb-2 leading-snug">
          Падают с боссов ({Math.round(RELIC_DROP.boss * 100)}%) и редко с элитных. Повторная находка повышает уровень
          (до {RELIC_MAX}), на максимуме даёт золото. Остаются навсегда. Найдено: {owned}/{RELICS.length}.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {RELICS.map(r => {
            const lvl = meta.relics[r.id];
            return (
              <div key={r.id} className={`rounded-lg p-2 border ${lvl ? 'bg-cyan-950/50 border-cyan-400/50' : 'bg-black/30 border-dashed border-purple-700/50 opacity-60'}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`text-2xl ${lvl ? '' : 'grayscale'}`}>{r.emoji}</span>
                  <div className="leading-tight min-w-0">
                    <div className="text-xs font-bold text-cyan-100 truncate">{lvl ? r.name : '???'}</div>
                    <div className="text-[10px] text-cyan-300">{lvl ? `ур. ${lvl}/${RELIC_MAX}` : 'не найдена'}</div>
                  </div>
                </div>
                <div className="text-[11px] text-purple-200 mt-1">
                  {lvl ? `${r.desc} × ${lvl}` : r.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default memo(QuestsPanel);
