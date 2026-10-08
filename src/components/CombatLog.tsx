import type { LogEntry, LogType } from '../types';

const TYPE_STYLES: Record<LogType, string> = {
  dmg: 'text-red-300',
  crit: 'text-yellow-300 font-bold',
  heal: 'text-green-300',
  loot: 'text-amber-400',
  dodge: 'text-sky-300 italic',
  info: 'text-purple-200',
  boss: 'text-orange-400 font-bold text-base',
  death: 'text-red-500 font-black',
};

export default function CombatLog({ log }: { log: LogEntry[] }) {
  return (
    <div className="panel rounded-lg p-3">
      <h3 className="font-black text-amber-300 mb-2 text-center">📜 Журнал боя</h3>
      <div className="scroll-log overflow-y-auto h-48 md:h-56 space-y-0.5 pr-1 text-sm">
        {log.map(e => (
          <div key={e.id} className={`fade-in ${TYPE_STYLES[e.type]}`}>
            {e.text}
          </div>
        ))}
      </div>
    </div>
  );
}
