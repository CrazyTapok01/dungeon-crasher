import type { OfflineReport } from '../types';

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${Math.max(1, m)} мин`;
}

/** «С возвращением!» — награда за время, пока игра была закрыта. */
export default function OfflineModal({ report, onClose }: { report: OfflineReport; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 fade-in">
      <div className="panel rounded-2xl p-5 max-w-sm w-full pop-in text-center border-amber-500/50">
        <div className="text-5xl mb-1">🌙</div>
        <h3 className="text-2xl font-black text-amber-300 text-stroke">С возвращением!</h3>
        <p className="text-sm text-purple-300 mb-3">Тебя не было {formatDuration(report.seconds)} — герой не сидел без дела:</p>
        <div className="space-y-1.5 mb-4 text-base">
          <div className="bg-black/40 rounded-lg py-1.5">☠️ Побеждено врагов: <b className="text-red-300">{report.kills}</b></div>
          <div className="bg-black/40 rounded-lg py-1.5">💰 Золото: <b className="text-yellow-300">+{report.gold}</b></div>
          <div className="bg-black/40 rounded-lg py-1.5">⭐ Опыт: <b className="text-blue-300">+{report.xp}</b></div>
          {report.levels > 0 && <div className="bg-black/40 rounded-lg py-1.5">🎉 Новых уровней: <b className="text-green-300">+{report.levels}</b></div>}
        </div>
        <button onClick={onClose} className="btn-purple w-full py-3 rounded-xl font-black text-lg">Забрать награду</button>
      </div>
    </div>
  );
}
